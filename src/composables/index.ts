/** Public composable barrel for the VFloat API surface. */

export type { VirtualElement } from "@/types";

export type {
  ApplyArrowStylesFn,
  UseArrowContext,
  UseArrowOptions,
  UseArrowReturn,
} from "./arrow/use-arrow";
// Arrow
export { useArrow } from "./arrow/use-arrow";
export type { UseClickContext, UseClickOptions } from "./click/use-click";
// Click
export { useClick } from "./click/use-click";
export type {
  Coordinates,
  TrackingMode,
  UseClientPointContext,
  UseClientPointOptions,
  UseClientPointReturn,
} from "./client-point/use-client-point";
// Client Point
export { useClientPoint } from "./client-point/use-client-point";
export type { UseEscapeKeyContext, UseEscapeKeyOptions } from "./escape-key";
// Escape Key
export { useEscapeKey } from "./escape-key";
export type {
  AnchorElement,
  FloatingElement,
  FloatingNode,
  FloatingNodeElements,
  FloatingNodeId,
  TraversalOrder,
  TraverseAction,
  TraverseOptions,
  UseFloatingNodeOptions,
} from "./floating-node";
// Floating Node
export { useFloatingNode } from "./floating-node";
export type { UseFocusContext, UseFocusOptions } from "./focus/use-focus";
// Focus
export { useFocus } from "./focus/use-focus";
export type { UseFocusTrapContext, UseFocusTrapOptions, UseFocusTrapReturn } from "./focus-trap";
// Focus Trap
export { useFocusTrap } from "./focus-trap";
export type { SafePolygonOptions, UseHoverDelay, UseHoverOptions } from "./hover/use-hover";
// Hover
export { useHover } from "./hover/use-hover";
export type {
  NavigationTarget,
  NavigationTargetOptions,
  NavigationTargetValue,
  RovingEntryFocusMode,
  TypeaheadFindMatchFn,
  UseAriaActivedescendantContext,
  UseAriaActivedescendantOptions,
  UseAriaActivedescendantReturn,
  UseRovingFocusContext,
  UseRovingFocusOptions,
  UseRovingFocusReturn,
  UseTypeaheadContext,
  UseTypeaheadOptions,
  UseTypeaheadReturn,
  VirtualizerAdapter,
} from "./keyboard-navigation";
// Keyboard Navigation (Virtual Focus, Physical Roving Focus & Typeahead)
export {
  createCustomVirtualAdapter,
  createTanStackVirtualAdapter,
  useAriaActivedescendant,
  useRovingFocus,
  useTypeahead,
} from "./keyboard-navigation";
export type { InlineOptions, Middleware, Placement, Strategy } from "./middlewares";
// Middlewares
export { arrow, autoPlacement, flip, hide, inline, offset, shift, size } from "./middlewares";
export type {
  OutsideClickPredicate,
  UseOutsideClickContext,
  UseOutsideClickOptions,
} from "./outside-click";
// Outside Click
export { useOutsideClick } from "./outside-click";
export type {
  ApplyStylesFn,
  FloatingMiddlewareRegistry,
  FloatingPosition,
  FloatingStyles,
  UsePositionArrowOptions,
  UsePositionMiddlewaresOptions,
  UsePositionOptions,
} from "./position";
// Position
export { usePosition } from "./position";
export type {
  FloatingRole,
  FloatingRoleItemRole,
  UseRoleOptions,
  UseRoleReturn,
} from "./role/use-role";
// Role
export { useRole } from "./role/use-role";
