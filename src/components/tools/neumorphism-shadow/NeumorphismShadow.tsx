"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColorField, Label, NumberField, Slider, TextField } from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { presetLibrary } from "./presets";
import {
  contrastWarning,
  DEFAULT_CONFIG,
  isHex,
  normalizeHex,
  previewStyle,
  shadowColors,
  toCss,
  toReact,
  toTailwind,
  type LightSource,
  type NeuConfig,
  type Shape,
} from "./neumorphism";

const SLUG = "neumorphism-shadow";

const SHAPES: { id: Shape; label: string; hint: string }[] = [
  { id: "flat", label: "Flat", hint: "Solid face, outer shadows" },
  { id: "convex", label: "Convex", hint: "Bulges towards the light" },
  { id: "concave", label: "Concave", hint: "Dips away from the light" },
  { id: "pressed", label: "Pressed", hint: "Shadows move inside" },
];

const LIGHT_SOURCES: { id: LightSource; label: string }[] = [
  { id: "top-left", label: "↖" },
  { id: "top-right", label: "↗" },
  { id: "bottom-left", label: "↙" },
  { id: "bottom-right", label: "↘" },
];

const SLIDERS: {
  key: keyof Pick<NeuConfig, "size" | "radius" | "distance" | "intensity" | "blur">;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}[] = [
  { key: "size", label: "Size", min: 50, max: 400, step: 10, suffix: "px" },
  { key: "radius", label: "Radius", min: 0, max: 200, step: 1, suffix: "px" },
  { key: "distance", label: "Distance", min: 0, max: 50, step: 1, suffix: "px" },
  { key: "intensity", label: "Intensity", min: 0.01, max: 0.3, step: 0.01 },
  { key: "blur", label: "Blur", min: 0, max: 100, step: 1, suffix: "px" },
];

export function NeumorphismShadow() {
  const toast = useToast();
  const { value: config, setValue: setConfig, hydrated } = useLocalStorage<NeuConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const history = useHistory<NeuConfig>(SLUG, 10);

  // the hex text field keeps its own draft so half-typed values do not reset it
  const [hexDraft, setHexDraft] = useState(config.baseColor);
  useEffect(() => setHexDraft(config.baseColor), [config.baseColor]);

  const skipFirstPush = useRef(true);
  const pushHistory = history.push;
  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPush.current) {
      skipFirstPush.current = false;
      return;
    }
    const t = window.setTimeout(() => pushHistory(config), 900);
    return () => window.clearTimeout(t);
  }, [config, hydrated, pushHistory]);

  const set = useCallback(
    <K extends keyof NeuConfig>(key: K, value: NeuConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value })),
    [setConfig],
  );

  const apply = useCallback(
    (next: NeuConfig, message?: string) => {
      setConfig({ ...next });
      if (message) toast(message);
    },
    [setConfig, toast],
  );

  const { light, dark } = shadowColors(config);
  const warning = contrastWarning(config);

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(config) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(config) },
      { id: "react", label: "React", code: toReact(config) },
    ],
    [config],
  );

  return (
    <div className="space-y-6">
      {/* preview — its background has to match the element or the illusion dies */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={`${config.shape} · light from ${config.lightSource}`}>Live preview</Label>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-full border border-border-soft"
                style={{ background: light }}
              />
              <code className="font-mono">{light}</code>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-full border border-border-soft"
                style={{ background: dark }}
              />
              <code className="font-mono">{dark}</code>
            </span>
          </div>
        </div>

        <div
          className="flex min-h-[420px] items-center justify-center overflow-auto rounded-lg p-8 transition-colors"
          style={{ background: config.baseColor }}
        >
          <div style={previewStyle(config)} />
        </div>

        {warning ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-fg">
            {warning}
          </p>
        ) : (
          <p className="mt-3 text-xs text-fg-muted">
            The canvas is painted in your base colour on purpose — neumorphism only reads as depth
            when the element and its parent share one colour.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="base colour, shape, light">Surface</Label>

          <div className="space-y-4">
            <div>
              <Label>base colour</Label>
              <div className="flex items-center gap-2">
                <ColorField
                  value={config.baseColor}
                  onChange={(v) => set("baseColor", v)}
                  className="h-10 w-10"
                />
                <TextField
                  value={hexDraft}
                  invalid={!isHex(hexDraft)}
                  placeholder="#e0e0e0"
                  onChange={(v) => {
                    setHexDraft(v);
                    if (isHex(v)) set("baseColor", normalizeHex(v));
                  }}
                />
              </div>
            </div>

            <div>
              <Label>shape</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => set("shape", s.id)}
                    title={s.hint}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                      config.shape === s.id
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-fg-muted">
                {SHAPES.find((s) => s.id === config.shape)?.hint}
              </p>
            </div>

            <div>
              <Label hint={config.lightSource}>light source</Label>
              <div className="grid w-28 grid-cols-2 gap-1.5">
                {LIGHT_SOURCES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => set("lightSource", l.id)}
                    aria-label={`Light from ${l.id}`}
                    className={`grid h-10 place-items-center rounded-lg border text-base transition ${
                      config.lightSource === l.id
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="size and shadow">Controls</Label>
          <div className="space-y-4">
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <Label hint={`${config[s.key]}${s.suffix ?? ""}`}>{s.label}</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={config[s.key]}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    onChange={(v) => set(s.key, v)}
                  />
                  <NumberField
                    value={config[s.key]}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    onChange={(v) => set(s.key, v)}
                    className="w-24"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => apply(DEFAULT_CONFIG, "Reset to defaults")}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset all
            </button>
            <button
              type="button"
              onClick={() =>
                set(
                  "lightSource",
                  config.lightSource === "top-left"
                    ? "bottom-right"
                    : config.lightSource === "bottom-right"
                      ? "top-left"
                      : config.lightSource === "top-right"
                        ? "bottom-left"
                        : "top-right",
                )
              }
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Flip light
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <Label hint="css / tailwind / react">Export</Label>
        <ExportPanel formats={formats} />
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <Label hint={`${presetLibrary.length} presets`}>Preset library</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {presetLibrary.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => apply(p.config, `Applied ${p.name}`)}
              className="group rounded-lg border border-border-soft p-3 text-left transition hover:border-accent"
            >
              <span
                className="mb-2 flex h-24 items-center justify-center rounded-md"
                style={{ background: p.config.baseColor }}
              >
                <span
                  style={{
                    ...previewStyle(p.config),
                    width: 52,
                    height: 52,
                    borderRadius: Math.min(p.config.radius, 26),
                  }}
                />
              </span>
              <span className="block text-xs font-bold text-fg">{p.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <Label hint="last 10, saved automatically">Recent designs</Label>
          {history.entries.length ? (
            <button
              type="button"
              onClick={history.clear}
              className="mb-1.5 text-xs font-semibold text-fg-muted transition hover:text-fg"
            >
              Clear
            </button>
          ) : null}
        </div>
        {history.entries.length === 0 ? (
          <p className="text-xs text-fg-muted">
            Your recent edits show up here, and survive a page reload.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {history.entries.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => apply(e.value, "Restored a recent design")}
                title={`${e.value.shape} · ${e.value.baseColor}`}
                className="grid h-16 w-16 place-items-center rounded-lg border border-border-soft transition hover:border-accent"
                style={{ background: e.value.baseColor }}
              >
                <span
                  style={{
                    ...previewStyle(e.value),
                    width: 34,
                    height: 34,
                    borderRadius: Math.min(e.value.radius, 17),
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
