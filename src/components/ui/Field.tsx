"use client";

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{children}</span>
      {hint ? <span className="text-xs text-fg-muted">{hint}</span> : null}
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          onChange(Number.isNaN(n) ? (min ?? 0) : n);
        }}
        className="w-full rounded-md border border-border-soft bg-surface px-2.5 py-2 text-sm tabular-nums text-fg outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-ring-soft"
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs text-fg-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className="h-1.5 w-full min-w-16 cursor-pointer appearance-none rounded-full"
      style={{ accentColor: "var(--accent)", background: "var(--border)" }}
    />
  );
}

export function ColorField({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  return (
    <label
      className={`relative block h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-soft ${className}`}
      style={{ background: value }}
      title={value}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Colour"
      />
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition ${
          checked ? "border-accent bg-accent" : "border-border-soft bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[1.15rem]" : "left-0.5"
          }`}
        />
      </button>
      {children}
    </label>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`w-full appearance-none rounded-md border border-border-soft bg-surface px-2.5 py-2 text-sm text-fg outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-ring-soft ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  invalid = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      className={`w-full rounded-md border bg-surface px-2.5 py-2 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-ring-soft ${
        invalid ? "border-red-500 text-red-500" : "border-border-soft focus:border-accent"
      } ${className}`}
    />
  );
}
