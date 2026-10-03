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

  ui: {
    theme: {
      colors: ["primary", "secondary", "tertiary", "success", "info", "warning", "error"],
    },
  },

  app: {
    head: {
      link: [{ rel: "icon", href: "data:," }],
    },
  },

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
    "/guide": {
      redirect: { to: "/guide/getting-started/introduction", statusCode: 301 },
    },
  },
});
