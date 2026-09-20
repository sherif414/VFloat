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

const trackedElements: HTMLElement[] = [];

/**
 * Registers a detached element for teardown. Tier-P DOM-utility suites that
 * cannot render components use this single shared tracker instead of
 * copy-pasting the helper per file. Render-based suites must not use it.
 */
export function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

/**
 * Removes tracked elements in reverse order and resets the registry.
 * Call from `afterEach()`.
 */
export function clearTrackedElements(): void {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }
  trackedElements.length = 0;
}

/**
 * Stubs getBoundingClientRect on a rendered element for geometry tests
 * without layout. Missing fields fall back to a zero rect.
 */
export function stubElementRect(el: HTMLElement, rect: Partial<DOMRect> = {}): void {
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
}

/**
 * Queries a rendered element by test id. Throws when the fixture is missing
 * so failures point at the broken fixture instead of a null dereference.
 * Pass a render container to scope the lookup when a test mounts multiple
 * fixtures.
 */
export function getTestEl(testId: string, root: ParentNode = document.body): HTMLElement {
  const el = root.querySelector(`[data-testid="${testId}"]`);
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
