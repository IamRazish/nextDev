export type Rgba = { r: number; g: number; b: number; a: number };
export type Stop = { id: string; position: number; color: Rgba };
export type GradientType = "linear" | "radial" | "conic";
export type RadialShape = "circle" | "ellipse";

export type Adjustments = {
  /** degrees, -180 … 180 */
  hue: number;
  /** multiplier, 0 … 2 */
  saturation: number;
};

export type GradientConfig = {
  type: GradientType;
  angle: number;
  radialShape: RadialShape;
  /** `center`, `top left`, … — used by radial and conic */
  position: string;
  stops: Stop[];
  adjustments: Adjustments;
  /** emit -webkit-/-moz-/-o- copies of the declaration */
  legacyPrefixes: boolean;
};

export const POSITIONS = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
] as const;

let seq = 0;
export const newStop = (position: number, color: Rgba): Stop => ({
  id: `s${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  position,
  color,
});

export const DEFAULT_CONFIG: GradientConfig = {
  type: "linear",
  angle: 90,
  radialShape: "circle",
  position: "center",
  stops: [
    newStop(0, { r: 255, g: 0, b: 128, a: 1 }),
    newStop(100, { r: 0, g: 255, b: 255, a: 1 }),
  ],
  adjustments: { hue: 0, saturation: 1 },
  legacyPrefixes: false,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/* ── colour conversion ─────────────────────────────────────────── */

export const rgbaToCss = ({ r, g, b, a }: Rgba) =>
  a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;

const hex2 = (c: number) => `0${Math.round(clamp(c, 0, 255)).toString(16)}`.slice(-2);

export function rgbaToHex({ r, g, b, a }: Rgba) {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a >= 1 ? base : `${base}${hex2(a * 255)}`;
}

export function hexToRgba(input: string): Rgba | null {
  let hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const s = max === 0 ? 0 : diff / max;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = (g - b) / diff + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
    h /= 6;
  }
  return { h: h * 360, s, v: max };
}

/** `h` in degrees — the standalone tool fed degrees into a 0–1 parameter here,
 * which quantised every colour into the wrong hue sector. */
function hsvToRgb(hDegrees: number, s: number, v: number) {
  const h = (((hDegrees % 360) + 360) % 360) / 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i % 6];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/** Applies the global hue shift and saturation multiplier to one stop colour. */
export function adjustColor(color: Rgba, adjustments: Adjustments): Rgba {
  if (adjustments.hue === 0 && adjustments.saturation === 1) return color;
  const hsv = rgbToHsv(color.r, color.g, color.b);
  const rgb = hsvToRgb(hsv.h + adjustments.hue, clamp(hsv.s * adjustments.saturation, 0, 1), hsv.v);
  return { ...rgb, a: color.a };
}

export function interpolate(c1: Rgba, c2: Rgba, ratio: number): Rgba {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  return {
    r: mix(c1.r, c2.r),
    g: mix(c1.g, c2.g),
    b: mix(c1.b, c2.b),
    a: Number((c1.a + (c2.a - c1.a) * ratio).toFixed(3)),
  };
}

/* ── gradient string ───────────────────────────────────────────── */

export const sortedStops = (config: GradientConfig) =>
  [...config.stops].sort((a, b) => a.position - b.position);

export function stopList(config: GradientConfig) {
  return sortedStops(config)
    .map(
      (stop) =>
        `${rgbaToCss(adjustColor(stop.color, config.adjustments))} ${Number(
          stop.position.toFixed(2),
        )}%`,
    )
    .join(", ");
}

export function buildGradient(config: GradientConfig) {
  const stops = stopList(config);
  if (!stops) return "none";
  if (config.type === "linear") return `linear-gradient(${config.angle}deg, ${stops})`;
  if (config.type === "radial")
    return `radial-gradient(${config.radialShape} at ${config.position}, ${stops})`;
  return `conic-gradient(from ${config.angle}deg at ${config.position}, ${stops})`;
}

/** First stop, flattened — what a browser without gradient support falls back to. */
export function fallbackColor(config: GradientConfig) {
  const first = sortedStops(config)[0];
  if (!first) return "transparent";
  return rgbaToCss(adjustColor(first.color, config.adjustments));
}

/* ── exports ───────────────────────────────────────────────────── */

export function toCss(config: GradientConfig, selector = ".gradient") {
  const gradient = buildGradient(config);
  const lines = [`${selector} {`, `  background-color: ${fallbackColor(config)};`];

  if (config.legacyPrefixes) {
    // conic-gradient never shipped behind -moz-/-o-, so prefixing it is noise
    const prefixes = config.type === "conic" ? [""] : ["-webkit-", "-moz-", "-o-", ""];
    for (const prefix of prefixes) lines.push(`  background-image: ${prefix}${gradient};`);
  } else {
    lines.push(`  background-image: ${gradient};`);
  }

  lines.push("}");
  return lines.join("\n");
}

const arbitrary = (value: string) => value.replace(/,\s+/g, ",").replace(/\s/g, "_");

export const toTailwind = (config: GradientConfig) => `bg-[${arbitrary(buildGradient(config))}]`;

export function toReact(config: GradientConfig) {
  return [
    "const gradient: React.CSSProperties = {",
    `  backgroundColor: "${fallbackColor(config)}",`,
    "  backgroundImage:",
    `    "${buildGradient(config)}",`,
    "};",
    "",
    '<div style={gradient} className="h-64 w-full rounded-lg" />',
  ].join("\n");
}

/** SVG needs its own stop elements, and only linear/radial exist there. */
export function toSvg(config: GradientConfig, size = 320) {
  const stops = sortedStops(config)
    .map((stop) => {
      const c = adjustColor(stop.color, config.adjustments);
      return `      <stop offset="${Number(stop.position.toFixed(2))}%" stop-color="rgb(${c.r},${c.g},${c.b})" stop-opacity="${Number(c.a.toFixed(3))}" />`;
    })
    .join("\n");

  // CSS 0deg points up and turns clockwise; SVG x1/y1→x2/y2 needs a vector
  const rad = ((config.angle - 90) * Math.PI) / 180;
  const x1 = (50 - Math.cos(rad) * 50).toFixed(2);
  const y1 = (50 - Math.sin(rad) * 50).toFixed(2);
  const x2 = (50 + Math.cos(rad) * 50).toFixed(2);
  const y2 = (50 + Math.sin(rad) * 50).toFixed(2);

  const def =
    config.type === "radial"
      ? `    <radialGradient id="g" cx="50%" cy="50%" r="70%">\n${stops}\n    </radialGradient>`
      : `    <linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n${stops}\n    </linearGradient>`;

  const note =
    config.type === "conic"
      ? "\n  <!-- SVG has no conic gradient; exported as linear along the same angle -->"
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${note}
  <defs>
${def}
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)" />
</svg>`;
}

/**
 * Samples `count` colours across the middle of an image and returns them as
 * evenly spaced stops.
 */
export function stopsFromImage(image: HTMLImageElement, count = 5): Stop[] {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const stops: Stop[] = [];
  const y = Math.floor(canvas.height / 2);
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0 : i / (count - 1);
    const x = Math.min(canvas.width - 1, Math.floor(ratio * canvas.width));
    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
    stops.push(newStop(Math.round(ratio * 100), { r, g, b, a: a / 255 }));
  }
  return stops;
}
