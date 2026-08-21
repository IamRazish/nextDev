import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { WatermarkEditor } from "@/components/tools/watermark-editor/WatermarkEditor";
import { allFontClassNames, FONT_OPTIONS } from "@/lib/fonts";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Watermark Editor",
  description:
    "Compose text images with a watermark: title and body blocks in English or Urdu, solid, gradient or image backgrounds, single or tiled watermarks, exported at real social sizes.",
};

export default function Page() {
  const tool = findTool("watermark-editor");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Referencing every family here is what makes the browser fetch all eight
          faces, so the canvas renderer can measure and draw with any of them. */}
      <span className={`sr-only ${allFontClassNames}`} aria-hidden>
        {FONT_OPTIONS.map((f) => f.label).join(" ")}
      </span>
      <ToolHeader tool={tool} />
      <WatermarkEditor fonts={FONT_OPTIONS} />
    </div>
  );
}
