"""Restore public, dated demo output on a new ephemeral host; never overwrite live data."""

import json
from pathlib import Path
from .core import ROOT, get, put


def seed_if_empty(path: Path | None = None):
    path = path or ROOT / "frontend" / "out" / "snapshot.json"
    if get("bootstrap") or not path.exists():
        return
    snapshot = json.loads(path.read_text())
    for company in snapshot["overview"]["companies"]:
        cap_key = "marketcap:" + company["symbol"]
        if company.get("market_cap_url") and get(cap_key) is None:
            put(cap_key, {k: v for k, v in company.items() if k.startswith("market_cap_")})
        key = "price:" + company["symbol"]
        if company.get("price") and get(key) is None:
            put(key, company["price"])
    if get("events") is None:
        put("events", snapshot["events"])
    for symbol, result in snapshot.get("research", {}).items():
        if get("research:" + symbol) is None:
            put("research:" + symbol, result)
    for event_id, result in snapshot.get("enrichments", {}).items():
        if get("enrichment:" + event_id) is None:
            put("enrichment:" + event_id, result)
    put("bootstrap", {"captured_at": snapshot["captured_at"], "source": "bundled public snapshot"})
