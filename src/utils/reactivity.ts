export function isWatchable(source: unknown): boolean {
  return source != null && (typeof source === "object" || typeof source === "function");
}
