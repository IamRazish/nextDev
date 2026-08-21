"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Label,
  NumberField,
  Select,
  Slider,
  TextField,
  Toggle,
} from "@/components/ui/Field";
import { ExportPanel } from "@/components/ui/ExportPanel";
import { useToast } from "@/components/ui/Toast";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { presetLibrary } from "./presets";
import {
  alignContentIsInert,
  containerStyle,
  DEFAULT_CONTAINER,
  isValidBasis,
  itemStyle,
  newItem,
  toCss,
  toReact,
  toTailwind,
  type AlignContent,
  type AlignItems,
  type AlignSelf,
  type Display,
  type FlexConfig,
  type FlexContainer,
  type FlexDirection,
  type FlexItem,
  type FlexWrap,
} from "./flexbox";

const SLUG = "flexbox-generator";

const DISPLAY: readonly Display[] = ["flex", "inline-flex"];
const DIRECTION: readonly FlexDirection[] = ["row", "row-reverse", "column", "column-reverse"];
const WRAP: readonly FlexWrap[] = ["nowrap", "wrap", "wrap-reverse"];
const JUSTIFY = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
] as const;
const ALIGN_ITEMS: readonly AlignItems[] = [
  "stretch",
  "center",
  "flex-start",
  "flex-end",
  "baseline",
];
const ALIGN_CONTENT: readonly AlignContent[] = [
  "stretch",
  "center",
  "flex-start",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
];
const ALIGN_SELF: readonly AlignSelf[] = [
  "auto",
  "stretch",
  "center",
  "flex-start",
  "flex-end",
  "baseline",
];

const DEFAULT_CONFIG: FlexConfig = {
  container: DEFAULT_CONTAINER,
  items: [newItem(), newItem(), newItem()],
};

/** Fresh ids so applying the same preset twice never collides in React keys. */
const cloneConfig = (config: FlexConfig): FlexConfig => ({
  container: { ...config.container },
  items: config.items.map((item) =>
    newItem({
      order: item.order,
      grow: item.grow,
      shrink: item.shrink,
      basis: item.basis,
      alignSelf: item.alignSelf,
    }),
  ),
});

type SavedTemplate = { id: string; name: string; config: FlexConfig };

