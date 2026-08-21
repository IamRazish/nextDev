"use client";

import { useCallback, useState } from "react";
import { Label, Select } from "@/components/ui/Field";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyButton } from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  analyzeCss,
  mergedStylesheet,
  SAMPLE_CSS,
  type Analysis,
  type CssSyntax,
} from "./analyze";

const SLUG = "css-duplicate-checker";
const SYNTAXES: readonly CssSyntax[] = ["css", "scss", "less"];

const ruleCss = (selector: string, properties: { prop: string; value: string }[]) =>
  [`${selector} {`, ...properties.map((p) => `  ${p.prop}: ${p.value};`), "}"].join("\n");

export function CssDuplicateChecker() {
  const toast = useToast();
  const { value: source, setValue: setSource } = useLocalStorage<string>(
    `nextdev:${SLUG}:source`,
    "",
  );
  const { value: syntax, setValue: setSyntax } = useLocalStorage<CssSyntax>(
    `nextdev:${SLUG}:syntax`,
    "css",
  );

  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const analyze = useCallback(() => {
    if (!source.trim()) {
      toast("Paste some CSS first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const analysis = analyzeCss(source, syntax);
      setResult(analysis);
      const found = analysis.duplicateSelectors.length + analysis.duplicateProperties.length;
      toast(found ? `Found ${found} issue${found === 1 ? "" : "s"}` : "No duplicates found");
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Could not parse that");
    } finally {
      setBusy(false);
    }
  }, [source, syntax, toast]);

  const lines = source ? source.split("\n").length : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-40">
            <Label hint={lines ? `${lines} lines` : undefined}>Stylesheet</Label>
            <Select
              value={syntax}
              options={SYNTAXES}
              onChange={(v) => {
                setSyntax(v);
                setResult(null);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSource(SAMPLE_CSS);
                setResult(null);
              }}
              className="rounded-lg border border-border-soft px-2.5 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={() => {
                setSource("");
                setResult(null);
                setError(null);
              }}
              className="rounded-lg border border-border-soft px-2.5 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={analyze}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              Analyse {syntax.toUpperCase()}
            </button>
          </div>
        </div>

        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          rows={14}
          placeholder={`/* Paste ${syntax.toUpperCase()} here, or load the sample */`}
          className="scroll-thin w-full resize-y rounded-lg border border-border-soft bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg outline-none transition focus:border-accent"
        />

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-fg">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <>
          <section className="rounded-xl border border-border-soft bg-surface p-5">
            <Label hint={result.hasAtRules ? "at-rules kept separate" : undefined}>Summary</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "rules", value: result.totals.rules },
                { label: "declarations", value: result.totals.declarations },
                { label: "unique selectors", value: result.totals.selectors },
                { label: "redundant", value: result.totals.redundant, tone: "warn" },
                { label: "overridden", value: result.totals.overridden, tone: "bad" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5"
                >
                  <span
                    className={`block text-xl font-black tabular-nums ${
                      stat.tone === "bad" && stat.value > 0
                        ? "text-red-500"
                        : stat.tone === "warn" && stat.value > 0
                          ? "text-amber-500"
                          : "text-fg"
                    }`}
                  >
                    {stat.value}
                  </span>
                  <span className="block text-[11px] uppercase tracking-wide text-fg-muted">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              <strong className="text-fg">Redundant</strong> declarations repeat a value that is
              already set, so deleting them changes nothing.{" "}
              <strong className="text-fg">Overridden</strong> ones set a different value that a
              later declaration wins over — those are where bugs hide.
            </p>
          </section>

          {result.duplicateSelectors.length === 0 && result.duplicateProperties.length === 0 ? (
            <section className="rounded-xl border border-border-soft bg-surface p-8 text-center">
              <p className="text-2xl">✅</p>
              <h3 className="mt-2 text-sm font-bold text-fg">No duplicates found</h3>
              <p className="mt-1 text-xs text-fg-muted">
                Every selector appears once per context, and no property is set twice.
              </p>
            </section>
          ) : null}

          {result.duplicateSelectors.length ? (
            <section className="rounded-xl border border-border-soft bg-surface p-5">
              <Label hint={`${result.duplicateSelectors.length} selectors`}>
                Duplicate selectors
              </Label>
              <ul className="space-y-4">
                {result.duplicateSelectors.map((dupe) => {
                  const merged = result.mergedSelectors.find(
                    (m) => m.selector === dupe.selector && m.context === dupe.context,
                  );
                  return (
                    <li
                      key={`${dupe.selector}|${dupe.context}`}
                      className="rounded-lg border border-border-soft bg-surface-2 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <code className="block truncate font-mono text-sm font-bold text-fg">
                            {dupe.selector}
                          </code>
                          <span className="text-[11px] text-fg-muted">
                            {dupe.blocks.length} blocks
                            {dupe.context === "root" ? "" : ` · inside ${dupe.context}`}
                          </span>
                        </div>
                        {merged ? (
                          <CopyButton
                            text={ruleCss(merged.selector, merged.properties)}
                            label="Copy merged rule"
                          />
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {dupe.blocks.map((block) => (
                          <div
                            key={block.index}
                            className="rounded-md border border-border-soft bg-surface p-3"
                          >
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-fg-muted">
                              block {block.index} · lines {block.startLine}–{block.endLine}
                            </span>
                            <ul className="space-y-0.5 font-mono text-[11px] text-fg-muted">
                              {block.declarations.map((decl, i) => (
                                <li key={i}>
                                  <span className="text-fg">{decl.prop}</span>: {decl.value};
                                </li>
                              ))}
                              {block.declarations.length === 0 ? <li>{"/* empty */"}</li> : null}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {result.duplicateProperties.length ? (
            <section className="rounded-xl border border-border-soft bg-surface p-5">
              <Label hint={`${result.duplicateProperties.length} properties`}>
                Duplicate properties
              </Label>
              <ul className="space-y-2">
                {result.duplicateProperties.map((dupe) => (
                  <li
                    key={`${dupe.selector}|${dupe.context}|${dupe.property}`}
                    className="rounded-lg border border-border-soft bg-surface-2 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          dupe.identical
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-red-500/15 text-red-500"
                        }`}
                      >
                        {dupe.identical ? "redundant" : "overridden"}
                      </span>
                      <code className="font-mono text-xs font-bold text-fg">
                        {dupe.selector}
                      </code>
                      <span className="text-xs text-fg-muted">→</span>
                      <code className="font-mono text-xs text-fg">{dupe.property}</code>
                      {dupe.context === "root" ? null : (
                        <span className="text-[11px] text-fg-muted">in {dupe.context}</span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
                      {dupe.occurrences.map((o, i) => {
                        const last = i === dupe.occurrences.length - 1;
                        return (
                          <li key={i} className={last ? "text-fg" : "text-fg-muted line-through"}>
                            line {o.line}: {o.value}
                            {last ? "  ← applies" : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-xl border border-border-soft bg-surface p-5">
            <Label hint="duplicates collapsed, last value wins">Merged stylesheet</Label>
            <CodeBlock code={mergedStylesheet(result)} caption="merged" />
            <p className="mt-3 text-xs text-fg-muted">
              One rule per selector per context, in source order. This is what the browser ends up
              applying — check it before pasting over the original.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
