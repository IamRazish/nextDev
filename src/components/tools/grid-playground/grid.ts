export type BorderStyle = "solid" | "dashed" | "dotted" | "double" | "none";
export type SizeUnit = "%" | "px" | "auto";

export type GridCell = {
  id: string;
  row: number;
  col: number;
  content: string;
  bgColor: string;
  borderColor: string;
  borderStyle: BorderStyle;
  rowSpan: number;
  colSpan: number;
  /** false when a merge swallowed this cell */
  visible: boolean;
};

export type GridConfig = {
  rows: number;
  cols: number;
  gap: number;
  width: number;
  widthUnit: SizeUnit;
  height: number;
  heightUnit: SizeUnit;
  bgColor: string;
  borderColor: string;
  borderStyle: BorderStyle;
  /** emit the tablet/mobile media queries in the CSS export */
  responsive: boolean;
  tabletCols: number;
  mobileCols: number;
  cells: GridCell[];
};

export const CELL_DEFAULTS = {
  bgColor: "#ffffff",
  borderColor: "#d4d7e3",
  borderStyle: "solid" as BorderStyle,
};

export const MAX_TRACKS = 12;

export const cellId = (row: number, col: number) => `r${row}c${col}`;

export const makeCell = (row: number, col: number): GridCell => ({
  id: cellId(row, col),
  row,
  col,
  content: `${row},${col}`,
  ...CELL_DEFAULTS,
  rowSpan: 1,
  colSpan: 1,
  visible: true,
});

export function makeCells(rows: number, cols: number) {
  const cells: GridCell[] = [];
  for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) cells.push(makeCell(r, c));
  return cells;
}

export const DEFAULT_CONFIG: GridConfig = {
  rows: 4,
  cols: 4,
  gap: 10,
  width: 100,
  widthUnit: "%",
  height: 100,
  heightUnit: "%",
  bgColor: "#eef1f7",
  borderColor: "#4f46e5",
  borderStyle: "solid",
  responsive: false,
  tabletCols: 2,
  mobileCols: 1,
  cells: makeCells(4, 4),
};

/* ── resizing ──────────────────────────────────────────────────── */

/**
 * Grow or shrink the grid while keeping the cells that survive. The original
 * playground rebuilt every cell whenever the row or column count changed,
 * which silently threw away content, colours and merges.
 */
export function resize(config: GridConfig, rows: number, cols: number): GridConfig {
  const kept = new Map(config.cells.map((c) => [c.id, c]));
  const cells: GridCell[] = [];

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const existing = kept.get(cellId(r, c));
      if (!existing) {
        cells.push(makeCell(r, c));
        continue;
      }
      // A span that would now hang off the edge gets clamped back.
      cells.push({
        ...existing,
        rowSpan: Math.min(existing.rowSpan, rows - r + 1),
        colSpan: Math.min(existing.colSpan, cols - c + 1),
      });
    }
  }

  // Anything hidden by a merge that no longer covers it becomes visible again.
  const covered = new Set<string>();
  for (const cell of cells) {
    if (cell.rowSpan === 1 && cell.colSpan === 1) continue;
    for (let r = cell.row; r < cell.row + cell.rowSpan; r++) {
      for (let c = cell.col; c < cell.col + cell.colSpan; c++) {
        if (r !== cell.row || c !== cell.col) covered.add(cellId(r, c));
      }
    }
  }

  return {
    ...config,
    rows,
    cols,
    cells: cells.map((c) => ({ ...c, visible: !covered.has(c.id) })),
  };
}

/* ── merge / unmerge ───────────────────────────────────────────── */

export type MergeResult = { config: GridConfig; error?: string; masterId?: string };

export function merge(config: GridConfig, selectedIds: string[]): MergeResult {
  if (selectedIds.length < 2) return { config, error: "Select at least two cells to merge" };

  const selected = config.cells.filter((c) => selectedIds.includes(c.id));
  if (!selected.length) return { config, error: "Nothing selected" };

  let minRow = Infinity;
  let minCol = Infinity;
  let maxRow = 0;
  let maxCol = 0;
  for (const c of selected) {
    minRow = Math.min(minRow, c.row);
    minCol = Math.min(minCol, c.col);
    maxRow = Math.max(maxRow, c.row + c.rowSpan - 1);
    maxCol = Math.max(maxCol, c.col + c.colSpan - 1);
  }

  const masterId = cellId(minRow, minCol);
  const master = config.cells.find((c) => c.id === masterId);
  if (!master) return { config, error: "The top-left cell of that area is missing" };

  const cells = config.cells.map((cell) => {
    const inside =
      cell.row >= minRow && cell.row <= maxRow && cell.col >= minCol && cell.col <= maxCol;
    if (cell.id === masterId) {
      return { ...cell, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1, visible: true };
    }
    if (!inside) return cell;
    return { ...cell, visible: false, rowSpan: 1, colSpan: 1 };
  });

  return { config: { ...config, cells }, masterId };
}

