"use client";

import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

export type ExportFormat = { id: string; label: string; code: string };

/**
 * Shared export surface for every generator: one tab per target
 * (plain CSS, Tailwind classes, React inline styles, …).
 */
export function ExportPanel({ formats }: { formats: ExportFormat[] }) {
  const [active, setActive] = useState(formats[0]?.id);
  const current = formats.find((f) => f.id === active) ?? formats[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border-soft bg-surface-2 p-1">
        {formats.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActive(f.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              f.id === current?.id
                ? "bg-accent text-accent-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {current ? <CodeBlock code={current.code} caption={current.label} /> : null}
    </div>
  );
}
