"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColorField, Label, NumberField, Select, Slider, Toggle } from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { createZip, downloadBlob } from "@/lib/zip";
import {
  cellStyle,
  containerStyle,
  DEFAULT_CONFIG,
  makeCells,
  MAX_TRACKS,
  merge,
  rangeIds,
  resize,
  toCss,
  toHtml,
  toReact,
  toTailwind,
  unmerge,
  type BorderStyle,
  type GridCell,
  type GridConfig,
  type SizeUnit,
} from "./grid";

const SLUG = "grid-playground";
const BORDER_STYLES: readonly BorderStyle[] = ["solid", "dashed", "dotted", "double", "none"];
const UNITS: readonly SizeUnit[] = ["%", "px", "auto"];
const VIEWS = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "mobile", label: "Mobile", width: "375px" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const HISTORY_LIMIT = 50;
const COALESCE_MS = 600;

export function GridPlayground() {
  const toast = useToast();
  const { value: config, setValue: setConfig } = useLocalStorage<GridConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("desktop");

  const past = useRef<GridConfig[]>([]);
  const future = useRef<GridConfig[]>([]);
  const lastCommit = useRef<{ key: string; at: number } | null>(null);
  const [depth, setDepth] = useState({ undo: 0, redo: 0 });
  const sync = useCallback(
    () => setDepth({ undo: past.current.length, redo: future.current.length }),
    [],
  );

  /**
   * Every edit goes through here so undo/redo stays honest. `coalesceKey`
   * folds a burst of changes to the same control (a slider drag) into one
   * undo step.
   */
  const commit = useCallback(
    (next: GridConfig, coalesceKey?: string) => {
      const now = Date.now();
      const last = lastCommit.current;
      const fold =
        coalesceKey !== undefined && last?.key === coalesceKey && now - last.at < COALESCE_MS;

      if (!fold) past.current = [...past.current, config].slice(-HISTORY_LIMIT);
      future.current = [];
      lastCommit.current = coalesceKey === undefined ? null : { key: coalesceKey, at: now };
      setConfig(next);
      sync();
    },
    [config, setConfig, sync],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [...future.current, config];
    lastCommit.current = null;
    setConfig(prev);
    setSelected([]);
    sync();
  }, [config, setConfig, sync]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current = [...past.current, config];
    lastCommit.current = null;
    setConfig(next);
    setSelected([]);
    sync();
  }, [config, setConfig, sync]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      // let the browser handle undo inside a text field
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const set = useCallback(
    <K extends keyof GridConfig>(key: K, value: GridConfig[K], coalesceKey?: string) =>
      commit({ ...config, [key]: value }, coalesceKey),
    [commit, config],
  );

  const setTracks = useCallback(
    (rows: number, cols: number) => {
      const r = Math.min(Math.max(rows, 1), MAX_TRACKS);
      const c = Math.min(Math.max(cols, 1), MAX_TRACKS);
      commit(resize(config, r, c), `tracks`);
    },
    [commit, config],
  );

  const patchSelected = useCallback(
    (patch: Partial<GridCell>, coalesceKey?: string) => {
      if (!selected.length) return;
      commit(
        {
          ...config,
          cells: config.cells.map((c) => (selected.includes(c.id) ? { ...c, ...patch } : c)),
        },
        coalesceKey,
      );
    },
    [commit, config, selected],
  );

  const onCellClick = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && anchor) {
      setSelected(rangeIds(config, anchor, id));
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      setAnchor(id);
      return;
    }
    setSelected((s) => (s.length === 1 && s[0] === id ? [] : [id]));
    setAnchor(id);
  };

  const doMerge = () => {
    const result = merge(config, selected);
    if (result.error) {
      toast(result.error);
      return;
    }
    commit(result.config);
    setSelected(result.masterId ? [result.masterId] : []);
    toast("Cells merged");
  };

  const doUnmerge = () => {
    if (selected.length !== 1) {
      toast("Select a single merged cell to unmerge");
      return;
    }
    const result = unmerge(config, selected[0]);
    if (result.error) {
      toast(result.error);
      return;
    }
    commit(result.config);
    toast("Cells unmerged");
  };

  const exportZip = () => {
    const zip = createZip([
      { name: "index.html", content: toHtml(config, { standalone: true }) },
      { name: "style.css", content: toCss(config) },
    ]);
    downloadBlob(zip, "css-grid-layout.zip");
    toast("Downloaded index.html + style.css");
  };

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(config) },
      { id: "html", label: "HTML", code: toHtml(config) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(config) },
      { id: "react", label: "React", code: toReact(config) },
    ],
    [config],
  );

  const cells = config.cells.filter((c) => c.visible);
  const selectedCells = config.cells.filter((c) => selected.includes(c.id));
  const single = selectedCells.length === 1 ? selectedCells[0] : null;
  const mergedSelected = single && (single.rowSpan > 1 || single.colSpan > 1);
  const frameWidth = VIEWS.find((v) => v.id === view)?.width ?? "100%";

  return (
    <div className="space-y-6">
      {/* preview */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={`${config.rows} x ${config.cols} · ${cells.length} cells`}>
            Live preview
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-border-soft bg-surface-2 p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    view === v.id ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={undo}
              disabled={!depth.undo}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-40"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!depth.redo}
              className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-40"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
          </div>
        </div>

        <div className="checkerboard overflow-auto rounded-lg p-3">
          <div
            className="mx-auto transition-all"
            style={{ width: frameWidth, maxWidth: "100%", minHeight: 320 }}
          >
            <div style={containerStyle(config)} className="min-h-80">
              {cells.map((cell) => {
                const active = selected.includes(cell.id);
                return (
                  <button
                    key={cell.id}
                    type="button"
                    onClick={(e) => onCellClick(cell.id, e)}
                    style={cellStyle(cell)}
                    className={`flex items-center justify-center overflow-hidden whitespace-pre-wrap p-1 text-center text-xs text-neutral-800 transition ${
                      active ? "outline outline-2 -outline-offset-2 outline-indigo-600" : ""
                    }`}
                  >
                    {cell.content}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          Click to select · Ctrl/Cmd-click to add · Shift-click for a rectangle · Ctrl+Z to undo
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* grid settings */}
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="the container">Grid</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label hint={`max ${MAX_TRACKS}`}>rows</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={config.rows}
                  min={1}
                  max={MAX_TRACKS}
                  onChange={(r) => setTracks(r, config.cols)}
                />
                <NumberField
                  value={config.rows}
                  min={1}
                  max={MAX_TRACKS}
                  onChange={(r) => setTracks(r, config.cols)}
                  className="w-20"
                />
              </div>
            </div>
            <div>
              <Label hint={`max ${MAX_TRACKS}`}>columns</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={config.cols}
                  min={1}
                  max={MAX_TRACKS}
                  onChange={(c) => setTracks(config.rows, c)}
                />
                <NumberField
                  value={config.cols}
                  min={1}
                  max={MAX_TRACKS}
                  onChange={(c) => setTracks(config.rows, c)}
                  className="w-20"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label hint={`${config.gap}px`}>gap</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={config.gap}
                  min={0}
                  max={50}
                  onChange={(gap) => set("gap", gap, "gap")}
                />
                <NumberField
                  value={config.gap}
                  min={0}
                  max={200}
                  onChange={(gap) => set("gap", gap, "gap")}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Label>width</Label>
              <div className="flex gap-2">
                <NumberField
                  value={config.width}
                  min={0}
                  onChange={(w) => set("width", w, "width")}
                  className={config.widthUnit === "auto" ? "pointer-events-none opacity-40" : ""}
                />
                <Select
                  value={config.widthUnit}
                  options={UNITS}
                  onChange={(u) => set("widthUnit", u)}
                  className="w-20"
                />
              </div>
            </div>
            <div>
              <Label>height</Label>
              <div className="flex gap-2">
                <NumberField
                  value={config.height}
                  min={0}
                  onChange={(h) => set("height", h, "height")}
                  className={config.heightUnit === "auto" ? "pointer-events-none opacity-40" : ""}
                />
                <Select
                  value={config.heightUnit}
                  options={UNITS}
                  onChange={(u) => set("heightUnit", u)}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Label>background</Label>
              <div className="flex items-center gap-2">
                <ColorField value={config.bgColor} onChange={(v) => set("bgColor", v, "bg")} />
                <span className="font-mono text-xs text-fg-muted">{config.bgColor}</span>
              </div>
            </div>
            <div>
              <Label>border</Label>
              <div className="flex items-center gap-2">
                <ColorField
                  value={config.borderColor}
                  onChange={(v) => set("borderColor", v, "border")}
                />
                <Select
                  value={config.borderStyle}
                  options={BORDER_STYLES}
                  onChange={(v) => set("borderStyle", v)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                commit({ ...DEFAULT_CONFIG, cells: makeCells(DEFAULT_CONFIG.rows, DEFAULT_CONFIG.cols) });
                setSelected([]);
                toast("Grid reset — Ctrl+Z brings it back");
              }}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset grid
            </button>
            <button
              type="button"
              onClick={exportZip}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-fg transition hover:opacity-90"
            >
              Export as ZIP
            </button>
          </div>
        </section>

        {/* cell settings */}
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label
            hint={
              selectedCells.length === 0
                ? "nothing selected"
                : selectedCells.length === 1
                  ? `row ${single?.row}, column ${single?.col}`
                  : `${selectedCells.length} cells`
            }
          >
            Cell
          </Label>

          {selectedCells.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Pick a cell in the preview to give it content, colours or a border — or select several
              and merge them into one area.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label hint={single ? undefined : "single cell only"}>content</Label>
                <textarea
                  value={single ? single.content : ""}
                  disabled={!single}
                  rows={2}
                  onChange={(e) =>
                    single && patchSelected({ content: e.target.value }, `content-${single.id}`)
                  }
                  placeholder={single ? "Text or emoji" : "Select one cell to edit its content"}
                  className="w-full resize-y rounded-md border border-border-soft bg-surface px-2.5 py-2 text-sm text-fg outline-none transition focus:border-accent disabled:opacity-50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>background</Label>
                  <div className="flex items-center gap-2">
                    <ColorField
                      value={single?.bgColor ?? "#ffffff"}
                      onChange={(bgColor) => patchSelected({ bgColor }, "cell-bg")}
                    />
                    <span className="font-mono text-xs text-fg-muted">
                      {single?.bgColor ?? "mixed"}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>border</Label>
                  <div className="flex items-center gap-2">
                    <ColorField
                      value={single?.borderColor ?? "#d4d7e3"}
                      onChange={(borderColor) => patchSelected({ borderColor }, "cell-border")}
                    />
                    <Select
                      value={single?.borderStyle ?? "solid"}
                      options={BORDER_STYLES}
                      onChange={(borderStyle) => patchSelected({ borderStyle })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={doMerge}
                  disabled={selectedCells.length < 2}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-40"
                >
                  Merge {selectedCells.length > 1 ? `${selectedCells.length} cells` : "cells"}
                </button>
                <button
                  type="button"
                  onClick={doUnmerge}
                  disabled={!mergedSelected}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-40"
                >
                  Unmerge
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchSelected({
                      bgColor: DEFAULT_CONFIG.cells[0].bgColor,
                      borderColor: DEFAULT_CONFIG.cells[0].borderColor,
                      borderStyle: "solid",
                    })
                  }
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  Clear styling
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  Deselect
                </button>
              </div>

              {selectedCells.length > 1 ? (
                <p className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-xs text-fg-muted">
                  Colour and border changes apply to all {selectedCells.length} selected cells.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint="css / html / tailwind / react">Export</Label>
          <Toggle checked={config.responsive} onChange={(v) => set("responsive", v)}>
            <span className="text-xs text-fg-muted">Add responsive media queries</span>
          </Toggle>
        </div>

        {config.responsive ? (
          <div className="mb-4 grid gap-4 rounded-lg border border-border-soft bg-surface-2 p-3 sm:grid-cols-2">
            <div>
              <Label hint="max-width: 1024px">tablet columns</Label>
              <NumberField
                value={config.tabletCols}
                min={1}
                max={MAX_TRACKS}
                onChange={(v) => set("tabletCols", v, "tabletCols")}
              />
            </div>
            <div>
              <Label hint="max-width: 640px">mobile columns</Label>
              <NumberField
                value={config.mobileCols}
                min={1}
                max={MAX_TRACKS}
                onChange={(v) => set("mobileCols", v, "mobileCols")}
              />
            </div>
            <p className="text-xs text-fg-muted sm:col-span-2">
              Below each breakpoint the rows switch to <code className="font-mono">auto</code> and
              cells drop their explicit placement, so a merged area reflows instead of overlapping.
            </p>
          </div>
        ) : null}

        <ExportPanel formats={formats} />
        <p className="mt-3 text-xs text-fg-muted">
          Cells that still look like the defaults are left out of the CSS — only the ones you styled
          or merged get a rule.
        </p>
      </section>
    </div>
  );
}
