import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { ClipPathEditor } from "@/components/tools/css-clip-path/ClipPathEditor";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "CSS Clip Path",
  description:
    "Draw clip-path shapes on a live preview: drag polygon vertices, trace over your own image, or drive circle, ellipse and inset numerically, then export CSS, Tailwind, React, SVG or JSON.",
};

export default function Page() {
  const tool = findTool("css-clip-path");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <ClipPathEditor />
    </div>
  );
}
