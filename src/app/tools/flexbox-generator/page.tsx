import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { FlexboxGenerator } from "@/components/tools/flexbox-generator/FlexboxGenerator";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Flexbox Generator",
  description:
    "Interactive flexbox playground: set direction, wrap, justify, align and gap, tune per-item grow, shrink, basis, order and align-self, then export CSS, Tailwind classes or React styles.",
};

export default function Page() {
  const tool = findTool("flexbox-generator");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <FlexboxGenerator />
    </div>
  );
}
