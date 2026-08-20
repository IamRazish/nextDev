"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColorField, Label, NumberField, Slider, Toggle } from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { presetLibrary } from "./presets";
import {
  buildGradient,
  newStripe,
  patternWidth,
  toCss,
  toReact,
  toSvg,
  toTailwind,
  type Stripe,
  type StripeConfig,
} from "./stripes";

const SLUG = "stripe-generator";

const DEFAULT_CONFIG: StripeConfig = {
  angle: 45,
  stripes: [newStripe("#ff0000", 20), newStripe("#ffffff", 20)],
};

/** Fresh ids, so applying the same preset twice never collides in React keys. */
const cloneConfig = (config: StripeConfig): StripeConfig => ({
  angle: config.angle,
  stripes: config.stripes.map((s) => newStripe(s.color, s.width)),
});

const randomHex = () =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;

export function StripeGenerator() {
  const toast = useToast();
  const { value: config, setValue: setConfig, hydrated } = useLocalStorage<StripeConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const { value: gallery, setValue: setGallery } = useLocalStorage<
    { id: string; config: StripeConfig }[]
  >(`nextdev:${SLUG}:gallery`, []);
  const history = useHistory<StripeConfig>(SLUG, 10);

  const [responsive, setResponsive] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const gradient = useMemo(() => buildGradient(config), [config]);
  const total = patternWidth(config);

  // Record the design a short beat after the user stops fiddling.
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

  const patchStripe = useCallback(
    (id: string, patch: Partial<Stripe>) =>
      setConfig((c) => ({
        ...c,
        stripes: c.stripes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
    [setConfig],
  );

  const removeStripe = useCallback(
    (id: string) => setConfig((c) => ({ ...c, stripes: c.stripes.filter((s) => s.id !== id) })),
    [setConfig],
  );

  const duplicateStripe = useCallback(
    (id: string) =>
      setConfig((c) => {
        const i = c.stripes.findIndex((s) => s.id === id);
        if (i === -1) return c;
        const copy = newStripe(c.stripes[i].color, c.stripes[i].width);
        const stripes = [...c.stripes];
        stripes.splice(i + 1, 0, copy);
        return { ...c, stripes };
      }),
    [setConfig],
  );

  const reorder = useCallback(
    (from: number, to: number) =>
      setConfig((c) => {
        if (from === to || from < 0 || to < 0) return c;
        const stripes = [...c.stripes];
        const [moved] = stripes.splice(from, 1);
        stripes.splice(to, 0, moved);
        return { ...c, stripes };
      }),
    [setConfig],
  );

  const apply = useCallback(
    (next: StripeConfig, message?: string) => {
      setConfig(cloneConfig(next));
      if (message) toast(message);
    },
    [setConfig, toast],
  );

  const download = useCallback(
    (kind: "svg" | "png") => {
      const svg = toSvg(config, 640);
      if (kind === "svg") {
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "stripes.svg";
        a.click();
        URL.revokeObjectURL(url);
        toast("SVG downloaded");
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 640;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "stripes.png";
        a.click();
        toast("PNG downloaded");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast("Could not render PNG - try the SVG export");
      };
      img.src = url;
    },
    [config, toast],
  );

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(config) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(config) },
      { id: "react", label: "React", code: toReact(config) },
      { id: "svg", label: "SVG", code: toSvg(config, 320) },
    ],
    [config],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* controls */}
      <div className="space-y-5">
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint={`${config.angle} deg`}>Angle</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={config.angle}
              min={0}
              max={360}
              onChange={(angle) => setConfig((c) => ({ ...c, angle }))}
            />
            <NumberField
              value={config.angle}
              min={0}
              max={360}
              onChange={(angle) => setConfig((c) => ({ ...c, angle }))}
              className="w-24"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[0, 45, 90, 135, 180].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, angle: a }))}
                className="rounded-md border border-border-soft px-2 py-1 text-xs font-semibold text-fg-muted transition hover:border-accent hover:text-fg"
              >
                {a}&deg;
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint={`${config.stripes.length} stripes / ${total}px repeat`}>Stripes</Label>

          <ul className="space-y-2">
            {config.stripes.map((s, i) => (
              <li
                key={s.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) reorder(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={`flex items-center gap-2 rounded-lg border bg-surface-2 p-2 transition ${
                  dragIndex === i
                    ? "opacity-40"
                    : overIndex === i && dragIndex !== null
                      ? "border-accent"
                      : "border-border-soft"
                }`}
              >
                <span
                  className="cursor-grab px-0.5 text-fg-muted active:cursor-grabbing"
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M8 6h8M8 12h8M8 18h8" strokeLinecap="round" />
                  </svg>
                </span>
                <ColorField value={s.color} onChange={(color) => patchStripe(s.id, { color })} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Slider
                    value={s.width}
                    min={1}
                    max={120}
                    onChange={(width) => patchStripe(s.id, { width })}
                  />
                  <NumberField
                    value={s.width}
                    min={1}
                    max={400}
                    onChange={(width) => patchStripe(s.id, { width })}
                    className="w-20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => duplicateStripe(s.id)}
                  aria-label="Duplicate stripe"
                  className="grid h-8 w-8 place-items-center rounded-md border border-border-soft text-fg-muted transition hover:text-fg"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeStripe(s.id)}
                  aria-label="Remove stripe"
                  disabled={config.stripes.length <= 1}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border-soft text-fg-muted transition hover:border-red-500 hover:text-red-500 disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setConfig((c) => ({ ...c, stripes: [...c.stripes, newStripe(randomHex(), 20)] }))
              }
              className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-fg transition hover:opacity-90"
            >
              + Add stripe
            </button>
            <button
              type="button"
              onClick={() =>
                setConfig((c) => ({
                  angle: Math.floor(Math.random() * 37) * 10,
                  stripes: c.stripes.map((s) => ({
                    ...s,
                    color: randomHex(),
                    width: 6 + Math.floor(Math.random() * 30),
                  })),
                }))
              }
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Randomise
            </button>
            <button
              type="button"
              onClick={() => apply(DEFAULT_CONFIG, "Reset to defaults")}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setGallery((g) => [
                  { id: `g${Date.now().toString(36)}`, config: cloneConfig(config) },
                  ...g,
                ]);
                toast("Saved to your gallery");
              }}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Save to gallery
            </button>
          </div>
        </section>
      </div>

      {/* preview + export */}
      <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Label>Preview</Label>
            <Toggle checked={responsive} onChange={setResponsive}>
              <span className="text-xs text-fg-muted">Full width</span>
            </Toggle>
          </div>
          <div className="checkerboard rounded-lg p-2">
            <div
              className={`h-72 rounded-md border border-border-soft transition-all ${
                responsive ? "w-full" : "mx-auto w-[320px]"
              }`}
              style={{ backgroundImage: gradient }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => download("svg")}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Download SVG
            </button>
            <button
              type="button"
              onClick={() => download("png")}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Download PNG
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="css / tailwind / react / svg">Export</Label>
          <ExportPanel formats={formats} />
        </section>
      </div>

      {/* libraries */}
      <section className="rounded-xl border border-border-soft bg-surface p-5 lg:col-span-2">
        <Label hint={`${presetLibrary.length} presets`}>Preset library</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {presetLibrary.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => apply(p.config, `Applied ${p.name}`)}
              className="group overflow-hidden rounded-lg border border-border-soft text-left transition hover:border-accent"
            >
              <span
                className="block h-20 w-full"
                style={{ backgroundImage: buildGradient(p.config) }}
              />
              <span className="block px-2.5 py-2 text-xs font-semibold text-fg-muted transition group-hover:text-fg">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5 lg:col-span-2">
        <Label hint={gallery.length ? `${gallery.length} saved` : "nothing saved yet"}>
          Your gallery
        </Label>
        {gallery.length === 0 ? (
          <p className="text-xs text-fg-muted">
            Hit <strong className="text-fg">Save to gallery</strong> to keep a stripe pattern here.
            It lives in this browser only.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {gallery.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-lg border border-border-soft">
                <button
                  type="button"
                  onClick={() => apply(item.config, "Loaded from gallery")}
                  className="block h-20 w-full"
                  style={{ backgroundImage: buildGradient(item.config) }}
                  aria-label="Load pattern"
                />
                <div className="flex items-center justify-between px-2.5 py-2">
                  <span className="text-xs font-semibold text-fg-muted">
                    {item.config.angle}&deg;
                  </span>
                  <button
                    type="button"
                    onClick={() => setGallery((g) => g.filter((x) => x.id !== item.id))}
                    className="text-xs font-semibold text-fg-muted transition hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5 lg:col-span-2">
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
                title={`${e.value.stripes.length} stripes at ${e.value.angle} deg`}
                className="h-14 w-14 rounded-lg border border-border-soft transition hover:border-accent"
                style={{ backgroundImage: buildGradient(e.value) }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
