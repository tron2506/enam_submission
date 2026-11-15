# FINN — Know what matters.

A responsive investor workspace with 18 default companies: price and volume charts, daily-move comparisons, prioritized filings, configurable alerts, results extraction, and company research grounded in annual reports and earnings-call transcripts.

The watchlist uses the supplied 18-company selection. Each row has a **Replace** control: enter an NSE equity ticker and confirm; the server verifies its price feed and replaces that slot in prices, filings, and alerts. Duplicate or unverifiable tickers leave the list unchanged. Market-cap bars use the owner-supplied snapshot in INR crore, not live valuations; Axis Bank’s missing value is fetched from Screener with a source link and retrieval date. Jio Platforms uses `JPL.NS`; NSE Ltd uses its BSE feed, `NSE.BO`. Price fetching retries the alternate Yahoo endpoint on transient failures. Research accepts company names (for example, Jio) and offers keyboard-accessible watchlist suggestions. Research assessments and extracted quarterly results also have graphical summaries, with source citations retained.

**Deployment status:** the source is prepared for a single cloud-hosted Docker service. A complete cloud deployment still needs your hosting account and API secret. The earlier Sites preview is a separate static deployment and is not the final full-stack submission. Do not submit the old tunnel links.

## Deploy online — recommended: Render Free

Both Next.js's exported frontend and the FastAPI backend run in the cloud container at one HTTPS URL. Your laptop is not involved after deployment. The browser calls `/api` on the same origin; no backend URL, tunnel, or CORS setup is needed.

1. Use this project folder directly as your repository root. Commit the source files with Git; the root `.gitignore` excludes `.env`, caches, dependencies, runtime databases, and generated output. `Dockerfile`, `render.yaml`, `backend/`, and `frontend/` must appear at the repository root. If uploading through the GitHub website, manually exclude `.env` and local hidden metadata—website uploads do not apply `.gitignore`.
2. Create a Render account and connect your GitHub repository.
3. Choose **New → Blueprint**, select the repository, and deploy `render.yaml`. It declares a **Free Docker web service** and prompts for `HYDE_INFERENCE_API_KEY`. Alternatively, create a Web Service manually, select Docker, repository root `.`, Dockerfile `./Dockerfile`, Free instance, and health path `/api/health`.
4. Add your real Hyde key in the **Render service → Environment** dashboard. Set the variable name to `HYDE_INFERENCE_API_KEY` and its value to your key. Save and deploy. Do not put the value in GitHub, `render.yaml`, the Dockerfile, or a `NEXT_PUBLIC_*` variable.
5. Wait for the cloud build and health check. Open the generated `https://…onrender.com` URL. Test it on your phone with your computer switched off.
6. Confirm `/api/health` reports `model_configured: true`, then run a new ticker analysis and a follow-up question. Check the reported source refresh errors; exchange sites may treat hosting IPs differently from a laptop.
7. Put the final Render URL and GitHub URL into `docs/COVERING_NOTE.md`.

