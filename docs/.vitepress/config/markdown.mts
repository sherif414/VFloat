import type { MarkdownOptions } from "vitepress";
import { demoMdPlugin } from "vitepress-plugin-demo";

export const markdown: MarkdownOptions = {
  config(md) {
    md.use(demoMdPlugin);
  },
};
