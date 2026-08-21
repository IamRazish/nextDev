export type ToolStatus = "live" | "planned";

export type Tool = {
  slug: string;
  name: string;
  /** short line used in cards, sidebar tooltips and the command palette */
  tagline: string;
  /** extra words the Cmd+K search should match on */
  keywords: string[];
  category: "CSS" | "Layout" | "Images";
  status: ToolStatus;
  /** emoji glyph — cheap, no icon dependency */
  glyph: string;
  /** original standalone deployment, kept for reference during migration */
  legacyUrl?: string;
};

export const tools: Tool[] = [
  {
    slug: "stripe-generator",
    name: "Stripe Generator",
    tagline: "Repeating linear-gradient stripes with drag-to-reorder colours.",
    keywords: ["stripes", "repeating", "linear", "gradient", "pattern", "background"],
    category: "CSS",
    status: "live",
    glyph: "🎨",
  },
  {
    slug: "css3-generator",
    name: "CSS3 Generator",
    tagline: "Eleven single-property generators with a live preview each.",
    keywords: [
      "border-radius",
      "box-shadow",
      "text-shadow",
      "rgba",
      "transform",
      "transition",
      "column",
      "resize",
      "box-sizing",
      "outline",
      "css3",
    ],
    category: "CSS",
    status: "live",
    glyph: "🧪",
  },
  {
    slug: "flexbox-generator",
    name: "Flexbox Generator",
    tagline: "Visual flex container and item playground.",
    keywords: ["flex", "justify", "align", "wrap", "layout", "grow", "shrink", "basis", "gap"],
    category: "Layout",
    status: "live",
    glyph: "📐",
  },
  {
    slug: "grid-playground",
    name: "Grid Playground",
    tagline: "Lay out CSS grids, merge cells into areas, export the code.",
    keywords: ["grid", "template", "areas", "columns", "rows", "merge", "span", "gap"],
    category: "Layout",
    status: "live",
    glyph: "🔲",
  },
  {
    slug: "css-clip-path",
    name: "CSS Clip Path",
    tagline: "Draw polygon and shape clip-paths on a live preview.",
    keywords: ["clip", "path", "polygon", "shape", "mask", "inset", "circle", "ellipse", "vertices"],
    category: "CSS",
    status: "live",
    glyph: "✂️",
  },
  {
    slug: "gradient-editor",
    name: "Gradient Editor",
    tagline: "Multi-stop linear, radial and conic gradients.",
    keywords: ["gradient", "linear", "radial", "conic", "stops", "colour", "color", "hue"],
    category: "CSS",
    status: "live",
    glyph: "🌈",
  },
  {
    slug: "neumorphism-shadow",
    name: "Neumorphism Shadow",
    tagline: "Soft-UI box-shadow pairs with light source control.",
    keywords: ["neumorphism", "shadow", "soft", "box-shadow", "inset", "convex", "concave", "pressed"],
    category: "CSS",
    status: "live",
    glyph: "🫧",
  },
  {
    slug: "watermark-editor",
    name: "Watermark Editor",
    tagline: "Compose text images and stamp them with a watermark.",
    keywords: [
      "watermark",
      "photo",
      "image",
      "canvas",
      "text",
      "urdu",
      "social",
      "instagram",
      "tiktok",
    ],
    category: "Images",
    status: "live",
    glyph: "🖼️",
  },
];

export const liveTools = () => tools.filter((t) => t.status === "live");

export const findTool = (slug: string) => tools.find((t) => t.slug === slug);
