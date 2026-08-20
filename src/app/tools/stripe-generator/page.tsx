import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { StripeGenerator } from "@/components/tools/stripe-generator/StripeGenerator";
import { findTool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Stripe Generator",
  description:
    "Build repeating-linear-gradient stripe patterns: any angle, unlimited colours, drag to reorder, then export as CSS, Tailwind, React or SVG.",
};

export default function Page() {
  const tool = findTool("stripe-generator");
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool} />
      <StripeGenerator />
    </div>
  );
}
