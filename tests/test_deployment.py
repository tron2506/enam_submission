import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend import core


@pytest.fixture
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(core, "DATA", tmp_path)
    monkeypatch.setenv("FINN_AUTO_REFRESH", "false")
    return tmp_path


def test_cold_start_restores_dated_research_without_overwriting(isolated):
    from backend.bootstrap import seed_if_empty

    source = Path(__file__).resolve().parents[1] / "frontend/public/snapshot.json"
    core.put("price:INFY", {"close": 123, "fetched_at": "newer"})
    seed_if_empty(source)
    assert core.get("price:INFY")["close"] == 123
    assert core.get("research:DIXON")["evidence"]
    assert core.get("bootstrap")["captured_at"] == json.loads(source.read_text())["captured_at"]
    core.put("research:DIXON", {"new": True})
    seed_if_empty(source)
    assert core.get("research:DIXON") == {"new": True}


def test_daily_attempt_budget_is_atomic(isolated):
    def reserve(_):
        try:
            core.reserve_model_call(5)
            return True
        except ValueError:
            return False

    with ThreadPoolExecutor(max_workers=8) as pool:
        assert sum(pool.map(reserve, range(20))) == 5
    assert core.get("model_attempts:" + core.now()[:10]) == 5


def test_invalid_tickers_return_client_errors(isolated):
    from backend.app import app

    with TestClient(app) as client:
        assert client.get("/api/research/INVALID!").status_code == 400
        response = client.put(
            "/api/settings", json={**core.DEFAULT_SETTINGS, "symbols": ["INVALID!"]}
        )
        assert response.status_code == 400
        assert client.get("/api/health").status_code == 200


def test_seeded_followup_uses_primary_excerpts(isolated, monkeypatch):
    from backend import research

    core.put(
        "research:INFY",
        {
            "evidence": [
                {
                    "id": "real",
                    "text": "A primary excerpt",
                    "url": "https://example.com/report.pdf",
                    "page": 1,
                }
            ]
        },
    )

    async def fake_generate(prompt, schema, budget):
        assert "A primary excerpt" in prompt
        return {
            "claims": [{"text": "Supported claim", "evidence": ["real"]}],
            "limitations": [],
        }, "test"

    monkeypatch.setattr(research, "generate", fake_generate)
    result = asyncio.run(research.answer("INFY", "What does the source say?"))
    assert result["claims"][0]["evidence"] == ["real"]


def test_hosted_secret_wins_over_local_dotenv(isolated, monkeypatch):
    from dotenv import load_dotenv

    monkeypatch.setenv("HYDE_INFERENCE_API_KEY", "hosted-test-placeholder")
    p = isolated / "environment"
    p.write_text("HYDE_INFERENCE_API_KEY=local-test-placeholder\n")
    load_dotenv(p, override=False)
    import os

    assert os.environ["HYDE_INFERENCE_API_KEY"] == "hosted-test-placeholder"
