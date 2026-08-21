"use client";

import { toCanvas } from "html-to-image";
import { useCallback, useMemo, useRef, useState } from "react";
import { ColorField, Label, NumberField, Select, Slider, TextField, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { canvasToBlob } from "@/lib/canvas";
import { downloadBlob } from "@/lib/zip";
import "./code-theme.css";
import { countLines, EXTENSIONS, highlight, LANGUAGES } from "./highlight";

const SLUG = "code-to-image";

const DEFAULT_CODE = `// Paste code, drop a file, or just start typing.
// The card grows with the content.

function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome to the nextDev Toolsuite!\`;
}

const result = greet("Developer");
console.log(result);`;

const GRADIENTS = [
  { id: "purple", label: "Purple", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "ocean", label: "Ocean", value: "linear-gradient(135deg, #667eea 0%, #f093fb 100%)" },
  { id: "fire", label: "Fire", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "sunset", label: "Sunset", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { id: "ice", label: "Ice", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: "forest", label: "Forest", value: "linear-gradient(135deg, #0ba360 0%, #3cba92 100%)" },
  { id: "midnight", label: "Midnight", value: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
  { id: "candy", label: "Candy", value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" },
] as const;

type BackgroundType = "gradient" | "solid" | "transparent";
type CodeTheme = "dark" | "light";
type WatermarkType = "text" | "avatar" | "handle";

type ShotConfig = {
  code: string;
  language: string;
  theme: CodeTheme;
  backgroundType: BackgroundType;
  gradient: string;
  solidColor: string;
  padding: number;
  radius: number;
  fontSize: number;
  codeWidth: number;
  lineNumbers: boolean;
  showChrome: boolean;
  showDots: boolean;
  showTitle: boolean;
  title: string;
  watermark: {
    show: boolean;
    type: WatermarkType;
    text: string;
    fontSize: number;
    color: string;
  };
};

const DEFAULT_CONFIG: ShotConfig = {
  code: DEFAULT_CODE,
  language: "javascript",
  theme: "dark",
  backgroundType: "gradient",
  gradient: "purple",
  solidColor: "#667eea",
  padding: 64,
  radius: 12,
  fontSize: 14,
  codeWidth: 640,
  lineNumbers: false,
  showChrome: true,
  showDots: true,
  showTitle: true,
  title: "code.js",
  watermark: { show: false, type: "handle", text: "@username", fontSize: 16, color: "#ffffff" },
};

export function CodeToImage() {
  const toast = useToast();
  const { value: config, setValue: setConfig } = useLocalStorage<ShotConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  // The avatar is a data URL, so it stays out of the persisted config.
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const set = useCallback(
    <K extends keyof ShotConfig>(key: K, value: ShotConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value })),
    [setConfig],
  );

  const setWatermark = useCallback(
    (patch: Partial<ShotConfig["watermark"]>) =>
      setConfig((c) => ({ ...c, watermark: { ...c.watermark, ...patch } })),
    [setConfig],
  );

  const highlighted = useMemo(() => highlight(config.code, config.language), [
    config.code,
    config.language,
  ]);
  const lineCount = countLines(config.code);

  const background =
    config.backgroundType === "transparent"
      ? "transparent"
      : config.backgroundType === "solid"
        ? config.solidColor
        : (GRADIENTS.find((g) => g.id === config.gradient) ?? GRADIENTS[0]).value;

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const ext = file.name.split(".").pop()?.toLowerCase();
      setConfig((c) => ({
        ...c,
        code: text,
        language: ext && EXTENSIONS[ext] ? EXTENSIONS[ext] : c.language,
        title: file.name,
      }));
      toast(`Loaded ${file.name}`);
    };
    reader.onerror = () => toast("Could not read that file");
    reader.readAsText(file);
  };

  const exportImage = async (format: "png" | "jpeg") => {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    try {
      // html-to-image's toBlob always writes a PNG — it has no `type` option —
      // so render to a canvas and encode from there.
      const transparent = config.backgroundType === "transparent";
      const canvas = await toCanvas(node, {
        pixelRatio: 2,
        // JPEG has no alpha: without a sheet behind it, transparency turns black
        backgroundColor: transparent && format === "jpeg" ? "#ffffff" : undefined,
      });
      const blob = await canvasToBlob(
        canvas,
        format === "png" ? "image/png" : "image/jpeg",
        format === "jpeg" ? 0.95 : undefined,
      );
      if (!blob) {
        toast("Export failed — try again");
        return;
      }
      downloadBlob(blob, `code-${Date.now().toString(36)}.${format}`);
      toast(`Saved ${format.toUpperCase()} at 2× pixel ratio`);
    } catch {
      toast("Export failed — try again");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(config.code);
      toast("Code copied");
    } catch {
      toast("Clipboard blocked — select the code manually");
    }
  };

  const innerRadius = Math.max(0, Math.min(config.radius, 16));

  return (
    <div className="space-y-6">
      {/* the card that gets exported */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={`${lineCount} lines · ${config.language}`}>Card</Label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Copy code
            </button>
            <button
              type="button"
              onClick={() => set("code", DEFAULT_CODE)}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset code
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => exportImage("png")}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Rendering…" : "Download PNG"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => exportImage("jpeg")}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-50"
            >
              JPEG
            </button>
          </div>
        </div>

        <div
          className={`checkerboard flex justify-center overflow-auto rounded-lg p-4 transition ${
            dragging ? "ring-2 ring-accent" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) loadFile(file);
          }}
        >
          <div
            ref={cardRef}
            className="code-shot inline-block shrink-0"
            data-code-theme={config.theme}
            style={{
              background,
              padding: config.padding,
              borderRadius: config.radius,
            }}
          >
            <div
              className="overflow-hidden shadow-2xl"
              style={{ borderRadius: innerRadius, width: config.codeWidth }}
            >
              {config.showChrome ? (
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: "var(--code-chrome)" }}
                >
                  {config.showDots ? (
                    <span className="flex items-center gap-2">
                      {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
                        <span
                          key={c}
                          className="block h-3 w-3 rounded-full"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                  ) : (
                    <span />
                  )}
                  {config.showTitle ? (
                    <span className="text-xs" style={{ color: "var(--code-gutter)" }}>
                      {config.title}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span />
                </div>
              ) : null}

              <div
                className="relative font-mono"
                style={{
                  background: "var(--code-bg)",
                  color: "var(--code-fg)",
                  fontSize: config.fontSize,
                  lineHeight: 1.6,
                }}
              >
                <div className="flex">
                  {config.lineNumbers ? (
                    <pre
                      aria-hidden
                      className="select-none py-4 pl-4 pr-3 text-right"
                      style={{ color: "var(--code-gutter)" }}
                    >
                      {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
                    </pre>
                  ) : null}
                  <div className="relative min-w-0 flex-1">
                    {/* the textarea sits invisibly on top of the highlighted copy */}
                    <textarea
                      value={config.code}
                      onChange={(e) => set("code", e.target.value)}
                      spellCheck={false}
                      aria-label="Code"
                      className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre bg-transparent p-4 font-mono text-transparent caret-current outline-none"
                      style={{ fontSize: config.fontSize, lineHeight: 1.6 }}
                    />
                    <pre className="pointer-events-none m-0 overflow-visible whitespace-pre p-4">
                      <code
                        className={`language-${config.language}`}
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                      />
                      {config.code.endsWith("\n") ? <br /> : null}
                    </pre>
                  </div>
                </div>

                {config.watermark.show ? (
                  <div
                    className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2"
                    style={{
                      color: config.watermark.color,
                      fontSize: config.watermark.fontSize,
                      fontWeight: 500,
                    }}
                  >
                    {config.watermark.type === "avatar" && avatar ? (
                      // A plain img on purpose: this node gets serialised by
                      // html-to-image, and next/image's lazy wrapper does not
                      // survive that. The source is a local data URL anyway.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt=""
                        className="rounded-full object-cover"
                        style={{
                          width: config.watermark.fontSize * 2,
                          height: config.watermark.fontSize * 2,
                        }}
                      />
                    ) : null}
                    {config.watermark.type === "handle" ? (
                      <svg
                        viewBox="0 0 24 24"
                        width={config.watermark.fontSize * 1.1}
                        height={config.watermark.fontSize * 1.1}
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5-6.6L5.6 22H2.5l7.2-8.3L1.6 2h6.6l4.7 6.2L18.9 2Zm-1.1 18h1.7L6.4 3.8H4.6L17.8 20Z" />
                      </svg>
                    ) : null}
                    <span>{config.watermark.text}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          Type straight into the card, or drop a source file on it — the language and window title
          follow the extension.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="code and theme">Code</Label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>language</Label>
              <Select
                value={config.language}
                options={LANGUAGES.map((l) => l.id)}
                onChange={(v) => set("language", v)}
              />
              <p className="mt-1.5 text-xs text-fg-muted">
                {LANGUAGES.find((l) => l.id === config.language)?.label}
              </p>
            </div>
            <div>
              <Label>theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["dark", "light"] as CodeTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("theme", t)}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize transition ${
                      config.theme === t
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label hint={`${config.fontSize}px`}>font size</Label>
              <Slider
                value={config.fontSize}
                min={10}
                max={28}
                onChange={(v) => set("fontSize", v)}
              />
            </div>
            <div>
              <Label hint={`${config.codeWidth}px`}>card width</Label>
              <Slider
                value={config.codeWidth}
                min={320}
                max={1000}
                step={10}
                onChange={(v) => set("codeWidth", v)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={config.lineNumbers} onChange={(v) => set("lineNumbers", v)}>
              <span className="text-xs text-fg-muted">Line numbers</span>
            </Toggle>
          </div>

          <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
            <Label>window chrome</Label>
            <div className="flex flex-wrap items-center gap-4">
              <Toggle checked={config.showChrome} onChange={(v) => set("showChrome", v)}>
                <span className="text-xs text-fg-muted">Title bar</span>
              </Toggle>
              <Toggle checked={config.showDots} onChange={(v) => set("showDots", v)}>
                <span className="text-xs text-fg-muted">Traffic lights</span>
              </Toggle>
              <Toggle checked={config.showTitle} onChange={(v) => set("showTitle", v)}>
                <span className="text-xs text-fg-muted">File name</span>
              </Toggle>
            </div>
            {config.showTitle ? (
              <div className="mt-3">
                <TextField
                  value={config.title}
                  onChange={(v) => set("title", v)}
                  placeholder="code.js"
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="background and frame">Frame</Label>

          <div>
            <Label>background</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["gradient", "solid", "transparent"] as BackgroundType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("backgroundType", t)}
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
          </div>

          {config.backgroundType === "gradient" ? (
            <div className="grid grid-cols-4 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => set("gradient", g.id)}
                  title={g.label}
                  className={`h-12 rounded-lg border-2 transition ${
                    config.gradient === g.id ? "border-accent" : "border-transparent"
                  }`}
                  style={{ background: g.value }}
                >
                  <span className="sr-only">{g.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {config.backgroundType === "solid" ? (
            <div className="flex items-center gap-2">
              <ColorField value={config.solidColor} onChange={(v) => set("solidColor", v)} />
              <span className="font-mono text-xs text-fg-muted">{config.solidColor}</span>
            </div>
          ) : null}

          {config.backgroundType === "transparent" ? (
            <p className="text-xs text-fg-muted">
              PNG keeps the transparency. JPEG cannot, so it falls back to white.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label hint={`${config.padding}px`}>padding</Label>
              <Slider value={config.padding} min={0} max={160} onChange={(v) => set("padding", v)} />
            </div>
            <div>
              <Label hint={`${config.radius}px`}>corner radius</Label>
              <Slider value={config.radius} min={0} max={48} onChange={(v) => set("radius", v)} />
            </div>
          </div>

          <div className="rounded-lg border border-border-soft bg-surface-2 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label>watermark</Label>
              <Toggle
                checked={config.watermark.show}
                onChange={(show) => setWatermark({ show })}
              >
                <span className="text-xs text-fg-muted">show</span>
              </Toggle>
            </div>

            {config.watermark.show ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["handle", "text", "avatar"] as WatermarkType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (t === "avatar" && !avatar) avatarInputRef.current?.click();
                        setWatermark({ type: t });
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-bold capitalize transition ${
                        config.watermark.type === t
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border-soft text-fg-muted hover:border-accent hover:text-fg"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <TextField
                  value={config.watermark.text}
                  onChange={(text) => setWatermark({ text })}
                  placeholder="@username"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label hint={`${config.watermark.fontSize}px`}>size</Label>
                    <NumberField
                      value={config.watermark.fontSize}
                      min={8}
                      max={48}
                      onChange={(fontSize) => setWatermark({ fontSize })}
                    />
                  </div>
                  <div>
                    <Label>colour</Label>
                    <ColorField
                      value={config.watermark.color}
                      onChange={(color) => setWatermark({ color })}
                    />
                  </div>
                </div>
                {config.watermark.type === "avatar" ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                  >
                    {avatar ? "Change avatar" : "Choose avatar"}
                  </button>
                ) : null}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setAvatar(String(reader.result));
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
