import type { Tool } from "@/lib/tools";

export function ToolHeader({ tool, children }: { tool: Tool; children?: React.ReactNode }) {
  return (
    <header className="mb-6 border-b border-border-soft pb-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{tool.glyph}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black tracking-tight text-fg sm:text-2xl">{tool.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">{tool.tagline}</p>
        </div>
        {children}
      </div>
    </header>
  );
}
