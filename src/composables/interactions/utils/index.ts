/**
 * @fileoverview Centralized utility functions for interaction composables
 * 
 * This module exports shared helper functions to eliminate code duplication
 * across use-click, use-focus, use-hover, use-client-point, and polygon composables.
 */

// Tree-aware context utilities
export {
  isTreeNode,
  getContextFromParameter,
  isTargetWithinElement,
  findDescendantContainingTarget,
} from './tree-context'

// Element and input type detection
export {
  isMouseLikePointerType,
  isTypeableElement,
  isButtonTarget,
  isSpaceIgnored,
  isHTMLElement,
  isVirtualElement,
  isEventTargetWithin,
  isClickOnScrollbar,
} from './element-detection'

// Browser environment detection
export {
  isMac,
  isSafari,
  matchesFocusVisible,
} from './browser-detection'

// Event handling and timing utilities
export {
  contains,
  getTarget,
  getCurrentTime,
  clearTimeoutIfSet,
} from './event-utils'