export function unmerge(config: GridConfig, id: string): MergeResult {
  const master = config.cells.find((c) => c.id === id);
  if (!master) return { config, error: "Nothing selected" };
  if (master.rowSpan === 1 && master.colSpan === 1)
    return { config, error: "That cell is not merged" };

  const { row, col, rowSpan, colSpan } = master;
  const cells = config.cells.map((cell) => {
    const inside =
      cell.row >= row && cell.row < row + rowSpan && cell.col >= col && cell.col < col + colSpan;
    if (!inside) return cell;
    return { ...cell, visible: true, rowSpan: 1, colSpan: 1 };
  });

  return { config: { ...config, cells }, masterId: id };
}

/** Rectangular range between two cells — for shift-click selection. */
export function rangeIds(config: GridConfig, fromId: string, toId: string) {
  const a = config.cells.find((c) => c.id === fromId);
  const b = config.cells.find((c) => c.id === toId);
  if (!a || !b) return [toId];
  const ids: string[] = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      const cell = config.cells.find((x) => x.id === cellId(r, c));
      if (cell?.visible) ids.push(cell.id);
    }
  }
  return ids;
}

/* ── styles for the live preview ───────────────────────────────── */

const size = (value: number, unit: SizeUnit) => (unit === "auto" ? "auto" : `${value}${unit}`);

export const containerStyle = (config: GridConfig): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
  gridTemplateRows: `repeat(${config.rows}, 1fr)`,
  gap: `${config.gap}px`,
  width: size(config.width, config.widthUnit),
  height: size(config.height, config.heightUnit),
  backgroundColor: config.bgColor,
  borderWidth: config.borderStyle === "none" ? 0 : 2,
  borderStyle: config.borderStyle,
  borderColor: config.borderColor,
});

export const cellStyle = (cell: GridCell): React.CSSProperties => ({
  gridColumn: `${cell.col} / span ${cell.colSpan}`,
  gridRow: `${cell.row} / span ${cell.rowSpan}`,
  backgroundColor: cell.bgColor,
  borderWidth: cell.borderStyle === "none" ? 0 : 1,
  borderStyle: cell.borderStyle,
  borderColor: cell.borderColor,
});

export const visibleCells = (config: GridConfig) => config.cells.filter((c) => c.visible);

/** A cell only needs its own rule when it differs from the defaults. */
export const isPlainCell = (cell: GridCell) =>
  cell.rowSpan === 1 &&
  cell.colSpan === 1 &&
  cell.bgColor === CELL_DEFAULTS.bgColor &&
  cell.borderColor === CELL_DEFAULTS.borderColor &&
  cell.borderStyle === CELL_DEFAULTS.borderStyle;

/* ── exports ───────────────────────────────────────────────────── */

export function toCss(config: GridConfig) {
  const lines: string[] = [
    ".grid-container {",
    "  display: grid;",
    `  grid-template-columns: repeat(${config.cols}, 1fr);`,
    `  grid-template-rows: repeat(${config.rows}, 1fr);`,
    `  gap: ${config.gap}px;`,
    `  width: ${size(config.width, config.widthUnit)};`,
    `  height: ${size(config.height, config.heightUnit)};`,
    `  background-color: ${config.bgColor};`,
  ];
  lines.push(
    config.borderStyle === "none"
      ? "  border: none;"
      : `  border: 2px ${config.borderStyle} ${config.borderColor};`,
    "}",
    "",
    ".grid-container > * {",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  overflow: hidden;",
    "  text-align: center;",
    `  background-color: ${CELL_DEFAULTS.bgColor};`,
    `  border: 1px ${CELL_DEFAULTS.borderStyle} ${CELL_DEFAULTS.borderColor};`,
    "}",
  );

  for (const cell of visibleCells(config)) {
    if (isPlainCell(cell)) continue;
    lines.push("", `.${cell.id} {`);
    lines.push(`  grid-column: ${cell.col}${cell.colSpan > 1 ? ` / span ${cell.colSpan}` : ""};`);
    lines.push(`  grid-row: ${cell.row}${cell.rowSpan > 1 ? ` / span ${cell.rowSpan}` : ""};`);
    if (cell.bgColor !== CELL_DEFAULTS.bgColor) lines.push(`  background-color: ${cell.bgColor};`);
    if (cell.borderStyle === "none") {
      lines.push("  border: none;");
    } else if (
      cell.borderColor !== CELL_DEFAULTS.borderColor ||
      cell.borderStyle !== CELL_DEFAULTS.borderStyle
    ) {
      lines.push(`  border: 1px ${cell.borderStyle} ${cell.borderColor};`);
    }
    lines.push("}");
  }

  if (config.responsive) {
    lines.push(
      "",
      "@media (max-width: 1024px) {",
      "  .grid-container {",
      `    grid-template-columns: repeat(${config.tabletCols}, 1fr);`,
      "    grid-template-rows: auto;",
      "    height: auto;",
      "  }",
      "  .grid-container > * { grid-column: auto; grid-row: auto; }",
      "}",
      "",
      "@media (max-width: 640px) {",
      "  .grid-container {",
      `    grid-template-columns: repeat(${config.mobileCols}, 1fr);`,
      "    grid-template-rows: auto;",
      "    height: auto;",
      "  }",
      "  .grid-container > * { grid-column: auto; grid-row: auto; }",
      "}",
    );
  }

  return lines.join("\n");
}

