"""FINN's deterministic calculations, prioritization, and durable state."""

import hashlib
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=False)
DATA = Path(os.getenv("FINN_DATA_DIR", str(ROOT / "data")))
DATA.mkdir(parents=True, exist_ok=True)
# Market caps are the owner's supplied snapshot in INR crore, not live quotes.
COMPANIES = [
    ("RELIANCE", "Reliance Industries Ltd", "Energy", 1812818.89),
    ("BHARTIARTL", "Bharti Airtel Ltd", "Telecom", 1314499.14),
    ("JPL", "Jio Platforms Ltd", "Telecom", 1290093.13),
    ("HDFCBANK", "HDFC Bank Ltd", "Banking", 1239299.80),
    ("ICICIBANK", "ICICI Bank Ltd", "Banking", 1137500.21),
    ("SBIN", "State Bank of India (SBI)", "Banking", 997384.35),
    ("TCS", "Tata Consultancy Services Ltd (TCS)", "Technology", 871959.09),
    ("BAJFINANCE", "Bajaj Finance Ltd", "Financial services", 694318.73),
    ("LT", "Larsen & Toubro Ltd (L&T)", "Industrials", 569491.67),
    ("LICI", "Life Insurance Corporation of India (LIC)", "Insurance", 505746.82),
    ("NSE", "National Stock Exchange of India Ltd (NSE)", "Financial services", 492537.38),
    ("KOTAKBANK", "Kotak Mahindra Bank Ltd", "Banking", 485058.69),
    ("HINDUNILVR", "Hindustan Unilever Ltd (HUL)", "Consumer", 466393.87),
    ("INFY", "Infosys Ltd", "Technology", 462645.31),
    ("SUNPHARMA", "Sun Pharmaceutical Industries Ltd", "Healthcare", 451280.28),
    ("ADANIPORTS", "Adani Ports and Special Economic Zone Ltd", "Industrials", 438708.37),
    ("TITAN", "Titan Company Ltd", "Consumer", 430611.80),
    ("AXISBANK", "Axis Bank Ltd", "Banking", None),
]
PORTFOLIO = [(s, n, sector) for s, n, sector, _ in COMPANIES]
CATALOG = {
    s: {"symbol": s, "name": n, "sector": sector, "market_cap_cr": cap,
        "market_cap_source": "User-supplied snapshot" if cap is not None else None,
        "price_supported": s != "NSE"}
    for s, n, sector, cap in COMPANIES
}


def company(symbol):
    return CATALOG.get(symbol) or get("company:" + symbol) or {
        "symbol": symbol, "name": symbol, "sector": "Other", "price_supported": True,
    }


def selected_companies():
    return [company(s) for s in get("settings", DEFAULT_SETTINGS)["symbols"]]



def now():
    return datetime.now(timezone.utc).isoformat()


def uid(value):
    return hashlib.sha256(value.encode()).hexdigest()[:24]


@contextmanager
def connect():
    c = sqlite3.connect(DATA / "finn.db", timeout=30)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def put(key, value):
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO kv VALUES (?,?)", (key, json.dumps(value)))


def get(key, default=None):
    with connect() as c:
        row = c.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
    return json.loads(row[0]) if row else default


def keys(prefix):
    with connect() as c:
        rows = c.execute("SELECT key,value FROM kv WHERE key LIKE ?", (prefix + "%",)).fetchall()
    return {k: json.loads(v) for k, v in rows}


def ticker(value):
    value = value.upper().strip().removesuffix(".NS")
    if not re.fullmatch(r"[A-Z0-9&-]{1,24}", value):
        raise ValueError("Enter a valid NSE symbol, for example INFY.")
    return value


