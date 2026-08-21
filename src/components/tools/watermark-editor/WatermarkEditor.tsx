"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColorField, Label, NumberField, Select, Slider, TextField, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { downloadBlob } from "@/lib/zip";
import type { FontOption } from "@/lib/fonts";
import { canvasToBlob, ensureFonts, render, renderToCanvas, type FontMap } from "./renderer";
import {
  CANVAS_PRESETS,
  DEFAULT_CONFIG,
  defaultFontFor,
  findPreset,
  type ComposerConfig,
  type GradientDirection,
  type Language,
  type TextAlign,
  type TextBlock,
  type VerticalAlignment,
  type WatermarkMode,
  type WatermarkPosition,
} from "./types";

const SLUG = "watermark-editor";

const ALIGNMENTS: readonly TextAlign[] = ["left", "center", "right"];
const V_ALIGNMENTS: readonly VerticalAlignment[] = ["top", "middle", "bottom"];
const GRADIENT_DIRECTIONS: readonly GradientDirection[] = [
  "to right",
  "to bottom",
  "to bottom right",
  "to top right",
];
const POSITIONS: readonly WatermarkPosition[] = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right",
];
const MODES: readonly WatermarkMode[] = ["single", "grid"];
const SCALES = [0.5, 1, 2];

type BlockKey = "title" | "body";

