import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { GradientEditor } from "@/components/tools/gradient-editor/GradientEditor";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Gradient Editor",
  description:
    "Multi-stop linear, radial and conic gradients: drag stops on a live bar, shift hue and saturation, sample colours from an image, then export CSS, Tailwind, React or SVG.",
};

export default function Page() {
  const tool = findTool("gradient-editor");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <GradientEditor />
    </div>
  );
}
