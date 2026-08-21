# nextDev Toolsuite

A collection of web developer tools, UI utilities and CSS generators built with
Next.js 15 (App Router), React 19 and Tailwind CSS 4 — all under one shell, one
theme and one search box.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Structure

| Path | Purpose |
| --- | --- |
| `src/lib/tools.ts` | Tool registry — drives the sidebar, home grid, Cmd+K palette and SEO metadata |
| `src/components/shell/` | App shell: sidebar, top bar, theme toggle, command palette |
| `src/components/ui/` | Shared primitives: export tabs, code block, copy button, colour/number fields, toasts |
| `src/hooks/` | `useLocalStorage`, `useHistory` (rolling "recent designs" per tool) |
| `src/lib/zip.ts` | Dependency-free store-only ZIP writer, for multi-file exports |
| `src/lib/fonts.ts` | The eight next/font families the canvas composer draws with |
| `src/components/tools/<slug>/` | One folder per tool: pure logic in a `.ts` file, UI in a `.tsx` |
| `src/app/tools/<slug>/page.tsx` | Route + per-tool metadata |
| `src/app/tools/[slug]/page.tsx` | "Coming soon" fallback for registry entries not ported yet |

## Adding a tool

1. Add an entry to `src/lib/tools.ts` with `status: "planned"`.
2. Put the generator's pure logic in `src/components/tools/<slug>/<name>.ts`
   (code generation lives here — CSS, Tailwind, React, SVG).
3. Build the UI with the shared primitives, then add
   `src/app/tools/<slug>/page.tsx` and flip `status` to `"live"`.

## Migration status

| Tool | Route | Status |
| --- | --- | --- |
| Stripe Generator | `/tools/stripe-generator` | ✅ ported |
| Flexbox Generator | `/tools/flexbox-generator` | ✅ ported |
| Grid Playground | `/tools/grid-playground` | ✅ ported |
| CSS Clip Path | `/tools/css-clip-path` | ✅ ported |
| Gradient Editor | `/tools/gradient-editor` | ✅ ported |
| Neumorphism Shadow | `/tools/neumorphism-shadow` | ✅ ported |
| Watermark Editor | `/tools/watermark-editor` | ✅ ported |

The standalone `sp-tools` grab-bag is not a separate route: its utilities are
covered by the seven tools above, and the home grid plus the ⌘K palette already
do the "one place for everything" job it existed for.
