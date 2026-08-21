// side-effect import first: it sets Prism.manual before the library loads
import "./prism-manual";
import Prism from "prismjs";

// clike first — several grammars below extend it
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating"; // php needs this
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-php";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";

export type LanguageOption = { id: string; label: string };

export const LANGUAGES: LanguageOption[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "jsx", label: "JSX" },
  { id: "tsx", label: "TSX" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "csharp", label: "C#" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "php", label: "PHP" },
  { id: "markup", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
  { id: "markdown", label: "Markdown" },
];

const ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cpp",
  ts: "typescript",
  js: "javascript",
  py: "python",
  html: "markup",
  xml: "markup",
  yml: "yaml",
  sh: "bash",
  md: "markdown",
  rb: "ruby",
};

/** File extension → language id, for drag-and-drop. */
export const EXTENSIONS: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  java: "java",
  cpp: "cpp",
  cc: "cpp",
  h: "cpp",
  c: "c",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  css: "css",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  md: "markdown",
};

export function resolveLanguage(language: string) {
  const key = ALIASES[language.toLowerCase()] ?? language.toLowerCase();
  return Prism.languages[key] ? key : "javascript";
}

export function highlight(code: string, language: string) {
  const id = resolveLanguage(language);
  const grammar = Prism.languages[id];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, id);
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const countLines = (code: string) => code.split("\n").length;
