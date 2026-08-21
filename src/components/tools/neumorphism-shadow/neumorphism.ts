export type Shape = "flat" | "convex" | "concave" | "pressed";
export type LightSource = "top-left" | "top-right" | "bottom-right" | "bottom-left";

export type NeuConfig = {
  baseColor: string;
  shape: Shape;
  lightSource: LightSource;
  size: number;
  radius: number;
  distance: number;
  /** 0.01 – 0.3, how far the two shadow colours part from the base */
  intensity: number;
  blur: number;
};

export const DEFAULT_CONFIG: NeuConfig = {
  baseColor: "#e0e0e0",
  shape: "convex",
  lightSource: "top-left",
  size: 250,
  radius: 20,
  distance: 10,
  intensity: 0.15,
  blur: 20,
};

/* ── colour maths ──────────────────────────────────────────────── */

export const isHex = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

/** #abc → #aabbcc, so the channel maths below can assume six digits. */
export function normalizeHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

const channels = (hex: string): [number, number, number] => {
  const h = normalizeHex(hex);
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
};

const toHex = (c: number) =>
  `00${Math.round(Math.min(255, Math.max(0, c))).toString(16)}`.slice(-2);

/**
 * Scales each channel by `amount` — the same multiplicative shading the
 * standalone generator used, so a given base colour produces the same pair of
 * shadow colours here.
 */
export function shade(hex: string, amount: number) {
  const [r, g, b] = channels(hex);
  return `#${toHex(r + r * amount)}${toHex(g + g * amount)}${toHex(b + b * amount)}`;
}

export const shadowColors = (config: NeuConfig) => ({
  light: shade(config.baseColor, config.intensity * 2),
  dark: shade(config.baseColor, -config.intensity * 2),
});

/**
 * Multiplicative shading has nowhere to go on a near-black base: 8 * 1.3 is
 * still 10. Worth telling the user rather than showing them a flat square.
 */
export function contrastWarning(config: NeuConfig) {
  const { light, dark } = shadowColors(config);
  const [lr, lg, lb] = channels(light);
  const [dr, dg, db] = channels(dark);
  const spread = Math.max(Math.abs(lr - dr), Math.abs(lg - dg), Math.abs(lb - db));
  if (spread >= 24) return null;
  return "This base colour is too dark for the shadows to show. Lighten it, or raise the intensity.";
}

/* ── geometry ──────────────────────────────────────────────────── */

const DIRECTIONS: Record<
  LightSource,
  { dark: [number, number]; light: [number, number]; gradient: number }
> = {
  // the dark shadow always falls away from the light, the highlight towards it
  "top-left": { dark: [1, 1], light: [-1, -1], gradient: 145 },
  "top-right": { dark: [-1, 1], light: [1, -1], gradient: 215 },
  "bottom-right": { dark: [-1, -1], light: [1, 1], gradient: 325 },
  "bottom-left": { dark: [1, -1], light: [-1, 1], gradient: 35 },
};

export function boxShadow(config: NeuConfig) {
  const { light, dark } = shadowColors(config);
  const dir = DIRECTIONS[config.lightSource];
  const inset = config.shape === "pressed" ? "inset " : "";
  const d = config.distance;
  const px = (n: number) => `${n * d}px`;

  return [
    `${inset}${px(dir.dark[0])} ${px(dir.dark[1])} ${config.blur}px ${dark}`,
    `${inset}${px(dir.light[0])} ${px(dir.light[1])} ${config.blur}px ${light}`,
  ].join(", ");
}

/**
 * `flat` and `convex` produced identical CSS in the standalone tool. The
 * difference belongs in the background: a convex face catches the light at the
 * top, a concave one at the bottom.
 */
export function background(config: NeuConfig) {
  const { light, dark } = shadowColors(config);
  const angle = DIRECTIONS[config.lightSource].gradient;
  if (config.shape === "convex") return `linear-gradient(${angle}deg, ${light}, ${dark})`;
  if (config.shape === "concave") return `linear-gradient(${angle}deg, ${dark}, ${light})`;
  return config.baseColor;
}

export const previewStyle = (config: NeuConfig): React.CSSProperties => ({
  width: config.size,
  height: config.size,
  borderRadius: config.radius,
  background: background(config),
  boxShadow: boxShadow(config),
  transition: "background 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease",
});

/* ── exports ───────────────────────────────────────────────────── */

export function toCss(config: NeuConfig, selector = ".neumorphic") {
  const bg = background(config);
  return [
    `${selector} {`,
    `  width: ${config.size}px;`,
    `  height: ${config.size}px;`,
    `  border-radius: ${config.radius}px;`,
    `  background: ${bg};`,
    `  box-shadow: ${boxShadow(config)};`,
    "}",
    "",
    "/* Neumorphism only reads as depth when the element sits on the same",
    `   colour it is made of — give the parent background: ${config.baseColor}; */`,
  ].join("\n");
}

const arbitrary = (value: string) => value.replace(/,\s+/g, ",").replace(/\s/g, "_");

export function toTailwind(config: NeuConfig) {
  return [
    `w-[${config.size}px]`,
    `h-[${config.size}px]`,
    `rounded-[${config.radius}px]`,
    `bg-[${arbitrary(background(config))}]`,
    `shadow-[${arbitrary(boxShadow(config))}]`,
  ].join(" ");
}

export function toReact(config: NeuConfig) {
  return [
    "const neumorphic: React.CSSProperties = {",
    `  width: ${config.size},`,
    `  height: ${config.size},`,
    `  borderRadius: ${config.radius},`,
    `  background: "${background(config)}",`,
    `  boxShadow:`,
    `    "${boxShadow(config)}",`,
    "};",
    "",
    `<div style={{ background: "${config.baseColor}", padding: 40 }}>`,
    "  <div style={neumorphic} />",
    "</div>",
  ].join("\n");
}
