"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label, NumberField, Select, Slider, TextField, Toggle } from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { downloadBlob } from "@/lib/zip";
import { presetLibrary } from "./presets";
import {
  adjustColor,
  buildGradient,
  DEFAULT_CONFIG,
  hexToRgba,
  interpolate,
  newStop,
  POSITIONS,
  rgbaToCss,
  rgbaToHex,
  sortedStops,
  stopsFromImage,
  toCss,
  toReact,
  toSvg,
  toTailwind,
  type GradientConfig,
  type GradientType,
  type RadialShape,
  type Stop,
} from "./gradient";

const SLUG = "gradient-editor";

const TYPES: { id: GradientType; label: string }[] = [
  { id: "linear", label: "Linear" },
  { id: "radial", label: "Radial" },
  { id: "conic", label: "Conic" },
];

const ANGLE_SHORTCUTS = [
  { angle: 0, label: "↑" },
  { angle: 45, label: "↗" },
  { angle: 90, label: "→" },
  { angle: 135, label: "↘" },
  { angle: 180, label: "↓" },
  { angle: 270, label: "←" },
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const cloneConfig = (config: GradientConfig): GradientConfig => ({
  ...config,
  adjustments: { ...config.adjustments },
  stops: config.stops.map((s) => newStop(s.position, { ...s.color })),
});

export function GradientEditor() {
  const toast = useToast();
  const { value: config, setValue: setConfig, hydrated } = useLocalStorage<GradientConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const history = useHistory<GradientConfig>(SLUG, 10);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hexDraft, setHexDraft] = useState("");
  const barRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stops = useMemo(() => sortedStops(config), [config]);
  const active = stops.find((s) => s.id === activeId) ?? null;
  const gradient = buildGradient(config);

  // keep a stop selected so the stop panel is never empty for no reason
  useEffect(() => {
    if (!activeId && stops.length) setActiveId(stops[0].id);
  }, [activeId, stops]);

  useEffect(() => {
    if (active) setHexDraft(rgbaToHex({ ...active.color, a: 1 }));
  }, [active?.id, active?.color, active]);

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
    <K extends keyof GradientConfig>(key: K, value: GradientConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value })),
    [setConfig],
  );

  const patchStop = useCallback(
    (id: string, patch: Partial<Stop>) =>
      setConfig((c) => ({
        ...c,
        stops: c.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
    [setConfig],
  );

  const apply = useCallback(
    (next: GradientConfig, message?: string) => {
      const cloned = cloneConfig(next);
      setConfig(cloned);
      setActiveId(cloned.stops[0]?.id ?? null);
      if (message) toast(message);
    },
    [setConfig, toast],
  );

  /* ── stop bar interaction ─────────────────────────────────── */

  const positionFromClientX = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      patchStop(draggingId, { position: Number(positionFromClientX(e.clientX).toFixed(2)) });
    };
    const onUp = () => setDraggingId(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingId, patchStop, positionFromClientX]);

  const addStopAt = useCallback(
    (position: number) => {
      const list = sortedStops(config);
      if (!list.length) return;
      let before = list[0];
      let after = list[list.length - 1];
      for (let i = 0; i < list.length - 1; i++) {
        if (position >= list[i].position && position <= list[i + 1].position) {
          before = list[i];
          after = list[i + 1];
          break;
        }
      }
      const span = after.position - before.position;
      const ratio = span === 0 ? 0 : (position - before.position) / span;
      const stop = newStop(
        Number(position.toFixed(2)),
        interpolate(before.color, after.color, clamp(ratio, 0, 1)),
      );
      setConfig((c) => ({ ...c, stops: [...c.stops, stop] }));
      setActiveId(stop.id);
    },
    [config, setConfig],
  );

  const removeStop = useCallback(
    (id: string) => {
      if (config.stops.length <= 2) {
        toast("A gradient needs at least two stops");
        return;
      }
      setConfig((c) => ({ ...c, stops: c.stops.filter((s) => s.id !== id) }));
      if (activeId === id) setActiveId(null);
    },
    [activeId, config.stops.length, setConfig, toast],
  );

  /* ── whole-gradient actions ───────────────────────────────── */

  const reverse = () =>
    setConfig((c) => ({
      ...c,
      stops: c.stops.map((s) => ({ ...s, position: Number((100 - s.position).toFixed(2)) })),
    }));

  const distribute = () =>
    setConfig((c) => {
      const list = [...c.stops].sort((a, b) => a.position - b.position);
      return {
        ...c,
        stops: list.map((s, i) => ({
          ...s,
          position: list.length === 1 ? 0 : Number(((i / (list.length - 1)) * 100).toFixed(2)),
        })),
      };
    });

  const onImageChosen = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sampled = stopsFromImage(img, 5);
        if (!sampled.length) {
          toast("Could not read that image");
          return;
        }
        setConfig((c) => ({ ...c, stops: sampled }));
        setActiveId(sampled[0].id);
        toast("Sampled 5 colours from the image");
      };
      img.onerror = () => toast("Could not read that image");
      img.src = String(reader.result);
    };
    reader.onerror = () => toast("Could not read that file");
    reader.readAsDataURL(file);
  };

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(config) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(config) },
      { id: "react", label: "React", code: toReact(config) },
      { id: "svg", label: "SVG", code: toSvg(config) },
    ],
    [config],
  );

  const showAngle = config.type === "linear" || config.type === "conic";
  const showPosition = config.type === "radial" || config.type === "conic";

  return (
    <div className="space-y-6">
      {/* preview + stop bar */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={`${stops.length} stops · ${config.type}`}>Live preview</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reverse}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reverse
            </button>
            <button
              type="button"
              onClick={distribute}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Even spacing
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Sample image
            </button>
            <button
              type="button"
              onClick={() => {
                downloadBlob(new Blob([toSvg(config, 640)], { type: "image/svg+xml" }), "gradient.svg");
                toast("SVG downloaded");
              }}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Download SVG
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageChosen(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="checkerboard rounded-lg p-2">
          <div className="h-64 rounded-md border border-border-soft" style={{ background: gradient }} />
        </div>

        {/* the stop bar: click to add, drag a handle to move */}
        <div className="mt-6 pb-7">
          <div
            ref={barRef}
            onPointerDown={(e) => {
              if (e.target !== barRef.current) return;
              addStopAt(positionFromClientX(e.clientX));
            }}
            className="checkerboard relative h-9 cursor-copy rounded-md border border-border-soft"
            title="Click to add a stop"
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-[5px]"
              style={{
                background: `linear-gradient(90deg, ${stops
                  .map(
                    (s) =>
                      `${rgbaToCss(adjustColor(s.color, config.adjustments))} ${s.position}%`,
                  )
                  .join(", ")})`,
              }}
            />
            {stops.map((stop) => {
              const isActive = stop.id === activeId;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setActiveId(stop.id);
                    setDraggingId(stop.id);
                  }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 10 : 1;
                    if (e.key === "ArrowLeft")
                      patchStop(stop.id, { position: clamp(stop.position - step, 0, 100) });
                    if (e.key === "ArrowRight")
                      patchStop(stop.id, { position: clamp(stop.position + step, 0, 100) });
                    if (e.key === "Backspace" || e.key === "Delete") removeStop(stop.id);
                  }}
                  aria-label={`Stop at ${Math.round(stop.position)}%`}
                  className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 shadow-md transition active:cursor-grabbing ${
                    isActive ? "border-accent ring-2 ring-ring-soft" : "border-white"
                  }`}
                  style={{
                    left: `${stop.position}%`,
                    background: rgbaToCss(adjustColor(stop.color, config.adjustments)),
                  }}
                >
                  <span
                    className={`absolute left-1/2 top-full mt-1.5 -translate-x-1/2 text-[10px] font-bold tabular-nums ${
                      isActive ? "text-accent" : "text-fg-muted"
                    }`}
                  >
                    {Math.round(stop.position)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* stop editor */}
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint={active ? `stop at ${Math.round(active.position)}%` : "no stop selected"}>
            Colour stop
          </Label>

          {!active ? (
            <p className="text-xs text-fg-muted">Click a handle on the bar to edit its colour.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>colour</Label>
                  <div className="flex items-center gap-2">
                    <label
                      className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-soft"
                      style={{ background: rgbaToCss(active.color) }}
                    >
                      <input
                        type="color"
                        value={rgbaToHex({ ...active.color, a: 1 })}
                        onChange={(e) => {
                          const rgb = hexToRgba(e.target.value);
                          if (rgb) patchStop(active.id, { color: { ...rgb, a: active.color.a } });
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Stop colour"
                      />
                    </label>
                    <TextField
                      value={hexDraft}
                      invalid={hexToRgba(hexDraft) === null}
                      placeholder="#ff0080"
                      onChange={(v) => {
                        setHexDraft(v);
                        const rgb = hexToRgba(v);
                        if (rgb) patchStop(active.id, { color: { ...rgb, a: active.color.a } });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label hint={`${Math.round(active.position)}%`}>position</Label>
                  <NumberField
                    value={Number(active.position.toFixed(2))}
                    min={0}
                    max={100}
                    onChange={(position) =>
                      patchStop(active.id, { position: clamp(position, 0, 100) })
                    }
                  />
                </div>
              </div>

              <div>
                <Label hint={`${Math.round(active.color.a * 100)}%`}>opacity</Label>
                <Slider
                  value={active.color.a}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(a) => patchStop(active.id, { color: { ...active.color, a } })}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addStopAt(clamp(active.position + 10, 0, 100))}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  Add stop
                </button>
                <button
                  type="button"
                  onClick={() => removeStop(active.id)}
                  disabled={config.stops.length <= 2}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-red-500 hover:text-red-500 disabled:opacity-40"
                >
                  Remove stop
                </button>
              </div>
              <p className="text-xs text-fg-muted">
                Handles take the keyboard too: arrows nudge, Shift+arrow jumps 10%, Delete removes.
              </p>
            </div>
          )}
        </section>

        {/* geometry + adjustments */}
        <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
          <div>
            <Label>type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set("type", t.id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                    config.type === t.id
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {showAngle ? (
            <div>
              <Label hint={`${config.angle}°`}>angle</Label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {ANGLE_SHORTCUTS.map((a) => (
                  <button
                    key={a.angle}
                    type="button"
                    onClick={() => set("angle", a.angle)}
                    title={`${a.angle}°`}
                    className={`h-8 w-8 rounded-md border text-sm transition ${
                      config.angle === a.angle
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Slider value={config.angle} min={0} max={360} onChange={(v) => set("angle", v)} />
                <NumberField
                  value={config.angle}
                  min={0}
                  max={360}
                  onChange={(v) => set("angle", v)}
                  className="w-20"
                />
              </div>
            </div>
          ) : null}

          {showPosition ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {config.type === "radial" ? (
                <div>
                  <Label>shape</Label>
                  <Select
                    value={config.radialShape}
                    options={["circle", "ellipse"] as readonly RadialShape[]}
                    onChange={(v) => set("radialShape", v)}
                  />
                </div>
              ) : null}
              <div>
                <Label>position</Label>
                <Select
                  value={config.position}
                  options={POSITIONS}
                  onChange={(v) => set("position", v)}
                />
              </div>
            </div>
          ) : null}

          <div>
            <Label hint={`${config.adjustments.hue}°`}>hue shift</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={config.adjustments.hue}
                min={-180}
                max={180}
                onChange={(hue) => set("adjustments", { ...config.adjustments, hue })}
              />
              <NumberField
                value={config.adjustments.hue}
                min={-180}
                max={180}
                onChange={(hue) => set("adjustments", { ...config.adjustments, hue })}
                className="w-20"
              />
            </div>
          </div>

          <div>
            <Label hint={`${Math.round(config.adjustments.saturation * 100)}%`}>saturation</Label>
            <Slider
              value={config.adjustments.saturation}
              min={0}
              max={2}
              step={0.01}
              onChange={(saturation) => set("adjustments", { ...config.adjustments, saturation })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => set("adjustments", { hue: 0, saturation: 1 })}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Clear adjustments
            </button>
            <button
              type="button"
              onClick={() => apply(DEFAULT_CONFIG, "Reset to defaults")}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset all
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint="css / tailwind / react / svg">Export</Label>
          <Toggle checked={config.legacyPrefixes} onChange={(v) => set("legacyPrefixes", v)}>
            <span className="text-xs text-fg-muted">Legacy vendor prefixes</span>
          </Toggle>
        </div>
        <ExportPanel formats={formats} />
        <p className="mt-3 text-xs text-fg-muted">
          The <code className="font-mono">background-color</code> line is the flat fallback: the
          first stop, for anything that cannot paint a gradient.
        </p>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <Label hint={`${presetLibrary.length} presets`}>Preset gallery</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {presetLibrary.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => apply(p.config, `Applied ${p.name}`)}
              className="group overflow-hidden rounded-lg border border-border-soft text-left transition hover:border-accent"
            >
              <span className="block h-20 w-full" style={{ background: buildGradient(p.config) }} />
              <span className="block px-2.5 py-2 text-[11px] font-semibold text-fg-muted transition group-hover:text-fg">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <Label hint="last 10, saved automatically">Recent gradients</Label>
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
                onClick={() => apply(e.value, "Restored a recent gradient")}
                title={`${e.value.type} · ${e.value.stops.length} stops`}
                className="h-14 w-14 rounded-lg border border-border-soft transition hover:border-accent"
                style={{ background: buildGradient(e.value) }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
