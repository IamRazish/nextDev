import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/shell/ToolHeader";
import { findTool, liveTools, tools } from "@/lib/tools";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Ported tools own a real route file, which wins over this catch-all.
  return tools.filter((t) => t.status !== "live").map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const tool = findTool(slug);
  return tool ? { title: tool.name, description: tool.tagline } : {};
}

/** Placeholder for registry entries that have not been ported yet. */
export default async function Page({ params }: Params) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ToolHeader tool={tool}>
        <span className="rounded-full border border-border-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
          coming soon
        </span>
      </ToolHeader>

      <div className="rounded-xl border border-border-soft bg-surface p-6">
        <h2 className="text-sm font-bold text-fg">Not ported yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {tool.name} is next in line for the migration into this shell. Everything already ported
          shares the same dark mode, the same export tabs and the same local history.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {liveTools().map((t) => (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="rounded-lg border border-border-soft px-3 py-2 text-xs font-bold text-fg-muted transition hover:border-accent hover:text-fg"
            >
              {t.glyph} {t.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
