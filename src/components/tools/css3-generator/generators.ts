export type GeneratorId =
  | "border-radius"
  | "box-shadow"
  | "text-shadow"
  | "rgba"
  | "gradient"
  | "transform"
  | "transition"
  | "multi-column"
  | "box-resize"
  | "box-sizing"
  | "outline";

export type PreviewKind = "box" | "button" | "text";

export type GeneratorConfig = {
  borderRadius: {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
    linked: boolean;
  };
  boxShadow: { x: number; y: number; blur: number; spread: number; color: string; inset: boolean };
  textShadow: { x: number; y: number; blur: number; color: string };
  rgba: { r: number; g: number; b: number; a: number };
  gradient: {
    type: "linear" | "radial";
    angle: number;
    stops: { color: string; position: number }[];
  };
  transform: {
    rotate: number;
    scale: number;
    skewX: number;
    skewY: number;
    translateX: number;
    translateY: number;
  };
  transition: { property: string; duration: number; timingFunction: string; delay: number };
  multiColumn: {
    count: number;
    width: number;
    gap: number;
    ruleStyle: string;
    ruleWidth: number;
    ruleColor: string;
  };
  boxResize: { resize: string; overflow: string };
  boxSizing: {
    boxSizing: "border-box" | "content-box";
    width: number;
    padding: number;
    borderWidth: number;
    borderStyle: string;
    borderColor: string;
  };
  outline: { width: number; style: string; color: string; offset: number };
};

export const DEFAULT_CONFIG: GeneratorConfig = {
  borderRadius: { topLeft: 10, topRight: 10, bottomRight: 10, bottomLeft: 10, linked: true },
  boxShadow: { x: 0, y: 4, blur: 10, spread: 0, color: "rgba(0,0,0,0.1)", inset: false },
  textShadow: { x: 2, y: 2, blur: 4, color: "#000000" },
  rgba: { r: 65, g: 105, b: 225, a: 1 },
  gradient: {
    type: "linear",
    angle: 90,
    stops: [
      { color: "#4facfe", position: 0 },
      { color: "#00f2fe", position: 100 },
    ],
  },
  transform: { rotate: 0, scale: 1, skewX: 0, skewY: 0, translateX: 0, translateY: 0 },
  transition: { property: "all", duration: 0.3, timingFunction: "ease", delay: 0 },
  multiColumn: {
    count: 3,
    width: 0,
    gap: 20,
    ruleStyle: "solid",
    ruleWidth: 1,
    ruleColor: "#333333",
  },
  boxResize: { resize: "both", overflow: "auto" },
  boxSizing: {
    boxSizing: "border-box",
    width: 300,
    padding: 20,
    borderWidth: 4,
    borderStyle: "solid",
    borderColor: "#007acc",
  },
  outline: { width: 3, style: "dashed", color: "#ff5722", offset: 4 },
};

/* ── control schema ────────────────────────────────────────────── */

export type Control =
  | {
      kind: "slider";
      path: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      unit?: string;
    }
  | { kind: "select"; path: string; label: string; options: readonly string[] }
  | { kind: "color"; path: string; label: string; hint?: string }
  | { kind: "text"; path: string; label: string; placeholder?: string; hint?: string }
  | { kind: "toggle"; path: string; label: string }
  | { kind: "stops"; path: string; label: string };

export type Generator = {
  id: GeneratorId;
  label: string;
  glyph: string;
  description: string;
  controls: Control[];
  /** which sample the preview should show; undefined means the panel draws its own */
  custom?: boolean;
};

const BORDER_STYLES = ["none", "solid", "dashed", "dotted", "double"] as const;