export function FlexboxGenerator() {
  const toast = useToast();
  const { value: config, setValue: setConfig, hydrated } = useLocalStorage<FlexConfig>(
    `nextdev:${SLUG}:config`,
    DEFAULT_CONFIG,
  );
  const { value: templates, setValue: setTemplates } = useLocalStorage<SavedTemplate[]>(
    `nextdev:${SLUG}:templates`,
    [],
  );
  const history = useHistory<FlexConfig>(SLUG, 10);

  const [selected, setSelected] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [varied, setVaried] = useState(true);
  const [omitDefaults, setOmitDefaults] = useState(false);

  const { container, items } = config;

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

  const setContainer = useCallback(
    <K extends keyof FlexContainer>(key: K, value: FlexContainer[K]) =>
      setConfig((c) => ({ ...c, container: { ...c.container, [key]: value } })),
    [setConfig],
  );

  const patchItem = useCallback(
    (id: string, patch: Partial<FlexItem>) =>
      setConfig((c) => ({
        ...c,
        items: c.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      })),
    [setConfig],
  );

  const addItem = useCallback(
    () =>
      setConfig((c) => {
        const item = newItem();
        setSelected(item.id);
        return { ...c, items: [...c.items, item] };
      }),
    [setConfig],
  );

  const removeItem = useCallback(
    (id: string) =>
      setConfig((c) => {
        setSelected((s) => (s === id ? null : s));
        return { ...c, items: c.items.filter((it) => it.id !== id) };
      }),
    [setConfig],
  );

  const apply = useCallback(
    (next: FlexConfig, message?: string) => {
      setConfig(cloneConfig(next));
      setSelected(null);
      if (message) toast(message);
    },
    [setConfig, toast],
  );

  const saveTemplate = useCallback(() => {
    const name = templateName.trim();
    if (!name) {
      toast("Give the template a name first");
      return;
    }
    setTemplates((list) => {
      const existing = list.find((t) => t.name.toLowerCase() === name.toLowerCase());
      const entry: SavedTemplate = {
        id: existing?.id ?? `t${Date.now().toString(36)}`,
        name,
        config: cloneConfig(config),
      };
      return existing
        ? list.map((t) => (t.id === existing.id ? entry : t))
        : [entry, ...list];
    });
    setTemplateName("");
    toast(`Saved “${name}”`);
  }, [config, templateName, setTemplates, toast]);

  const formats = useMemo(
    () => [
      { id: "css", label: "CSS", code: toCss(config, { includeDefaults: !omitDefaults }) },
      { id: "tailwind", label: "Tailwind", code: toTailwind(config) },
      { id: "react", label: "React", code: toReact(config) },
    ],
    [config, omitDefaults],
  );

  const inertAlignContent = alignContentIsInert(container);
  const selectedItem = items.find((it) => it.id === selected) ?? null;
  const selectedIndex = selectedItem ? items.indexOf(selectedItem) + 1 : 0;

  /** Uneven padding makes align-items differences (baseline especially) visible. */
  const previewItemChrome = (i: number): React.CSSProperties =>
    varied
      ? { paddingTop: 8 + (i % 3) * 12, paddingBottom: 8, fontSize: 12 + (i % 3) * 3 }
      : { padding: 8, fontSize: 13 };

  return (
    <div className="space-y-6">
      {/* preview first — it is what the user actually watches */}
      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint={`${items.length} items`}>Live preview</Label>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={varied} onChange={setVaried}>
              <span className="text-xs text-fg-muted">Uneven item sizes</span>
            </Toggle>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition hover:opacity-90"
            >
              + Item
            </button>
          </div>
        </div>

        <div
          className="min-h-64 resize-y overflow-auto rounded-lg border border-dashed border-border-soft bg-surface-2 p-3"
          style={containerStyle(container)}
        >
          {items.map((item, i) => {
            const active = item.id === selected;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(active ? null : item.id)}
                style={{ ...itemStyle(item), ...previewItemChrome(i) }}
                className={`min-h-10 min-w-12 rounded-md border-2 text-center font-semibold transition ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-transparent bg-accent/15 text-fg hover:border-accent/50"
                }`}
                title="Click to edit this item"
              >
                {i + 1}
              </button>
            );
          })}
          {items.length === 0 ? (
            <p className="m-auto text-sm text-fg-muted">
              No items — add one to start.
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          Click an item to edit it. Uneven sizes are preview-only and never land in the export.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* container controls */}
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint="the parent">Container</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>display</Label>
              <Select
                value={container.display}
                options={DISPLAY}
                onChange={(v) => setContainer("display", v)}
              />
            </div>
            <div>
              <Label>flex-direction</Label>
              <Select
                value={container.flexDirection}
                options={DIRECTION}
                onChange={(v) => setContainer("flexDirection", v)}
              />
            </div>
            <div>
              <Label>flex-wrap</Label>
              <Select
                value={container.flexWrap}
                options={WRAP}
                onChange={(v) => setContainer("flexWrap", v)}
              />
            </div>
            <div>
              <Label>justify-content</Label>
              <Select
                value={container.justifyContent}
                options={JUSTIFY}
                onChange={(v) => setContainer("justifyContent", v)}
              />
            </div>
            <div>
              <Label>align-items</Label>
              <Select
                value={container.alignItems}
                options={ALIGN_ITEMS}
                onChange={(v) => setContainer("alignItems", v)}
              />
            </div>
            <div>
              <Label hint={inertAlignContent ? "needs wrap" : undefined}>align-content</Label>
              <Select
                value={container.alignContent}
                options={ALIGN_CONTENT}
                onChange={(v) => setContainer("alignContent", v)}
                className={inertAlignContent ? "opacity-50" : ""}
              />
            </div>
            <div className="sm:col-span-2">
              <Label hint={`${container.gap}px`}>gap</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={container.gap}
                  min={0}
                  max={64}
                  onChange={(v) => setContainer("gap", v)}
                />
                <NumberField
                  value={container.gap}
                  min={0}
                  max={200}
                  onChange={(v) => setContainer("gap", v)}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {inertAlignContent ? (
            <p className="mt-4 rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-xs text-fg-muted">
              <strong className="text-fg">align-content</strong> does nothing while flex-wrap is{" "}
              <code className="font-mono">nowrap</code> — there is only one line to distribute. It is
              left out of the Tailwind output.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => apply(DEFAULT_CONFIG, "Reset to defaults")}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Reset
            </button>
            <div className="flex min-w-48 flex-1 gap-2">
              <TextField
                value={templateName}
                onChange={setTemplateName}
                placeholder="Template name"
              />
              <button
                type="button"
                onClick={saveTemplate}
                className="shrink-0 rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
              >
                Save
              </button>
            </div>
          </div>
        </section>

        {/* item controls */}
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint={selectedItem ? `item ${selectedIndex} of ${items.length}` : "select an item"}>
            Item
          </Label>

          {!selectedItem ? (
            <p className="text-xs text-fg-muted">
              Click any item in the preview to edit its <code className="font-mono">order</code>,{" "}
              <code className="font-mono">flex-grow</code>,{" "}
              <code className="font-mono">flex-shrink</code>,{" "}
              <code className="font-mono">flex-basis</code> and{" "}
              <code className="font-mono">align-self</code>.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>order</Label>
                <NumberField
                  value={selectedItem.order}
                  min={-20}
                  max={20}
                  onChange={(order) => patchItem(selectedItem.id, { order })}
                />
              </div>
              <div>
                <Label>align-self</Label>
                <Select
                  value={selectedItem.alignSelf}
                  options={ALIGN_SELF}
                  onChange={(alignSelf) => patchItem(selectedItem.id, { alignSelf })}
                />
              </div>
              <div>
                <Label>flex-grow</Label>
                <NumberField
                  value={selectedItem.grow}
                  min={0}
                  max={20}
                  onChange={(grow) => patchItem(selectedItem.id, { grow })}
                />
              </div>
              <div>
                <Label>flex-shrink</Label>
                <NumberField
                  value={selectedItem.shrink}
                  min={0}
                  max={20}
                  onChange={(shrink) => patchItem(selectedItem.id, { shrink })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label hint={isValidBasis(selectedItem.basis) ? undefined : "not a valid length"}>
                  flex-basis
                </Label>
                <TextField
                  value={selectedItem.basis}
                  onChange={(basis) => patchItem(selectedItem.id, { basis })}
                  placeholder="auto, 200px, 50%, calc(50% - 8px)"
                  invalid={!isValidBasis(selectedItem.basis)}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["auto", "0", "100px", "200px", "50%", "calc(50% - 8px)"].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => patchItem(selectedItem.id, { basis: b })}
                      className="rounded-md border border-border-soft px-2 py-1 font-mono text-[11px] text-fg-muted transition hover:border-accent hover:text-fg"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchItem(selectedItem.id, {
                      order: 0,
                      grow: 0,
                      shrink: 1,
                      basis: "auto",
                      alignSelf: "auto",
                    })
                  }
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
                >
                  Clear item
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(selectedItem.id)}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-red-500 hover:text-red-500"
                >
                  Remove item {selectedIndex}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Label hint="css / tailwind / react">Export</Label>
          <Toggle checked={omitDefaults} onChange={setOmitDefaults}>
            <span className="text-xs text-fg-muted">Only non-default properties</span>
          </Toggle>
        </div>
        <ExportPanel formats={formats} />
      </section>

      <section className="rounded-xl border border-border-soft bg-surface p-5">
        <Label hint={`${presetLibrary.length} layouts`}>Preset library</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presetLibrary.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => apply(p.config, `Loaded ${p.name}`)}
              className="group rounded-lg border border-border-soft p-3 text-left transition hover:border-accent"
            >
              <span
                className="mb-2 flex h-20 overflow-hidden rounded-md bg-surface-2 p-1.5"
                style={containerStyle({ ...p.config.container, gap: 3 })}
              >
                {p.config.items.map((item, i) => (
                  <span
                    key={item.id}
                    style={{ ...itemStyle(item), minWidth: 8, minHeight: 8 }}
                    className="rounded-sm bg-accent/50"
                  >
                    <span className="sr-only">item {i + 1}</span>
                  </span>
                ))}
              </span>
              <span className="block text-xs font-bold text-fg">{p.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-fg-muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <Label hint={templates.length ? `${templates.length} saved` : "nothing saved yet"}>
            Your templates
          </Label>
          {templates.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Name a layout and hit <strong className="text-fg">Save</strong> to keep it in this
              browser. Saving under an existing name overwrites it.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => apply(t.config, `Loaded “${t.name}”`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-fg">{t.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {t.config.items.length} items · {t.config.container.flexDirection} ·{" "}
                      {t.config.container.justifyContent}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplates((list) => list.filter((x) => x.id !== t.id))}
                    className="text-xs font-semibold text-fg-muted transition hover:text-red-500"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border-soft bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <Label hint="last 10, saved automatically">Recent layouts</Label>
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {history.entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => apply(e.value, "Restored a recent layout")}
                  title={`${e.value.items.length} items · ${e.value.container.flexDirection}`}
                  className="flex h-14 overflow-hidden rounded-lg border border-border-soft p-1 transition hover:border-accent"
                  style={containerStyle({ ...e.value.container, gap: 2 })}
                >
                  {e.value.items.map((item) => (
                    <span
                      key={item.id}
                      style={{ ...itemStyle(item), minWidth: 5, minHeight: 5 }}
                      className="rounded-sm bg-accent/50"
                    />
                  ))}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
