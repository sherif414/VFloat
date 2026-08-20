import type { Highlighter } from "shiki/bundle/web";

let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * Gets or initializes the shared Shiki highlighter instance configured with
 * dual light/dark themes and required grammars for Vue SFC code.
 */
export async function getShowcaseHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    const { createHighlighter } = await import("shiki/bundle/web");
    highlighterPromise = createHighlighter({
      themes: ["github-light", "material-theme-palenight"],
      langs: ["vue", "typescript", "html", "css"],
    });
  }
  return highlighterPromise;
}

/**
 * Highlights dynamic Vue SFC showcase code with dual-theme CSS variables.
 *
 * @param code - Raw Vue SFC code string.
 * @returns Highlighted HTML string with `--shiki-light` and `--shiki-dark` tokens.
 */
export async function highlightShowcaseCode(code: string): Promise<string> {
  const highlighter = await getShowcaseHighlighter();
  return highlighter.codeToHtml(code, {
    lang: "vue",
    themes: {
      light: "github-light",
      dark: "material-theme-palenight",
    },
    defaultColor: false,
  });
}