def classify(title, text=""):
    s = (title + " " + text).lower()
    rules = [
        (
            "management_change",
            r"resign|appointment.*(?:chief|director|ceo|cfo)|change.*(?:management|director)|cessation",
            "high",
            "Leadership changes can affect execution and governance.",
        ),
        (
            "litigation",
            r"litigation|penalty|fraud|default|insolvency|regulatory order|auditor.*(?:resign|qualif)",
            "high",
            "A legal or governance development warrants review.",
        ),
        (
            "M&A",
            r"acquisition|merger|demerger|joint venture|amalgamation",
            "high",
            "The transaction may change the business or capital allocation.",
        ),
        (
            "fund_raise",
            r"fund rais|preferential|allotment.*(?:qip|rights)|buyback|rights issue|qualified institution",
            "high",
            "Capital structure or ownership may change.",
        ),
        (
            "results",
            r"financial result|quarterly result|audited result|unaudited result",
            "high",
            "New reported performance is available.",
        ),
        (
            "credit_rating",
            r"credit rat|rating.*(?:upgrade|downgrade|reaffirm)",
            "medium",
            "Credit quality and funding costs may be affected.",
        ),
        (
            "capex",
            r"capacity expansion|capital expenditure|new plant",
            "medium",
            "Capacity investment affects growth and future cash needs.",
        ),
        ("dividend", r"dividend", "medium", "A distribution may affect portfolio cash flows."),
        (
            "bonus_split",
            r"bonus|stock split|sub.division",
            "medium",
            "A corporate action changes the share count.",
        ),
        (
            "pledging",
            r"pledge|encumbrance",
            "medium",
            "Promoter financing can affect ownership risk.",
        ),
        (
            "earnings_call",
            r"transcript|earnings call|conference call",
            "medium",
            "Management commentary may add context to the numbers.",
        ),
        (
            "investor_meetings",
            r"investor meet|analyst.*meet|investor conference",
            "routine",
            "A scheduled investor interaction; no new material facts established.",
        ),
        (
            "agm_egm",
            r"annual general|extraordinary general",
            "routine",
            "Shareholder meeting paperwork.",
        ),
        ("postal_ballot", r"postal ballot", "routine", "Shareholder voting paperwork."),
        (
            "press_release",
            r"press release|order win|contract|product launch",
            "medium",
            "A business update may affect the operating outlook.",
        ),
    ]
    # Notices and advertisements do not constitute the actual results.
    if re.search(
        r"newspaper|publication|board meeting.*(?:intimation|notice)|intimation.*board meeting", s
    ):
        return (
            "unclassified",
            "routine",
            "A publication or meeting notice; inspect the filing for any substantive update.",
        )
    for cat, pattern, priority, reason in rules:
        if re.search(pattern, s):
            return cat, priority, reason
    return (
        "unclassified",
        "medium",
        "Unclassified disclosure: retained for review rather than assumed immaterial.",
    )


def percent(current, previous):
    if current is None or previous is None or previous <= 0:
        return None
    return round((current - previous) / previous * 100, 2)


def price_signal(bars):
    valid = [x for x in bars if x.get("close") is not None and x.get("volume") is not None]
    if len(valid) < 2:
        return None
    last, previous = valid[-1], valid[-2]
    history = valid[-21:-1]
    avg = sum(x["volume"] for x in history) / len(history)
    change = percent(last["close"], previous["close"])
    split = any(x.get("split", False) for x in valid[-21:])
    return {
        "close": round(last["close"], 2),
        "change": change,
        "volume": last["volume"],
        "volume_ratio": (
            round(last["volume"] / avg, 2) if avg and len(history) == 20 and not split else None
        ),
        "baseline_sessions": len(history),
        "date": last["date"],
        "bars": valid[-45:],
        "corporate_action": split,
    }


DEFAULT_SETTINGS = {
    "price_threshold": 4.0,
    "volume_threshold": 2.0,
    "categories": [
        "results",
        "management_change",
        "M&A",
        "litigation",
        "fund_raise",
        "credit_rating",
        "capex",
    ],
    "symbols": [x[0] for x in PORTFOLIO],
}


