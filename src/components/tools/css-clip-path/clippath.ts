export type Point = { x: number; y: number };
export type ShapeType = "polygon" | "circle" | "ellipse" | "inset";
export type FillRule = "nonzero" | "evenodd";

export type ClipConfig = {
  type: ShapeType;
  /** percentages of the box, 0–100 */
  points: Point[];
  fillRule: FillRule;
  circle: { r: number; cx: number; cy: number };
  ellipse: { rx: number; ry: number; cx: number; cy: number };
  inset: { top: number; right: number; bottom: number; left: number; round: number };
  width: number;
  height: number;
  snap: boolean;
  gridSize: number;
  showGrid: boolean;
  webkitPrefix: boolean;
};

export const DEFAULT_CONFIG: ClipConfig = {
  type: "polygon",
  points: [
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 80, y: 80 },
    { x: 20, y: 80 },
  ],
  fillRule: "nonzero",
  circle: { r: 50, cx: 50, cy: 50 },
  ellipse: { rx: 50, ry: 35, cx: 50, cy: 50 },
  inset: { top: 10, right: 10, bottom: 10, left: 10, round: 0 },
  width: 320,
  height: 320,
  snap: false,
  gridSize: 5,
  showGrid: true,
  webkitPrefix: false,
};

export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const round2 = (n: number) => Number(n.toFixed(2));

export const snapValue = (n: number, config: ClipConfig) =>
  config.snap && config.gridSize > 0 ? Math.round(n / config.gridSize) * config.gridSize : round2(n);

/* ── the clip-path value ───────────────────────────────────────── */

export function buildClipPath(config: ClipConfig) {
  switch (config.type) {
    case "circle":
      return `circle(${config.circle.r}% at ${config.circle.cx}% ${config.circle.cy}%)`;
    case "ellipse":
      return `ellipse(${config.ellipse.rx}% ${config.ellipse.ry}% at ${config.ellipse.cx}% ${config.ellipse.cy}%)`;
    case "inset": {
      const { top, right, bottom, left, round } = config.inset;
      return `inset(${top}% ${right}% ${bottom}% ${left}%${round > 0 ? ` round ${round}%` : ""})`;
    }
    default: {
      if (config.points.length < 3) return "none";
      const list = config.points.map((p) => `${round2(p.x)}% ${round2(p.y)}%`).join(", ");
      // A self-intersecting outline (a frame, say) only reads as hollow under
      // the even-odd rule; nonzero paints it solid.
      const rule = config.fillRule === "evenodd" ? "evenodd, " : "";
      return `polygon(${rule}${list})`;
    }
  }
}

/** Vertices are only editable for polygons. */
export const isPolygon = (config: ClipConfig) => config.type === "polygon";

/**
 * Index of the edge closest to `p`, so a click on the outline inserts the new
 * vertex between its neighbours instead of at the end of the list.
 */
export function nearestEdge(points: Point[], p: Point) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq, 0, 1);
    const distance = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

export function insertPoint(points: Point[], p: Point) {
  const edge = nearestEdge(points, p);
  const next = [...points];
  next.splice(edge + 1, 0, p);
  return next;
}

/** Regular n-gon, handy for "make this a heptagon" without a preset table. */
export function regularPolygon(sides: number, rotationDeg = -90) {
  const points: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180;
    points.push({
      x: round2(50 + Math.cos(angle) * 50),
      y: round2(50 + Math.sin(angle) * 50),
    });
  }
  return points;
}

/* ── exports ───────────────────────────────────────────────────── */

export function toCss(config: ClipConfig, selector = ".clipped") {
  const value = buildClipPath(config);
  const lines = [`${selector} {`];
  if (config.webkitPrefix) lines.push(`  -webkit-clip-path: ${value};`);
  lines.push(`  clip-path: ${value};`, "}");
  return lines.join("\n");
}

const arbitrary = (value: string) => value.replace(/,\s+/g, ",").replace(/\s/g, "_");

export const toTailwind = (config: ClipConfig) =>
  `[clip-path:${arbitrary(buildClipPath(config))}]`;

export function toReact(config: ClipConfig) {
  return [
    "const clipped: React.CSSProperties = {",
    `  clipPath: "${buildClipPath(config)}",`,
    "};",
    "",
    "<div style={clipped} className=\"h-80 w-80 bg-indigo-500\" />",
  ].join("\n");
}

/**
 * An objectBoundingBox clipPath takes 0–1 coordinates, so the same shape can be
 * reused on any sized element — and on an `<image>` if one is loaded.
 */
export function toSvg(config: ClipConfig, imageHref?: string | null) {
  const w = config.width;
  const h = config.height;
  const id = "clip";

  let shape: string;
  if (config.type === "circle") {
    shape = `    <circle cx="${config.circle.cx / 100}" cy="${config.circle.cy / 100}" r="${
      config.circle.r / 100
    }" />`;
  } else if (config.type === "ellipse") {
    shape = `    <ellipse cx="${config.ellipse.cx / 100}" cy="${config.ellipse.cy / 100}" rx="${
      config.ellipse.rx / 100
    }" ry="${config.ellipse.ry / 100}" />`;
  } else if (config.type === "inset") {
    const { top, right, bottom, left, round } = config.inset;
    const x = left / 100;
    const y = top / 100;
    const width = (100 - left - right) / 100;
    const height = (100 - top - bottom) / 100;
    const rx = round > 0 ? ` rx="${round / 100}"` : "";
    shape = `    <rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${Math.max(
      0,
      height,
    )}"${rx} />`;
  } else {
    const pts = config.points.map((p) => `${(p.x / 100).toFixed(4)},${(p.y / 100).toFixed(4)}`);
    const rule = config.fillRule === "evenodd" ? ' clip-rule="evenodd"' : "";
    shape = `    <polygon points="${pts.join(" ")}"${rule} />`;
  }

  const body = imageHref
    ? `  <image href="${imageHref}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" />`
    : `  <rect width="${w}" height="${h}" fill="#4f46e5" clip-path="url(#${id})" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <clipPath id="${id}" clipPathUnits="objectBoundingBox">
${shape}
    </clipPath>
  </defs>
${body}
</svg>`;
}

export const toJson = (config: ClipConfig) =>
  JSON.stringify(
    {
      type: config.type,
      clipPath: buildClipPath(config),
      points: config.type === "polygon" ? config.points : undefined,
      circle: config.type === "circle" ? config.circle : undefined,
      ellipse: config.type === "ellipse" ? config.ellipse : undefined,
      inset: config.type === "inset" ? config.inset : undefined,
    },
    null,
    2,
  );
