import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "../../..");
const distFile = join(rootDir, "dist/index.mjs");
const packageJsonFile = join(rootDir, "package.json");

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
}

export function loadPackageSize(): PackageSizeData {
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
      // Fall through to dev fallback
    }
  }

  const pkg = existsSync(packageJsonFile)
    ? JSON.parse(readFileSync(packageJsonFile, "utf8"))
    : { version: "0.0.0" };

  return {
    version: pkg.version || "0.0.0",
    rawBytes: 0,
    rawFormatted: "N/A",
    minifiedBytes: 0,
    minifiedFormatted: "N/A",
    gzipBytes: 0,
    gzipFormatted: "~19 kB",
    brotliBytes: 0,
    brotliFormatted: "~17 kB",
  };
}

declare const data: PackageSizeData;
export { data };

export default {
  watch: ["../../../dist/index.mjs"],
  load(): PackageSizeData {
    return loadPackageSize();
  },
};
