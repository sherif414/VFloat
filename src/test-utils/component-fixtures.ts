import type { Ref } from "vue";

/**
 * Shared helpers for render-based component fixtures.
 *
 * Element creation and mounting belong to the test component rendered via
 * `vitest-browser-vue`. These utilities only cover the repetitive lookups and
 * list registrations shared across suites.
 */

/**
 * Registers a rendered list item at its index. Use as a template ref callback.
 */
export function registerListItem(
  elementsList: Ref<Array<HTMLElement | null>>,
  el: Element | null,
  idx: number,
): void {
  elementsList.value[idx] = el as HTMLElement | null;
}

/**
 * Queries a rendered element by test id. Throws when the fixture is missing
 * so failures point at the broken fixture instead of a null dereference.
 */
export function getTestEl(testId: string): HTMLElement {
  const el = document.body.querySelector(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`Missing rendered element [data-testid="${testId}"]`);
  return el as HTMLElement;
}

/**
 * Queries a rendered element by CSS selector with the same missing-fixture guard.
 */
export function getRenderedEl(selector: string): HTMLElement {
  const el = document.body.querySelector(selector);
  if (!el) throw new Error(`Missing rendered element ${selector}`);
  return el as HTMLElement;
}
