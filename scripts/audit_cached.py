import asyncio, json
from backend.core import get, put, now, enforce_comparison_timing
from backend.research import Research, generate, validate_citations


async def audit(s):
    r = get("research:" + s)
    cited = {
        i
        for f in ["snapshot", "financials", "comparisons", "watch"]
        for c in r[f]
        for i in c["evidence"]
    }
    e = [e for e in r["evidence"] if e["id"] in cited]
    prompt = (
        "AS OF "
        + now()
        + ". Correct and date this research. Important: a full-year FY2027 target ends 2027-03-31 and is NOT YET DUE. H1 vs H2 is not assessable until both halves are reported. Never judge annual guidance against one interim quarter. Read fiscal years from evidence, do not use upload month as call date. Record actual promise_date, target_end_date and outcome_end_date in ISO format (null if uncertain) for every row. Revise verdict/rationale to match the timeframe. Limit comparisons to the 4 most useful, prioritizing completed explicit targets over open targets. Correct any limitations that incorrectly claim a supplied document is missing. Return the full Research object.\nDraft: "
        + json.dumps(
            {k: r[k] for k in ["snapshot", "financials", "comparisons", "watch", "limitations"]}
        )
        + "\nDocuments: "
        + json.dumps(r["documents"])
        + "\nEvidence: "
        + json.dumps(e)
    )
    raw, _ = await generate(prompt, Research.model_json_schema(), 6000)
    out = Research.model_validate(raw).model_dump()
    validate_citations(out, r["evidence"])
    for c in out["comparisons"]:
        enforce_comparison_timing(c)
    r.update(out)
    r["generated_at"] = now()
    put("research:" + s, r)
    print(
        s,
        [
            (c["assessment"], c["target_end_date"], c["outcome_end_date"])
            for c in out["comparisons"]
        ],
        flush=True,
    )


async def main():
    results = await asyncio.gather(
        *(audit(s) for s in ["INFY", "TCS", "DIXON", "PERSISTENT"]), return_exceptions=True
    )
    for r in results:
        if isinstance(r, Exception):
            print("ERROR", type(r).__name__, str(r)[:200])


if __name__ == "__main__":
    asyncio.run(main())
