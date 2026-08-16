/** Public composable barrel for the VFloat API surface. */

// Core Types
export type { OpenChangeReason, VirtualElement } from "@/types";

export type { UseArrowContext, UseArrowOptions, UseArrowReturn } from "./arrow/use-arrow";
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
export type {
  CollectionNavigationOptions,
  UseCollectionOptions,
  UseCollectionReturn,
} from "./collection";
// Collection
export { useCollection } from "./collection";
export type { UseEscapeKeyContext, UseEscapeKeyOptions } from "./escape-key/use-escape-key";
// Escape Key
export { useEscapeKey } from "./escape-key/use-escape-key";
export type {
  AnchorElement,
  FloatingContext,
  FloatingContextId,
  FloatingElement,
  FloatingRefs,
  FloatingState,
  UseFloatingContextOptions,
} from "./floating-context";
// Floating Context
export { useFloatingContext } from "./floating-context";
export type { UseFocusContext, UseFocusOptions } from "./focus/use-focus";
// Focus
export { useFocus } from "./focus/use-focus";
export type {
  UseFocusTrapContext,
  UseFocusTrapOptions,
  UseFocusTrapReturn,
} from "./focus-trap/use-focus-trap";
// Focus Trap
export { useFocusTrap } from "./focus-trap/use-focus-trap";
export type { SafePolygonOptions, UseHoverOptions } from "./hover/use-hover";
// Hover
export { useHover } from "./hover/use-hover";
export type {
  NavigableCollection,
  NavigationOrientation,
  UseListNavigationOptions,
} from "./list-navigation/use-list-navigation";
// List Navigation
export { useListNavigation } from "./list-navigation/use-list-navigation";
export type { Middleware, Placement, Strategy } from "./middlewares";
// Middlewares
export { arrow, autoPlacement, flip, hide, offset, shift, size } from "./middlewares";
export type {
  OutsideClickPredicate,
  UseOutsideClickContext,
  UseOutsideClickOptions,
} from "./outside-click/use-outside-click";
// Outside Click
export { useOutsideClick } from "./outside-click/use-outside-click";
export type {
  FloatingMiddlewareRegistry,
  FloatingPosition,
  FloatingStyles,
  UsePositionMiddlewareOptions,
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
