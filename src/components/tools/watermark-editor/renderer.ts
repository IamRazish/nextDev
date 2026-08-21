export { canvasToBlob } from "@/lib/canvas";

import {
  findPreset,
  type ComposerConfig,
  type TextAlign,
  type TextBlock,
  type Watermark,
} from "./types";

export type FontMap = Record<string, string>;

/** Canvas needs a concrete family, so peel the first entry off next/font's list. */
export const primaryFamily = (family: string) =>
  family.split(",")[0].trim().replace(/^['"]|['"]$/g, "");

const fontString = (block: { weight: number; size: number }, family: string) =>
  `${block.weight} ${block.size}px ${family}`;

/**
 * Waits for the faces the current config actually uses. Without this the first
 * paint measures a fallback face and the layout jumps once the webfont lands.
 */
export async function ensureFonts(config: ComposerConfig, fonts: FontMap) {
  if (typeof document === "undefined" || !document.fonts) return;
  const wanted = [
    { family: fonts[config.title.font], weight: config.title.weight },
    { family: fonts[config.body.font], weight: config.body.weight },
    { family: fonts[config.watermark.font], weight: 700 },
  ];
  await Promise.all(
    wanted
      .filter((w) => w.family)
      .map((w) =>
        document.fonts.load(`${w.weight} 64px "${primaryFamily(w.family)}"`).catch(() => []),
      ),
  );
}

const isPaintable = (color: string) => color !== "transparent" && color !== "";

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Greedy word wrap that also honours the newlines the user typed. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

type BlockLayout = {
  lines: string[];
  /** height of the painted block, excluding margins */
  height: number;
  width: number;
};

function layoutBlock(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  family: string,
  columnWidth: number,
): BlockLayout {
  ctx.font = fontString(block, family);
  const inner = Math.max(10, columnWidth - block.margins.left - block.margins.right - block.padding * 2);
  const lines = wrapText(ctx, block.text, inner);
  const lineHeight = block.size * block.lineHeight;
  return {
    lines,
    height: lines.length * lineHeight + block.padding * 2 + block.borderWidth * 2,
    width: columnWidth - block.margins.left - block.margins.right,
  };
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  family: string,
  layout: BlockLayout,
  x: number,
  y: number,
  rtl: boolean,
) {
  const w = layout.width;
  const h = layout.height;

  if (isPaintable(block.backgroundColor)) {
    ctx.fillStyle = block.backgroundColor;
    roundedRect(ctx, x, y, w, h, block.borderRadius);
    ctx.fill();
  }

  if (block.borderWidth > 0 && isPaintable(block.borderColor)) {
    ctx.strokeStyle = block.borderColor;
    ctx.lineWidth = block.borderWidth;
    roundedRect(
      ctx,
      x + block.borderWidth / 2,
      y + block.borderWidth / 2,
      w - block.borderWidth,
      h - block.borderWidth,
      block.borderRadius,
    );
    ctx.stroke();
  }

  ctx.font = fontString(block, family);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textBaseline = "top";
  ctx.textAlign = block.align as CanvasTextAlign;

  const lineHeight = block.size * block.lineHeight;
  const inset = block.padding + block.borderWidth;
  const left = x + inset;
  const right = x + w - inset;
  const anchor: Record<TextAlign, number> = {
    left,
    center: (left + right) / 2,
    right,
  };

  layout.lines.forEach((line, i) => {
    // canvas has no line-height, so centre each line inside its own slot
    const baseline = y + inset + i * lineHeight + (lineHeight - block.size) / 2;
    if (block.strokeWidth > 0 && isPaintable(block.strokeColor)) {
      ctx.lineWidth = block.strokeWidth;
      ctx.strokeStyle = block.strokeColor;
      ctx.lineJoin = "round";
      ctx.strokeText(line, anchor[block.align], baseline);
    }
    ctx.fillStyle = block.color;
    ctx.fillText(line, anchor[block.align], baseline);
  });
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  config: ComposerConfig,
  width: number,
  height: number,
  image: HTMLImageElement | null,
) {
  if (config.backgroundType === "image" && image) {
    // cover: fill the frame, crop the overflow, keep it centred
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    return;
  }

  if (config.backgroundType === "gradient") {
    const coords: Record<string, [number, number, number, number]> = {
      "to right": [0, 0, width, 0],
      "to bottom": [0, 0, 0, height],
      "to bottom right": [0, 0, width, height],
      "to top right": [0, height, width, 0],
    };
    const [x1, y1, x2, y2] = coords[config.gradientDirection] ?? coords["to bottom"];
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, config.gradientStart);
    gradient.addColorStop(1, config.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  mark: Watermark,
  family: string,
  width: number,
  height: number,
) {
  if (!mark.show || !mark.text.trim()) return;

  ctx.save();
  ctx.globalAlpha = mark.opacity;
  ctx.fillStyle = mark.color;
  ctx.font = `700 ${mark.size}px ${family}`;
  ctx.textBaseline = "middle";

  const radians = (mark.rotation * Math.PI) / 180;

  if (mark.mode === "single") {
    // Rotating about the anchor pushed a corner mark off the canvas, so place
    // the text's centre inside by half of its *rotated* bounding box instead.
    const textWidth = ctx.measureText(mark.text).width;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const halfW = (textWidth * cos + mark.size * sin) / 2;
    const halfH = (textWidth * sin + mark.size * cos) / 2;

    const left = mark.inset + halfW;
    const right = width - mark.inset - halfW;
    const top = mark.inset + halfH;
    const bottom = height - mark.inset - halfH;

    const anchors: Record<Watermark["position"], { x: number; y: number }> = {
      "top-left": { x: left, y: top },
      "top-right": { x: right, y: top },
      "bottom-left": { x: left, y: bottom },
      "bottom-right": { x: right, y: bottom },
      center: { x: width / 2, y: height / 2 },
    };
    const anchor = anchors[mark.position];
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(radians);
    ctx.textAlign = "center";
    ctx.fillText(mark.text, 0, 0);
    ctx.restore();
    return;
  }

  // grid: the original tiled a 2S box holding two staggered marks
  const step = Math.max(20, mark.gridSpacing);
  const tile = step * 2;
  ctx.textAlign = "center";
  // overshoot the frame so rotated marks do not stop short of the edges
  for (let y = -tile; y < height + tile; y += tile) {
    for (let x = -tile; x < width + tile; x += tile) {
      for (const [dx, dy] of [
        [step / 2, step / 2],
        [step * 1.5, step * 1.5],
      ]) {
        ctx.save();
        ctx.translate(x + dx, y + dy);
        ctx.rotate(radians);
        ctx.fillText(mark.text, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

/** Draws the whole composition in design units — the caller sets up scaling. */
export function render(
  ctx: CanvasRenderingContext2D,
  config: ComposerConfig,
  fonts: FontMap,
  image: HTMLImageElement | null,
) {
  const preset = findPreset(config.preset);
  const { width, height } = preset;
  const rtl = config.language === "ur";

  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, config, width, height, image);

  const columnWidth = Math.max(20, width - config.canvasPadding * 2);
  const blocks: { block: TextBlock; family: string; layout: BlockLayout }[] = [];

  for (const block of [config.title, config.body]) {
    if (!block.show || !block.text) continue;
    const family = fonts[block.font] ?? "sans-serif";
    blocks.push({ block, family, layout: layoutBlock(ctx, block, family, columnWidth) });
  }

  const totalHeight = blocks.reduce(
    (sum, b) => sum + b.layout.height + b.block.margins.top + b.block.margins.bottom,
    0,
  );

  let y =
    config.verticalAlignment === "top"
      ? config.canvasPadding
      : config.verticalAlignment === "bottom"
        ? height - config.canvasPadding - totalHeight
        : (height - totalHeight) / 2;

  for (const { block, family, layout } of blocks) {
    y += block.margins.top;
    drawBlock(
      ctx,
      block,
      family,
      layout,
      config.canvasPadding + block.margins.left,
      y,
      rtl,
    );
    y += layout.height + block.margins.bottom;
  }

  drawWatermark(ctx, config.watermark, fonts[config.watermark.font] ?? "sans-serif", width, height);
}

/** Renders to a detached canvas at `scale`× the preset size, for export. */
export function renderToCanvas(
  config: ComposerConfig,
  fonts: FontMap,
  image: HTMLImageElement | null,
  scale = 1,
) {
  const preset = findPreset(config.preset);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(preset.width * scale);
  canvas.height = Math.round(preset.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  render(ctx, config, fonts, image);
  return canvas;
}
