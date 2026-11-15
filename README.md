# FINN — Investor Desk

FINN is a web application for tracking Indian companies, reviewing exchange disclosures, and researching company performance using annual reports and earnings-call transcripts. It combines a configurable 18-company watchlist with financial charts and AI-assisted research linked to source documents.

## What the project does

- **Watchlist:** tracks 18 default companies and lets you replace any company with another supported equity ticker.
- **Market overview:** displays completed-session closing prices, price and volume charts, daily price changes, and market-cap comparisons.
- **Company disclosures:** groups exchange filings by category and priority, with links to the original documents and an expandable section for routine updates.
- **Research:** searches companies by name or ticker, suggests watchlist matches, summarizes the business and financials, and compares management guidance with reported outcomes.
- **Results analysis:** extracts reported financial metrics and calculates quarter-on-quarter and year-on-year changes when the reporting periods are comparable.
- **Evidence and follow-up questions:** links research claims to document excerpts and PDF pages, and supports questions about the available evidence.
- **Alerts and saved filings:** flags configured price changes, unusual trading volume, and selected disclosure categories; lets you bookmark filings for later review.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, CSS, Lucide icons, and SVG charts |
| Backend | Python 3.12, FastAPI, Uvicorn, and Pydantic |
| Storage | SQLite for settings, cached prices, filings, and research; browser local storage for bookmarks |
| Document processing | PyMuPDF for PDF text extraction, Beautiful Soup for document discovery, and HTTPX for source/API requests |
| LLM | GLM through Hyde Inference; default model: `hyde/glm-5.3-flash` |
| Deployment | Docker container hosted as a Render web service |

Prices come from Yahoo Finance, exchange disclosures from NSE, and report/transcript links are discovered through Screener. Research uses the underlying company documents. Most market caps use the supplied watchlist snapshot; Axis Bank's value is fetched from Screener and includes its source and retrieval date.

## How to use FINN

### 1. Review your watchlist

Open **Today** to see the market overview and company table. Select a company in the chart selector to inspect its closing-price history and trading volume. The daily-moves chart compares companies with data for the same trading session.

To change a company, click **Replace** beside its row, enter the replacement's NSE ticker, and confirm. FINN verifies the price feed before saving the replacement. The new company takes the same slot and is included in subsequent price, filing, and alert checks. Duplicate or unverifiable tickers leave the watchlist unchanged.

### 2. Read disclosures

Below the watchlist, choose a date window and filter filings by company or category. Open a filing to inspect its details and original exchange document. For a results filing, select **Analyze results filing** to extract its financial metrics and comparisons. Use the bookmark button to save a filing, then find it under **Saved**.

### 3. Research a company

Open **Research** and type a company name or ticker—for example, `Jio`, `Axis Bank`, or `TCS`. Choose a suggestion with the mouse or arrow keys and Enter. A unique name match also resolves directly when you press Enter; `Jio` opens `JPL`.

**Open company** loads existing research when available. If no cached research exists, select **Research** to generate it. The analysis shows the business, financial observations, management guidance versus outcomes, items to watch, and evidence limitations. Click a source badge to inspect the excerpt or open its original PDF page. Use the follow-up question field to ask about the available evidence.

### 4. Configure alerts

Open **Watchlist & settings**, choose your daily price-change threshold, volume multiplier, and disclosure categories, then save. Review matching items under **Alerts** and mark them as read. **Refresh sources** requests new prices and filings; the deployed configuration also polls periodically while the service is running.

## LLM API key and configuration

The default setup uses a **Hyde Inference API key**, stored in the server environment as:

```text
HYDE_INFERENCE_API_KEY=your-hyde-api-key
```

The configured model is `hyde/glm-5.3-flash`, accessed through `https://inference.hyde.tech/v1`. Your Hyde account must have access to that model. A key is required for new research, results extraction, and follow-up answers; viewing cached research does not require a new model call.

