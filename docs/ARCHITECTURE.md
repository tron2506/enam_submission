# Architecture and product choices

## Product point of view

An investor's first question is which changes deserve attention. Today keeps filings reachable while separating substantive disclosures from meeting notices and newspaper advertisements. Every priority includes an explanation. Unknown disclosures remain visible for review rather than automatically disappearing.

The second question is whether management is delivering. Research starts from annual reports and transcripts, gives concise context, and puts promises next to outcomes. Sources open from the claim, with PDF page numbers and excerpt text. General optimism and long-term aspirations cannot receive a “met” or “missed” verdict merely because the next quarter grew. Research jobs are visible and cached company examples open immediately.

## Data, computation, and AI boundaries

- Yahoo's chart endpoint supplies EOD closes/volume; Indian symbols use `.NS`. A reusable adapter replaces a larger yfinance dependency for this prototype.
- NSE's announcement API supplies dates, titles, descriptions, and attachment links. The ID is a hash of ticker and filing URL; repeated ingestion is idempotent. Revisions at new URLs remain separate. **Cross-exchange semantic deduplication is not implemented**: only NSE is ingested, which meets the brief's NSE/BSE source choice.
- Screener supplies document links only. Analysis does not use its summaries, financial tables, or broker commentary. Annual reports/transcripts behind those links are the evidence.
- PDFs are parsed with PyMuPDF. Results use layout-preserving text to maintain table columns; financial extraction retains full relevant pages so headers remain available. Other documents use page-preserving chunks and keyword-ranked retrieval across every available document.
- Rules classify and rank announcements. They explicitly distinguish results from meeting notices/publication ads. Rules are useful and inspectable but can misclassify ambiguous disclosures; no claim of comprehensive materiality detection is made.
- Arithmetic and alerts run in code. Volume uses the preceding 20 complete sessions, excluding the evaluated session. Insufficient history or a split in the baseline suppresses the volume signal. Ongoing sessions before 15:30 IST are excluded. Raw-price threshold alerts are suppressed around detected splits.
- The model extracts/synthesizes from retrieved primary excerpts. Pydantic validates research shape and citation IDs are checked against actual excerpts. A second pass audits the draft against cited excerpts. This catches errors but is not a proof that every claim is correct; readers can inspect the original evidence.
- Results pass through two extraction/review calls, then a deterministic reporting-date check before QoQ/YoY arithmetic. Unsupported numbers stay null. EBITDA is not inferred from unrelated profit lines. Nonpositive percentage bases produce an unavailable percentage rather than a misleading sign.

## Storage and runtime

SQLite stores JSON records under indexed keys for events, price series, documents, extracted facts, cached research, settings, and usage. Content hashes and source/retrieval times preserve provenance. Downloaded PDF text is cached with page boundaries; raw PDF binaries are not retained. This is sufficient for one process and one investor. It intentionally avoids Redis, queues, and vector databases.

Research jobs run as bounded asynchronous tasks within the FastAPI process. Three may run concurrently; duplicate active jobs for the same key reuse the existing job. Finished output is durable in SQLite; in-flight progress is in memory and does not survive a restart. The optional ingestion loop runs every 15 minutes while the service is awake. Exchange alerts arrive after polling; EOD alerts arrive after a completed session, not intraday.

## Reliability and security

Provider errors do not destroy cached results. A dated exported replay lets the frontend remain inspectable during source/backend failure. It is labeled and disables new research/refresh; it is never presented as live analysis. Document requests require HTTPS, block private-network addresses, validate redirects, and cap download size. Ticker input is validated. Model keys stay server-side. Document contents are treated as untrusted data in model instructions.

This is a single-user prototype, including shared watch settings and cached research. The deployment now runs the frontend and API in one cloud container. A public multi-user deployment needs authentication, per-user quotas, stronger persisted job handling, and stronger URL/network isolation (including DNS rebinding defenses). The SQLite model-attempt budget reserves slots atomically before network calls, including failures. It resets when ephemeral storage is lost and is not a provider billing guarantee.

## Trade-offs and next steps

1. Source availability and finance-aware correctness came before broad research sections. No bank EBITDA is invented; missing metrics are explicit.
2. The worked comparison can contain annual guidance, milestones, or evidence gaps rather than four artificially complete quarterly verdicts. Not every company provides quarterly quantitative guidance. The UI should make such gaps clear.
3. Model review still needs a broader labeled evaluation set. The next improvement is structured guidance facts with independently verified dates, metric definitions, and quantitative outcomes, rather than relying on prose labels.
4. Document discovery is generic but bounded: one latest annual report and up to five available transcript links. Sparse or unreadable coverage is reported. OCR and more document versions would expand coverage.
5. Cloud deployment uses the Dockerfile and Render Free Blueprint. Provisioning still requires the user’s account. No tunnel or local API is part of the new deployment. Startup restores bundled dated research on an empty database and refreshes live feeds. Durable user data still requires persistent storage.
6. Next priorities: persistent scheduled ingestion, cross-exchange duplicate/revision handling, more robust table extraction, configurable per-company rules, and targeted cash-flow analysis.
