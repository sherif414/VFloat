import { isReactive, isRef } from "vue";

export function isWatchable(source: unknown): boolean {
  return source != null && (isReactive(source) || isRef(source) || typeof source === "function");
}