export function WatermarkEditor({ fonts }: { fonts: FontOption[] }) {
  const toast = useToast();
  const { value: config, setValue: setConfig, hydrated } = useLocalStorage<ComposerConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const history = useHistory<ComposerConfig>(SLUG, 10);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [imageName, setImageName] = useState<string | null>(null);
  const [tab, setTab] = useState<BlockKey>("title");
  const [exportScale, setExportScale] = useState(1);
  const [exportType, setExportType] = useState<"png" | "jpeg">("png");

  const fontMap: FontMap = useMemo(
    () => Object.fromEntries(fonts.map((f) => [f.label, f.family])),
    [fonts],
  );
  const scriptFonts = useMemo(
    () => fonts.filter((f) => f.script === (config.language === "ur" ? "arabic" : "latin")),
    [fonts, config.language],
  );
  const preset = findPreset(config.preset);

  /* ── paint ────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureFonts(config, fontMap);
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = preset.width;
      canvas.height = preset.height;
      const ctx = canvas.getContext("2d");
      if (ctx) render(ctx, config, fontMap, imageRef.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [config, fontMap, preset.width, preset.height, imageVersion]);

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

  /* ── updates ──────────────────────────────────────────────────── */

  const set = useCallback(
    <K extends keyof ComposerConfig>(key: K, value: ComposerConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value })),
    [setConfig],
  );

  const patchBlock = useCallback(
    (key: BlockKey, patch: Partial<TextBlock>) =>
      setConfig((c) => ({ ...c, [key]: { ...c[key], ...patch } })),
    [setConfig],
  );

  const setMargin = useCallback(
    (key: BlockKey, side: keyof TextBlock["margins"], value: number) =>
      setConfig((c) => {
        const block = c[key];
        const margins = block.lockMargins
          ? { top: value, right: value, bottom: value, left: value }
          : { ...block.margins, [side]: value };
        return { ...c, [key]: { ...block, margins } };
      }),
    [setConfig],
  );

  const switchLanguage = useCallback(
    (language: Language) => {
      const font = defaultFontFor(language);
      setConfig((c) => ({
        ...c,
        language,
        title: { ...c.title, font },
        body: { ...c.body, font },
        watermark: { ...c.watermark, font },
      }));
    },
    [setConfig],
  );

  const onImageChosen = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageName(file.name);
        setImageVersion((v) => v + 1);
        setConfig((c) => ({ ...c, backgroundType: "image" }));
        toast(`Loaded ${file.name} — kept in this tab only, not saved`);
      };
      img.onerror = () => toast("Could not read that image");
      img.src = String(reader.result);
    };
    reader.onerror = () => toast("Could not read that file");
    reader.readAsDataURL(file);
  };

  const download = async () => {
    const canvas = renderToCanvas(config, fontMap, imageRef.current, exportScale);
    if (!canvas) {
      toast("Could not render the canvas");
      return;
    }
    const mime = exportType === "png" ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(canvas, mime, exportType === "jpeg" ? 0.92 : undefined);
    if (!blob) {
      toast("Export failed");
      return;
    }
    downloadBlob(blob, `composition-${canvas.width}x${canvas.height}.${exportType}`);
    toast(`Saved ${canvas.width}×${canvas.height} ${exportType.toUpperCase()}`);
  };

  const block = config[tab];
  const blockFonts = scriptFonts.length ? scriptFonts : fonts;
  const weightOptions = (fonts.find((f) => f.label === block.font) ?? fonts[0]).weights;

  return (
    <div className="space-y-6">
      {/* canvas */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={`${preset.width} × ${preset.height}`}>Live canvas</Label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              {imageName ? "Change image" : "Background image"}
            </button>
            {imageName ? (
              <button
                type="button"
                onClick={() => {
                  imageRef.current = null;
                  setImageName(null);
                  setImageVersion((v) => v + 1);
                  setConfig((c) => ({ ...c, backgroundType: "solid" }));
                }}
                className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
              >
                Remove image
              </button>
            ) : null}
            <div className="w-20">
              <Select
                value={String(exportScale)}
                options={SCALES.map(String)}
                onChange={(v) => setExportScale(Number(v))}
              />
            </div>
            <div className="w-24">
              <Select
                value={exportType}
                options={["png", "jpeg"] as const}
                onChange={(v) => setExportType(v)}
              />
            </div>
            <button
              type="button"
              onClick={download}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition hover:opacity-90"
            >
              Download
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

        <div className="checkerboard flex justify-center rounded-lg p-4">
          <canvas
            ref={canvasRef}
            className="max-h-[70vh] w-auto max-w-full rounded-md border border-border-soft"
            style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
          />
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          The preview <em>is</em> the export — same canvas code, so what you see is what downloads,
          at {Math.round(preset.width * exportScale)} × {Math.round(preset.height * exportScale)}{" "}
          pixels.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* global */}
        <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="canvas and script">Layout</Label>

          <div>
            <Label>language</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["en", "ur"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => switchLanguage(lang)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    config.language === lang
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                  }`}
                >
                  {lang === "en" ? "English" : "اردو"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">
              Urdu switches the text to right-to-left and swaps in the Nastaliq families.
            </p>
          </div>

          <div>
            <Label>canvas size</Label>
            <Select
              value={config.preset}
              options={CANVAS_PRESETS.map((p) => p.id)}
              onChange={(v) => set("preset", v)}
            />
            <p className="mt-1.5 text-xs text-fg-muted">
              {CANVAS_PRESETS.find((p) => p.id === config.preset)?.label}
            </p>
          </div>

          <div>
            <Label>vertical alignment</Label>
            <div className="grid grid-cols-3 gap-2">
              {V_ALIGNMENTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("verticalAlignment", v)}
                  className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize transition ${
                    config.verticalAlignment === v
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label hint={`${config.canvasPadding}px`}>canvas padding</Label>
            <Slider
              value={config.canvasPadding}
              min={0}
              max={300}
              onChange={(v) => set("canvasPadding", v)}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setConfig({ ...DEFAULT_CONFIG });
                toast("Reset to defaults");
              }}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset all
            </button>
          </div>
        </section>

        {/* background */}
        <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="solid, gradient or image">Background</Label>

          <div className="grid grid-cols-3 gap-2">
            {(["solid", "gradient", "image"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (t === "image" && !imageRef.current) {
                    fileRef.current?.click();
                    return;
                  }
                  set("backgroundType", t);
                }}
                className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize transition ${
                  config.backgroundType === t
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {config.backgroundType === "solid" ? (
            <div>
              <Label>colour</Label>
              <div className="flex items-center gap-2">
                <ColorField
                  value={config.backgroundColor}
                  onChange={(v) => set("backgroundColor", v)}
                />
                <span className="font-mono text-xs text-fg-muted">{config.backgroundColor}</span>
              </div>
            </div>
          ) : null}

          {config.backgroundType === "gradient" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>from</Label>
                  <ColorField
                    value={config.gradientStart}
                    onChange={(v) => set("gradientStart", v)}
                  />
                </div>
                <div>
                  <Label>to</Label>
                  <ColorField value={config.gradientEnd} onChange={(v) => set("gradientEnd", v)} />
                </div>
              </div>
              <div>
                <Label>direction</Label>
                <Select
                  value={config.gradientDirection}
                  options={GRADIENT_DIRECTIONS}
                  onChange={(v) => set("gradientDirection", v)}
                />
              </div>
            </div>
          ) : null}

          {config.backgroundType === "image" ? (
            <p className="text-xs text-fg-muted">
              {imageName ? (
                <>
                  Using <strong className="text-fg">{imageName}</strong>, scaled to cover the canvas.
                  It lives in this tab only — nothing is uploaded and nothing is written to storage,
                  so a reload starts clean.
                </>
              ) : (
                "Pick an image to use as the background."
              )}
            </p>
          ) : null}
        </section>
      </div>

      {/* text blocks */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint="title and body share these controls">Text</Label>
          <div className="flex gap-1 rounded-lg border border-border-soft bg-surface-2 p-1">
            {(["title", "body"] as BlockKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  tab === k ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
                }`}
              >
                {k}
              </button>
            ))}
            <Toggle checked={block.show} onChange={(v) => patchBlock(tab, { show: v })}>
              <span className="px-1 text-xs text-fg-muted">show</span>
            </Toggle>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label>text</Label>
              <textarea
                value={block.text}
                rows={tab === "title" ? 2 : 5}
                onChange={(e) => patchBlock(tab, { text: e.target.value })}
                dir={config.language === "ur" ? "rtl" : "ltr"}
                className="w-full resize-y rounded-md border border-border-soft bg-surface px-2.5 py-2 text-sm text-fg outline-none transition focus:border-accent"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>font</Label>
                <Select
                  value={block.font}
                  options={blockFonts.map((f) => f.label)}
                  onChange={(font) => {
                    const available = (fonts.find((f) => f.label === font) ?? fonts[0]).weights;
                    patchBlock(tab, {
                      font,
                      weight: available.includes(block.weight) ? block.weight : available[0],
                    });
                  }}
                />
              </div>
              <div>
                <Label>weight</Label>
                <Select
                  value={String(block.weight)}
                  options={weightOptions.map(String)}
                  onChange={(v) => patchBlock(tab, { weight: Number(v) })}
                />
              </div>
              <div>
                <Label hint={`${block.size}px`}>size</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={block.size}
                    min={8}
                    max={300}
                    onChange={(size) => patchBlock(tab, { size })}
                  />
                  <NumberField
                    value={block.size}
                    min={8}
                    max={600}
                    onChange={(size) => patchBlock(tab, { size })}
                    className="w-20"
                  />
                </div>
              </div>
              <div>
                <Label hint={`${block.lineHeight}`}>line height</Label>
                <Slider
                  value={block.lineHeight}
                  min={0.8}
                  max={3}
                  step={0.05}
                  onChange={(lineHeight) => patchBlock(tab, { lineHeight })}
                />
              </div>
            </div>

            <div>
              <Label>alignment</Label>
              <div className="grid grid-cols-3 gap-2">
                {ALIGNMENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => patchBlock(tab, { align: a })}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize transition ${
                      block.align === a
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>text colour</Label>
                <div className="flex items-center gap-2">
                  <ColorField value={block.color} onChange={(color) => patchBlock(tab, { color })} />
                  <span className="font-mono text-xs text-fg-muted">{block.color}</span>
                </div>
              </div>
              <div>
                <Label hint={block.backgroundColor === "transparent" ? "off" : undefined}>
                  block background
                </Label>
                <div className="flex items-center gap-2">
                  <ColorField
                    value={
                      block.backgroundColor === "transparent" ? "#ffffff" : block.backgroundColor
                    }
                    onChange={(backgroundColor) => patchBlock(tab, { backgroundColor })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patchBlock(tab, {
                        backgroundColor:
                          block.backgroundColor === "transparent" ? "#ffffff" : "transparent",
                      })
                    }
                    className="rounded-md border border-border-soft px-2 py-1.5 text-xs font-semibold text-fg-muted transition hover:border-accent hover:text-fg"
                  >
                    {block.backgroundColor === "transparent" ? "enable" : "clear"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label hint={`${block.strokeWidth}px`}>text outline</Label>
                <div className="flex items-center gap-2">
                  <ColorField
                    value={block.strokeColor === "transparent" ? "#000000" : block.strokeColor}
                    onChange={(strokeColor) => patchBlock(tab, { strokeColor })}
                  />
                  <NumberField
                    value={block.strokeWidth}
                    min={0}
                    max={40}
                    onChange={(strokeWidth) => patchBlock(tab, { strokeWidth })}
                  />
                </div>
              </div>
              <div>
                <Label hint={`${block.borderWidth}px`}>block border</Label>
                <div className="flex items-center gap-2">
                  <ColorField
                    value={block.borderColor === "transparent" ? "#000000" : block.borderColor}
                    onChange={(borderColor) => patchBlock(tab, { borderColor })}
                  />
                  <NumberField
                    value={block.borderWidth}
                    min={0}
                    max={40}
                    onChange={(borderWidth) => patchBlock(tab, { borderWidth })}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-fg-muted">
              These are two separate things now: the outline traces the glyphs, the border draws a
              rectangle around the block. The standalone tool applied one number to both at once.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label hint={`${block.padding}px`}>padding</Label>
                <Slider
                  value={block.padding}
                  min={0}
                  max={150}
                  onChange={(padding) => patchBlock(tab, { padding })}
                />
              </div>
              <div>
                <Label hint={`${block.borderRadius}px`}>corner radius</Label>
                <Slider
                  value={block.borderRadius}
                  min={0}
                  max={150}
                  onChange={(borderRadius) => patchBlock(tab, { borderRadius })}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  margins
                </span>
                <Toggle
                  checked={block.lockMargins}
                  onChange={(lockMargins) => patchBlock(tab, { lockMargins })}
                >
                  <span className="text-xs text-fg-muted">lock all</span>
                </Toggle>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <div key={side}>
                    <span className="mb-1 block text-[10px] uppercase text-fg-muted">{side}</span>
                    <NumberField
                      value={block.margins[side]}
                      min={0}
                      max={400}
                      onChange={(v) => setMargin(tab, side, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* watermark */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={config.watermark.show ? config.watermark.mode : "off"}>Watermark</Label>
          <Toggle
            checked={config.watermark.show}
            onChange={(show) => set("watermark", { ...config.watermark, show })}
          >
            <span className="text-xs text-fg-muted">show</span>
          </Toggle>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label>text</Label>
              <TextField
                value={config.watermark.text}
                onChange={(text) => set("watermark", { ...config.watermark, text })}
                placeholder="WATERMARK"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set("watermark", { ...config.watermark, mode: m })}
                      className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize transition ${
                        config.watermark.mode === m
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>colour</Label>
                <div className="flex items-center gap-2">
                  <ColorField
                    value={config.watermark.color}
                    onChange={(color) => set("watermark", { ...config.watermark, color })}
                  />
                  <span className="font-mono text-xs text-fg-muted">{config.watermark.color}</span>
                </div>
              </div>
            </div>

            {config.watermark.mode === "single" ? (
              <div>
                <Label>position</Label>
                <Select
                  value={config.watermark.position}
                  options={POSITIONS}
                  onChange={(position) => set("watermark", { ...config.watermark, position })}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <Label hint={`${Math.round(config.watermark.opacity * 100)}%`}>opacity</Label>
              <Slider
                value={config.watermark.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(opacity) => set("watermark", { ...config.watermark, opacity })}
              />
            </div>
            <div>
              <Label hint={`${config.watermark.size}px`}>size</Label>
              <Slider
                value={config.watermark.size}
                min={10}
                max={300}
                onChange={(size) => set("watermark", { ...config.watermark, size })}
              />
            </div>
            <div>
              <Label hint={`${config.watermark.rotation}°`}>rotation</Label>
              <Slider
                value={config.watermark.rotation}
                min={-180}
                max={180}
                onChange={(rotation) => set("watermark", { ...config.watermark, rotation })}
              />
            </div>
            {config.watermark.mode === "grid" ? (
              <div>
                <Label hint={`${config.watermark.gridSpacing}px`}>grid spacing</Label>
                <Slider
                  value={config.watermark.gridSpacing}
                  min={40}
                  max={600}
                  onChange={(gridSpacing) => set("watermark", { ...config.watermark, gridSpacing })}
                />
              </div>
            ) : (
              <div>
                <Label hint={`${config.watermark.inset}px`}>edge inset</Label>
                <Slider
                  value={config.watermark.inset}
                  min={0}
                  max={300}
                  onChange={(inset) => set("watermark", { ...config.watermark, inset })}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <Label hint="last 10, saved automatically">Recent compositions</Label>
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
            Your recent edits show up here, and survive a page reload. Background images are not
            part of a saved entry.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {history.entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setConfig({ ...e.value });
                    toast("Restored a recent composition");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border-soft px-3 py-2 text-left transition hover:border-accent"
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded border border-border-soft"
                    style={{
                      background:
                        e.value.backgroundType === "gradient"
                          ? `linear-gradient(${e.value.gradientDirection}, ${e.value.gradientStart}, ${e.value.gradientEnd})`
                          : e.value.backgroundColor,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-fg">
                      {e.value.title.text || e.value.body.text || "Untitled"}
                    </span>
                    <span className="block text-[11px] text-fg-muted">
                      {findPreset(e.value.preset).label}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
