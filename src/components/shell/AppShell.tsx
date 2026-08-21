"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { tools, type Tool } from "@/lib/tools";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPalette } from "./CommandPalette";

const categories: Tool["category"][] = ["CSS", "Layout", "Images", "Analyse"];

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="scroll-thin flex-1 space-y-6 overflow-y-auto px-3 pb-6">
      {categories.map((cat) => {
        const items = tools.filter((t) => t.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat}>
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted">
              {cat}
            </p>
            <ul className="space-y-0.5">
              {items.map((t) => {
                const href = `/tools/${t.slug}`;
                const active = pathname === href;
                return (
                  <li key={t.slug}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                        active
                          ? "bg-accent/10 font-semibold text-accent"
                          : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      <span className="text-base leading-none">{t.glyph}</span>
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      {t.status === "planned" ? (
                        <span className="text-[10px] font-semibold uppercase text-fg-muted">soon</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border-soft bg-surface lg:flex">
        <Link href="/" className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-black text-accent-fg">
            N
          </span>
          <span className="text-sm font-bold tracking-tight text-fg">
            nextDev <span className="text-fg-muted">Toolsuite</span>
          </span>
        </Link>
        <SidebarLinks />
      </aside>

      {/* mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-border-soft bg-surface">
            <div className="flex items-center justify-between px-5 py-5">
              <span className="text-sm font-bold text-fg">nextDev Toolsuite</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-fg-muted"
              >
                ✕
              </button>
            </div>
            <SidebarLinks onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border-soft bg-surface/80 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border-soft text-fg-muted lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border-soft bg-surface-2 px-3 text-sm text-fg-muted transition hover:border-accent sm:max-w-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span className="flex-1 truncate text-left">Search tools</span>
            <kbd className="hidden rounded border border-border-soft px-1.5 py-0.5 text-[10px] font-semibold sm:block">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="hidden text-xs font-semibold text-fg-muted transition hover:text-fg sm:block"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
