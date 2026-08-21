import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { GridPlayground } from "@/components/tools/grid-playground/GridPlayground";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Grid Playground",
  description:
    "Build CSS grid layouts by hand: set rows, columns and gap, merge cells into areas, style each cell, then export CSS, HTML, Tailwind, React — or a ready-to-run ZIP.",
};

export default function Page() {
  const tool = findTool("grid-playground");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <GridPlayground />
    </div>
  );
}
