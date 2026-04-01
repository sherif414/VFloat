import { defineConfig } from "vitepress";
import { siteHead } from "./config/head.mts";
import { markdown } from "./config/markdown.mts";
import { siteMeta } from "./config/site.mts";
import { themeConfig } from "./config/theme.mts";
import { vite } from "./config/vite.mts";

export default defineConfig({
  ...siteMeta,
  head: siteHead,
  vite,
  markdown,
  themeConfig,
});