def alerts(settings=None):
    settings = settings or get("settings", DEFAULT_SETTINGS)
    output = []
    for symbol in settings["symbols"]:
        p = get("price:" + symbol)
        if not p:
            continue
        reasons = []
        if (
            not p.get("corporate_action")
            and p["change"] is not None
            and abs(p["change"]) >= settings["price_threshold"]
        ):
            reasons.append(f"{p['change']:+.2f}% daily move")
        if p["volume_ratio"] is not None and p["volume_ratio"] >= settings["volume_threshold"]:
            reasons.append(f"{p['volume_ratio']:.2f}× preceding 20-session volume")
        if reasons:
            output.append(
                {
                    "id": uid(symbol + p["date"]),
                    "symbol": symbol,
                    "title": " · ".join(reasons),
                    "kind": "market",
                    "date": p["date"],
                    "reason": "Your configured end-of-day threshold was crossed.",
                }
            )
    for e in get("events", []):
        if (
            e["symbol"] in settings["symbols"]
            and e["category"] in settings["categories"]
            and e["priority"] != "routine"
        ):
            output.append(
                {
                    "id": e["id"],
                    "symbol": e["symbol"],
                    "title": e["title"],
                    "date": e["published_at"],
                    "kind": "filing",
                    "reason": e["reason"],
                    "url": e["url"],
                }
            )
    return sorted(output, key=lambda a: a["date"], reverse=True)


def finalize_results(raw, evidence):
    """Only calculate comparisons for the same three-month reporting periods."""
    from datetime import date
    from calendar import monthrange

    current = date.fromisoformat(raw["current_period_end"])
    total = current.year * 12 + current.month - 1 - 3
    expected_prev = date(
        total // 12, total % 12 + 1, monthrange(total // 12, total % 12 + 1)[1]
    ).isoformat()
    expected_yoy = date(
        current.year - 1, current.month, monthrange(current.year - 1, current.month)[1]
    ).isoformat()
    allowed = {x["id"] for x in evidence}
    for m in raw.get("metrics", []):
        if raw.get("previous_quarter_end") != expected_prev:
            m["previous_quarter"] = None
        if raw.get("year_ago_end") != expected_yoy:
            m["year_ago"] = None
        if re.search(r"half.year|not.*comparab|not a single quarter", m.get("note", ""), re.I):
            m["year_ago"] = None
        if any(e not in allowed for e in m.get("evidence", [])):
            raise ValueError("Unsupported results citation")
        for k in ["current", "previous_quarter", "year_ago"]:
            if m.get(k) is not None and (
                not isinstance(m[k], (float, int)) or not m.get("evidence")
            ):
                raise ValueError("Invalid financial value or missing citation")
        m["qoq"] = percent(m.get("current"), m.get("previous_quarter"))
        m["yoy"] = percent(m.get("current"), m.get("year_ago"))
    return raw


def enforce_comparison_timing(comparison, as_of=None):
    """A future target cannot be scored against an interim reported outcome."""
    from datetime import date

    as_of = as_of or datetime.now(timezone.utc).date()
    c = comparison

    def parsed(key):
        try:
            return date.fromisoformat(c.get(key) or "")
        except ValueError:
            return None

    target = parsed("target_end_date")
    outcome = parsed("outcome_end_date")
    promise = parsed("promise_date")
    if c.get("guidance_kind") == "explicit_timeline" and not re.search(
        r"commenc|trial|production|launch|commission|operational|complet|start|finish|capacity|capex|facility|project|plant|exit.*margin",
        c.get("promise", ""),
        re.I,
    ):
        c["guidance_kind"] = "qualitative_outlook"
    if c.get("guidance_kind") in ("qualitative_outlook", "aspiration"):
        c["assessment"] = "not_comparable"
    elif target and target > as_of:
        c["assessment"] = "not_yet_due"
    elif c["assessment"] in ("met", "missed", "mixed"):
        if not target or not outcome or outcome < target:
            c["assessment"] = "insufficient_evidence"
        elif promise and promise > target:
            c["assessment"] = "not_comparable"
    return c


def reserve_model_call(limit: int):
    """Count attempts atomically before network I/O, including failed requests."""
    key = "model_attempts:" + now()[:10]
    with connect() as c:
        c.execute("BEGIN IMMEDIATE")
        row = c.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
        count = json.loads(row[0]) if row else 0
        if count >= limit:
            raise ValueError("Daily model-call budget reached. Cached research remains available.")
        c.execute("INSERT OR REPLACE INTO kv VALUES (?,?)", (key, json.dumps(count + 1)))
    return count + 1
