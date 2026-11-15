import asyncio
from backend.research import run_research


async def run(s):
    try:
        r = await run_research(s, lambda p: print(s, p, flush=True))
        print("COMPLETE", s, len(r["comparisons"]), "comparisons", flush=True)
    except Exception as e:
        print("ERROR", s, type(e).__name__, str(e)[:250], flush=True)


async def main():
    await asyncio.gather(*(run(s) for s in ["INFY", "TCS", "DIXON"]))


if __name__ == "__main__":
    asyncio.run(main())
