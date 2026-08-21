import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import lessSyntax from "postcss-less";
import scssSyntax from "postcss-scss";

export type CssSyntax = "css" | "scss" | "less";

export type DeclInfo = { prop: string; value: string; line: number };

export type RuleBlock = {
  /** 1-based order of this block among the blocks sharing a selector */
  index: number;
  startLine: number;
  endLine: number;
  declarations: DeclInfo[];
};

export type DuplicateSelector = {
  selector: string;
  context: string;
  blocks: RuleBlock[];
};

export type DuplicateProperty = {
  selector: string;
  context: string;
  property: string;
  /** every place this property is set for that selector, in source order */
  occurrences: { value: string; line: number }[];
  /** true when every occurrence sets the same value — pure dead weight */
  identical: boolean;
  /** the value that actually applies (the last one) */
  winner: string;
};

export type MergedSelector = {
  selector: string;
  context: string;
  properties: { prop: string; value: string; line: number }[];
};

export type Analysis = {
  duplicateSelectors: DuplicateSelector[];
  duplicateProperties: DuplicateProperty[];
  mergedSelectors: MergedSelector[];
  totals: {
    rules: number;
    declarations: number;
    selectors: number;
    /** declarations that could be deleted without changing the result */
    redundant: number;
    /** declarations silently overridden by a later, different value */
    overridden: number;
  };
  hasAtRules: boolean;
};

/** `@media (max-width: 700px)` etc, or "root" when a rule is top level. */
function contextOf(rule: Rule) {
  const parts: string[] = [];
  let parent = rule.parent as { type?: string; parent?: unknown } | undefined;
  while (parent) {
    if (parent.type === "atrule") {
      const at = parent as unknown as AtRule;
      parts.unshift(`@${at.name}${at.params ? ` ${at.params}` : ""}`);
    }
    parent = parent.parent as { type?: string; parent?: unknown } | undefined;
  }
  return parts.length ? parts.join(" › ") : "root";
}

/**
 * `.b, .a` and `.a,.b` target the same elements, so they have to hash the same.
 * The standalone checker keyed on the raw selector text and missed these.
 */
export function normalizeSelector(selector: string) {
  return selector
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .sort()
    .join(", ");
}

export function analyzeCss(source: string, syntax: CssSyntax = "css"): Analysis {
  let root;
  try {
    if (syntax === "scss") {
      root = postcss().process(source, { syntax: scssSyntax, from: undefined }).root;
    } else if (syntax === "less") {
      root = postcss().process(source, { syntax: lessSyntax, from: undefined }).root;
    } else {
      root = postcss.parse(source, { from: undefined });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Could not parse this as ${syntax.toUpperCase()}: ${message}`);
  }

  type Group = { selector: string; context: string; blocks: RuleBlock[] };
  const groups = new Map<string, Group>();
  let hasAtRules = false;
  let ruleCount = 0;
  let declCount = 0;

  root.walkRules((rule: Rule) => {
    ruleCount++;
    const context = contextOf(rule);
    if (context !== "root") hasAtRules = true;

    const declarations: DeclInfo[] = [];
    rule.walkDecls((decl: Declaration) => {
      declCount++;
      declarations.push({
        prop: decl.prop,
        value: decl.value,
        line: decl.source?.start?.line ?? 0,
      });
    });

    const normalized = normalizeSelector(rule.selector);
    const key = `${normalized}|||${context}`;
    const group = groups.get(key) ?? { selector: normalized, context, blocks: [] };
    group.blocks.push({
      index: group.blocks.length + 1,
      startLine: rule.source?.start?.line ?? 0,
      endLine: rule.source?.end?.line ?? 0,
      declarations,
    });
    groups.set(key, group);
  });

  const duplicateSelectors: DuplicateSelector[] = [];
  const duplicateProperties: DuplicateProperty[] = [];
  const mergedSelectors: MergedSelector[] = [];
  let redundant = 0;
  let overridden = 0;

  for (const group of groups.values()) {
    if (group.blocks.length > 1) {
      duplicateSelectors.push({
        selector: group.selector,
        context: group.context,
        blocks: group.blocks,
      });
    }

    // every declaration for this selector, across its blocks, in source order
    const byProp = new Map<string, { value: string; line: number }[]>();
    for (const block of group.blocks) {
      for (const decl of block.declarations) {
        const list = byProp.get(decl.prop) ?? [];
        list.push({ value: decl.value, line: decl.line });
        byProp.set(decl.prop, list);
      }
    }

    for (const [prop, occurrences] of byProp) {
      if (occurrences.length < 2) continue;
      const values = new Set(occurrences.map((o) => o.value.trim()));
      const identical = values.size === 1;
      if (identical) redundant += occurrences.length - 1;
      else overridden += occurrences.length - 1;

      duplicateProperties.push({
        selector: group.selector,
        context: group.context,
        property: prop,
        occurrences,
        identical,
        winner: occurrences[occurrences.length - 1].value,
      });
    }

    // last write wins, which is what the browser does
    const resolved = new Map<string, { value: string; line: number }>();
    for (const block of group.blocks) {
      for (const decl of block.declarations) {
        resolved.set(decl.prop, { value: decl.value, line: decl.line });
      }
    }
    mergedSelectors.push({
      selector: group.selector,
      context: group.context,
      properties: [...resolved.entries()].map(([prop, v]) => ({ prop, ...v })),
    });
  }

  // worst offenders first
  duplicateSelectors.sort((a, b) => b.blocks.length - a.blocks.length);
  duplicateProperties.sort((a, b) => b.occurrences.length - a.occurrences.length);

  return {
    duplicateSelectors,
    duplicateProperties,
    mergedSelectors,
    totals: {
      rules: ruleCount,
      declarations: declCount,
      selectors: groups.size,
      redundant,
      overridden,
    },
    hasAtRules,
  };
}

/** One rule per selector, duplicates collapsed — grouped back under at-rules. */
export function mergedStylesheet(analysis: Analysis) {
  const byContext = new Map<string, MergedSelector[]>();
  for (const entry of analysis.mergedSelectors) {
    const list = byContext.get(entry.context) ?? [];
    list.push(entry);
    byContext.set(entry.context, list);
  }

  const block = (entry: MergedSelector, indent = "") =>
    [
      `${indent}${entry.selector} {`,
      ...entry.properties.map((p) => `${indent}  ${p.prop}: ${p.value};`),
      `${indent}}`,
    ].join("\n");

  const out: string[] = [];
  for (const entry of byContext.get("root") ?? []) out.push(block(entry));

  for (const [context, entries] of byContext) {
    if (context === "root") continue;
    // a nested context prints as its own at-rule wrapper
    const wrappers = context.split(" › ");
    const open = wrappers.map((w, i) => `${"  ".repeat(i)}${w} {`).join("\n");
    const body = entries.map((e) => block(e, "  ".repeat(wrappers.length))).join("\n\n");
    const close = wrappers
      .map((_, i) => `${"  ".repeat(wrappers.length - 1 - i)}}`)
      .join("\n");
    out.push([open, body, close].join("\n"));
  }

  return out.join("\n\n");
}

export const SAMPLE_CSS = `.card {
  padding: 16px;
  color: #333;
  border-radius: 8px;
}

.btn, .button {
  display: inline-block;
  padding: 8px 16px;
}

/* same selector again — the two blocks will be merged */
.card {
  color: #111;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* comma order flipped: still the same selector */
.button, .btn {
  padding: 10px 20px;
}

@media (max-width: 700px) {
  .card {
    padding: 12px;
  }
  .card {
    padding: 12px;
  }
}
`;
