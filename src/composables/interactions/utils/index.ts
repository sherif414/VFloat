/**
 * @fileoverview Centralized utility functions for interaction composables
 *
 * This module exports shared helper functions to eliminate code duplication
 * across use-click, use-focus, use-hover, use-client-point, and polygon composables.
 */

// Browser environment detection
export {
  isMac,
  isSafari,
  matchesFocusVisible,
} from "./browser-detection"

// Element and input type detection
export {
  isButtonTarget,
  isClickOnScrollbar,
  isEventTargetWithin,
  isHTMLElement,
  isMouseLikePointerType,
  isSpaceIgnored,
  isTypeableElement,
  isVirtualElement,
} from "./element-detection"
// Event handling and timing utilities
export {
  clearTimeoutIfSet,
  contains,
  getCurrentTime,
  getTarget,
} from "./event-utils"
// Tree-aware context utilities
export {
  findDescendantContainingTarget,
  getContextFromParameter,
  isTargetWithinElement,
  isTreeNode,
} from "./tree-context"
