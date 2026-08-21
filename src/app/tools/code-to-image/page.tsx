import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { CodeToImage } from "@/components/tools/code-to-image/CodeToImage";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Code to Image",
  description:
    "Turn a snippet into a shareable image: syntax highlighting for 19 languages, window chrome, gradient or transparent backgrounds, a watermark, and PNG or JPEG export at 2x.",
};

export default function Page() {
  const tool = findTool("code-to-image");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <CodeToImage />
    </div>
  );
}
