import { CopyButton } from "./CopyButton";

export function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-soft bg-surface-2">
      <div className="flex items-center justify-between gap-2 border-b border-border-soft px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
          {caption ?? "Code"}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="scroll-thin max-h-64 overflow-auto px-3 py-3 text-xs leading-relaxed">
        <code className="font-mono whitespace-pre-wrap break-all select-all">{code}</code>
      </pre>
    </div>
  );
}
