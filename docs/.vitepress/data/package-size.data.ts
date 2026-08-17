import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "../../..");
const distFile = join(rootDir, "dist/index.mjs");
const packageJsonFile = join(rootDir, "package.json");
const jsonFile = join(__dirname, "package-size.json");

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} kB`;
}

export interface PackageSizeData {
  version: string;
  rawBytes: number;
  rawFormatted: string;
  minifiedBytes: number;
  minifiedFormatted: string;
  gzipBytes: number;
  gzipFormatted: string;
  brotliBytes: number;
  brotliFormatted: string;
  measuredAt: string;
}

declare const data: PackageSizeData;
export { data };

export default {
  watch: ["../../../dist/index.mjs", "./package-size.json"],
  load(): PackageSizeData {
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
          measuredAt: new Date().toISOString(),
        };
      } catch {
        // Fall through to jsonFile
      }
    }

    if (existsSync(jsonFile)) {
      try {
        return JSON.parse(readFileSync(jsonFile, "utf8"));
      } catch {
        // Fall through to default fallback
      }
    }

    return {
      version: "0.12.0",
      rawBytes: 55479,
      rawFormatted: "54.18 kB",
      minifiedBytes: 55479,
      minifiedFormatted: "54.18 kB",
      gzipBytes: 15069,
      gzipFormatted: "14.72 kB",
      brotliBytes: 13377,
      brotliFormatted: "13.06 kB",
      measuredAt: new Date().toISOString(),
    };
  },
};
