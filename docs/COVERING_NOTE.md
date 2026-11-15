Subject: FINN — AI Engineer Build Challenge submission

Hello ENAM team,

I built FINN as a mobile-first investment desk around two questions: what changed that deserves attention, and is management delivering what it said?

The portfolio inbox monitors 18 NSE-listed companies, prioritizes material filings, collapses routine paperwork, and supports configurable price, volume, and announcement alerts. Results filings can be opened for a source-linked first cut of Revenue, EBITDA, PBT, and PAT, with comparable QoQ/YoY changes where the evidence supports them.

The research view reads annual reports and earnings-call transcripts, gives concise business and financial context, and compares management statements with outcomes. Every claim opens its primary-source excerpt and PDF page. I focused on honest comparisons: annual guidance still in progress is not yet due, qualitative aspirations are not scored as a quantitative promise, and absent evidence remains a visible gap. The engine also handled PERSISTENT, outside the prepared portfolio, through the same pipeline.

I used Next.js/TypeScript and Python/FastAPI, SQLite caching, deterministic financial calculations, and existing GLM API access through Hyde. Rules handle prioritization and thresholds; the model handles extraction, synthesis, and a second evidence review. Model usage is logged, and there is no automatic paid-provider fallback.

A useful failure shaped the implementation: a first results extraction confused a half-year comparator with a quarter. I added layout-preserving PDF text, a review pass, and reporting-date checks before calculating percentage changes. The repository records this limitation and the corrected example rather than claiming universal extraction accuracy.

I deliberately left out native apps, voice, trading, intraday prices, broad OCR, and a comprehensive financial dashboard. The next steps would be durable scheduled ingestion, stronger structured financial extraction, broader labeled evaluation, and additional cash-quality analysis.

Prototype: [add your deployed cloud HTTPS URL after verification]
GitHub: [add your repository URL]

The repository includes reproducible setup, a Docker deployment, a documented real-data replay, validation results, and known limitations. The frontend and Python backend are deployed together in one cloud service. Prepared research retains its original dates; new analysis reads current available sources.

Best,
[Your name]
