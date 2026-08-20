"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tools } from "@/lib/tools";

function score(query: string, haystack: string) {
  const q = query.toLowerCase();
  const h = haystack.toLowerCase();
  const i = h.indexOf(q);
  if (i === -1) return -1;
  return i === 0 ? 2 : 1;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return tools;
    return tools
      .map((t) => ({
        tool: t,
        rank: Math.max(
          score(query, t.name),
          score(query, t.tagline),
          ...t.keywords.map((k) => score(query, k)),
        ),
      }))
      .filter((r) => r.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .map((r) => r.tool);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // focus after the dialog paints
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  const go = (slug: string) => {
    onOpenChange(false);
    router.push(`/tools/${slug}`);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border-soft bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border-soft px-4">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-fg-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === "Enter" && results[cursor]) go(results[cursor].slug);
            }}
            placeholder="Search tools…"
            className="w-full bg-transparent py-3.5 text-sm text-fg outline-none placeholder:text-fg-muted"
          />
          <kbd className="rounded border border-border-soft px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
            esc
          </kbd>
        </div>
        <ul className="scroll-thin max-h-80 overflow-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-fg-muted">No tool matches that.</li>
          ) : (
            results.map((t, i) => (
              <li key={t.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(t.slug)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    i === cursor ? "bg-surface-2" : ""
                  }`}
                >
                  <span className="text-lg leading-none">{t.glyph}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{t.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{t.tagline}</span>
                  </span>
                  {t.status === "planned" ? (
                    <span className="rounded-full border border-border-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-fg-muted">
                      soon
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
