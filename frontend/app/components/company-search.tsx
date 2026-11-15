"use client";
import { useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
type Company = { symbol: string; name: string };
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function matches(query: string, companies: Company[]) {
  const q = normalize(query);
  return companies.filter(
    (c) => normalize(c.symbol).includes(q) || normalize(c.name).includes(q),
  );
}
export function resolveCompany(query: string, companies: Company[]) {
  const q = normalize(query);
  if (!q) throw new Error("Enter a company name or ticker.");
  const exact = companies.find(
    (c) => normalize(c.symbol) === q || normalize(c.name) === q,
  );
  if (exact) return exact.symbol;
  const found = matches(query, companies);
  if (found.length === 1) return found[0].symbol;
  if (found.length > 1)
    throw new Error("Several companies match. Choose a suggestion below.");
  const ticker = query.trim().toUpperCase().replace(/\.NS$/, "");
  if (!/^[A-Z0-9&-]{1,24}$/.test(ticker))
    throw new Error("Choose a suggested company or enter an exchange ticker.");
  return ticker;
}
export default function CompanySearch({
  companies,
  value,
  onChange,
  onOpen,
}: {
  companies: Company[];
  value: string;
  onChange: (s: string) => void;
  onOpen: (s: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [error, setError] = useState("");
  const suggestions = matches(value, companies);
  useEffect(() => {
    setActive(-1);
    setError("");
  }, [value]);
  function choose(symbol: string) {
    onChange(symbol);
    setOpen(false);
    setError("");
    onOpen(symbol);
  }
  return (
    <div className="company-search-wrap">
      <form
        className="research-search"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            choose(
              open && active >= 0
                ? suggestions[active].symbol
                : resolveCompany(value, companies),
            );
          } catch (e: any) {
            setError(e.message);
            setOpen(true);
          }
        }}
      >
        <Search size={20} />
        <input
          role="combobox"
          aria-label="Company name or ticker"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="company-suggestions"
          aria-activedescendant={
            open && active >= 0 ? `company-option-${active}` : undefined
          }
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Search a company, e.g. Jio, Axis Bank or TCS"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            } else if (e.key === "ArrowDown" && suggestions.length) {
              e.preventDefault();
              setOpen(true);
              setActive((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp" && suggestions.length) {
              e.preventDefault();
              setOpen(true);
              setActive(
                (i) => (i - 1 + suggestions.length) % suggestions.length,
              );
            }
          }}
        />
        <button className="primary" type="submit">
          Open company <ArrowRight size={16} />
        </button>
      </form>
      {open && suggestions.length > 0 && (
        <ul
          id="company-suggestions"
          className="company-suggestions"
          role="listbox"
          aria-label="Watchlist companies"
        >
          {suggestions.map((c, i) => (
            <li
              id={`company-option-${i}`}
              role="option"
              aria-selected={active === i}
              key={c.symbol}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(c.symbol)}
            >
              <span>{c.name}</span>
              <strong>{c.symbol}</strong>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="search-error" role="alert">
          {error}
        </p>
      )}
      <p className="search-help">
        Search by company name or ticker. Suggestions come from your watchlist.
      </p>
    </div>
  );
}
