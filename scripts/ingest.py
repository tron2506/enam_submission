import asyncio, json
from backend.sources import refresh

if __name__ == "__main__":
    print(json.dumps(asyncio.run(refresh()), indent=2))
