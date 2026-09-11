import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useEscapeKey } from "@/composables/escape-key/use-escape-key";
import type { FloatingNode, FloatingTree } from "@/composables/floating-tree";
import { type OutsideClickPredicate, useOutsideClick } from "@/composables/outside-click/use-outside-click";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node on Escape and outside pointer input through one shared gate.
 *
 * Thin composition over `useEscapeKey` and `useOutsideClick`: `enabled` and `tree`
 * are declared once and forwarded to both channels, so nested surfaces stay
 * family-aware without repeating the tree on every dismissal primitive.
 * For independent reactive gates per channel, compose the primitives directly.
 *
 * @param node - The floating node with refs and open state.
 * @param options - Shared gate plus per-channel Escape and outside-press config.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useDismiss(node)
 * ```
 *
 * @example Escape-only dismissal
 * ```ts
 * useDismiss(node, { outsidePress: false })
 * ```
 */
export function useDismiss(node: UseDismissContext, options: UseDismissOptions = {}): void {
  const isEscapeEnabled = computed(
    () => toValue(options.enabled ?? true) && options.escapeKey !== false,
  );
  const isOutsideEnabled = computed(
    () => toValue(options.enabled ?? true) && options.outsidePress !== false,
  );

  useEscapeKey(node, {
    enabled: isEscapeEnabled,
    tree: options.tree,
    ...(typeof options.escapeKey === "object" ? options.escapeKey : {}),
  });

  useOutsideClick(node, {
    enabled: isOutsideEnabled,
    tree: options.tree,
    ...(typeof options.outsidePress === "object" ? options.outsidePress : {}),
  });
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useDismiss`.
 */
export interface UseDismissContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

/**
 * Escape-channel config for `useDismiss`, without the shared `enabled` / `tree` gate.
 */
export interface UseDismissEscapeOptions {
  /**
   * Whether to use capture phase for the document keydown listener.
   * @default false
   */
  capture?: boolean;

  /**
   * Whether to call preventDefault on the escape key event before handling it.
   * @default false
   */
  preventDefault?: boolean;

  /**
   * Custom callback executed when Escape is pressed.
   * When provided, overrides the default close behavior.
   */
  onEscape?: (event: KeyboardEvent) => void;

  /**
   * Predicate to determine if an escape key press should be ignored.
   * @param event - The keyboard event
   * @returns true if the escape key should be ignored
   */
  ignoreEscapeKey?: (event: KeyboardEvent) => boolean;
}

/**
 * Outside-press channel config for `useDismiss`, without the shared `enabled` / `tree` gate.
 */
export interface UseDismissOutsideOptions {
  /**
   * The event to use for outside-press detection.
   * @default 'pointerdown'
   */
  event?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;

  /**
   * Whether to use capture phase for the document listener.
   * @default true
   */
  capture?: MaybeRefOrGetter<boolean>;

  /**
   * Predicate used to ignore specific outside presses.
   * @param event - The mouse event that triggered the outside press
   * @param target - The event target
   * @returns true if the press should be ignored
   */
  ignoreClick?: OutsideClickPredicate;

  /**
   * Custom function to handle outside presses.
   * If provided, this function is called instead of the default close behavior.
   * @param event - The mouse event that triggered the outside press
   */
  onClick?: (event: MouseEvent) => void;

  /**
   * Whether to ignore presses on scrollbars.
   * @default true
   */
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to ignore outside presses that finish a drag started inside the floating element.
   * Only applies when `event` is `"click"`.
   * @default true
   */
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}

/**
 * Options for configuring grouped dismissal behavior.
 */
export interface UseDismissOptions {
  /**
   * Shared gate for both dismissal channels.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Explicit floating tree shared by both channels for family-aware dismissal
   * across nested surfaces. When omitted, only the node's own anchor and
   * floating elements count as inside.
   */
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;

  /**
   * Escape-channel config. `false` disables Escape dismissal.
   * @default true
   */
  escapeKey?: boolean | UseDismissEscapeOptions;

  /**
   * Outside-press channel config. `false` disables outside-press dismissal.
   * @default true
   */
  outsidePress?: boolean | UseDismissOutsideOptions;
}
