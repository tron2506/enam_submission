from datetime import datetime, timedelta, timezone
from backend.core import classify, price_signal, percent, ticker, put, get, alerts, DEFAULT_SETTINGS


def test_publication_is_not_results():
    assert classify("Newspaper publication", "Financial results for the quarter")[1] == "routine"
    assert (
        classify("Financial Results", "Unaudited standalone and consolidated financial results")[0]
        == "results"
    )


def test_unknown_is_retained_for_review():
    assert classify("Unexpected disclosure")[1] == "medium"
    assert classify("Auditor resignation")[1] == "high"


def test_volume_excludes_current_session():
    bars = [{"date": str(i), "close": 100, "volume": 100} for i in range(20)]
    bars.append({"date": "20", "close": 105, "volume": 300})
    p = price_signal(bars)
    assert p["volume_ratio"] == 3
    assert p["change"] == 5
    assert p["baseline_sessions"] == 20


def test_insufficient_history_and_splits():
    bars = [
        {"date": "1", "close": 100, "volume": 100},
        {"date": "2", "close": 50, "volume": 200, "split": True},
    ]
    assert price_signal(bars)["volume_ratio"] is None
    assert price_signal(bars)["corporate_action"]


def test_negative_and_zero_base_not_misrepresented():
    assert percent(100, 0) is None
    assert percent(10, -10) is None
    assert percent(110, 100) == 10


def test_ticker_validation():
    import pytest

    assert ticker(" infy.ns ") == "INFY"
    with pytest.raises(ValueError):
        ticker("../../etc/passwd")


def test_alerts_follow_settings(tmp_path, monkeypatch):
    import backend.core as core

    monkeypatch.setattr(core, "DATA", tmp_path)
    put(
        "price:INFY",
        {
            "close": 100,
            "change": 5,
            "volume_ratio": 3,
            "date": "2026-11-13",
            "corporate_action": False,
        },
    )
    put("events", [])
    settings = {
        **DEFAULT_SETTINGS,
        "symbols": ["INFY"],
        "price_threshold": 6,
        "volume_threshold": 4,
    }
    assert alerts(settings) == []
    settings["price_threshold"] = 4
    assert len(alerts(settings)) == 1


def test_citations_reject_fabricated_ids():
    import pytest
    from backend.research import validate_citations

    with pytest.raises(ValueError):
        validate_citations(
            {"snapshot": [{"text": "Unsupported", "evidence": ["invented"]}]}, [{"id": "real"}]
        )
    assert validate_citations(
        {"snapshot": [{"text": "Supported", "evidence": ["real"]}]}, [{"id": "real"}]
    )


def test_results_reject_wrong_period_and_half_year():
    from backend.core import finalize_results

    raw = {
        "current_period_end": "2026-09-30",
        "previous_quarter_end": "2026-03-31",
        "year_ago_end": "2025-09-30",
        "metrics": [
            {
                "name": "Revenue",
                "current": 100,
                "previous_quarter": 90,
                "year_ago": 180,
                "evidence": ["p1"],
                "note": "Year-ago number is half-year, not a single quarter.",
            }
        ],
    }
    m = finalize_results(raw, [{"id": "p1"}])["metrics"][0]
    assert m["previous_quarter"] is None
    assert m["year_ago"] is None
    assert m["qoq"] is None and m["yoy"] is None


def test_results_comparable_quarters_calculate_in_code():
    from backend.core import finalize_results

    raw = {
        "current_period_end": "2026-03-31",
        "previous_quarter_end": "2025-12-31",
        "year_ago_end": "2025-03-31",
        "metrics": [
            {
                "name": "Revenue",
                "current": 110,
                "previous_quarter": 100,
                "year_ago": 100,
                "evidence": ["p1"],
                "note": "Consolidated quarterly revenue.",
            }
        ],
    }
    m = finalize_results(raw, [{"id": "p1"}])["metrics"][0]
    assert m["qoq"] == 10 and m["yoy"] == 10


def test_annual_target_not_judged_from_interim_quarter():
    from backend.core import enforce_comparison_timing
    from datetime import date

    c = {
        "assessment": "mixed",
        "guidance_kind": "explicit_quantitative",
        "promise_date": "2026-07-15",
        "target_end_date": "2027-03-31",
        "outcome_end_date": "2026-09-30",
    }
    assert enforce_comparison_timing(c, date(2026, 11, 15))["assessment"] == "not_yet_due"
    c = {
        "assessment": "met",
        "guidance_kind": "explicit_quantitative",
        "promise_date": "2025-04-01",
        "target_end_date": "2026-03-31",
        "outcome_end_date": "2025-09-30",
    }
    assert enforce_comparison_timing(c, date(2026, 11, 15))["assessment"] == "insufficient_evidence"
