"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ColorField, Label, NumberField, Select, Slider, TextField, Toggle } from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  applyControlChange,
  DEFAULT_CONFIG,
  findGenerator,
  GENERATORS,
  getAtPath,
  previewStyle,
  resetGenerator,
  toCss,
  toReact,
  toTailwind,
  type Control,
  type GeneratorConfig,
  type GeneratorId,
  type PreviewKind,
} from "./generators";

const SLUG = "css3-generator";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";

export function Css3Generator() {
  const toast = useToast();
  const { value: config, setValue: setConfig } = useLocalStorage<GeneratorConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const [active, setActive] = useState<GeneratorId>("border-radius");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("box");
  const [hovering, setHovering] = useState(false);

  const generator = findGenerator(active);

  const change = useCallback(
    (path: string, value: unknown) => setConfig((c) => applyControlChange(c, path, value)),
    [setConfig],
  );

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(active, config) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(active, config) },
      { id: "react", label: "React", code: toReact(active, config) },
    ],
    [active, config],
  );

  const renderControl = (control: Control) => {
    const value = getAtPath(config, control.path);

    switch (control.kind) {
      case "toggle":
        // a toggle takes its own row, so the sliders below it keep their order
        return (
          <div key={control.path} className="sm:col-span-2">
            <Toggle checked={Boolean(value)} onChange={(v) => change(control.path, v)}>
              <span className="text-xs text-fg-muted">{control.label}</span>
            </Toggle>
          </div>
        );
      case "slider": {
        const n = typeof value === "number" ? value : 0;
        const linkedCorner =
          control.path.startsWith("borderRadius.") &&
          control.path !== "borderRadius.linked" &&
          config.borderRadius.linked &&
          control.path !== "borderRadius.topLeft";
        return (
          <div key={control.path} className={linkedCorner ? "opacity-50" : ""}>
            <Label hint={`${n}${control.unit ?? ""}`}>{control.label}</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={n}
                min={control.min}
                max={control.max}
                step={control.step}
                onChange={(v) => change(control.path, v)}
              />
              <NumberField
                value={n}
                min={control.min}
                max={control.max}
                step={control.step}
                onChange={(v) => change(control.path, v)}
                className="w-20"
              />
            </div>
          </div>
        );
      }
      case "select":
        return (
          <div key={control.path}>
            <Label>{control.label}</Label>
            <Select
              value={String(value)}
              options={control.options}
              onChange={(v) => change(control.path, v)}
            />
          </div>
        );
      case "color":
        return (
          <div key={control.path}>
            <Label>{control.label}</Label>
            <div className="flex items-center gap-2">
              <ColorField value={String(value)} onChange={(v) => change(control.path, v)} />
              <span className="font-mono text-xs text-fg-muted">{String(value)}</span>
            </div>
          </div>
        );
      case "text":
        return (
          <div key={control.path}>
            <Label hint={control.hint}>{control.label}</Label>
            <TextField
              value={String(value)}
              placeholder={control.placeholder}
              onChange={(v) => change(control.path, v)}
            />
          </div>
        );
      case "stops":
        return (
          <div key={control.path} className="space-y-2">
            <Label hint="two stops">{control.label}</Label>
            {config.gradient.stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorField
                  value={stop.color}
                  onChange={(color) =>
                    change(
                      "gradient.stops",
                      config.gradient.stops.map((s, j) => (j === i ? { ...s, color } : s)),
                    )
                  }
                />
                <Slider
                  value={stop.position}
                  min={0}
                  max={100}
                  onChange={(position) =>
                    change(
                      "gradient.stops",
                      config.gradient.stops.map((s, j) => (j === i ? { ...s, position } : s)),
                    )
                  }
                />
                <span className="w-10 text-right font-mono text-xs text-fg-muted">
                  {stop.position}%
                </span>
              </div>
            ))}
            <p className="text-xs text-fg-muted">
              Need more stops, a radial centre or conic?{" "}
              <Link href="/tools/gradient-editor" className="font-semibold text-accent">
                Gradient Editor
              </Link>{" "}
              does the full job.
            </p>
          </div>
        );
    }
  };

  const renderPreview = () => {
    const style = previewStyle(active, config);

    if (active === "multi-column") {
      return (
        <div
          className="w-full max-w-2xl rounded-lg bg-surface p-6 text-sm leading-relaxed text-fg"
          style={style}
        >
          {LOREM}
        </div>
      );
    }

    if (active === "box-resize") {
      return (
        <textarea
          defaultValue="Drag my corner to resize me — that is what the resize property does."
          className="h-40 w-64 rounded-lg border-2 border-border-soft bg-surface p-4 text-sm text-fg"
          style={style}
        />
      );
    }

    if (active === "box-sizing") {
      const b = config.boxSizing;
      const shared = {
        width: `${b.width}px`,
        padding: `${b.padding}px`,
        border: `${b.borderWidth}px ${b.borderStyle} ${b.borderColor}`,
      } as const;
      return (
        <div className="flex flex-wrap items-start justify-center gap-6">
          {(["content-box", b.boxSizing] as const).map((mode, i) => (
            <div key={i} className="text-center">
              <span className="mb-2 block text-xs font-semibold text-fg-muted">{mode}</span>
              <div
                className={i === 0 ? "bg-accent/15" : "bg-accent/40"}
                style={{ ...shared, boxSizing: mode }}
              >
                <span className="text-xs text-fg">Content</span>
              </div>
              <span className="mt-2 block text-[11px] text-fg-muted">
                {mode === "content-box"
                  ? `renders ${b.width + b.padding * 2 + b.borderWidth * 2}px wide`
                  : `renders ${Math.max(b.width, b.padding * 2 + b.borderWidth * 2)}px wide`}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (active === "outline") {
      return (
        <div
          className="grid h-44 w-44 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-fg"
          style={style}
        >
          Outline
        </div>
      );
    }

    if (active === "transition") {
      // a transition only shows itself in motion, so the sample reacts to hover
      const target: React.CSSProperties = {
        ...style,
        backgroundColor: hovering ? "#ec4899" : "#4f46e5",
        transform: hovering ? "scale(1.15) rotate(6deg)" : "none",
        opacity: hovering ? 0.85 : 1,
      };
      return (
        <div className="flex flex-col items-center gap-3">
          <div
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="grid h-40 w-40 cursor-pointer place-items-center rounded-xl text-sm font-bold text-white"
            style={target}
          >
            Hover me
          </div>
          <span className="text-xs text-fg-muted">
            Hovering changes colour, transform and opacity — the timing above is what you are
            watching.
          </span>
        </div>
      );
    }

    // the plain inline-style generators share one sample, in three shapes
    if (previewKind === "text") {
      return (
        <p className="max-w-md text-center text-3xl font-black text-fg" style={style}>
          The quick brown fox
        </p>
      );
    }
    if (previewKind === "button") {
      return (
        <button
          type="button"
          className="bg-accent px-6 py-3 text-sm font-bold text-accent-fg"
          style={style}
        >
          Click me
        </button>
      );
    }
    return (
      <div
        className="grid h-48 w-48 place-items-center bg-accent text-sm font-bold text-accent-fg"
        style={style}
      >
        Preview
      </div>
    );
  };

  const showPreviewKind = !generator.custom;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* generator rail */}
      <nav className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-border-soft bg-surface p-2">
          <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted">
            Generators
          </p>
          <ul className="space-y-0.5">
            {GENERATORS.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setActive(g.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${
                    active === g.id
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <span className="text-base leading-none">{g.glyph}</span>
                  <span className="min-w-0 flex-1 truncate">{g.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-2 px-2 text-[11px] leading-snug text-fg-muted">
          Flexbox lives in its own tool —{" "}
          <Link href="/tools/flexbox-generator" className="font-semibold text-accent">
            Flexbox Generator
          </Link>
          .
        </p>
      </nav>

      <div className="min-w-0 space-y-6">
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-fg">{generator.label}</h2>
              <p className="mt-0.5 text-sm text-fg-muted">{generator.description}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfig((c) => resetGenerator(c, active));
                toast(`Reset ${generator.label}`);
              }}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset panel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {generator.controls.map(renderControl)}
          </div>
        </section>

        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Label>Live preview</Label>
            {showPreviewKind ? (
              <div className="flex gap-1 rounded-lg border border-border-soft bg-surface-2 p-1">
                {(["box", "button", "text"] as PreviewKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPreviewKind(k)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      previewKind === k ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="checkerboard flex min-h-72 items-center justify-center overflow-auto rounded-lg p-8">
            {renderPreview()}
          </div>
        </section>

        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="css / tailwind / react">Export</Label>
          <ExportPanel formats={formats} />
        </section>
      </div>
    </div>
  );
}
