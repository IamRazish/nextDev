export type Stripe = { id: string; color: string; width: number };
export type StripeConfig = { angle: number; stripes: Stripe[] };

let seq = 0;
export const newStripe = (color = "#4f46e5", width = 20): Stripe => ({
  id: `s${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  color,
  width,
});

/** A stripe with a non-positive width would collapse the pattern. */
const safeWidth = (w: number) => (Number.isFinite(w) && w > 0 ? Math.round(w) : 1);

export const patternWidth = (config: StripeConfig) =>
  config.stripes.reduce((sum, s) => sum + safeWidth(s.width), 0);

/**
 * Hard stops at each boundary — `colour Npx, colour Mpx` — which is what makes
 * a gradient render as flat stripes instead of a blend.
 */
export function buildGradient(config: StripeConfig) {
  if (!config.stripes.length) return "none";
  let offset = 0;
  const stops = config.stripes.map((s) => {
    const w = safeWidth(s.width);
    const stop = `${s.color} ${offset}px, ${s.color} ${offset + w}px`;
    offset += w;
    return stop;
  });
  return `repeating-linear-gradient(${config.angle}deg, ${stops.join(", ")})`;
}

export function toCss(config: StripeConfig, selector = ".striped") {
  return `${selector} {\n  background-image: ${buildGradient(config)};\n}`;
}

export function toTailwind(config: StripeConfig) {
  // Tailwind arbitrary values cannot contain spaces — underscores stand in.
  return `bg-[${buildGradient(config).replace(/,\s+/g, ",").replace(/\s/g, "_")}]`;
}

export function toReact(config: StripeConfig) {
  return `const stripeStyle: React.CSSProperties = {\n  backgroundImage:\n    "${buildGradient(config)}",\n};\n\n<div style={stripeStyle} className="h-64 w-full rounded-lg" />`;
}

export function toSvg(config: StripeConfig, size = 320) {
  // Flat rects rotated about the centre reproduce the CSS pattern as a file.
  const total = patternWidth(config) || 1;
  const repeats = Math.ceil((size * 1.5) / total) + 1;
  const rects: string[] = [];
  for (let r = 0; r < repeats; r++) {
    let offset = r * total - size * 0.25;
    for (const s of config.stripes) {
      const w = safeWidth(s.width);
      rects.push(`<rect x="${offset}" y="${-size}" width="${w}" height="${size * 3}" fill="${s.color}" />`);
      offset += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n  <g transform="rotate(${config.angle - 90} ${size / 2} ${size / 2})">\n    ${rects.join("\n    ")}\n  </g>\n</svg>`;
}