export const GENERATORS: Generator[] = [
  {
    id: "border-radius",
    label: "Border Radius",
    glyph: "⬜",
    description: "Rounds the corners of an element.",
    controls: [
      { kind: "toggle", path: "borderRadius.linked", label: "Link all corners" },
      { kind: "slider", path: "borderRadius.topLeft", label: "Top left", min: 0, max: 100, unit: "px" },
      { kind: "slider", path: "borderRadius.topRight", label: "Top right", min: 0, max: 100, unit: "px" },
      {
        kind: "slider",
        path: "borderRadius.bottomRight",
        label: "Bottom right",
        min: 0,
        max: 100,
        unit: "px",
      },
      {
        kind: "slider",
        path: "borderRadius.bottomLeft",
        label: "Bottom left",
        min: 0,
        max: 100,
        unit: "px",
      },
    ],
  },
  {
    id: "box-shadow",
    label: "Box Shadow",
    glyph: "🃏",
    description: "Adds shadow effects around an element's frame.",
    controls: [
      { kind: "slider", path: "boxShadow.x", label: "Offset x", min: -50, max: 50, unit: "px" },
      { kind: "slider", path: "boxShadow.y", label: "Offset y", min: -50, max: 50, unit: "px" },
      { kind: "slider", path: "boxShadow.blur", label: "Blur", min: 0, max: 100, unit: "px" },
      { kind: "slider", path: "boxShadow.spread", label: "Spread", min: -50, max: 50, unit: "px" },
      {
        kind: "text",
        path: "boxShadow.color",
        label: "Shadow colour",
        placeholder: "rgba(0,0,0,0.5)",
        hint: "hex, rgb/rgba, hsl or a colour keyword",
      },
      { kind: "toggle", path: "boxShadow.inset", label: "Inset" },
    ],
  },
  {
    id: "text-shadow",
    label: "Text Shadow",
    glyph: "🅰️",
    description: "Adds a shadow behind text.",
    controls: [
      { kind: "slider", path: "textShadow.x", label: "Offset x", min: -50, max: 50, unit: "px" },
      { kind: "slider", path: "textShadow.y", label: "Offset y", min: -50, max: 50, unit: "px" },
      { kind: "slider", path: "textShadow.blur", label: "Blur", min: 0, max: 50, unit: "px" },
      { kind: "color", path: "textShadow.color", label: "Shadow colour" },
    ],
  },
  {
    id: "rgba",
    label: "RGBA Colour",
    glyph: "🎨",
    description: "Builds a colour from red, green, blue and alpha channels.",
    controls: [
      { kind: "slider", path: "rgba.r", label: "Red", min: 0, max: 255 },
      { kind: "slider", path: "rgba.g", label: "Green", min: 0, max: 255 },
      { kind: "slider", path: "rgba.b", label: "Blue", min: 0, max: 255 },
      { kind: "slider", path: "rgba.a", label: "Alpha", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "gradient",
    label: "Gradient",
    glyph: "🌈",
    description: "A quick two-stop gradient.",
    controls: [
      { kind: "select", path: "gradient.type", label: "Type", options: ["linear", "radial"] },
      { kind: "slider", path: "gradient.angle", label: "Angle", min: 0, max: 360, unit: "deg" },
      { kind: "stops", path: "gradient.stops", label: "Stops" },
    ],
  },
  {
    id: "transform",
    label: "Transform",
    glyph: "🔄",
    description: "Rotates, scales, skews or translates an element.",
    controls: [
      { kind: "slider", path: "transform.rotate", label: "Rotate", min: 0, max: 360, unit: "deg" },
      { kind: "slider", path: "transform.scale", label: "Scale", min: 0.1, max: 2, step: 0.1 },
      { kind: "slider", path: "transform.skewX", label: "Skew x", min: -90, max: 90, unit: "deg" },
      { kind: "slider", path: "transform.skewY", label: "Skew y", min: -90, max: 90, unit: "deg" },
      {
        kind: "slider",
        path: "transform.translateX",
        label: "Translate x",
        min: -100,
        max: 100,
        unit: "px",
      },
      {
        kind: "slider",
        path: "transform.translateY",
        label: "Translate y",
        min: -100,
        max: 100,
        unit: "px",
      },
    ],
  },
  {
    id: "transition",
    label: "Transition",
    glyph: "⏱️",
    description: "Controls how a property animates between values.",
    controls: [
      {
        kind: "select",
        path: "transition.property",
        label: "Property",
        options: ["all", "background-color", "transform", "opacity", "color", "box-shadow"],
      },
      {
        kind: "select",
        path: "transition.timingFunction",
        label: "Timing",
        options: ["ease", "linear", "ease-in", "ease-out", "ease-in-out"],
      },
      {
        kind: "slider",
        path: "transition.duration",
        label: "Duration",
        min: 0,
        max: 5,
        step: 0.1,
        unit: "s",
      },
      { kind: "slider", path: "transition.delay", label: "Delay", min: 0, max: 5, step: 0.1, unit: "s" },
    ],
    custom: true,
  },
  {
    id: "multi-column",
    label: "Multiple Column",
    glyph: "📰",
    description: "Flows text into newspaper-style columns.",
    controls: [
      { kind: "slider", path: "multiColumn.count", label: "Column count", min: 1, max: 6 },
      {
        kind: "slider",
        path: "multiColumn.width",
        label: "Column width",
        min: 0,
        max: 400,
        step: 10,
        unit: "px",
      },
      { kind: "slider", path: "multiColumn.gap", label: "Gap", min: 0, max: 80, unit: "px" },
      {
        kind: "select",
        path: "multiColumn.ruleStyle",
        label: "Rule style",
        options: BORDER_STYLES,
      },
      { kind: "slider", path: "multiColumn.ruleWidth", label: "Rule width", min: 0, max: 10, unit: "px" },
      { kind: "color", path: "multiColumn.ruleColor", label: "Rule colour" },
    ],
    custom: true,
  },
  {
    id: "box-resize",
    label: "Box Resize",
    glyph: "↔️",
    description: "Lets the user drag an element bigger or smaller.",
    controls: [
      {
        kind: "select",
        path: "boxResize.resize",
        label: "Resize",
        options: ["none", "both", "horizontal", "vertical"],
      },
      {
        kind: "select",
        path: "boxResize.overflow",
        label: "Overflow",
        options: ["visible", "hidden", "auto", "scroll"],
      },
    ],
    custom: true,
  },
  {
    id: "box-sizing",
    label: "Box Sizing",
    glyph: "📦",
    description: "Whether width includes padding and border.",
    controls: [
      {
        kind: "select",
        path: "boxSizing.boxSizing",
        label: "Box sizing",
        options: ["border-box", "content-box"],
      },
      { kind: "slider", path: "boxSizing.width", label: "Width", min: 100, max: 500, unit: "px" },
      { kind: "slider", path: "boxSizing.padding", label: "Padding", min: 0, max: 50, unit: "px" },
      {
        kind: "slider",
        path: "boxSizing.borderWidth",
        label: "Border width",
        min: 0,
        max: 20,
        unit: "px",
      },
      {
        kind: "select",
        path: "boxSizing.borderStyle",
        label: "Border style",
        options: ["none", "solid", "dashed", "dotted"],
      },
      { kind: "color", path: "boxSizing.borderColor", label: "Border colour" },
    ],
    custom: true,
  },
  {
    id: "outline",
    label: "Outline",
    glyph: "🔲",
    description: "Draws a line outside the border edge.",
    controls: [
      { kind: "slider", path: "outline.width", label: "Width", min: 0, max: 10, unit: "px" },
      { kind: "select", path: "outline.style", label: "Style", options: BORDER_STYLES },
      { kind: "color", path: "outline.color", label: "Colour" },
      { kind: "slider", path: "outline.offset", label: "Offset", min: -10, max: 20, unit: "px" },
    ],
    custom: true,
  },
];

export const findGenerator = (id: GeneratorId) =>
  GENERATORS.find((g) => g.id === id) ?? GENERATORS[0];

/* ── path helpers so the control schema can stay declarative ────── */

export function getAtPath(config: GeneratorConfig, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, config);
}

export function setAtPath(
  config: GeneratorConfig,
  path: string,
  value: unknown,
): GeneratorConfig {
  const [head, ...rest] = path.split(".");
  const clone = { ...config } as unknown as Record<string, unknown>;
  if (!rest.length) {
    clone[head] = value;
    return clone as unknown as GeneratorConfig;
  }
  const branch = { ...(clone[head] as Record<string, unknown>) };
  let cursor = branch;
  for (let i = 0; i < rest.length - 1; i++) {
    cursor[rest[i]] = { ...(cursor[rest[i]] as Record<string, unknown>) };
    cursor = cursor[rest[i]] as Record<string, unknown>;
  }
  cursor[rest[rest.length - 1]] = value;
  clone[head] = branch;
  return clone as unknown as GeneratorConfig;
}

/**
 * `Link all corners` has to fan one value out to all four, which no generic
 * path setter can know about.
 */
export function applyControlChange(
  config: GeneratorConfig,
  path: string,
  value: unknown,
): GeneratorConfig {
  if (path.startsWith("borderRadius.") && path !== "borderRadius.linked") {
    if (config.borderRadius.linked && typeof value === "number") {
      return {
        ...config,
        borderRadius: {
          topLeft: value,
          topRight: value,
          bottomRight: value,
          bottomLeft: value,
          linked: true,
        },
      };
    }
  }
  return setAtPath(config, path, value);
}

export function resetGenerator(config: GeneratorConfig, id: GeneratorId): GeneratorConfig {
  const key = SLICE_BY_ID[id];
  return { ...config, [key]: DEFAULT_CONFIG[key] } as GeneratorConfig;
}

const SLICE_BY_ID: Record<GeneratorId, keyof GeneratorConfig> = {
  "border-radius": "borderRadius",
  "box-shadow": "boxShadow",
  "text-shadow": "textShadow",
  rgba: "rgba",
  gradient: "gradient",
  transform: "transform",
  transition: "transition",
  "multi-column": "multiColumn",
  "box-resize": "boxResize",
  "box-sizing": "boxSizing",
  outline: "outline",
};

/* ── the declarations each generator produces ──────────────────── */

const stopList = (config: GeneratorConfig) =>
  config.gradient.stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");

export const gradientValue = (config: GeneratorConfig) =>
  config.gradient.type === "linear"
    ? `linear-gradient(${config.gradient.angle}deg, ${stopList(config)})`
    : `radial-gradient(circle, ${stopList(config)})`;

export const rgbaValue = (config: GeneratorConfig) =>
  `rgba(${config.rgba.r}, ${config.rgba.g}, ${config.rgba.b}, ${config.rgba.a})`;

export const boxShadowValue = (config: GeneratorConfig) => {
  const s = config.boxShadow;
  return `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`;
};

export const textShadowValue = (config: GeneratorConfig) => {
  const s = config.textShadow;
  return `${s.x}px ${s.y}px ${s.blur}px ${s.color}`;
};

export const transformValue = (config: GeneratorConfig) => {
  const t = config.transform;
  return `rotate(${t.rotate}deg) scale(${t.scale}) skew(${t.skewX}deg, ${t.skewY}deg) translate(${t.translateX}px, ${t.translateY}px)`;
};

export const transitionValue = (config: GeneratorConfig) => {
  const t = config.transition;
  return `${t.property} ${t.duration}s ${t.timingFunction} ${t.delay}s`;
};

export const borderRadiusValue = (config: GeneratorConfig) => {
  const r = config.borderRadius;
  return `${r.topLeft}px ${r.topRight}px ${r.bottomRight}px ${r.bottomLeft}px`;
};

/** [property, value] pairs — one source for CSS, React and the preview. */
export function declarations(id: GeneratorId, config: GeneratorConfig): [string, string][] {
  switch (id) {
    case "border-radius":
      return [["border-radius", borderRadiusValue(config)]];
    case "box-shadow":
      return [["box-shadow", boxShadowValue(config)]];
    case "text-shadow":
      return [["text-shadow", textShadowValue(config)]];
    case "rgba":
      return [["background-color", rgbaValue(config)]];
    case "gradient":
      return [["background-image", gradientValue(config)]];
    case "transform":
      return [["transform", transformValue(config)]];
    case "transition":
      return [["transition", transitionValue(config)]];
    case "multi-column": {
      const m = config.multiColumn;
      const out: [string, string][] = [
        ["column-count", String(m.count)],
        ["column-gap", `${m.gap}px`],
      ];
      if (m.width > 0) out.push(["column-width", `${m.width}px`]);
      if (m.ruleStyle !== "none") {
        out.push(["column-rule", `${m.ruleWidth}px ${m.ruleStyle} ${m.ruleColor}`]);
      }
      return out;
    }
    case "box-resize":
      return [
        ["resize", config.boxResize.resize],
        ["overflow", config.boxResize.overflow],
      ];
    case "box-sizing": {
      const b = config.boxSizing;
      return [
        ["box-sizing", b.boxSizing],
        ["width", `${b.width}px`],
        ["padding", `${b.padding}px`],
        ["border", `${b.borderWidth}px ${b.borderStyle} ${b.borderColor}`],
      ];
    }
    case "outline":
      return [
        ["outline", `${config.outline.width}px ${config.outline.style} ${config.outline.color}`],
        ["outline-offset", `${config.outline.offset}px`],
      ];
  }
}

export function toCss(id: GeneratorId, config: GeneratorConfig, selector = ".example") {
  const decls = declarations(id, config);
  return `${selector} {\n${decls.map(([p, v]) => `  ${p}: ${v};`).join("\n")}\n}`;
}

const camel = (prop: string) => prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

export function toReact(id: GeneratorId, config: GeneratorConfig) {
  const decls = declarations(id, config);
  const body = decls.map(([p, v]) => `  ${camel(p)}: "${v}",`).join("\n");
  return `const style: React.CSSProperties = {\n${body}\n};\n\n<div style={style} />`;
}

export function previewStyle(id: GeneratorId, config: GeneratorConfig): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const [prop, value] of declarations(id, config)) style[camel(prop)] = value;
  return style as React.CSSProperties;
}

