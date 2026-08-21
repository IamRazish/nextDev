"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label, NumberField, Select, Slider, Toggle } from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { downloadBlob } from "@/lib/zip";
import { shapeLibrary } from "./presets";
import {
  buildClipPath,
  clamp,
  DEFAULT_CONFIG,
  insertPoint,
  isPolygon,
  regularPolygon,
  snapValue,
  toCss,
  toJson,
  toReact,
  toSvg,
  toTailwind,
  type ClipConfig,
  type FillRule,
  type Point,
  type ShapeType,
} from "./clippath";

const SLUG = "css-clip-path";

const TYPES: { id: ShapeType; label: string }[] = [
  { id: "polygon", label: "Polygon" },
  { id: "circle", label: "Circle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "inset", label: "Inset" },
];

const UNDO_LIMIT = 40;

export function ClipPathEditor() {
  const toast = useToast();
  const { value: config, setValue: setConfig, hydrated } = useLocalStorage<ClipConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const history = useHistory<ClipConfig>(SLUG, 10);

  // The traced image is deliberately NOT persisted — a data URL would blow the
  // localStorage quota on the first upload.
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [addMode, setAddMode] = useState(true);
  const [showCoords, setShowCoords] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const undoStack = useRef<Point[][]>([]);

  const clipPath = buildClipPath(config);
  const polygon = isPolygon(config);

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
    <K extends keyof ClipConfig>(key: K, value: ClipConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value })),
    [setConfig],
  );

  const commitPoints = useCallback(
    (points: Point[], remember = true) => {
      if (remember) {
        undoStack.current = [...undoStack.current, config.points].slice(-UNDO_LIMIT);
      }
      setConfig((c) => ({ ...c, points }));
    },
    [config.points, setConfig],
  );

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) {
      toast("Nothing left to undo");
      return;
    }
    setConfig((c) => ({ ...c, points: previous }));
    setActiveIndex(null);
  }, [setConfig, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && activeIndex !== null) {
        e.preventDefault();
        if (config.points.length <= 3) {
          toast("A polygon needs at least three points");
          return;
        }
        commitPoints(config.points.filter((_, i) => i !== activeIndex));
        setActiveIndex(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, commitPoints, config.points, toast, undo]);

  /* ── pointer interaction on the stage ─────────────────────────── */

  const pointFromEvent = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return { x: 0, y: 0 };
      return {
        x: snapValue(clamp(((clientX - rect.left) / rect.width) * 100), config),
        y: snapValue(clamp(((clientY - rect.top) / rect.height) * 100), config),
      };
    },
    [config],
  );

  useEffect(() => {
    if (draggingIndex === null) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const p = pointFromEvent(e.clientX, e.clientY);
      setConfig((c) => ({
        ...c,
        points: c.points.map((old, i) => (i === draggingIndex ? p : old)),
      }));
    };
    const onUp = () => setDraggingIndex(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingIndex, pointFromEvent, setConfig]);

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (!polygon || !addMode) return;
    if (e.target !== stageRef.current) return;
    const p = pointFromEvent(e.clientX, e.clientY);
    commitPoints(insertPoint(config.points, p));
  };

  /* ── actions ──────────────────────────────────────────────────── */

  const applyShape = (points: Point[], fillRule: FillRule, name: string) => {
    undoStack.current = [...undoStack.current, config.points].slice(-UNDO_LIMIT);
    setConfig((c) => ({ ...c, type: "polygon", points, fillRule }));
    setActiveIndex(null);
    toast(`Applied ${name}`);
  };

  const onImageChosen = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(String(reader.result));
      toast("Image loaded — trace over it, it is not saved to storage");
    };
    reader.onerror = () => toast("Could not read that file");
    reader.readAsDataURL(file);
  };

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(config) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(config) },
      { id: "react", label: "React", code: toReact(config) },
      { id: "svg", label: "SVG", code: toSvg(config, imageSrc ? "your-image.jpg" : null) },
      { id: "json", label: "JSON", code: toJson(config) },
    ],
    [config, imageSrc],
  );

  const gridStyle = config.showGrid
    ? {
        backgroundImage: `linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)`,
        backgroundSize: `${config.gridSize}% ${config.gridSize}%`,
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* stage */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={polygon ? `${config.points.length} points` : config.type}>
            Live preview
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            {polygon ? (
              <>
                <Toggle checked={addMode} onChange={setAddMode}>
                  <span className="text-xs text-fg-muted">Click to add</span>
                </Toggle>
                <button
                  type="button"
                  onClick={undo}
                  className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                  title="Ctrl+Z"
                >
                  Undo
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              {imageSrc ? "Change image" : "Trace an image"}
            </button>
            {imageSrc ? (
              <button
                type="button"
                onClick={() => setImageSrc(null)}
                className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
              >
                Remove image
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                downloadBlob(
                  new Blob([toSvg(config, imageSrc)], { type: "image/svg+xml" }),
                  "clip-path.svg",
                );
                toast(imageSrc ? "SVG downloaded with the image clipped" : "SVG downloaded");
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

        <div className="checkerboard flex justify-center overflow-auto rounded-lg p-4">
          <div
            ref={stageRef}
            onPointerDown={onStagePointerDown}
            className={`relative shrink-0 border border-dashed border-border-soft ${
              polygon && addMode ? "cursor-copy" : ""
            }`}
            style={{ width: config.width, height: config.height, ...gridStyle }}
          >
            {/* the clipped surface */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                clipPath,
                WebkitClipPath: clipPath,
                background: imageSrc
                  ? `center / cover no-repeat url(${imageSrc})`
                  : "linear-gradient(135deg, #6366f1, #ec4899)",
              }}
            />

            {/* outline + handles, polygon only */}
            {polygon ? (
              <>
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={config.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="0.4"
                    strokeDasharray="1.5 1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {config.points.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setActiveIndex(i);
                      setDraggingIndex(i);
                    }}
                    onKeyDown={(e) => {
                      const step = e.shiftKey ? 5 : 1;
                      const move = (dx: number, dy: number) =>
                        commitPoints(
                          config.points.map((old, j) =>
                            j === i
                              ? { x: clamp(old.x + dx), y: clamp(old.y + dy) }
                              : old,
                          ),
                          false,
                        );
                      if (e.key === "ArrowLeft") move(-step, 0);
                      if (e.key === "ArrowRight") move(step, 0);
                      if (e.key === "ArrowUp") move(0, -step);
                      if (e.key === "ArrowDown") move(0, step);
                    }}
                    aria-label={`Point ${i + 1} at ${p.x}%, ${p.y}%`}
                    className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 bg-white shadow transition active:cursor-grabbing ${
                      activeIndex === i ? "border-accent ring-2 ring-ring-soft" : "border-accent/60"
                    }`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  />
                ))}
              </>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-xs text-fg-muted">
          {polygon
            ? "Drag a handle to move it · click the stage to insert a point on the nearest edge · arrows nudge, Delete removes, Ctrl+Z undoes."
            : "Circle, ellipse and inset are driven by the numbers below — switch to Polygon to edit vertices by hand."}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* shape controls */}
        <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
          <div>
            <Label>shape function</Label>
            <div className="grid grid-cols-4 gap-2">
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

          {config.type === "circle" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label hint={`${config.circle.r}%`}>radius</Label>
                <Slider
                  value={config.circle.r}
                  min={0}
                  max={100}
                  onChange={(r) => set("circle", { ...config.circle, r })}
                />
              </div>
              <div>
                <Label>centre x</Label>
                <NumberField
                  value={config.circle.cx}
                  min={0}
                  max={100}
                  onChange={(cx) => set("circle", { ...config.circle, cx })}
                />
              </div>
              <div>
                <Label>centre y</Label>
                <NumberField
                  value={config.circle.cy}
                  min={0}
                  max={100}
                  onChange={(cy) => set("circle", { ...config.circle, cy })}
                />
              </div>
            </div>
          ) : null}

          {config.type === "ellipse" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label hint={`${config.ellipse.rx}%`}>radius x</Label>
                <Slider
                  value={config.ellipse.rx}
                  min={0}
                  max={100}
                  onChange={(rx) => set("ellipse", { ...config.ellipse, rx })}
                />
              </div>
              <div>
                <Label hint={`${config.ellipse.ry}%`}>radius y</Label>
                <Slider
                  value={config.ellipse.ry}
                  min={0}
                  max={100}
                  onChange={(ry) => set("ellipse", { ...config.ellipse, ry })}
                />
              </div>
              <div>
                <Label>centre x</Label>
                <NumberField
                  value={config.ellipse.cx}
                  min={0}
                  max={100}
                  onChange={(cx) => set("ellipse", { ...config.ellipse, cx })}
                />
              </div>
              <div>
                <Label>centre y</Label>
                <NumberField
                  value={config.ellipse.cy}
                  min={0}
                  max={100}
                  onChange={(cy) => set("ellipse", { ...config.ellipse, cy })}
                />
              </div>
            </div>
          ) : null}

          {config.type === "inset" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side}>
                  <Label hint={`${config.inset[side]}%`}>{side}</Label>
                  <Slider
                    value={config.inset[side]}
                    min={0}
                    max={50}
                    onChange={(v) => set("inset", { ...config.inset, [side]: v })}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label hint={`${config.inset.round}%`}>corner radius</Label>
                <Slider
                  value={config.inset.round}
                  min={0}
                  max={50}
                  onChange={(round) => set("inset", { ...config.inset, round })}
                />
              </div>
            </div>
          ) : null}

          {polygon ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label hint="self-intersecting outlines need even-odd">fill rule</Label>
                  <Select
                    value={config.fillRule}
                    options={["nonzero", "evenodd"] as readonly FillRule[]}
                    onChange={(v) => set("fillRule", v)}
                  />
                </div>
                <div>
                  <Label hint="regular n-gon">quick polygon</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 5, 6, 7, 8, 10, 12].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          applyShape(regularPolygon(n), "nonzero", `${n}-sided polygon`)
                        }
                        className="h-8 w-8 rounded-md border border-border-soft text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Toggle checked={config.snap} onChange={(v) => set("snap", v)}>
                  <span className="text-xs text-fg-muted">Snap to grid</span>
                </Toggle>
                <Toggle checked={config.showGrid} onChange={(v) => set("showGrid", v)}>
                  <span className="text-xs text-fg-muted">Show grid</span>
                </Toggle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted">grid</span>
                  <NumberField
                    value={config.gridSize}
                    min={1}
                    max={25}
                    onChange={(v) => set("gridSize", v)}
                    className="w-20"
                  />
                  <span className="text-xs text-fg-muted">%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowCoords((v) => !v)}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  {showCoords ? "Hide" : "Edit"} coordinates
                </button>
                <button
                  type="button"
                  onClick={() => applyShape(DEFAULT_CONFIG.points, "nonzero", "the default square")}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  Reset points
                </button>
              </div>
            </>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label hint="px">stage width</Label>
              <NumberField
                value={config.width}
                min={80}
                max={800}
                step={10}
                onChange={(v) => set("width", v)}
              />
            </div>
            <div>
              <Label hint="px">stage height</Label>
              <NumberField
                value={config.height}
                min={80}
                max={800}
                step={10}
                onChange={(v) => set("height", v)}
              />
            </div>
          </div>
        </section>

        {/* coordinates / export */}
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Label hint="css / tailwind / react / svg / json">Export</Label>
            <Toggle checked={config.webkitPrefix} onChange={(v) => set("webkitPrefix", v)}>
              <span className="text-xs text-fg-muted">-webkit- prefix</span>
            </Toggle>
          </div>
          <ExportPanel formats={formats} />

          {showCoords && polygon ? (
            <div className="mt-4">
              <Label hint={`${config.points.length} points`}>Coordinates</Label>
              <ul className="scroll-thin max-h-64 space-y-2 overflow-auto pr-1">
                {config.points.map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className={`w-6 shrink-0 text-center text-xs font-bold ${
                        activeIndex === i ? "text-accent" : "text-fg-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <NumberField
                      value={p.x}
                      min={0}
                      max={100}
                      onChange={(x) =>
                        commitPoints(
                          config.points.map((old, j) => (j === i ? { ...old, x: clamp(x) } : old)),
                          false,
                        )
                      }
                    />
                    <NumberField
                      value={p.y}
                      min={0}
                      max={100}
                      onChange={(y) =>
                        commitPoints(
                          config.points.map((old, j) => (j === i ? { ...old, y: clamp(y) } : old)),
                          false,
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (config.points.length <= 3) {
                          toast("A polygon needs at least three points");
                          return;
                        }
                        commitPoints(config.points.filter((_, j) => j !== i));
                      }}
                      aria-label={`Remove point ${i + 1}`}
                      className="shrink-0 rounded-md border border-border-soft px-2 py-1.5 text-xs font-bold text-fg-muted transition hover:border-red-500 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <Label hint={`${shapeLibrary.length} shapes`}>Shape library</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
          {shapeLibrary.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => applyShape(s.points, s.fillRule, s.name)}
              className="group rounded-lg border border-border-soft p-2 text-center transition hover:border-accent"
              title={s.name}
            >
              <span
                className="mb-1.5 block h-12 w-full bg-accent/70"
                style={{
                  clipPath: buildClipPath({
                    ...DEFAULT_CONFIG,
                    type: "polygon",
                    points: s.points,
                    fillRule: s.fillRule,
                  }),
                }}
              />
              <span className="block truncate text-[10px] font-semibold text-fg-muted transition group-hover:text-fg">
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <Label hint="last 10, saved automatically">Recent shapes</Label>
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
                onClick={() => {
                  setConfig({ ...e.value });
                  setActiveIndex(null);
                  toast("Restored a recent shape");
                }}
                title={e.value.type}
                className="h-14 w-14 rounded-lg border border-border-soft p-1 transition hover:border-accent"
              >
                <span
                  className="block h-full w-full bg-accent/70"
                  style={{ clipPath: buildClipPath(e.value) }}
                />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
