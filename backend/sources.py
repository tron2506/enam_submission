"""Public-source adapters. Screener discovers links, never supplies analysis."""

import asyncio
import ipaddress
import json
import re
import socket
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, urljoin
import httpx
import pymupdf as fitz
from bs4 import BeautifulSoup
from .core import DATA, PORTFOLIO, get, put, now, uid, classify, price_signal, ticker

HEADERS = {"User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9"}
SEM = asyncio.Semaphore(4)


async def fetch(url, binary=False):
    async with SEM, httpx.AsyncClient(
        headers=HEADERS, timeout=45, follow_redirects=False
    ) as client:
        for _ in range(5):
            p = urlparse(url)
            if p.scheme != "https" or not p.hostname:
                raise ValueError("Only HTTPS source documents are supported.")
            addresses = await asyncio.to_thread(socket.getaddrinfo, p.hostname, 443)
            if any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
                raise ValueError("Private-network document URLs are not allowed.")
            async with client.stream("GET", url) as r:
                if r.is_redirect:
                    url = urljoin(url, r.headers["location"])
                    continue
                r.raise_for_status()
                chunks = []
                size = 0
                async for chunk in r.aiter_bytes():
                    size += len(chunk)
                    if size > 45_000_000:
                        raise ValueError("Document exceeds the 45 MB prototype limit.")
                    chunks.append(chunk)
                content = b"".join(chunks)
                return content if binary else content.decode("utf-8", errors="replace")
    raise ValueError("Too many document redirects")


async def prices(symbol):
    raw = json.loads(
        await fetch(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.NS?interval=1d&range=3mo&events=splits"
        )
    )
    r = raw["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    bars = []
    splits = {int(v["date"]) for v in r.get("events", {}).get("splits", {}).values()}
    for i, t in enumerate(r.get("timestamp", [])):
        # Exclude a still-open Indian trading session (close is 15:30 IST).
        dt = datetime.fromtimestamp(t, timezone.utc)
        if dt.date() == datetime.now(timezone.utc).date() and (
            datetime.now(timezone.utc).hour,
            datetime.now(timezone.utc).minute,
        ) < (10, 30):
            continue
        bars.append(
            {
                "date": dt.isoformat(),
                "close": q["close"][i],
                "volume": q["volume"][i],
                "split": t in splits,
            }
        )
    result = price_signal(bars)
    if not result:
        raise ValueError("Not enough EOD history")
    result.update(
        symbol=symbol,
        fetched_at=now(),
        source=f"https://finance.yahoo.com/quote/{symbol}.NS/history/",
    )
    put("price:" + symbol, result)
    return result


async def announcements(days=7):
    local_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    start = (local_now - timedelta(days=days)).strftime("%d-%m-%Y")
    end = local_now.strftime("%d-%m-%Y")
    url = f"https://www.nseindia.com/api/corporate-announcements?index=equities&from_date={start}&to_date={end}"
    raw = json.loads(await fetch(url))
    events = []
    for a in raw:
        symbol = a.get("symbol", "")
        cat, priority, reason = classify(a.get("desc", ""), a.get("attchmntText", ""))
        try:
            dt = (
                datetime.strptime(a["an_dt"], "%d-%b-%Y %H:%M:%S")
                .replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
                .isoformat()
            )
        except (KeyError, ValueError):
            continue
        link = (
            a.get("attchmntFile")
            or "https://www.nseindia.com/companies-listing/corporate-filings-announcements"
        )
        events.append(
            {
                "id": uid(symbol + link),
                "symbol": symbol,
                "company": a.get("sm_name", symbol),
                "title": a.get("desc", "Exchange disclosure"),
                "summary": a.get("attchmntText", ""),
                "published_at": dt,
                "fetched_at": now(),
                "category": cat,
                "priority": priority,
                "reason": reason,
                "url": link,
                "exchange": "NSE",
            }
        )
    prior = {e["id"]: e for e in get("events", [])}
    prior.update({e["id"]: e for e in events})
    merged = sorted(prior.values(), key=lambda e: e["published_at"], reverse=True)
    put("events", merged[:15000])
    return len(events)


async def discover(symbol):
    symbol = ticker(symbol)
    html = await fetch(f"https://www.screener.in/company/{symbol}/consolidated/")
    soup = BeautifulSoup(html, "html.parser")
    name = soup.select_one("h1")
    docs = []
    for selector, kind, limit in [
        (".annual-reports li", "annual_report", 1),
        (".concalls li", "transcript", 5),
    ]:
        for li in soup.select(selector)[:limit]:
            if kind == "transcript":
                a = next(
                    (x for x in li.select("a[href]") if x.get_text(strip=True) == "Transcript"),
                    None,
                )
            else:
                a = li.select_one("a[href]")
            if not a:
                continue
            title = li.get_text(" ", strip=True).split("AI Summary")[0].strip()
            docs.append(
                {
                    "id": uid(a["href"]),
                    "url": a["href"],
                    "kind": kind,
                    "title": title[:120],
                    "symbol": symbol,
                }
            )
    if not docs:
        raise ValueError("No annual reports or transcripts found for this symbol.")
    result = {
        "symbol": symbol,
        "name": name.get_text(strip=True) if name else symbol,
        "documents": docs,
        "discovered_at": now(),
    }
    put("discovery:" + symbol, result)
    return result


async def document(doc):
    cached = get("doc:" + doc["id"])
    if cached and (doc["kind"] != "results" or cached.get("layout_version") == 2):
        return cached
    b = await fetch(doc["url"], True)
    if not b.startswith(b"%PDF"):
        raise ValueError("Source did not return a readable PDF")

    def parse():
        with fitz.open(stream=b, filetype="pdf") as pdf:
            return [
                {"page": i + 1, "text": p.get_text(sort=doc["kind"] == "results")[:35000]}
                for i, p in enumerate(pdf)
                if p.get_text().strip()
            ]

    pages = await asyncio.to_thread(parse)
    if not pages:
        raise ValueError("Scanned document needs OCR, which is outside this prototype.")
    output = {
        **doc,
        "pages": pages,
        "page_count": len(pages),
        "fetched_at": now(),
        "layout_version": 2,
        "hash": __import__("hashlib").sha256(b).hexdigest(),
    }
    put("doc:" + doc["id"], output)
    return output


async def refresh():
    status = {"started_at": now(), "errors": [], "prices": 0, "announcements": 0}

    async def one(s):
        try:
            await prices(s)
            status["prices"] += 1
        except Exception as e:
            status["errors"].append({"source": "price", "symbol": s, "error": str(e)[:180]})

    await asyncio.gather(*(one(x[0]) for x in PORTFOLIO))
    try:
        status["announcements"] = await announcements()
    except Exception as e:
        status["errors"].append({"source": "NSE", "error": str(e)[:180]})
    status["finished_at"] = now()
    put("refresh", status)
    return status