/* ── Tailwind ──────────────────────────────────────────────────── */

const arb = (value: string) => value.replace(/,\s+/g, ",").replace(/\s/g, "_");

export function toTailwind(id: GeneratorId, config: GeneratorConfig) {
  switch (id) {
    case "border-radius":
      return `rounded-[${arb(borderRadiusValue(config))}]`;
    case "box-shadow":
      return `shadow-[${arb(boxShadowValue(config))}]`;
    case "text-shadow":
      return `[text-shadow:${arb(textShadowValue(config))}]`;
    case "rgba":
      return `bg-[${arb(rgbaValue(config))}]`;
    case "gradient":
      return `bg-[${arb(gradientValue(config))}]`;
    case "transform": {
      const t = config.transform;
      // Tailwind has first-class transform utilities, so use them over one
      // arbitrary blob and skip the parts left at their identity value.
      const parts = [
        t.rotate !== 0 ? `rotate-[${t.rotate}deg]` : "",
        t.scale !== 1 ? `scale-[${t.scale}]` : "",
        t.skewX !== 0 ? `skew-x-[${t.skewX}deg]` : "",
        t.skewY !== 0 ? `skew-y-[${t.skewY}deg]` : "",
        t.translateX !== 0 ? `translate-x-[${t.translateX}px]` : "",
        t.translateY !== 0 ? `translate-y-[${t.translateY}px]` : "",
      ].filter(Boolean);
      return parts.length ? parts.join(" ") : "transform-none";
    }
    case "transition": {
      const t = config.transition;
      const property =
        t.property === "all"
          ? "transition-all"
          : t.property === "transform"
            ? "transition-transform"
            : t.property === "opacity"
              ? "transition-opacity"
              : t.property === "color"
                ? "transition-colors"
                : `[transition-property:${t.property}]`;
      const timing =
        t.timingFunction === "linear"
          ? "ease-linear"
          : t.timingFunction === "ease-in"
            ? "ease-in"
            : t.timingFunction === "ease-out"
              ? "ease-out"
              : t.timingFunction === "ease-in-out"
                ? "ease-in-out"
                : "ease-[ease]";
      const parts = [
        property,
        `duration-[${Math.round(t.duration * 1000)}ms]`,
        timing,
        t.delay > 0 ? `delay-[${Math.round(t.delay * 1000)}ms]` : "",
      ];
      return parts.filter(Boolean).join(" ");
    }
    case "multi-column": {
      const m = config.multiColumn;
      const parts = [
        `columns-${m.count}`,
        m.gap % 4 === 0 ? `gap-${m.gap / 4}` : `gap-[${m.gap}px]`,
        m.width > 0 ? `[column-width:${m.width}px]` : "",
        m.ruleStyle !== "none"
          ? `[column-rule:${arb(`${m.ruleWidth}px ${m.ruleStyle} ${m.ruleColor}`)}]`
          : "",
      ];
      return parts.filter(Boolean).join(" ");
    }
    case "box-resize": {
      const map: Record<string, string> = {
        none: "resize-none",
        both: "resize",
        horizontal: "resize-x",
        vertical: "resize-y",
      };
      return `${map[config.boxResize.resize] ?? "resize"} overflow-${config.boxResize.overflow}`;
    }
    case "box-sizing": {
      const b = config.boxSizing;
      const parts = [
        b.boxSizing === "border-box" ? "box-border" : "box-content",
        `w-[${b.width}px]`,
        `p-[${b.padding}px]`,
        b.borderStyle === "none"
          ? "border-0"
          : `border-[${b.borderWidth}px] border-${b.borderStyle} border-[${b.borderColor}]`,
      ];
      return parts.join(" ");
    }
    case "outline": {
      const o = config.outline;
      if (o.style === "none") return "outline-none";
      return `outline-[${o.width}px] outline-${o.style} outline-[${o.color}] outline-offset-[${o.offset}px]`;
    }
  }
}
