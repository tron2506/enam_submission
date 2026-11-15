# Validation record

Performed on 15 November 2026 against real public inputs. This is a targeted prototype evaluation, not a claim of financial-analysis accuracy across all listed companies.

## Working source paths

- EOD prices and volumes fetched successfully for all 18 configured NSE symbols.
- NSE ingestion returned 3,980 announcements for the requested week with no reported ingestion errors. Filtering to the selected portfolio yielded 35 stored filings in the exported replay. Counts reflect that fetch, not a guarantee of exchange-feed completeness.
- Primary PDFs were read for INFY (6 documents), TCS (5), DIXON (6), and PERSISTENT (5). PERSISTENT is outside the configured portfolio and used the same discovery/retrieval/synthesis pipeline.
- Each cached research result includes actual document URLs, source excerpts, PDF page numbers, a generation timestamp, and the model ID.

## Consequential checks

`python -m pytest -q`: **11 passed**.

Checks cover results-vs-publication classification, unknown disclosures staying visible, excluding the current session from the volume average, insufficient volume history, split handling, nonpositive percentage bases, ticker validation, threshold-driven alert behavior, rejection of invented citation IDs, quarter-vs-half-year comparator rejection, and future annual-guidance targets being protected from interim-quarter verdicts.

TypeScript check and optimized Next.js static production build passed. Production dependencies were updated after the initial dependency audit identified a vulnerable version.

Chrome checks at 1440px desktop width and 390px mobile width verified the briefing, cached research table, original-source excerpt dialog, filing detail drawer, and persisted watch settings. No horizontal page overflow or browser page errors was observed in that run. These checks are repeated against the final published assets; screenshots are in the local `artifacts/` directory.

## Specific financial extraction check

Kaynes' results filing for the quarter ended 30 September 2026 was selected because it includes restated comparators and is easy to misread. The first extraction incorrectly mixed a half-year comparator into YoY. That output was replaced after layout-preserving parsing, a second review pass, and explicit comparator-date validation were implemented.

The checked consolidated statement is in INR million:

| Metric | Sep 2026 quarter | Jun 2026 quarter | Sep 2025 quarter | QoQ | YoY |
| --- | ---: | ---: | ---: | ---: | ---: |
| Revenue | 9,525.15 | 9,462.12 | 9,121.25 | +0.67% | +4.43% |
| PBT | 647.31 | 772.21 | 1,481.19 | −16.17% | −56.30% |
| PAT, including non-controlling interests | 398.00 | 454.13 | 1,157.11 | −12.36% | −65.60% |
| EBITDA | Unavailable | Unavailable | Unavailable | — | — |

Numbers can be checked through the filing detail's source badges. Prior comparators are restated; the app preserves that note. EBITDA was not manufactured from a different profit metric.

## Research judgment checks and limitations

- A first pass treated some qualitative optimism as a promise kept and produced contradictory missing-document limitations. A second evidence review and a rule preventing qualitative/aspirational met/missed verdicts were added.
- Infosys' completed FY2026 constant-currency guidance is compared with FY2026 outcomes; ongoing FY2027 guidance is labeled not yet due.
- TCS' qualitative outlook and margin aspirations are not treated as completed quarterly quantitative commitments.
- Dixon provides both an assessable operating-volume comparison and a changed project timeline. Full-year targets still in progress remain not yet due.
- Citation-ID checks ensure links refer to retrieved excerpts; they do **not** independently establish that every numerical or causal claim is supported. Original pages remain the final evidence. The model review is a quality check, not independent financial verification.
- Four consecutive quarterly quantitative promises are not available for every company. The engine reports gaps and can return annual/milestone comparisons. The submission does not claim four complete quarterly verdicts for every ticker.

## Model usage

At the initial evaluation checkpoint, the local log contained 16 successful GLM calls, approximately 571,940 input tokens and 29,533 output tokens, and 214 seconds of aggregate request time. This includes development drafts, rework, extraction reviews, and unseen-ticker research; it is not the cost of each app visit. Cached research opens without a model call. Monetary cost is not inferred from gateway token counts. No paid subscription or paid-model fallback was configured.

## Deployment caveats

The initial runtime check used a temporary tunnel. That architecture has been superseded: the current Docker deployment serves the API and UI together in the cloud. The container has not been built here because Docker is unavailable; the final provider build and smoke test remain pending account setup.

Final production dependency audit: zero reported vulnerabilities.

Final checks also passed under strict TypeScript configuration. A forced-API-outage browser check confirmed labeled replay mode, 24-hour/seven-day filtering, expanded routine filings, and disabled regeneration. The live follow-up question endpoint returned five cited claims for a Dixon timeline question.

## Cloud revision checks

The subsequent cloud-deployment review passed **16 tests**, an optimized production build and strict TypeScript. New checks cover server bootstrap, model-budget races, client input errors, cached follow-up evidence and host-secret precedence. Old tunnel URLs are absent from compiled HTML/JavaScript. See `REVIEW.md` for unresolved limitations. Docker is unavailable here, so image execution and the provider deployment are not yet verified.
