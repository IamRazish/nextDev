import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { Css3Generator } from "@/components/tools/css3-generator/Css3Generator";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "CSS3 Generator",
  description:
    "Eleven single-property CSS generators in one panel: border-radius, box-shadow, text-shadow, rgba, gradient, transform, transition, multi-column, resize, box-sizing and outline — each with a live preview and CSS, Tailwind and React output.",
};

export default function Page() {
  const tool = findTool("css3-generator");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <Css3Generator />
    </div>
  );
}
