"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Activity,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  LayoutGrid,
  Loader2,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  TrendingUp,
  BookOpen,
  Clock,
  CheckCheck,
} from "lucide-react";

// Source objects carry variable company metrics; rendered values are never HTML.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any>;
// The cloud container serves the UI and API together. No machine-specific URL.
const API = "";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
const pct = (n: number | null) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const label = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
async function request(path: string, options?: RequestInit) {
  const r = await fetch(API + "/api" + path, options);
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw new Error(b.detail || `Request failed (${r.status})`);
  }
  return r.json();
}
async function jsonRequest(path: string, method = "POST", body?: any) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function Sparkline({
  bars,
  positive = true,
}: {
  bars: Obj[];
  positive?: boolean;
}) {
  const a = bars.map((b) => b.close).filter((v: any) => v != null);
  if (a.length < 2) return null;
  const min = Math.min(...a),
    max = Math.max(...a);
  const points = a
    .map(
      (v: number, i: number) =>
        `${(i / (a.length - 1)) * 130},${38 - ((v - min) / (max - min || 1)) * 32}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 130 42"
      className={"sparkline " + (positive ? "positive" : "negative")}
      aria-label="Recent closing prices"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
function AppIcon() {
  return (
    <span className="app-icon">
      f<span>ı</span>
    </span>
  );
}

export default function Home() {
  const [tab, setTab] = useState("today"),
    [overview, setOverview] = useState<Obj | null>(null),
    [events, setEvents] = useState<Obj[]>([]),
    [alerts, setAlerts] = useState<Obj>({ items: [], read: [] }),
    [days, setDays] = useState("1"),
    [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [expanded, setExpanded] = useState(false),
    [selected, setSelected] = useState<Obj | null>(null),
    [analysis, setAnalysis] = useState<Obj | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [progress, setProgress] = useState(""),
    [research, setResearch] = useState<Obj | null>(null),
    [symbol, setSymbol] = useState("DIXON"),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<Obj | null>(null),
    [citation, setCitation] = useState<Obj | null>(null),
    [saved, setSaved] = useState<string[]>([]),
    [settings, setSettings] = useState<Obj | null>(null),
    [customDays, setCustomDays] = useState("14"),
    [snapshot, setSnapshot] = useState(false);
  const load = useCallback(async () => {
    try {
      const [o, e, a] = await Promise.all([
        request("/overview"),
        request("/events?days=" + days),
        request("/alerts"),
      ]);
      setOverview(o);
      setSettings(o.settings);
      setEvents(e);
      setAlerts(a);
      setSnapshot(false);
      setError("");
    } catch (e: any) {
      // The exported site has a clearly labeled, real-data replay if no API is attached.
      {
        try {
          const r = await fetch("/snapshot.json");
          if (!r.ok) throw e;
          const d = await r.json();
          setOverview(d.overview);
          setSettings(d.overview.settings);
          setEvents(d.events);
          setAlerts(d.alerts);
          setSnapshot(true);
          return;
        } catch {}
      }
      setError(
        "Cannot reach the Python API. Start the backend or configure NEXT_PUBLIC_API_URL. " +
          e.message,
      );
    }
  }, [days]);
  useEffect(() => {
    load();
    try {
      setSaved(JSON.parse(localStorage.getItem("finn-saved") || "[]"));
    } catch {}
  }, [load]);
  useEffect(() => {
    if (!selected && !citation) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector(
      citation ? ".citation-dialog" : ".detail-drawer",
    ) as HTMLElement;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,select",
        ) || [],
      );
    focusable()[0]?.focus();
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        citation ? setCitation(null) : setSelected(null);
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [selected, citation]);
  useEffect(() => {
    if (tab === "settings") return;
    const timer = setInterval(() => load(), 60000);
    return () => clearInterval(timer);
  }, [load, tab]);
  function save(id: string) {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    setSaved(next);
    localStorage.setItem("finn-saved", JSON.stringify(next));
  }
  async function job(path: string, onDone: (r: any) => void) {
    if (snapshot) {
      setError(
        "This is a dated replay. Connect the Python API to fetch new data or run analysis.",
      );
      return;
    }
    setError("");
    setBusy(path);
    setProgress("Starting…");
    try {
      let j = await jsonRequest(path);
      let attempts = 0;
      while (j.status === "running" && attempts++ < 180) {
        setProgress(j.progress || "Reading sources…");
        await new Promise((r) => setTimeout(r, 2000));
        j = await request("/jobs/" + j.id);
      }
      if (j.status !== "complete")
        throw new Error(
          j.error || "The job is still running. Check again shortly.",
        );
      onDone(j.result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
      setProgress("");
    }
  }
  async function openResearch(s: string) {
    setSymbol(s);
    setTab("research");
    setResearch(null);
    setAnswer(null);
    setError("");
    try {
      if (snapshot) {
        const d = await (await fetch("/snapshot.json")).json();
        if (!d.research[s])
          throw new Error(
            "No prepared analysis for " +
              s +
              ". Connect the API to research this company.",
          );
        setResearch(d.research[s]);
      } else setResearch(await request("/research/" + s));
    } catch (e: any) {
      if (!e.message.includes("No cached")) setError(e.message);
    }
  }
  async function openEvent(e: Obj) {
    setSelected(e);
    setAnalysis(null);
    if (snapshot) {
      const d = await (await fetch("/snapshot.json")).json();
      setAnalysis(d.enrichments?.[e.id] || null);
    } else
      try {
        setAnalysis(await request("/events/" + e.id + "/analysis"));
      } catch {}
  }
  const companies = overview?.companies || [],
    settingsSymbols = settings?.symbols || companies.map((c: Obj) => c.symbol);
  const eligible = events
    .filter((e) => settingsSymbols.includes(e.symbol))
    .filter(
      (e) =>
        days === "all" ||
        !snapshot ||
        new Date(e.published_at).getTime() >=
          new Date(overview?.generated_at || Date.now()).getTime() -
            Number(days) * 86400000,
    );
  const filtered = eligible.filter(
    (e) =>
      (category === "all" || e.category === category) &&
      (search === "" ||
        (e.symbol + " " + e.company + " " + e.title)
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (tab !== "saved" || saved.includes(e.id)),
  );
  const important = filtered
      .filter((e) => e.priority !== "routine")
      .sort(
        (a, b) =>
          (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1) ||
          new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime(),
      ),
    routine = filtered.filter((e) => e.priority === "routine");
  const unread = alerts.items.filter(
    (a: Obj) => !alerts.read.includes(a.id),
  ).length;
  const high = eligible.filter((e) => e.priority === "high").length;
  const liveDate = overview?.generated_at || new Date().toISOString();
  function Evidence({ ids, evidence }: { ids: string[]; evidence: Obj[] }) {
    return (
      <span className="citations">
        {ids?.map((id, i) => (
          <button
            key={id}
            onClick={() =>
              setCitation(evidence.find((e) => e.id === id) ?? null)
            }
            aria-label={"Open source " + (i + 1)}
          >
            <FileText size={10} />
            {i + 1}
          </button>
        ))}
      </span>
    );
  }
  function ClaimList({ items, evidence }: { items: Obj[]; evidence: Obj[] }) {
    return (
      <div className="claims">
        {items?.map((c, i) => (
          <p key={i}>
            {c.text} <Evidence ids={c.evidence} evidence={evidence} />
          </p>
        ))}
      </div>
    );
  }
  function EventCard({ event: e }: { event: Obj }) {
    const company = companies.find((c: Obj) => c.symbol === e.symbol);
    return (
      <article
        className="event-card"
        onClick={() => openEvent(e)}
        tabIndex={0}
        role="button"
        onKeyDown={(ev) => {
          if (ev.key === "Enter") openEvent(e);
        }}
      >
        <div className={"company-avatar tint-" + (e.symbol.charCodeAt(0) % 5)}>
          {e.symbol.slice(0, 2)}
        </div>
        <div className="event-content">
          <div className="event-meta">
            <strong>{e.symbol}</strong>
            <span className="company-name">{company?.name || e.company}</span>
            <span className={"pill " + e.priority}>
              {e.priority === "high" ? "HIGH SIGNAL" : label(e.category)}
            </span>
            <span className="event-date">{date(e.published_at)}</span>
          </div>
          <h3>{e.title}</h3>
          <p className="event-summary">{e.summary}</p>
          <div className="why">
            <span className={"dot " + e.priority} />
            {e.reason}
          </div>
          {e.analysis_preview && (
            <div className="results-preview">
              <div className="preview-meta">
                {e.analysis_preview.period} · {e.analysis_preview.unit}
              </div>
              <div>
                {e.analysis_preview.metrics
                  .filter((m: Obj) => m.current != null)
                  .map((m: Obj) => (
                    <span key={m.name}>
                      <small>{m.name}</small>
                      <strong>{money(m.current)}</strong>
                      <em className={m.yoy >= 0 ? "up" : "down"}>
                        {pct(m.yoy)} YoY
                      </em>
                    </span>
                  ))}
              </div>
            </div>
          )}
          <div className="event-footer">
            <span>
              <FileText size={12} />
              {e.exchange} filing
            </span>
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                openEvent(e);
              }}
            >
              View evidence <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <button
          className={"bookmark " + (saved.includes(e.id) ? "is-saved" : "")}
          aria-label="Save filing"
          onClick={(ev) => {
            ev.stopPropagation();
            save(e.id);
          }}
        >
          <Bookmark
            size={17}
            fill={saved.includes(e.id) ? "currentColor" : "none"}
          />
        </button>
      </article>
    );
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setTab("today")}>
          <AppIcon />
          <span>
            finn<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">D</span>
          <div>
            My investment desk<small>PERSONAL WORKSPACE</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { id: "today", icon: LayoutGrid, name: "Today" },
            { id: "research", icon: Sparkles, name: "Research" },
            { id: "alerts", icon: Bell, name: "Alerts" },
            { id: "saved", icon: Bookmark, name: "Saved" },
          ].map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => {
                setTab(n.id);
                setError("");
              }}
            >
              <n.icon size={18} />
              <span>{n.name}</span>
              {n.id === "alerts" && unread > 0 && <b>{unread}</b>}
              {n.id === "research" && <small>AI</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="green-dot" />
          Built on primary sources
          <p>
            Less noise.
            <br />
            More conviction.
          </p>
          <ShieldCheck size={20} />
        </div>
        <button
          className={"settings-nav " + (tab === "settings" ? "active" : "")}
          onClick={() => setTab("settings")}
        >
          <Settings2 size={17} />
          Watch settings
        </button>
        <div className="profile">
          <span className="profile-avatar">D</span>
          <div>
            Your workspace<small>Indian equities · NSE</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{tab === "today" ? "Today" : label(tab)}</strong>
          </div>
          <div className="topbar-right">
            <span className="market-status">
              <span className="green-dot" />
              EOD intelligence
            </span>
            <button
              className="icon-button"
              aria-label="Alerts"
              onClick={() => setTab("alerts")}
            >
              <Bell size={18} />
              {unread > 0 && <i />}
            </button>
            <span className="profile-avatar small">D</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div className="eyebrow">YOUR EDGE, EVERY DAY</div>
            <div className="title-row">
              <div>
                <h1>
                  {tab === "today"
                    ? "Know what matters."
                    : tab === "research"
                      ? "Go beyond the headline."
                      : tab === "alerts"
                        ? "Your watch, working."
                        : tab === "saved"
                          ? "Worth a second look."
                          : "Make it your signal."}
                </h1>
                <p>
                  {tab === "today"
                    ? "The important changes across your portfolio. Everything else, quietly in the background."
                    : tab === "research"
                      ? "What management said. What the numbers show. Evidence on both sides."
                      : tab === "settings"
                        ? "You decide what unusual means. FINN watches for it."
                        : tab === "alerts"
                          ? "Material disclosures and market moves that meet your rules."
                          : "Filings you’ve kept for a closer read."}
                </p>
              </div>
              <div className="date-stamp">
                <Clock size={14} />
                {date(liveDate)}
                <small>
                  {snapshot
                    ? "Dated source replay"
                    : "Source-backed intelligence"}
                </small>
              </div>
            </div>
          </div>
          {!snapshot && overview?.bootstrap && (
            <div className="replay-banner">
              <Clock size={17} />
              <div>
                <strong>Cached research available</strong>
                <span>
                  Starter research captured{" "}
                  {date(overview.bootstrap.captured_at)}. Each analysis retains
                  its original date.{" "}
                  {overview.refresh?.finished_at
                    ? `Latest source refresh: ${new Date(overview.refresh.finished_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST (${overview.refresh.errors?.length || 0} source errors).`
                    : "Live source refresh is starting; initial prices and filings are from the dated starter data."}
                </span>
              </div>
            </div>
          )}
          {snapshot && (
            <div className="replay-banner">
              <BookOpen size={17} />
              <div>
                <strong>Real-data replay</strong>
                <span>
                  Captured{" "}
                  {new Date(liveDate).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST. Live research and refresh require the Python API.
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {busy && (
            <div className="progress-banner" role="status">
              <Loader2 className="spin" size={17} />
              {progress}
              <small>Reading primary sources; you can keep browsing.</small>
            </div>
          )}
          {!overview && !error ? (
            <div className="empty">
              <Loader2 className="spin" />
              Opening your investment desk…
            </div>
          ) : (
            <>
              {(tab === "today" || tab === "saved") && (
                <div className="desk-layout">
                  <section className="feed-column">
                    <div className="summary-strip">
                      <div>
                        <span className="stat-icon">
                          <Activity size={17} />
                        </span>
                        <span>
                          <strong>{settingsSymbols.length}</strong>
                          <small>Companies watched</small>
                        </span>
                      </div>
                      <div>
                        <span className="stat-icon amber">
                          <Sparkles size={17} />
                        </span>
                        <span>
                          <strong>
                            {high}
                            <em>need attention</em>
                          </strong>
                          <small>High-signal disclosures</small>
                        </span>
                      </div>
                      <div>
                        <span className="stat-icon neutral">
                          <FileText size={17} />
                        </span>
                        <span>
                          <strong>{eligible.length}</strong>
                          <small>Total filings in window</small>
                        </span>
                      </div>
                    </div>
                    <div className="feed-title">
                      <h2>
                        {tab === "saved" ? "Saved filings" : "Your briefing"}{" "}
                        <span>{filtered.length}</span>
                      </h2>
                      <div className="window-picker">
                        <Clock size={13} />
                        <select
                          aria-label="Digest time window"
                          value={days}
                          onChange={(e) => setDays(e.target.value)}
                        >
                          <option value="1">Last 24 hours</option>
                          <option value="7">Last 7 days</option>
                          <option value="30">Last 30 days</option>
                          {!["1", "7", "30"].includes(days) && (
                            <option value={days}>Last {days} days</option>
                          )}
                        </select>
                        <button
                          title="Custom window"
                          aria-label="Custom time window"
                          onClick={() => {
                            const v = prompt(
                              "Number of days (1–365)",
                              customDays,
                            );
                            if (v && Number(v) >= 1 && Number(v) <= 365) {
                              setCustomDays(v);
                              setDays(v);
                            }
                          }}
                        >
                          <SlidersHorizontal size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="feed-tools">
                      <div className="filter-tabs">
                        {[
                          ["all", "All signals"],
                          ["results", "Results"],
                          ["management_change", "Leadership"],
                          ["M&A", "M&A"],
                        ].map(([v, n]) => (
                          <button
                            className={category === v ? "selected" : ""}
                            key={v}
                            onClick={() => setCategory(v)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="feed-search">
                        <Search size={15} />
                        <input
                          aria-label="Filter portfolio filings"
                          placeholder="Filter companies"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="section-kicker">
                      <span className="dot high" />
                      PRIORITIZED FOR YOU
                      <span>{important.length} disclosures</span>
                    </div>
                    <div className="event-list">
                      {important.map((e) => (
                        <EventCard event={e} key={e.id} />
                      ))}
                    </div>
                    {important.length === 0 && (
                      <div className="empty">
                        <CheckCheck size={28} />
                        <h3>You’re all caught up.</h3>
                        <p>
                          No priority disclosures match this window. Try seven
                          days or another category.
                        </p>
                        <button
                          className="secondary"
                          onClick={() => {
                            setDays("7");
                            setCategory("all");
                          }}
                        >
                          View last 7 days <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                    {routine.length > 0 && (
                      <div className="routine-block">
                        <button
                          className="routine-toggle"
                          onClick={() => setExpanded(!expanded)}
                        >
                          <span>
                            <CheckCheck size={17} />
                            <strong>{routine.length} routine updates</strong>
                            <small>
                              Meeting notices, publications & compliance
                            </small>
                          </span>
                          <ChevronDown
                            className={expanded ? "rotate" : ""}
                            size={17}
                          />
                        </button>
                        {expanded &&
                          routine.map((e) => (
                            <EventCard event={e} key={e.id} />
                          ))}
                      </div>
                    )}
                    <div className="feed-bottom">
                      <ShieldCheck size={13} />
                      Every filing stays reachable. Priority is a reasoned
                      filter, not an investment recommendation.
                    </div>
                  </section>
                  <aside className="right-column">
                    <div className="research-promo">
                      <div className="promo-top">
                        <span>
                          <Sparkles size={16} />
                          FINN RESEARCH
                        </span>
                        <span className="mini-badge">PRIMARY SOURCES</span>
                      </div>
                      <h2>
                        Trust the story.
                        <br />
                        <i>Check the numbers.</i>
                      </h2>
                      <p>
                        Compare management’s promises with what actually
                        happened.
                      </p>
                      <button onClick={() => openResearch("DIXON")}>
                        Explore Dixon <ArrowUpRight size={17} />
                      </button>
                      <div className="promo-foot">
                        <FileText size={12} />
                        Annual reports + earnings calls
                      </div>
                    </div>
                    <div className="watchlist">
                      <div className="panel-heading">
                        <h3>On your radar</h3>
                        <button
                          aria-label="Edit watchlist"
                          onClick={() => setTab("settings")}
                        >
                          <Settings2 size={15} />
                        </button>
                      </div>
                      <div className="watch-subtitle">
                        Latest available close · INR
                      </div>
                      {companies
                        .filter((c: Obj) => settingsSymbols.includes(c.symbol))
                        .slice(0, 8)
                        .map((c: Obj) => (
                          <button
                            className="watch-row"
                            key={c.symbol}
                            onClick={() => openResearch(c.symbol)}
                          >
                            <div
                              className={
                                "mini-avatar tint-" +
                                (c.symbol.charCodeAt(0) % 5)
                              }
                            >
                              {c.symbol.slice(0, 1)}
                            </div>
                            <div className="watch-name">
                              <strong>{c.symbol}</strong>
                              <small>{c.sector}</small>
                            </div>
                            <Sparkline
                              bars={c.price?.bars || []}
                              positive={(c.price?.change || 0) >= 0}
                            />
                            <div className="watch-price">
                              <strong>
                                {c.price ? money(c.price.close) : "—"}
                              </strong>
                              <span
                                className={
                                  (c.price?.change || 0) >= 0 ? "up" : "down"
                                }
                              >
                                {pct(c.price?.change ?? null)}
                              </span>
                            </div>
                          </button>
                        ))}
                      <button
                        className="text-button full"
                        onClick={() => setTab("settings")}
                      >
                        Manage {settingsSymbols.length} companies{" "}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="source-status">
                      <span className="green-dot" />
                      <div>
                        Evidence comes first
                        <small>
                          Exchange filings. Company reports.
                          <br />
                          No broker notes. No news summaries.
                        </small>
                      </div>
                    </div>
                    <button
                      className="refresh-button"
                      disabled={!!busy || snapshot}
                      onClick={() => job("/refresh", () => load())}
                    >
                      <RefreshCw size={13} />
                      Refresh sources{" "}
                      <small>
                        {overview?.refresh?.finished_at
                          ? date(overview.refresh.finished_at)
                          : "Not synced"}
                      </small>
                    </button>
                  </aside>
                </div>
              )}
              {tab === "research" && (
                <div className="research-view">
                  <form
                    className="research-search"
                    onSubmit={(e) => {
                      e.preventDefault();
                      openResearch(symbol.toUpperCase().trim());
                    }}
                  >
                    <Search size={20} />
                    <input
                      aria-label="NSE ticker"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="Enter any NSE ticker, e.g. INFY"
                    />
                    <button className="primary" type="submit">
                      Open company <ArrowRight size={16} />
                    </button>
                  </form>
                  <div className="example-tickers">
                    <span>Start exploring</span>
                    {["INFY", "TCS", "DIXON"].map((s) => (
                      <button key={s} onClick={() => openResearch(s)}>
                        {s}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                  {!research ? (
                    <div className="research-empty">
                      <div className="research-orbit">
                        <Sparkles size={35} />
                      </div>
                      <div className="eyebrow">
                        A STORY IS ONLY HALF THE PICTURE
                      </div>
                      <h2>
                        Put management’s words
                        <br />
                        next to their results.
                      </h2>
                      <p>
                        FINN reads annual reports and earnings-call transcripts,
                        then connects each conclusion to the original page.
                      </p>
                      <button
                        className="primary"
                        disabled={!!busy}
                        onClick={() =>
                          job("/research/" + symbol, (r) => setResearch(r))
                        }
                      >
                        <Sparkles size={16} />
                        Research {symbol}
                      </button>
                      <div className="research-pillars">
                        <span>
                          <FileText size={17} />
                          Primary documents
                        </span>
                        <span>
                          <ShieldCheck size={17} />
                          Page-level evidence
                        </span>
                        <span>
                          <TrendingUp size={17} />
                          Promises vs. delivery
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="company-heading">
                        <div>
                          <span className="eyebrow">
                            {research.symbol} · PRIMARY-SOURCE RESEARCH
                          </span>
                          <h2>{research.name}</h2>
                          <p>
                            {research.documents.length} documents · Generated{" "}
                            {date(research.generated_at)} · {research.model}
                          </p>
                        </div>
                        <button
                          className="secondary"
                          disabled={snapshot || !!busy}
                          onClick={() =>
                            job("/research/" + research.symbol, (r) =>
                              setResearch(r),
                            )
                          }
                        >
                          <RefreshCw size={14} />
                          Refresh research
                        </button>
                      </div>
                      <div className="research-grid">
                        <section className="research-panel">
                          <h3>
                            <LayoutGrid size={17} />
                            The business
                          </h3>
                          <ClaimList
                            items={research.snapshot}
                            evidence={research.evidence}
                          />
                        </section>
                        <section className="research-panel">
                          <h3>
                            <Activity size={17} />
                            The numbers
                          </h3>
                          <ClaimList
                            items={research.financials}
                            evidence={research.evidence}
                          />
                        </section>
                      </div>
                      <section className="comparison-panel">
                        <div className="panel-heading">
                          <div>
                            <div className="eyebrow">
                              THE ACCOUNTABILITY CHECK
                            </div>
                            <h2>Promises vs. delivery</h2>
                          </div>
                          <span className="outline-pill">
                            <ShieldCheck size={13} />
                            Evidence on both sides
                          </span>
                        </div>
                        <p className="panel-description">
                          Explicit guidance is compared only when the metric,
                          scope, and period match.
                        </p>
                        {research.comparisons.length ? (
                          <div className="comparison-table">
                            <div className="comparison-header">
                              <span>PERIOD</span>
                              <span>WHAT MANAGEMENT SAID</span>
                              <span>WHAT HAPPENED</span>
                              <span>ASSESSMENT</span>
                            </div>
                            {research.comparisons.map((c: Obj, i: number) => (
                              <div className="comparison-row" key={i}>
                                <strong>
                                  {c.period}
                                  {c.target_end_date && (
                                    <small className="target-date">
                                      Target ends {date(c.target_end_date)}{" "}
                                      {c.target_end_date.slice(0, 4)}
                                    </small>
                                  )}
                                </strong>
                                <div>{c.promise}</div>
                                <div>
                                  {c.actual}
                                  <Evidence
                                    ids={c.evidence}
                                    evidence={research.evidence}
                                  />
                                </div>
                                <div>
                                  <span
                                    className={"assessment " + c.assessment}
                                  >
                                    {label(c.assessment)}
                                  </span>
                                  <p>{c.rationale}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty">
                            No comparable promise and outcome were found. Review
                            the evidence gaps below.
                          </div>
                        )}
                      </section>
                      <div className="research-grid">
                        <section className="research-panel">
                          <h3>
                            <Bell size={17} />
                            What to watch
                          </h3>
                          <ClaimList
                            items={research.watch}
                            evidence={research.evidence}
                          />
                        </section>
                        <section className="research-panel limitations">
                          <h3>
                            <BookOpen size={17} />
                            Evidence & limitations
                          </h3>
                          {research.limitations.map((s: string, i: number) => (
                            <p key={i}>{s}</p>
                          ))}
                          <div className="document-links">
                            {research.documents.map((d: Obj) => (
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noreferrer"
                                key={d.id}
                              >
                                <FileText size={13} />
                                {d.title}
                                <ExternalLink size={12} />
                              </a>
                            ))}
                          </div>
                        </section>
                      </div>
                      <section className="ask-panel">
                        <h3>
                          <Sparkles size={18} />
                          Ask the evidence
                        </h3>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setError("");
                            setBusy("ask");
                            try {
                              if (snapshot)
                                throw new Error(
                                  "Connect the API to ask a new question.",
                                );
                              setAnswer(
                                await jsonRequest(
                                  "/research/" + research.symbol + "/ask",
                                  "POST",
                                  { question },
                                ),
                              );
                            } catch (e: any) {
                              setError(e.message);
                            } finally {
                              setBusy("");
                            }
                          }}
                        >
                          <input
                            aria-label="Question about company documents"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Where do management’s claims and reported numbers diverge?"
                            minLength={3}
                            maxLength={1000}
                          />
                          <button
                            className="primary"
                            disabled={!!busy || snapshot}
                          >
                            Ask FINN <ArrowUpRight size={16} />
                          </button>
                        </form>
                        {answer && (
                          <>
                            <ClaimList
                              items={answer.claims}
                              evidence={answer.evidence}
                            />
                            {answer.limitations?.map((s: string, i: number) => (
                              <p className="muted" key={i}>
                                {s}
                              </p>
                            ))}
                          </>
                        )}
                      </section>
                    </>
                  )}
                </div>
              )}
              {tab === "alerts" && (
                <div className="alerts-view">
                  <div className="feed-title">
                    <h2>
                      Triggered alerts <span>{alerts.items.length}</span>
                    </h2>
                    <button
                      className="secondary"
                      disabled={snapshot || !unread}
                      onClick={async () => {
                        await jsonRequest("/alerts/read", "POST", {
                          ids: alerts.items.map((a: Obj) => a.id),
                        });
                        load();
                      }}
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  </div>
                  <div className="rules-banner">
                    <SlidersHorizontal size={17} />
                    <span>
                      Watching ±{settings?.price_threshold}% daily moves,{" "}
                      {settings?.volume_threshold}× volume and{" "}
                      {settings?.categories.length} filing categories.
                    </span>
                    <button onClick={() => setTab("settings")}>
                      Edit rules <ArrowRight size={13} />
                    </button>
                  </div>
                  {alerts.items.map((a: Obj) => (
                    <article
                      className={
                        "alert-card " +
                        (!alerts.read.includes(a.id) ? "unread" : "")
                      }
                      key={a.id}
                    >
                      <div className="stat-icon">
                        {a.kind === "market" ? (
                          <TrendingUp size={19} />
                        ) : (
                          <FileText size={19} />
                        )}
                      </div>
                      <div>
                        <div className="event-meta">
                          <strong>{a.symbol}</strong>
                          <span className="pill medium">
                            {a.kind === "market"
                              ? "EOD THRESHOLD"
                              : "MATERIAL FILING"}
                          </span>
                          <small>{date(a.date)}</small>
                        </div>
                        <h3>{a.title}</h3>
                        <p>{a.reason}</p>
                        {a.url && (
                          <a href={a.url} target="_blank" rel="noreferrer">
                            Original disclosure <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {!alerts.read.includes(a.id) && !snapshot && (
                        <button
                          className="icon-button"
                          aria-label="Mark alert read"
                          onClick={async () => {
                            await jsonRequest("/alerts/read", "POST", {
                              ids: [a.id],
                            });
                            load();
                          }}
                        >
                          <Check size={17} />
                        </button>
                      )}
                    </article>
                  ))}
                  {alerts.items.length === 0 && (
                    <div className="empty">
                      <Bell />
                      <h3>Nothing has crossed your rules.</h3>
                      <p>
                        FINN will surface new alerts after the next source
                        refresh.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {tab === "settings" && settings && (
                <div className="settings-view">
                  <section className="research-panel">
                    <h3>
                      <SlidersHorizontal size={17} />
                      Your alert thresholds
                    </h3>
                    <p className="muted">
                      Signals use the latest available end-of-day session.
                      Volume is compared with the preceding 20 completed
                      sessions.
                    </p>
                    <div className="threshold-grid">
                      <label>
                        Daily price change, ±%
                        <input
                          type="number"
                          min="0.1"
                          max="50"
                          step="0.5"
                          value={settings.price_threshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              price_threshold: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Volume multiplier
                        <input
                          type="number"
                          min="1"
                          max="20"
                          step="0.25"
                          value={settings.volume_threshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              volume_threshold: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <h4>Announcement categories</h4>
                    <div className="category-options">
                      {[
                        "results",
                        "management_change",
                        "M&A",
                        "litigation",
                        "fund_raise",
                        "credit_rating",
                        "capex",
                        "dividend",
                        "pledging",
                        "earnings_call",
                        "press_release",
                      ].map((c) => (
                        <label key={c}>
                          <input
                            type="checkbox"
                            checked={settings.categories.includes(c)}
                            onChange={() =>
                              setSettings({
                                ...settings,
                                categories: settings.categories.includes(c)
                                  ? settings.categories.filter(
                                      (x: string) => x !== c,
                                    )
                                  : [...settings.categories, c],
                              })
                            }
                          />
                          {label(c)}
                        </label>
                      ))}
                    </div>
                  </section>
                  <section className="research-panel">
                    <h3>
                      <LayoutGrid size={17} />
                      Your portfolio
                    </h3>
                    <p className="muted">
                      A mock portfolio across sectors and company sizes.
                      Research supports other NSE tickers too.
                    </p>
                    <div className="portfolio-options">
                      {companies.map((c: Obj) => (
                        <label key={c.symbol}>
                          <input
                            type="checkbox"
                            checked={settings.symbols.includes(c.symbol)}
                            onChange={() =>
                              setSettings({
                                ...settings,
                                symbols: settings.symbols.includes(c.symbol)
                                  ? settings.symbols.filter(
                                      (x: string) => x !== c.symbol,
                                    )
                                  : [...settings.symbols, c.symbol],
                              })
                            }
                          />
                          <div>
                            <strong>{c.symbol}</strong>
                            <small>
                              {c.name} · {c.sector}
                            </small>
                          </div>
                          <span
                            className={
                              (c.price?.change || 0) >= 0 ? "up" : "down"
                            }
                          >
                            {pct(c.price?.change ?? null)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                  <button
                    className="primary"
                    disabled={!!busy}
                    onClick={async () => {
                      if (snapshot) {
                        setError(
                          "Settings in the replay are temporary. Connect the API to persist alert rules.",
                        );
                        return;
                      }
                      setError("");
                      try {
                        await jsonRequest("/settings", "PUT", settings);
                        await load();
                        setTab("alerts");
                      } catch (e: any) {
                        setError(e.message);
                      }
                    }}
                  >
                    <Check size={16} />
                    Save watch settings
                  </button>
                  <div className="settings-foot">
                    <Clock size={14} />
                    Sources refresh manually or every 15 minutes when the
                    optional backend polling loop is enabled. Hosting sleep can
                    delay checks.
                  </div>
                </div>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              <AppIcon />
              FINN
            </span>
            <span>Clarity is a competitive advantage.</span>
            <span>PRIMARY SOURCES. CONSIDERED SIGNALS.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {[
          { id: "today", icon: LayoutGrid, name: "Today" },
          { id: "research", icon: Sparkles, name: "Research" },
          { id: "alerts", icon: Bell, name: "Alerts" },
          { id: "saved", icon: Bookmark, name: "Saved" },
          { id: "settings", icon: Settings2, name: "Settings" },
        ].map((n) => (
          <button
            className={tab === n.id ? "active" : ""}
            key={n.id}
            onClick={() => setTab(n.id)}
          >
            <n.icon size={20} />
            <span>{n.name}</span>
          </button>
        ))}
      </nav>
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <section
            className="detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Filing detail"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-top">
              <span className="eyebrow">THE ORIGINAL SIGNAL</span>
              <button
                className="icon-button"
                aria-label="Close filing"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="event-meta">
              <strong>{selected.symbol}</strong>
              <span className={"pill " + selected.priority}>
                {label(selected.category)}
              </span>
            </div>
            <h2>{selected.title}</h2>
            <p className="muted">
              {selected.company} · {date(selected.published_at)}
            </p>
            <div className="detail-reason">
              <Sparkles size={18} />
              <div>
                <strong>Why this is on your desk</strong>
                <p>{selected.reason}</p>
              </div>
            </div>
            <h4>Exchange description</h4>
            <p>{selected.summary}</p>
            <a
              className="primary"
              href={selected.url}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={15} />
              Read original filing <ArrowUpRight size={16} />
            </a>
            <div className="detail-times">
              <span>
                Published{" "}
                {new Date(selected.published_at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </span>
              <span>
                Retrieved{" "}
                {new Date(selected.fetched_at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </span>
            </div>
            {selected.category === "results" && (
              <section className="results-section">
                <h3>First cut of the numbers</h3>
                {analysis ? (
                  <>
                    <p>
                      {analysis.period} · {analysis.scope} · {analysis.unit}
                    </p>
                    <div className="results-table">
                      <div>
                        <strong>Metric</strong>
                        <strong>Reported</strong>
                        <strong>QoQ</strong>
                        <strong>YoY</strong>
                      </div>
                      {analysis.metrics.map((m: Obj) => (
                        <div key={m.name}>
                          <span>
                            {m.name}
                            <Evidence
                              ids={m.evidence}
                              evidence={analysis.evidence}
                            />
                          </span>
                          <strong>
                            {m.current == null
                              ? "Unavailable"
                              : money(m.current)}
                          </strong>
                          <span>{pct(m.qoq)}</span>
                          <span>{pct(m.yoy)}</span>
                        </div>
                      ))}
                    </div>
                    {analysis.metrics
                      .filter((m: Obj) => m.note)
                      .map((m: Obj) => (
                        <p className="muted" key={m.name}>
                          {m.name}: {m.note}
                        </p>
                      ))}
                    {analysis.limitations?.map((l: string, i: number) => (
                      <p className="muted" key={i}>
                        {l}
                      </p>
                    ))}
                  </>
                ) : (
                  <>
                    <p className="muted">
                      Read the actual filing to extract Revenue, EBITDA, PBT and
                      PAT. Missing values stay explicitly unavailable.
                    </p>
                    <button
                      className="secondary"
                      disabled={!!busy || snapshot}
                      onClick={() =>
                        job("/events/" + selected.id + "/analyze", (r) =>
                          setAnalysis(r),
                        )
                      }
                    >
                      <Sparkles size={15} />
                      Analyze results filing
                    </button>
                  </>
                )}
              </section>
            )}
            <button
              className="research-link"
              onClick={() => {
                openResearch(selected.symbol);
                setSelected(null);
              }}
            >
              Research {selected.symbol} <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {citation && (
        <div
          className="overlay citation-overlay"
          onClick={() => setCitation(null)}
        >
          <section
            className="citation-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Source evidence"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-top">
              <span className="eyebrow">CHECK THE EVIDENCE</span>
              <button
                className="icon-button"
                aria-label="Close source"
                onClick={() => setCitation(null)}
              >
                <X size={20} />
              </button>
            </div>
            <h3>{citation.title}</h3>
            <span className="outline-pill">PDF page {citation.page}</span>
            <blockquote>{citation.text}</blockquote>
            <a
              className="primary"
              href={citation.url + "#page=" + citation.page}
              target="_blank"
              rel="noreferrer"
            >
              Open original page <ExternalLink size={15} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