export function toHtml(config: GridConfig, { standalone = false } = {}) {
  const body = [
    '<div class="grid-container">',
    ...visibleCells(config).map((cell) => {
      const attr = isPlainCell(cell) ? "" : ` class="${cell.id}"`;
      return `  <div${attr}>${escapeHtml(cell.content)}</div>`;
    }),
    "</div>",
  ].join("\n");

  if (!standalone) return body;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CSS Grid layout</title>
<link rel="stylesheet" href="style.css">
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: ui-sans-serif, system-ui, sans-serif;
    background: #f4f5f9;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TW_BORDER: Record<BorderStyle, string> = {
  solid: "border-solid",
  dashed: "border-dashed",
  dotted: "border-dotted",
  double: "border-double",
  none: "border-none",
};

export function toTailwind(config: GridConfig) {
  // The shared cell styling rides on the container as child-selector utilities,
  // mirroring the `.grid-container > *` rule in the CSS export. Without it every
  // cell would repeat the same nine classes.
  const container = [
    "grid",
    `grid-cols-${config.cols}`,
    `grid-rows-${config.rows}`,
    config.gap % 4 === 0 ? `gap-${config.gap / 4}` : `gap-[${config.gap}px]`,
    config.widthUnit === "auto" ? "w-auto" : `w-[${config.width}${config.widthUnit}]`,
    config.heightUnit === "auto" ? "h-auto" : `h-[${config.height}${config.heightUnit}]`,
    `bg-[${config.bgColor}]`,
    config.borderStyle === "none" ? "border-0" : `border-2 ${TW_BORDER[config.borderStyle]}`,
    config.borderStyle === "none" ? "" : `border-[${config.borderColor}]`,
    "[&>*]:flex [&>*]:items-center [&>*]:justify-center [&>*]:overflow-hidden [&>*]:text-center",
    `[&>*]:bg-[${CELL_DEFAULTS.bgColor}] [&>*]:border [&>*]:border-solid [&>*]:border-[${CELL_DEFAULTS.borderColor}]`,
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [`<div class="${container}">`];
  for (const cell of visibleCells(config)) {
    const classes = [
      cell.colSpan > 1 ? `col-span-${cell.colSpan}` : "",
      cell.rowSpan > 1 ? `row-span-${cell.rowSpan}` : "",
      cell.bgColor === CELL_DEFAULTS.bgColor ? "" : `bg-[${cell.bgColor}]`,
      cell.borderStyle === "none" ? "border-0" : "",
      cell.borderStyle !== "none" && cell.borderStyle !== CELL_DEFAULTS.borderStyle
        ? TW_BORDER[cell.borderStyle]
        : "",
      cell.borderStyle !== "none" && cell.borderColor !== CELL_DEFAULTS.borderColor
        ? `border-[${cell.borderColor}]`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const attr = classes ? ` class="${classes}"` : "";
    lines.push(`  <div${attr}>${escapeHtml(cell.content)}</div>`);
  }
  lines.push("</div>");
  return lines.join("\n");
}

export function toReact(config: GridConfig) {
  const container = [
    "const container: React.CSSProperties = {",
    "  display: \"grid\",",
    `  gridTemplateColumns: "repeat(${config.cols}, 1fr)",`,
    `  gridTemplateRows: "repeat(${config.rows}, 1fr)",`,
    `  gap: ${config.gap},`,
    `  width: ${config.widthUnit === "auto" ? '"auto"' : `"${config.width}${config.widthUnit}"`},`,
    `  height: ${config.heightUnit === "auto" ? '"auto"' : `"${config.height}${config.heightUnit}"`},`,
    `  backgroundColor: "${config.bgColor}",`,
    config.borderStyle === "none"
      ? "  border: \"none\","
      : `  border: "2px ${config.borderStyle} ${config.borderColor}",`,
    "};",
  ].join("\n");

  const cells = visibleCells(config);
  const items = [
    "",
    "const items = [",
    ...cells.map((cell) => {
      const style = [
        `gridColumn: "${cell.col} / span ${cell.colSpan}"`,
        `gridRow: "${cell.row} / span ${cell.rowSpan}"`,
        `backgroundColor: "${cell.bgColor}"`,
        cell.borderStyle === "none"
          ? 'border: "none"'
          : `border: "1px ${cell.borderStyle} ${cell.borderColor}"`,
      ].join(", ");
      return `  { label: ${JSON.stringify(cell.content)}, style: { ${style} } },`;
    }),
    "];",
    "",
    "<div style={container}>",
    "  {items.map((item, i) => (",
    "    <div key={i} style={item.style}>",
    "      {item.label}",
    "    </div>",
    "  ))}",
    "</div>",
  ].join("\n");

  return `${container}\n${items}`;
}
