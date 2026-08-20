import Link from "next/link";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="mb-10">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-3 py-1 text-xs font-semibold text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Next.js 15 · Tailwind CSS 4
        </p>
        <h1 className="text-3xl font-black tracking-tight text-fg sm:text-4xl">
          One home for every CSS generator you keep bookmarking.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
          Stripes, gradients, shadows, layout and image tools — same shell, same dark mode, same
          export format. Hit <kbd className="rounded border border-border-soft px-1.5 py-0.5 text-xs font-semibold">⌘K</kbd>{" "}
          to jump between them.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const live = t.status === "live";
          const card = (
            <div
              className={`group relative flex h-full flex-col rounded-xl border border-border-soft bg-surface p-5 transition ${
                live ? "hover:border-accent hover:shadow-lg" : "opacity-70"
              }`}
            >
              <span className="mb-3 text-2xl leading-none">{t.glyph}</span>
              <h2 className="text-sm font-bold text-fg">{t.name}</h2>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-fg-muted">{t.tagline}</p>
              <span
                className={`mt-4 text-[11px] font-bold uppercase tracking-wider ${
                  live ? "text-accent" : "text-fg-muted"
                }`}
              >
                {live ? "Open tool →" : "Coming soon"}
              </span>
            </div>
          );

          return live ? (
            <Link key={t.slug} href={`/tools/${t.slug}`} className="block">
              {card}
            </Link>
          ) : (
            <div key={t.slug}>{card}</div>
          );
        })}
      </section>
    </div>
  );
}
