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
      // Fall through to jsonFile
    }
  }

  if (existsSync(jsonFile)) {
    try {
      return JSON.parse(readFileSync(jsonFile, "utf8"));
    } catch (error) {
      throw new Error(
        `Failed to parse package size data from ${jsonFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    `Package size data could not be loaded. Neither build artifact (${distFile}) nor saved metrics (${jsonFile}) were found. Run "pnpm run build" or "pnpm run size" to generate them.`,
  );
}

declare const data: PackageSizeData;
export { data };

export default {
  watch: ["../../../dist/index.mjs", "./package-size.json"],
  load(): PackageSizeData {
    return loadPackageSize();
  },
};
