import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { NeumorphismShadow } from "@/components/tools/neumorphism-shadow/NeumorphismShadow";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Neumorphism Shadow",
  description:
    "Soft-UI box-shadow generator: pick a base colour, shape and light source, tune distance, blur and intensity, then export CSS, Tailwind or React styles.",
};

export default function Page() {
  const tool = findTool("neumorphism-shadow");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <NeumorphismShadow />
    </div>
  );
}
