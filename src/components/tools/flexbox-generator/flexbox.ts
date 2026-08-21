export type Display = "flex" | "inline-flex";
export type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
export type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
export type JustifyContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type AlignItems = "stretch" | "center" | "flex-start" | "flex-end" | "baseline";
export type AlignContent =
  | "stretch"
  | "center"
  | "flex-start"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type AlignSelf = "auto" | AlignItems;

export type FlexContainer = {
  display: Display;
  flexDirection: FlexDirection;
  flexWrap: FlexWrap;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  alignContent: AlignContent;
  /** px — the original tool showed a gap in the preview but never exported it */
  gap: number;
};

export type FlexItem = {
  id: string;
  order: number;
  grow: number;
  shrink: number;
  basis: string;
  alignSelf: AlignSelf;
};

export type FlexConfig = {
  container: FlexContainer;
  items: FlexItem[];
};

export const DEFAULT_CONTAINER: FlexContainer = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  alignItems: "stretch",
  alignContent: "stretch",
  gap: 8,
};

let seq = 0;
export const newItem = (patch: Partial<Omit<FlexItem, "id">> = {}): FlexItem => ({
  id: `i${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  order: 0,
  grow: 0,
  shrink: 1,
  basis: "auto",
  alignSelf: "auto",
  ...patch,
});

/* ── validation ────────────────────────────────────────────────── */

const KEYWORD_BASIS = new Set([
  "auto",
  "content",
  "min-content",
  "max-content",
  "fit-content",
  "0",
]);

/** `flex-basis` takes a keyword, a length, a percentage or a calc() expression. */
export function isValidBasis(raw: string) {
  const v = raw.trim();
  if (!v) return false;
  if (KEYWORD_BASIS.has(v)) return true;
  if (/^calc\(.+\)$/i.test(v)) return true;
  return /^-?\d*\.?\d+(px|%|rem|em|ch|vh|vw|vmin|vmax)$/i.test(v);
}

/** align-content has no effect while the container is nowrap. */
export const alignContentIsInert = (c: FlexContainer) => c.flexWrap === "nowrap";

/* ── the properties that actually differ from the initial value ── */

const CONTAINER_DEFAULTS: Record<string, string> = {
  "flex-direction": "row",
  "flex-wrap": "nowrap",
  "justify-content": "flex-start",
  "align-items": "stretch",
  "align-content": "stretch",
};

const kebab = (s: string) => s.replace(/([A-Z])/g, "-$1").toLowerCase();

export function containerDeclarations(c: FlexContainer, includeDefaults = true) {
  const all: [string, string][] = [
    ["display", c.display],
    ["flex-direction", c.flexDirection],
    ["flex-wrap", c.flexWrap],
    ["justify-content", c.justifyContent],
    ["align-items", c.alignItems],
    ["align-content", c.alignContent],
  ];
  if (c.gap > 0) all.push(["gap", `${c.gap}px`]);
  if (includeDefaults) return all;
  return all.filter(([prop, value]) => CONTAINER_DEFAULTS[prop] !== value);
}

export function itemDeclarations(item: FlexItem) {
  const out: [string, string][] = [];
  if (item.order !== 0) out.push(["order", String(item.order)]);
  if (item.grow !== 0) out.push(["flex-grow", String(item.grow)]);
  if (item.shrink !== 1) out.push(["flex-shrink", String(item.shrink)]);
  if (item.basis !== "auto") out.push(["flex-basis", item.basis]);
  if (item.alignSelf !== "auto") out.push(["align-self", item.alignSelf]);
  return out;
}

/* ── inline styles for the live preview ────────────────────────── */

export const containerStyle = (c: FlexContainer): React.CSSProperties => ({
  display: c.display,
  flexDirection: c.flexDirection,
  flexWrap: c.flexWrap,
  justifyContent: c.justifyContent,
  alignItems: c.alignItems,
  alignContent: c.alignContent,
  gap: `${c.gap}px`,
});

export const itemStyle = (item: FlexItem): React.CSSProperties => ({
  order: item.order,
  flexGrow: item.grow,
  flexShrink: item.shrink,
  flexBasis: isValidBasis(item.basis) ? item.basis : "auto",
  alignSelf: item.alignSelf,
});

/* ── CSS export ────────────────────────────────────────────────── */

export function toCss(config: FlexConfig, { includeDefaults = true } = {}) {
  const block = (selector: string, decls: [string, string][]) =>
    decls.length
      ? `${selector} {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join("\n")}\n}`
      : "";

  const parts = [
    block(".flex-container", containerDeclarations(config.container, includeDefaults)),
  ];

  config.items.forEach((item, i) => {
    const decls = itemDeclarations(item);
    if (!decls.length) return;
    parts.push(block(`.flex-container > :nth-child(${i + 1})`, decls));
  });

  return parts.filter(Boolean).join("\n\n");
}

/* ── Tailwind export ───────────────────────────────────────────── */

const TW_CONTAINER: Record<string, Record<string, string>> = {
  display: { flex: "flex", "inline-flex": "inline-flex" },
  flexDirection: {
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
    column: "flex-col",
    "column-reverse": "flex-col-reverse",
  },
  flexWrap: { nowrap: "flex-nowrap", wrap: "flex-wrap", "wrap-reverse": "flex-wrap-reverse" },
  justifyContent: {
    "flex-start": "justify-start",
    center: "justify-center",
    "flex-end": "justify-end",
    "space-between": "justify-between",
    "space-around": "justify-around",
    "space-evenly": "justify-evenly",
  },
  alignItems: {
    stretch: "items-stretch",
    center: "items-center",
    "flex-start": "items-start",
    "flex-end": "items-end",
    baseline: "items-baseline",
  },
  alignContent: {
    stretch: "content-stretch",
    center: "content-center",
    "flex-start": "content-start",
    "flex-end": "content-end",
    "space-between": "content-between",
    "space-around": "content-around",
    "space-evenly": "content-evenly",
  },
};

const TW_SELF: Record<AlignSelf, string> = {
  auto: "self-auto",
  stretch: "self-stretch",
  center: "self-center",
  "flex-start": "self-start",
  "flex-end": "self-end",
  baseline: "self-baseline",
};

/** Arbitrary values may not contain spaces. */
const arbitrary = (v: string) => v.replace(/\s+/g, "");

export function containerClasses(c: FlexContainer) {
  const out = [
    TW_CONTAINER.display[c.display],
    TW_CONTAINER.flexDirection[c.flexDirection],
    TW_CONTAINER.flexWrap[c.flexWrap],
    TW_CONTAINER.justifyContent[c.justifyContent],
    TW_CONTAINER.alignItems[c.alignItems],
  ];
  if (!alignContentIsInert(c)) out.push(TW_CONTAINER.alignContent[c.alignContent]);
  if (c.gap > 0) out.push(c.gap % 4 === 0 ? `gap-${c.gap / 4}` : `gap-[${c.gap}px]`);
  return out.filter(Boolean).join(" ");
}

export function itemClasses(item: FlexItem) {
  const out: string[] = [];
  if (item.order !== 0) {
    out.push(item.order >= 1 && item.order <= 12 ? `order-${item.order}` : `order-[${item.order}]`);
  }
  if (item.grow !== 0) out.push(item.grow === 1 ? "grow" : `grow-[${item.grow}]`);
  if (item.shrink !== 1) out.push(item.shrink === 0 ? "shrink-0" : `shrink-[${item.shrink}]`);
  if (item.basis !== "auto") {
    out.push(item.basis === "100%" ? "basis-full" : `basis-[${arbitrary(item.basis)}]`);
  }
  if (item.alignSelf !== "auto") out.push(TW_SELF[item.alignSelf]);
  return out.join(" ");
}

export function toTailwind(config: FlexConfig) {
  const lines = [`<div class="${containerClasses(config.container)}">`];
  config.items.forEach((item, i) => {
    const cls = itemClasses(item);
    lines.push(`  <div${cls ? ` class="${cls}"` : ""}>Item ${i + 1}</div>`);
  });
  lines.push("</div>");
  return lines.join("\n");
}

/* ── React export ──────────────────────────────────────────────── */

const styleObject = (decls: [string, string][], indent: string) =>
  decls
    .map(([prop, value]) => {
      const key = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return `${indent}${key}: "${value}",`;
    })
    .join("\n");

export function toReact(config: FlexConfig) {
  const container = containerDeclarations(config.container);
  const itemStyles = config.items
    .map((item, i) => {
      const decls = itemDeclarations(item);
      if (!decls.length) return null;
      return `  item${i + 1}: {\n${styleObject(decls, "    ")}\n  },`;
    })
    .filter(Boolean);

  const styles = [
    "const styles: Record<string, React.CSSProperties> = {",
    `  container: {\n${styleObject(container, "    ")}\n  },`,
    ...itemStyles,
    "};",
  ].join("\n");

  const jsx = [
    "",
    "<div style={styles.container}>",
    ...config.items.map((item, i) => {
      const hasStyle = itemDeclarations(item).length > 0;
      return `  <div${hasStyle ? ` style={styles.item${i + 1}}` : ""}>Item ${i + 1}</div>`;
    }),
    "</div>",
  ].join("\n");

  return `${styles}\n${jsx}`;
}

/** `kebab` is exported for tests and for the item label helper. */
export { kebab };
