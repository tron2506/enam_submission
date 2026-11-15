import asyncio
import pytest
from fastapi.testclient import TestClient
from backend import core, sources
from backend.app import app, write_windows


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(core, "DATA", tmp_path)
    monkeypatch.setenv("FINN_AUTO_REFRESH", "false")
    write_windows.clear()
    from pathlib import Path
    from backend.bootstrap import seed_if_empty
    seed_if_empty(Path(__file__).resolve().parents[1] / "frontend/public/snapshot.json")
    with TestClient(app) as client:
        yield client


def test_requested_defaults(client):
    companies = client.get("/api/overview").json()["companies"]
    assert len(companies) == 18
    assert [c["symbol"] for c in companies] == [
        "RELIANCE", "BHARTIARTL", "JPL", "HDFCBANK", "ICICIBANK", "SBIN",
        "TCS", "BAJFINANCE", "LT", "LICI", "NSE", "KOTAKBANK", "HINDUNILVR",
        "INFY", "SUNPHARMA", "ADANIPORTS", "TITAN", "AXISBANK",
    ]
    assert companies[0]["market_cap_cr"] == 1812818.89
    assert companies[-1]["market_cap_cr"] > 0
    assert companies[-1]["market_cap_source"] == "Screener"
    assert companies[10]["exchange"] == "BSE"
    assert companies[10]["price"]["bars"]


def test_replace_persists_order_and_drives_feeds(client, monkeypatch):
    async def price(symbol):
        data = {"symbol": symbol, "name": "Maruti Suzuki India Ltd", "close": 123,
                "change": 5, "date": core.now(), "volume_ratio": 1, "bars": []}
        core.put("price:" + symbol, data)
        return data
    monkeypatch.setattr(sources, "prices", price)
    before = client.get("/api/overview").json()
    response = client.post("/api/watchlist/replace", json={"old_symbol":"JPL", "new_symbol":" maruti.ns "})
    assert response.status_code == 200
    after = client.get("/api/overview").json()
    assert len(after["companies"]) == 18
    assert after["companies"][2]["symbol"] == "MARUTI"
    assert after["companies"][2]["name"] == "Maruti Suzuki India Ltd"
    assert "market_cap_cr" not in after["companies"][2]
    assert after["companies"][:2] == before["companies"][:2]
    assert after["settings"]["symbols"][2] == "MARUTI"
    assert any(a["symbol"] == "MARUTI" for a in client.get("/api/alerts").json()["items"])
    core.put("events", [{"id":s,"symbol":s,"published_at":core.now()} for s in ["JPL", "MARUTI"]])
    assert [e["symbol"] for e in client.get("/api/events").json()] == ["MARUTI"]
    called = []
    async def refresh_price(symbol):
        called.append(symbol)
    async def announcements():
        return 0
    async def market_cap(symbol):
        return {}
    monkeypatch.setattr(sources, "market_cap", market_cap)
    monkeypatch.setattr(sources, "prices", refresh_price)
    monkeypatch.setattr(sources, "announcements", announcements)
    asyncio.run(sources.refresh())
    assert "MARUTI" in called and "JPL" not in called and "NSE" in called


def test_invalid_duplicate_and_failed_source_preserve_watchlist(client, monkeypatch):
    before = core.get("settings", core.DEFAULT_SETTINGS)
    for old, new, code in [("JPL","INFY",400),("JPL","INVALID!",400),("MISSING","MARUTI",409)]:
        assert client.post("/api/watchlist/replace",json={"old_symbol":old,"new_symbol":new}).status_code == code
    async def unavailable(symbol):
        raise ValueError("Unavailable")
    monkeypatch.setattr(sources,"prices",unavailable)
    assert client.post("/api/watchlist/replace",json={"old_symbol":"JPL","new_symbol":"MARUTI"}).status_code == 400
    assert core.get("settings",core.DEFAULT_SETTINGS) == before