[Render deployment limits](https://render.com/docs/free) · [Render environment variables and secrets](https://render.com/docs/configure-environment-variables)

### Secrets are supplied at runtime

The host injects the secret into the Python process. The backend reads `os.getenv('HYDE_INFERENCE_API_KEY')` and calls the model. The frontend only receives results. A local `.env` is optional for development, ignored by Git and Docker, and never overrides an existing host-provided variable.

| Variable | Where/value |
| --- | --- |
| `HYDE_INFERENCE_API_KEY` | Secret in the hosting dashboard; required for new GLM analysis |
| `LLM_MODEL` | `hyde/glm-5.3-flash`, or a model actually available to your account |
| `LLM_BASE_URL` | Defaults to `https://inference.hyde.tech/v1` |
| `FINN_AUTO_REFRESH` | `true` in the supplied deployment |
| `FINN_POLL_SECONDS` | `900` by default; checks run while the service is awake |
| `FINN_DAILY_MODEL_CALL_LIMIT` | `60` model attempts per UTC day, including failed attempts |
| `PORT` | Provided/configured by the host; Render Blueprint uses `10000` |
| `FINN_DATA_DIR` | `/app/data` in Docker; writable SQLite/cache directory |

Only variable names and nonsecret defaults belong in GitHub. `.env.example` contains placeholders. The API key is not needed during the frontend or Docker build. Provider access/quotas are separate from hosting; your existing Hyde access must allow requests from the hosted backend. There is no paid-model fallback.

## Free-host limitations

Render Free sleeps after 15 minutes without inbound traffic and can take about a minute to wake. Its filesystem is ephemeral, including SQLite. Startup restores bundled, dated public research, prices and filings when the database is empty, then attempts a live refresh. This restores the demo but **does not preserve new user settings or newly generated research across loss of the filesystem**. Original research/source dates remain visible. When a live feed has no events in the last 24 hours, that empty result is legitimate.

Background alerts cannot run while a free service sleeps. For durable settings and uninterrupted monitoring, a later iteration needs persistent database/storage and a scheduler that remains active. The current single-user demo shares portfolio settings across visitors. Write throttling, a three-job limit, and an atomic model-attempt budget bound abuse, but do not replace authentication or provider-side spending controls. The quota also resets when ephemeral storage is lost.

## Other platforms

- **Render Free is the recommended zero-subscription route** for this submission.
- **Koyeb** supports Docker and documents a Free instance, but also requires card verification and discusses paid plan charges in its signup FAQ. Confirm account eligibility before proceeding; do not assume a new account is entirely free. [Instances](https://www.koyeb.com/docs/reference/instances) · [Billing FAQ](https://www.koyeb.com/docs/faqs/pricing)
- **Hugging Face Docker Spaces** supports this architecture, but current documentation says creating a Docker/compute Space requires a paid plan even though CPU Basic has no hourly charge. This corrects the earlier recommendation: it is not a dependable zero-subscription choice for a new account. [Current requirements](https://huggingface.co/docs/hub/spaces-overview)
- A frontend-only static host cannot run this Python API and PDF pipeline. Use the single Docker service to keep the submission simple.

## Demonstration

1. Today → seven-day window → open a filing and its original exchange document. Routine notices remain expandable.
2. Open the cached Kaynes results analysis. It preserves consolidated scope, INR-million units and restated quarter comparators; unsupported EBITDA remains unavailable.
3. Research → DIXON → inspect the promises-versus-delivery rows and open the cited PDF page.
4. Research → TCS → see the distinction between qualitative aspirations and dated guidance.
5. Research another NSE symbol. INFY, TCS, DIXON and PERSISTENT have prepared output; the same pipeline handles other symbols with available primary documents.
6. Change an alert threshold and save. Price/volume alerts use EOD data; announcement alerts follow polling.

Cached results are useful immediately after a cloud restart. Follow-up questions can use the stored cited excerpts; a fresh analysis retrieves the full available documents. Cached research is not regenerated automatically just because the server restarts.

## Development and verification (optional)

Deployment builds everything on the host; these commands are only for contributors testing code.

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.lock.txt
npm ci --prefix frontend
npm run build --prefix frontend
.venv/bin/python -m pytest -q
npm run typecheck --prefix frontend
```

The optional `.env.example` can be copied to `.env` for local contributor testing. Model calls require a real server-side key; unit tests use isolated data and mocks. No local server is needed to keep a cloud deployment running.

Architecture: Next.js/React static export → same-origin FastAPI → SQLite, public source adapters, PDF parsing and GLM extraction/review. Source URLs, PDF pages and retrieval times accompany claims. Financial arithmetic and period eligibility run in code. Read [architecture](docs/ARCHITECTURE.md), [review findings](docs/REVIEW.md), [evaluation](docs/EVALUATION.md), and the [covering-note draft](docs/COVERING_NOTE.md).
