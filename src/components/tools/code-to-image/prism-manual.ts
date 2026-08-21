/**
 * Prism highlights every `code[class*="language-"]` it can find on
 * DOMContentLoaded, and `highlightElement` copies the language class onto the
 * parent <pre> and adds tabindex="0". That mutates markup React just hydrated,
 * which React reports as a hydration mismatch.
 *
 * Setting `manual` before prismjs is imported turns the automatic pass off; we
 * call Prism.highlight ourselves and render the result.
 */
declare global {
  interface Window {
    Prism?: { manual?: boolean };
  }
}

if (typeof window !== "undefined") {
  window.Prism = { ...(window.Prism ?? {}), manual: true };
}

export {};
