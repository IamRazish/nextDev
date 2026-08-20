"use client";

import { useToast } from "./Toast";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API blocked (http, permissions) — fall back to a hidden textarea
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const toast = useToast();

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text);
        toast(ok ? "Copied to clipboard" : "Copy failed — select the code manually");
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border-soft bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-fg-muted transition hover:text-fg hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" />
      </svg>
      {label}
    </button>
  );
}
