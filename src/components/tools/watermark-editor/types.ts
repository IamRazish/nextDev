export type Language = "en" | "ur";
export type TextAlign = "left" | "center" | "right";
export type VerticalAlignment = "top" | "middle" | "bottom";
export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";
export type WatermarkMode = "single" | "grid";
export type BackgroundType = "solid" | "gradient" | "image";
export type GradientDirection = "to right" | "to bottom" | "to bottom right" | "to top right";

export type Margins = { top: number; right: number; bottom: number; left: number };

export type TextBlock = {
  text: string;
  show: boolean;
  font: string;
  weight: number;
  size: number;
  lineHeight: number;
  color: string;
  /** "transparent" leaves the block unpainted */
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  margins: Margins;
  lockMargins: boolean;
  align: TextAlign;
  /** outline drawn around the glyphs */
  strokeColor: string;
  strokeWidth: number;
  /** rectangle drawn around the block — the standalone tool applied both at once */
  borderColor: string;
  borderWidth: number;
};

export type Watermark = {
  show: boolean;
  text: string;
  font: string;
  opacity: number;
  size: number;
  color: string;
  rotation: number;
  position: WatermarkPosition;
  mode: WatermarkMode;
  gridSpacing: number;
  /** distance from the edge for the single-placement modes */
  inset: number;
};

export type ComposerConfig = {
  language: Language;
  preset: string;
  verticalAlignment: VerticalAlignment;
  /** canvas px kept clear around the text column */
  canvasPadding: number;
  title: TextBlock;
  body: TextBlock;
  backgroundType: BackgroundType;
  backgroundColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: GradientDirection;
  watermark: Watermark;
};

/**
 * Real output dimensions rather than the preview-sized boxes the standalone tool
 * used, so an export lands at the size each platform actually wants.
 */
export const CANVAS_PRESETS = [
  { id: "vertical", label: "Vertical / TikTok (9:16)", width: 1080, height: 1920 },
  { id: "square", label: "Square / Instagram (1:1)", width: 1080, height: 1080 },
  { id: "instagram-portrait", label: "Instagram Portrait (4:5)", width: 1080, height: 1350 },
  { id: "horizontal", label: "Horizontal (16:9)", width: 1920, height: 1080 },
  { id: "facebook-landscape", label: "Facebook Landscape (1.91:1)", width: 1200, height: 628 },
] as const;

export const findPreset = (id: string) =>
  CANVAS_PRESETS.find((p) => p.id === id) ?? CANVAS_PRESETS[0];

const block = (overrides: Partial<TextBlock>): TextBlock => ({
  text: "",
  show: true,
  font: "Open Sans",
  weight: 400,
  size: 64,
  lineHeight: 1.5,
  color: "#111111",
  backgroundColor: "transparent",
  borderRadius: 0,
  padding: 0,
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  lockMargins: true,
  align: "center",
  strokeColor: "transparent",
  strokeWidth: 0,
  borderColor: "transparent",
  borderWidth: 0,
  ...overrides,
});

export const DEFAULT_CONFIG: ComposerConfig = {
  language: "en",
  preset: "vertical",
  verticalAlignment: "middle",
  canvasPadding: 80,
  title: block({ text: "Title Here", weight: 700, size: 96, color: "#000000" }),
  body: block({ text: "Your text goes here...", size: 56, lineHeight: 1.6, color: "#333333" }),
  backgroundType: "solid",
  backgroundColor: "#ffffff",
  gradientStart: "#ffffff",
  gradientEnd: "#f0f0f0",
  gradientDirection: "to bottom",
  watermark: {
    show: false,
    text: "WATERMARK",
    font: "Open Sans",
    opacity: 0.3,
    size: 56,
    color: "#000000",
    rotation: -45,
    position: "center",
    mode: "single",
    gridSpacing: 320,
    inset: 48,
  },
};

/** Switching script also swaps the default families, as the original did. */
export const defaultFontFor = (language: Language) =>
  language === "ur" ? "Noto Nastaliq Urdu" : "Open Sans";
