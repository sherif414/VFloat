import { describe, expect, it } from "vite-plus/test";

const docsPages = import.meta.glob("../../../../docs/**/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const readFrontmatter = (source: string) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  return match?.[1] ?? "";
};

describe("docs frontmatter", () => {
  it("requires every docs page to declare a description", () => {
    const missingDescriptions = Object.entries(docsPages)
      .filter(([filePath]) => !filePath.includes("/.vitepress/"))
      .filter(([, source]) => !/(?:^|\r?\n)description:\s*\S/.test(readFrontmatter(source)))
      .map(([filePath]) => filePath);

    expect(missingDescriptions).toEqual([]);
  });
});
