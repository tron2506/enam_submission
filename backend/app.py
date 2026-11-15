import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import logging
import time
from collections import defaultdict, deque
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .core import selected_companies, company, connect, DEFAULT_SETTINGS, get, put, keys, alerts, now, ticker
from . import sources, research

jobs = {}
active_tasks = set()


def start_job(label, func, key):
    for j in jobs.values():
        if j["key"] == key and j["status"] == "running":
            return j
    if sum(j["status"] == "running" for j in jobs.values()) >= 3:
        raise HTTPException(
            429, "Three analysis jobs are already running. Please wait for one to finish."
        )
    if len(jobs) > 100:
        for jid in [jid for jid, j in jobs.items() if j["status"] != "running"][:50]:
            jobs.pop(jid, None)
    j = {
        "id": str(uuid.uuid4()),
        "key": key,
        "label": label,
        "status": "running",
        "started_at": now(),
        "progress": "Starting",
    }
    jobs[j["id"]] = j

    async def run():
        try:
            result = await func(lambda msg: j.update(progress=msg))
            j.update(status="complete", result=result, finished_at=now())
        except Exception as e:
            # HTTP provider errors must not reveal request headers or credentials.
            j.update(status="failed", error=str(e)[:350], finished_at=now())

    task = asyncio.create_task(run())
    active_tasks.add(task)
    task.add_done_callback(active_tasks.discard)
    return j


@asynccontextmanager
async def lifespan(app):
    from .bootstrap import seed_if_empty

    seed_if_empty()

    async def loop():
        while True:
            try:
                await sources.refresh()
            except Exception:
                logging.exception("Source refresh failed; will retry at the next interval")
            await asyncio.sleep(max(300, int(os.getenv("FINN_POLL_SECONDS", "900"))))

    task = (
        asyncio.create_task(loop())
        if os.getenv("FINN_AUTO_REFRESH", "false").lower() == "true"
        else None
    )
    yield
    if task:
        task.cancel()
    pending = list(active_tasks) + ([task] if task else [])
    for t in pending:
        t.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)


app = FastAPI(title="FINN API", lifespan=lifespan)


@app.exception_handler(ValueError)
async def invalid_input(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)[:300]})


# A public single-user demo has bounded writes and model attempts.
write_windows = defaultdict(deque)


@app.middleware("http")
async def limit_writes(request: Request, call_next):
    if request.method in ("POST", "PUT") and request.url.path.startswith("/api/"):
        current = time.monotonic()
        host = request.client.host if request.client else "unknown"
        if len(write_windows) > 2000:
            for key in list(write_windows):
                if not write_windows[key] or write_windows[key][-1] < current - 60:
                    write_windows.pop(key, None)
        window = write_windows[host]
        while window and window[0] < current - 60:
            window.popleft()
        if len(window) >= 20:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait one minute."},
                headers={"Retry-After": "60"},
            )
        window.append(current)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "FINN_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_configured": bool(
            os.getenv("HYDE_INFERENCE_API_KEY") or os.getenv("GEMINI_API_KEY")
        ),
        "refresh": get("refresh"),
        "bootstrap": get("bootstrap"),
        "generated_at": now(),
    }


@app.get("/api/overview")
def overview():
    settings = get("settings", DEFAULT_SETTINGS)
    return {
        "companies": [
            {**c, "price": get("price:" + c["symbol"]) if c.get("price_supported", True) else None}
            for c in selected_companies()
        ],
        "settings": settings,
        "refresh": get("refresh"),
        "bootstrap": get("bootstrap"),
        "research_ready": [k.split(":", 1)[1] for k in keys("research:")],
        "usage": get("llm_usage", []),
        "generated_at": now(),
    }


@app.get("/api/events")
def events(days: float = 1):
    if not 0 < days <= 365:
        raise HTTPException(400, "Window must be between 0 and 365 days")
    symbols = get("settings", DEFAULT_SETTINGS)["symbols"]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = [
        dict(e)
        for e in get("events", [])
        if e["symbol"] in symbols
        and datetime.fromisoformat(e["published_at"]).astimezone(timezone.utc).isoformat() >= cutoff
    ]
    for e in result:
        analysis = get("enrichment:" + e["id"])
        if analysis:
            e["analysis_preview"] = {k: analysis[k] for k in ("period", "unit", "metrics")}
    return result


