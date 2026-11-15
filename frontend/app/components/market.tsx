"use client";
import { useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
type Row = Record<string, any>;
const number = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const percent = (n: number | null | undefined) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const day = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

export function PriceChart({ company }: { company: Row }) {
  const [range, setRange] = useState(45);
  const [hover, setHover] = useState<number | null>(null);
  const bars = (company.price?.bars || [])
    .filter((b: Row) => Number.isFinite(b.close))
    .slice(-range);
  const values = bars.map((b: Row) => b.close);
  const low = Math.min(...values),
    high = Math.max(...values),
    pad = (high - low) * 0.12 || 1;
  const min = low - pad,
    max = high + pad;
  const x = (i: number) => 58 + (i / Math.max(1, bars.length - 1)) * 590;
  const y = (v: number) => 180 - ((v - min) / (max - min)) * 152;
  const maxVolume = Math.max(1, ...bars.map((b: Row) => b.volume || 0));
  const active = bars[Math.min(hover ?? bars.length - 1, bars.length - 1)];
  const change =
    bars.length > 1 && bars[0].close > 0
      ? (bars[bars.length - 1].close / bars[0].close - 1) * 100
      : null;
  return (
    <section className="chart-panel price-panel">
      <div className="chart-heading">
        <div>
          <h3>
            {company.symbol} <span>Price & volume</span>
          </h3>
          <p>{company.name}</p>
        </div>
        <div className="range-control" aria-label="Chart range">
          {[20, 45].map((n) => (
            <button
              type="button"
              aria-pressed={range === n}
              key={n}
              onClick={() => {
                setRange(n);
                setHover(null);
              }}
            >
              {n} sessions
            </button>
          ))}
        </div>
      </div>
      {bars.length < 2 ? (
        <div className="chart-empty">
          {company.price_supported === false
            ? "NSE price feed is unavailable for this company."
            : "Price history is not available yet. Refresh sources to try again."}
        </div>
      ) : (
        <>
          <div className="chart-quote">
            <strong>₹{number(active.close)}</strong>
            <span className={change != null && change < 0 ? "down" : "up"}>
              {percent(change)} <small>over displayed period</small>
            </span>
            <small>
              {day(active.date)} · Volume {number(active.volume || 0)}
            </small>
          </div>
          <svg
            viewBox="0 0 710 280"
            className="price-chart"
            role="img"
            aria-label={`${company.name}: ${bars.length} closing prices in INR and daily volume. Period change ${percent(change)}.`}
            onMouseLeave={() => setHover(null)}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(
                Math.max(
                  0,
                  Math.min(
                    bars.length - 1,
                    Math.round(
                      ((((e.clientX - r.left) / r.width) * 710 - 58) / 590) *
                        (bars.length - 1),
                    ),
                  ),
                ),
              );
            }}
          >
            {[0, 1, 2, 3].map((i) => {
              const v = min + ((max - min) * i) / 3;
              return (
                <g key={i}>
                  <line
                    x1="58"
                    x2="648"
                    y1={y(v)}
                    y2={y(v)}
                    className="chart-grid"
                  />
                  <text x="49" y={y(v) + 4} textAnchor="end">
                    {number(Math.round(v))}
                  </text>
                </g>
              );
            })}
            <polyline
              points={bars
                .map((b: Row, i: number) => `${x(i)},${y(b.close)}`)
                .join(" ")}
              fill="none"
              stroke="var(--chart-blue)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <text x="58" y="205">
              Volume · shares
            </text>
            <text x="648" y="205" textAnchor="end">
              Peak {number(maxVolume)}
            </text>
            {bars.map((b: Row, i: number) => (
              <rect
                key={b.date}
                x={x(i) - Math.min(5, 220 / bars.length)}
                y={250 - ((b.volume || 0) / maxVolume) * 35}
                width={Math.min(10, 440 / bars.length)}
                height={((b.volume || 0) / maxVolume) * 35}
                fill={i && b.close < bars[i - 1].close ? "#c7817c" : "#8aa99b"}
              >
                <title>
                  {day(b.date)}: ₹{number(b.close)}; {number(b.volume || 0)}{" "}
                  shares
                </title>
              </rect>
            ))}
            {hover != null && active && (
              <g>
                <line
                  x1={x(Math.min(hover, bars.length - 1))}
                  x2={x(Math.min(hover, bars.length - 1))}
                  y1="28"
                  y2="250"
                  stroke="#9aa3af"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={x(Math.min(hover, bars.length - 1))}
                  cy={y(active.close)}
                  r="4"
                  fill="var(--chart-blue)"
                />
              </g>
            )}
            <text x="58" y="274">
              {day(bars[0].date)}
            </text>
            <text x="648" y="274" textAnchor="end">
              {day(bars[bars.length - 1].date)}
            </text>
          </svg>
          <div className="chart-foot">
            <span>
              Completed sessions · unadjusted close · splits may affect
              comparisons
            </span>
            {company.price?.source && (
              <a href={company.price.source} target="_blank" rel="noreferrer">
                Price source ↗
              </a>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function MarketOverview({ companies }: { companies: Row[] }) {
  const [symbol, setSymbol] = useState("");
  const company =
    companies.find((c) => c.symbol === symbol) ||
    companies.find((c) => c.price?.bars?.length) ||
    companies[0];
  if (!company) return null;
  const priced = companies.filter((c) => Number.isFinite(c.price?.change));
  const dates = priced
    .map((c) => c.price.date?.slice(0, 10))
    .filter(Boolean)
    .sort();
  const session = dates[dates.length - 1];
  const moves = priced
    .filter((c) => c.price.date?.slice(0, 10) === session)
    .sort((a, b) => b.price.change - a.price.change);
  const max = Math.max(1, ...moves.map((c) => Math.abs(c.price.change)));
  return (
    <div className="market-section">
      <div className="section-heading">
        <h2>Market overview</h2>
        <label className="chart-selector">
          Chart company{" "}
          <select
            aria-label="Chart company"
            value={company.symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.symbol}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="market-grid">
        <PriceChart key={company.symbol} company={company} />
        <section className="chart-panel movers-panel">
          <div className="chart-heading">
            <div>
              <h3>Daily moves</h3>
              <p>
                {session ? day(session) : "Awaiting prices"} · {moves.length}/
                {companies.length} companies with same-session data
              </p>
            </div>
          </div>
          <div className="breadth-legend">
            <span className="up">
              {moves.filter((c) => c.price.change > 0).length} advancing
            </span>
            <span className="down">
              {moves.filter((c) => c.price.change < 0).length} declining
            </span>
            <span>{moves.filter((c) => c.price.change === 0).length} flat</span>
          </div>
          <div className="move-list">
            {moves.map((c) => (
              <button
                className="move-row"
                key={c.symbol}
                onClick={() => setSymbol(c.symbol)}
                aria-label={`Chart ${c.symbol}, ${percent(c.price.change)}`}
              >
                <span>{c.symbol}</span>
                <span className="move-track">
                  <i
                    style={{
                      left:
                        c.price.change >= 0
                          ? "50%"
                          : `${50 - (Math.abs(c.price.change) / max) * 50}%`,
                      width: `${(Math.abs(c.price.change) / max) * 50}%`,
                      background: c.price.change < 0 ? "#b86a63" : "#48856f",
                    }}
                  />
                </span>
                <b className={c.price.change < 0 ? "down" : "up"}>
                  {percent(c.price.change)}
                </b>
              </button>
            ))}
          </div>
          {!moves.length && (
            <div className="chart-empty">
              No completed-session prices available.
            </div>
          )}
          <div className="chart-foot">
            Daily price changes, not portfolio returns.
          </div>
        </section>
      </div>
    </div>
  );
}

export function Watchlist({
  companies,
  onResearch,
  onReplace,
  disabled,
}: {
  companies: Row[];
  onResearch: (s: string) => void;
  onReplace: (old: string, next: string) => Promise<void>;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState("");
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const max = Math.max(1, ...companies.map((c) => c.market_cap_cr || 0));
  async function replace(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await onReplace(editing, next.trim().toUpperCase());
      setNotice(`${editing} replaced with ${next.trim().toUpperCase()}.`);
      setEditing("");
      setNext("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="watchlist-panel">
      <div className="section-heading">
        <div>
          <h2>
            Watchlist <span className="count-label">{companies.length}</span>
          </h2>
          <p>
            Market cap in ₹ crore · supplied snapshot, not live valuations. —
            means unavailable.
          </p>
        </div>
      </div>
      {notice && (
        <p role="status" className="watch-notice">
          {notice}
        </p>
      )}
      {editing && (
        <form className="replace-form" onSubmit={replace}>
          <label htmlFor="replacement">
            Replace <strong>{editing}</strong> with an NSE ticker
          </label>
          <div>
            <input
              autoFocus
              id="replacement"
              placeholder="e.g. MARUTI"
              value={next}
              onChange={(e) => setNext(e.target.value.toUpperCase())}
              maxLength={24}
              required
              disabled={pending}
            />
            <button className="primary" disabled={pending || !next.trim()}>
              {pending ? "Verifying…" : "Confirm replacement"}
            </button>
            <button
              type="button"
              aria-label="Cancel replacement"
              disabled={pending}
              onClick={() => {
                setEditing("");
                setError("");
              }}
            >
              <X size={18} />
            </button>
          </div>
          <small>
            The new company takes this slot. Its price feed is checked before
            saving.
          </small>
          {error && (
            <p role="alert" className="down">
              {error}
            </p>
          )}
        </form>
      )}
      <div
        className="watch-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Company watchlist, scroll horizontally for prices and replacement controls"
      >
        <table className="watch-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Sector</th>
              <th>Close · ₹</th>
              <th>1D change</th>
              <th>Market cap · ₹ Cr</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => (
              <tr key={c.symbol}>
                <td>
                  <button
                    className="company-cell"
                    onClick={() => onResearch(c.symbol)}
                  >
                    <span className="row-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>
                        {c.symbol}
                        {c.price_supported === false
                          ? " · NSE price feed unavailable"
                          : ""}
                      </small>
                    </span>
                  </button>
                </td>
                <td>{c.sector}</td>
                <td className="numeric">
                  {c.price ? (
                    <>
                      {number(c.price.close)}
                      <small>{day(c.price.date)}</small>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className={`numeric ${c.price?.change < 0 ? "down" : "up"}`}
                >
                  {percent(c.price?.change)}
                </td>
                <td className="numeric cap-cell">
                  {c.market_cap_cr == null ? (
                    "—"
                  ) : (
                    <>
                      <span>{c.market_cap_cr.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      <span className="cap-track">
                        <i
                          style={{ width: `${(c.market_cap_cr / max) * 100}%` }}
                        />
                      </span>
                    </>
                  )}
                </td>
                <td>
                  <button
                    className="replace-button"
                    disabled={disabled || pending}
                    aria-label={`Replace ${c.symbol}`}
                    onClick={() => {
                      setEditing(c.symbol);
                      setNext("");
                      setError("");
                      setNotice("");
                    }}
                  >
                    <ArrowLeftRight size={14} />
                    <span>Replace</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {disabled && (
        <p className="chart-foot">
          Replacement is available when the server is connected.
        </p>
      )}
    </section>
  );
}

export function AssessmentChart({ comparisons }: { comparisons: Row[] }) {
  const counts: Record<string, number> = {};
  comparisons.forEach(
    (c) => (counts[c.assessment] = (counts[c.assessment] || 0) + 1),
  );
  const colors: Record<string, string> = {
    met: "#48856f",
    missed: "#b86a63",
    mixed: "#b48b43",
    not_yet_due: "#6788b5",
    not_comparable: "#9da5b0",
    insufficient_evidence: "#c9cdd3",
  };
  if (!comparisons.length) return null;
  return (
    <div className="assessment-chart">
      <div
        className="assessment-bar"
        role="img"
        aria-label={Object.entries(counts)
          .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
          .join(", ")}
      >
        {Object.entries(counts).map(([k, v]) => (
          <span
            key={k}
            style={{
              width: `${(v / comparisons.length) * 100}%`,
              background: colors[k] || "#9da5b0",
            }}
          />
        ))}
      </div>
      <div className="assessment-legend">
        {Object.entries(counts).map(([k, v]) => (
          <span key={k}>
            <i style={{ background: colors[k] || "#9da5b0" }} />
            {k.replaceAll("_", " ")} <strong>{v}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResultsChart({
  metrics,
  unit,
}: {
  metrics: Row[];
  unit: string;
}) {
  return (
    <div className="results-charts">
      <p className="muted">
        Reported periods · {unit} · bar length shows magnitude; each metric has
        its own scale
      </p>
      {metrics
        .filter((m) => m.current != null)
        .map((m) => {
          const entries: [
            [string, number | null],
            [string, number | null],
            [string, number | null],
          ] = [
            ["Current", m.current],
            ["Previous quarter", m.previous_quarter],
            ["Year ago", m.year_ago],
          ];
          const max = Math.max(1, ...entries.map(([, v]) => Math.abs(v || 0)));
          return (
            <div className="metric-chart" key={m.name}>
              <h4>{m.name}</h4>
              {entries.map(([k, v], i) => (
                <div className="metric-row" key={k}>
                  <span>{k}</span>
                  <span className="metric-track">
                    {v != null && (
                      <i
                        style={{
                          width: `${(Math.abs(v) / max) * 100}%`,
                          background:
                            v < 0
                              ? "#b86a63"
                              : ["#365d91", "#819abb", "#c0cbd9"][i],
                        }}
                      />
                    )}
                  </span>
                  <strong>{v == null ? "Unavailable" : number(v)}</strong>
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}
