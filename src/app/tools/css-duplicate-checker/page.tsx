import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { CssDuplicateChecker } from "@/components/tools/css-duplicate-checker/CssDuplicateChecker";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "CSS Duplicate Checker",
  description:
    "Find duplicate selectors and repeated properties in CSS, SCSS or Less, see which declaration actually wins, and get the merged stylesheet back.",
};

export default function Page() {
  const tool = findTool("css-duplicate-checker");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <CssDuplicateChecker />
    </div>
  );
}