@app.get("/api/alerts")
def alert_list():
    return {"items": alerts(), "read": get("read_alerts", [])}


class Read(BaseModel):
    ids: list[str] = Field(max_length=1000)


@app.post("/api/alerts/read")
def read(body: Read):
    put("read_alerts", list(set(get("read_alerts", []) + body.ids)))
    return {"ok": True}


class Settings(BaseModel):
    price_threshold: float = Field(ge=0.1, le=50)
    volume_threshold: float = Field(ge=1, le=20)
    categories: list[str]
    symbols: list[str] = Field(min_length=1, max_length=30)


@app.put("/api/settings")
def settings(body: Settings):
    d = body.model_dump()
    d["symbols"] = [ticker(s) for s in d["symbols"]]
    put("settings", d)
    return d


class Replacement(BaseModel):
    old_symbol: str
    new_symbol: str


@app.post("/api/watchlist/replace")
async def replace_company(body: Replacement):
    """Validate first, then atomically replace one slot without losing other edits."""
    import json

    old, new = ticker(body.old_symbol), ticker(body.new_symbol)
    current = get("settings", DEFAULT_SETTINGS)
    if old not in current["symbols"]:
        raise HTTPException(409, "This company is no longer in the watchlist. Reload and try again.")
    if new in current["symbols"]:
        raise HTTPException(400, "This company is already in your watchlist.")
    try:
        price = await sources.prices(new)
    except Exception:
        raise HTTPException(400, "Could not verify this NSE equity. Check the ticker or retry when the price source is available. Your watchlist is unchanged.")
    meta = {**company(new), "name": company(new).get("name") if company(new).get("name") != new else price.get("name", new)}
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT value FROM kv WHERE key='settings'").fetchone()
        current = json.loads(row[0]) if row else dict(DEFAULT_SETTINGS)
        if old not in current["symbols"] or new in current["symbols"]:
            raise HTTPException(409, "Watchlist changed during validation. Reload and try again.")
        current["symbols"] = [new if s == old else s for s in current["symbols"]]
        db.execute("INSERT OR REPLACE INTO kv VALUES (?,?)", ("company:" + new, json.dumps(meta)))
        db.execute("INSERT OR REPLACE INTO kv VALUES (?,?)", ("settings", json.dumps(current)))
    return {"company": {**meta, "price": price}, "settings": current}


@app.post("/api/refresh")
async def refresh():
    return start_job("Refresh portfolio", lambda p: sources.refresh(), "refresh")


@app.get("/api/jobs/{job_id}")
def job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job expired or unknown; check cached results.")
    return jobs[job_id]


@app.get("/api/research/{symbol}")
def cached(symbol: str):
    r = get("research:" + ticker(symbol))
    if not r:
        raise HTTPException(
            404, "No cached analysis. Start research to read the primary documents."
        )
    return r


@app.post("/api/research/{symbol}")
async def research_start(symbol: str):
    try:
        symbol = ticker(symbol)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return start_job(
        "Research " + symbol, lambda p: research.run_research(symbol, p), "research:" + symbol
    )


class Question(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


@app.post("/api/research/{symbol}/ask")
async def ask(symbol: str, body: Question):
    try:
        return await research.answer(ticker(symbol), body.question)
    except Exception as e:
        raise HTTPException(422, str(e)[:300])


@app.get("/api/events/{event_id}/analysis")
def event_analysis(event_id: str):
    r = get("enrichment:" + event_id)
    if not r:
        raise HTTPException(404, "Not yet analyzed")
    return r


@app.post("/api/events/{event_id}/analyze")
async def event_start(event_id: str):
    e = next((e for e in get("events", []) if e["id"] == event_id), None)
    if not e:
        raise HTTPException(404, "Unknown event")
    if e["category"] != "results":
        raise HTTPException(400, "Structured extraction is available for results filings.")
    return start_job("Read results filing", lambda p: research.enrich_event(e), "event:" + event_id)


# A single-container deployment serves the exported Next.js app and Python API.
from pathlib import Path
from fastapi.staticfiles import StaticFiles

web = Path(__file__).resolve().parents[1] / "frontend" / "out"
if web.exists():
    app.mount("/", StaticFiles(directory=web, html=True), name="frontend")
