"""Export dated real data; no credentials, fabricated events, or model fallback."""

import json
from pathlib import Path
from backend.app import overview, events, alert_list
from backend.core import keys, get, now

root = Path(__file__).resolve().parents[1]
p = root / "frontend" / "public"
p.mkdir(exist_ok=True)
r = {k.split(":", 1)[1]: v for k, v in keys("research:").items()}
e = {k.split(":", 1)[1]: v for k, v in keys("enrichment:").items()}
d = {
    "captured_at": now(),
    "overview": overview(),
    "events": events(30),
    "alerts": alert_list(),
    "research": r,
    "enrichments": e,
}
(p / "snapshot.json").write_text(json.dumps(d, ensure_ascii=False))
print(
    "Exported",
    len(d["events"]),
    "real portfolio filings,",
    len(r),
    "cited company analyses,",
    len(e),
    "results extractions.",
)