| Environment variable | Purpose / default |
| --- | --- |
| `HYDE_INFERENCE_API_KEY` | Your private Hyde Inference API key |
| `LLM_MODEL` | `hyde/glm-5.3-flash` |
| `LLM_BASE_URL` | `https://inference.hyde.tech/v1` |
| `FINN_AUTO_REFRESH` | `true` in the supplied deployment |
| `FINN_POLL_SECONDS` | `900` seconds between source refreshes |
| `FINN_DAILY_MODEL_CALL_LIMIT` | `60` model attempts per UTC day, including failed attempts |
| `PORT` | `10000` in the Render Blueprint |
| `FINN_DATA_DIR` | `/app/data` inside the container |

The backend also supports Google Gemini as an alternative: set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (default `gemini-2.5-flash`) without setting a Hyde key. Hyde takes precedence when both are configured; Gemini is not an automatic fallback after a Hyde request fails.

Add secrets through **Render → Service → Environment**. Never commit the real key or `.env` to GitHub, put it in the Dockerfile, or use a `NEXT_PUBLIC_*` variable for it. The Python backend reads the key at runtime; it is not included in the frontend. `.env.example` documents the available settings without credentials.

## Deployment on Render

The supplied Dockerfile builds the Next.js frontend into static files and runs the FastAPI backend with Uvicorn. FastAPI serves both the frontend and `/api` routes from one HTTPS address. After deployment, the application runs entirely on Render and does not depend on your computer.

1. Upload the project source to a GitHub repository. Keep `Dockerfile`, `render.yaml`, `backend/`, and `frontend/` at the repository root. Include `frontend/public/snapshot.json`, which supplies dated starter data. Do not upload `.env`, dependencies, caches, or local databases. Git respects `.gitignore`; GitHub's browser upload requires you to exclude these files manually.
2. Sign in to Render, choose **New → Blueprint**, and connect the repository and deployment branch.
3. Select the root `render.yaml`. It defines a Docker web service using the Free plan and `/api/health` as the health-check path.
4. Enter your `HYDE_INFERENCE_API_KEY` when prompted. For an existing service, add or update it under **Environment**, then save and deploy.
5. Start deployment and wait for the service to report **Live**. Docker handles dependency installation, the frontend build, and backend startup; separate build/start commands are unnecessary.
6. Open the generated `https://…onrender.com` URL. Check `/api/health` for `status: "ok"` and `model_configured: true`. The latter confirms a key is present; a successful research request or follow-up answer verifies provider access.
7. Check source-refresh results and open a chart and cited research example. Submit the Render application URL as the hosted app link.

For later updates, push changes to the connected branch and deploy the latest commit through Render, or use automatic deployment if enabled. Manage API keys in Render's Environment settings.

## Limitations

- **End-of-day data:** prices and alerts use completed trading sessions, not real-time quotes. Market-cap snapshots are not continuously updated valuations.
- **Source coverage:** exchange sites and data providers can reject requests, restrict cloud IPs, or return incomplete history. Jio's provider currently supplies only one completed-session quote, so FINN shows its price but cannot draw a history chart. NSE Ltd uses its BSE price feed; the announcement feed remains NSE-based and does not provide equivalent BSE filing coverage.
- **Document availability:** research depends on accessible reports and transcripts. Scanned PDFs requiring OCR are not supported. Missing financial values and unsupported comparisons remain unavailable.
- **AI accuracy and quotas:** generated analysis can contain errors and should be checked against its citations. Provider access, quotas, and FINN's daily model-attempt limit can prevent new analysis. One analysis can require multiple model calls.
- **Free hosting:** an idle Render Free service can sleep. Opening its URL triggers a wake-up, which can delay the first response. Background polling and alerts do not run while it sleeps.
- **Ephemeral storage:** the deployment uses local SQLite storage. If the host discards that storage, new settings, replacements, and generated research are lost. Startup restores bundled dated data, not subsequent user changes. Durable storage is not configured.
- **Shared workspace:** there is no user authentication or separate account storage. Visitors share server-side watchlist settings and research. Bookmarks are stored only in the browser that created them.
- **Cached data:** starter research retains its original dates and is not automatically regenerated at startup. Cached content may remain visible when live sources are unavailable.
- **Investment decisions:** FINN is a research aid, not investment advice or a trading system.
