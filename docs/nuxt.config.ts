import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { defineNuxtConfig } from "nuxt/config";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} kB`;
}

function loadPackageSize() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const rootDir = join(currentDir, "..");
  const distFile = join(rootDir, "packages/vue/dist/index.mjs");
  const packageJsonFile = join(rootDir, "packages/vue/package.json");

  if (existsSync(distFile)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonFile, "utf8"));
      const content = readFileSync(distFile);
      const rawBytes = content.length;
      const gzipBytes = zlib.gzipSync(content, { level: 9 }).length;
      const brotliBytes = zlib.brotliCompressSync(content).length;

      return {
        version: pkg.version || "0.0.0",
        rawBytes,
        rawFormatted: formatBytes(rawBytes),
        minifiedBytes: rawBytes,
        minifiedFormatted: formatBytes(rawBytes),
        gzipBytes,
        gzipFormatted: formatBytes(gzipBytes),
        brotliBytes,
        brotliFormatted: formatBytes(brotliBytes),
      };
    } catch {
      // Fall through
    }
  }

  return {
    version: "0.14.0",
    rawBytes: 0,
    rawFormatted: "N/A",
    minifiedBytes: 0,
    minifiedFormatted: "N/A",
    gzipBytes: 0,
    gzipFormatted: "~14.7 kB",
    brotliBytes: 0,
    brotliFormatted: "~13.2 kB",
  };
}

export default defineNuxtConfig({
  extends: ["docus"],

  site: {
    name: "VFloat",
    url: "https://vfloat.pages.dev",
  },

  runtimeConfig: {
    public: {
      packageSize: loadPackageSize(),
    },
  },

  alias: {
    "@": fileURLToPath(new URL("../packages/vue/src", import.meta.url)),
    "v-float": fileURLToPath(new URL("../packages/vue/src/index.ts", import.meta.url)),
  },

  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../packages/vue/src", import.meta.url)),
        "v-float": fileURLToPath(new URL("../packages/vue/src/index.ts", import.meta.url)),
      },
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/"],
    },
  },

  routeRules: {
    // Guide section redirects from legacy flat URLs
    "/guide/first-tooltip": {
      redirect: { to: "/guide/getting-started/first-tooltip", statusCode: 301 },
    },
    "/guide/first-popover": {
      redirect: { to: "/guide/getting-started/first-popover", statusCode: 301 },
    },
    "/guide/floating-node": {
      redirect: { to: "/guide/core-concepts/floating-node", statusCode: 301 },
    },
    "/guide/placement-and-positioning": {
      redirect: { to: "/guide/core-concepts/placement-and-positioning", statusCode: 301 },
    },
    "/guide/interaction-model": {
      redirect: { to: "/guide/core-concepts/interaction-model", statusCode: 301 },
    },
    "/guide/tree-coordination-explained": {
      redirect: { to: "/guide/core-concepts/tree-coordination-explained", statusCode: 301 },
    },
    "/guide/build-accessible-tooltips": {
      redirect: { to: "/guide/components/build-accessible-tooltips", statusCode: 301 },
    },
    "/guide/build-popovers-and-dropdowns": {
      redirect: { to: "/guide/components/build-popovers-and-dropdowns", statusCode: 301 },
    },
    "/guide/build-dialogs-and-modals": {
      redirect: { to: "/guide/components/build-dialogs-and-modals", statusCode: 301 },
    },
    "/guide/build-nested-menus": {
      redirect: { to: "/guide/components/build-nested-menus", statusCode: 301 },
    },
    "/guide/keep-content-in-view": {
      redirect: { to: "/guide/positioning/keep-content-in-view", statusCode: 301 },
    },
    "/guide/use-virtual-anchors": {
      redirect: { to: "/guide/positioning/use-virtual-anchors", statusCode: 301 },
    },
    "/guide/middleware-pipeline": {
      redirect: { to: "/guide/positioning/middleware-pipeline", statusCode: 301 },
    },
    "/guide/control-open-state": {
      redirect: { to: "/guide/accessibility/control-open-state", statusCode: 301 },
    },
    "/guide/focus-models": {
      redirect: { to: "/guide/accessibility/focus-models", statusCode: 301 },
    },
    "/guide/keyboard-navigation": {
      redirect: { to: "/guide/accessibility/keyboard-navigation", statusCode: 301 },
    },
    "/guide/controlled-vs-uncontrolled": {
      redirect: { to: "/guide/advanced/controlled-vs-uncontrolled", statusCode: 301 },
    },
    "/guide/safe-polygon-gotchas": {
      redirect: { to: "/guide/advanced/safe-polygon-gotchas", statusCode: 301 },
    },
    "/guide/virtual-anchor-gotchas": {
      redirect: { to: "/guide/advanced/virtual-anchor-gotchas", statusCode: 301 },
    },
    "/guide/middleware-ordering-gotchas": {
      redirect: { to: "/guide/advanced/middleware-ordering-gotchas", statusCode: 301 },
    },
    "/guide/list-navigation-gotchas": {
      redirect: { to: "/guide/advanced/list-navigation-gotchas", statusCode: 301 },
    },

    // API Reference section redirects from legacy flat URLs
    "/api/types": { redirect: { to: "/api/overview/types", statusCode: 301 } },
    "/api/use-floating-node": { redirect: { to: "/api/core/use-floating-node", statusCode: 301 } },
    "/api/use-position": { redirect: { to: "/api/positioning/use-position", statusCode: 301 } },
    "/api/use-arrow": { redirect: { to: "/api/positioning/use-arrow", statusCode: 301 } },
    "/api/use-client-point": {
      redirect: { to: "/api/positioning/use-client-point", statusCode: 301 },
    },
    "/api/use-click": { redirect: { to: "/api/interactions/use-click", statusCode: 301 } },
    "/api/use-hover": { redirect: { to: "/api/interactions/use-hover", statusCode: 301 } },
    "/api/use-focus": { redirect: { to: "/api/interactions/use-focus", statusCode: 301 } },
    "/api/use-focus-trap": {
      redirect: { to: "/api/interactions/use-focus-trap", statusCode: 301 },
    },
    "/api/use-outside-click": {
      redirect: { to: "/api/interactions/use-outside-click", statusCode: 301 },
    },
    "/api/use-escape-key": {
      redirect: { to: "/api/interactions/use-escape-key", statusCode: 301 },
    },
    "/api/use-role": { redirect: { to: "/api/interactions/use-role", statusCode: 301 } },
    "/api/use-roving-focus": {
      redirect: { to: "/api/keyboard-navigation/use-roving-focus", statusCode: 301 },
    },
    "/api/use-aria-activedescendant": {
      redirect: { to: "/api/keyboard-navigation/use-aria-activedescendant", statusCode: 301 },
    },
    "/api/use-typeahead": {
      redirect: { to: "/api/keyboard-navigation/use-typeahead", statusCode: 301 },
    },
    "/api/offset": { redirect: { to: "/api/middleware/offset", statusCode: 301 } },
    "/api/flip": { redirect: { to: "/api/middleware/flip", statusCode: 301 } },
    "/api/shift": { redirect: { to: "/api/middleware/shift", statusCode: 301 } },
    "/api/autoplacement": { redirect: { to: "/api/middleware/autoplacement", statusCode: 301 } },
    "/api/size": { redirect: { to: "/api/middleware/size", statusCode: 301 } },
    "/api/inline": { redirect: { to: "/api/middleware/inline", statusCode: 301 } },
    "/api/arrow": { redirect: { to: "/api/middleware/arrow", statusCode: 301 } },
    "/api/hide": { redirect: { to: "/api/middleware/hide", statusCode: 301 } },
  },
});
