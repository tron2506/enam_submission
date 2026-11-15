# Code and cloud-deployment review — 15 November 2026

## Fixed in this revision

| Finding | Change |
| --- | --- |
| Previous deployed frontend depended on a tunnel to the author's computer | Frontend now requests `/api` from its own origin. The single Docker service hosts both UI and Python. Production output was searched for old tunnel URLs: none found. |
| New cloud container had an empty database and none of the demonstrated research | Startup seeds public dated prices, filings, cited research and results from the bundled snapshot, only for missing records. Existing live data is preserved. UI explains starter-data provenance and refresh status. |
| Seeded research could not answer follow-ups without local raw-document caches | Follow-ups can use the cached primary excerpts. Fresh research still downloads available primary PDFs. |
| Host secret could be overridden by local dotenv loading | Host environment values take precedence; dotenv uses `override=False`. Configuration is loaded before the data directory is selected. |
| Daily model limit counted only successful calls and could race under concurrency | SQLite transaction reserves attempts before HTTP calls. Failed attempts count too. Budget concurrency has an explicit regression test. |
| SQLite connections were not explicitly closed | Context manager commits/rolls back and closes each connection. |
| Invalid ticker on some routes caused a 500 | Value errors return a 400 JSON response. API tests cover research lookup and settings. |
| Unhandled polling exceptions could permanently stop monitoring | Refresh loop logs errors and retries at the next scheduled interval; shutdown awaits cancelled tasks. |
| Exchange query window used the server timezone | Announcement windows now explicitly use India time. |
| Public writes had no request throttle | Per-client write limit added; active research job limit and global model budget remain in place. This is a shared demo, not authenticated multi-user isolation. |
| Docker context exclusions missed nested secrets and local artifacts | Recursive credential, metadata and artifact exclusions added. Git ignores expanded. No provider key is a build argument or frontend variable. |
| Deployment docs described an author-machine runtime as the submission | README now leads with Render cloud setup, secret injection, remaining verification, and real free-host constraints. Covering note requires a verified cloud URL. |

## Validation

- 16 automated tests passed, including five new deployment checks: empty-server bootstrap, no overwriting live data, concurrent model budget, invalid ticker responses, seeded follow-ups, and host-secret precedence (some are combined in one test).
- Optimized Next.js build and strict TypeScript passed.
- Production HTML/JavaScript contains no old Cloudflare tunnel URL.
- Render YAML parsed and the intended Free Docker settings were checked.
- Submission source checked for accidentally embedded local credential values; `.env` stays local and ignored.
- Docker is not installed in the execution environment. The Docker image itself has **not** been built or run here. The hosting build, memory use and outbound source access must be verified on the chosen platform.
- One installed-library deprecation warning is emitted by Starlette's test client; tests pass. It is not an application runtime failure.

## Remaining before submission

1. Commit this cleaned project folder to GitHub (user-managed); keep `.env` and ignored metadata out.
2. Create the Render service and provide the key in its Environment dashboard.
3. Let Render build the image, confirm `/api/health`, and test actual NSE/Yahoo/document/model access from the host. Public data sources may block datacenter IPs even when local requests worked.
4. Test the complete phone workflow with the author computer off, including a fresh ticker and an evidence link.
5. Add the final cloud and GitHub URLs/name to the covering note.

## Important limitations and follow-on improvements

- **Persistence and scheduling:** Free Render's local SQLite is ephemeral. Startup restores starter output; it does not recover newly changed settings or analyses. Sleeping hosts do not monitor in the background. Persistent PostgreSQL/object storage and an independent scheduler are the next infrastructure step.
- **Financial accuracy:** Citation existence is checked; citation entailment still depends on model review and human inspection. The financial schema is requested from the model but results extraction lacks a complete strongly typed validated financial-record model. Add broader real-document regression fixtures, robust table extraction and schema checks next.
- **Generality:** Discovery currently depends on Screener consolidated pages. Add standalone-page and company-IR fallbacks. Scanned PDFs require OCR. Not every company provides comparable quantitative quarterly guidance.
- **Document freshness:** Text is cached by URL-derived ID and content hash is stored, but same-URL document replacements are not periodically revalidated. Add ETag/Last-Modified or scheduled hash refresh.
- **Feed history:** The UI can filter wider windows than ingestion currently backfills (initial fetch is seven days). A 30-day selection means stored filings within 30 days, not complete 30-day exchange coverage. Add explicit coverage bounds/backfill.
- **Resources and security:** A small free instance can be constrained by concurrent large PDF parsing. Measure memory on the host. Shared settings, in-memory jobs, per-client throttle and local quotas are suitable for a single-user demo; production needs authentication, durable jobs and distributed limits. Existing URL checks do not completely prevent DNS-rebinding attacks.
- **Front-end structure:** The main page is large and uses generic record types. Split it into typed components when there is time; this is maintainability work, not required for first cloud deployment.

The earlier owner-private Sites preview is not the new cloud deployment. It should not be submitted as the complete live application until it is replaced by or connected to a verified hosted backend. No local tunnel is part of the revised deployment.
