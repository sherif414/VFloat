import type { Placement } from "v-float";
import type { PresetType } from "./types";

interface CodeGeneratorOptions {
  activePreset: PresetType;
  placement: Placement;
  offset: number;
  flip: boolean;
  shift: boolean;
  arrow: boolean;
}

export function generateShowcaseCode(options: CodeGeneratorOptions): string {
  const { activePreset, placement, offset, flip, shift, arrow } = options;
  const scriptEnd = "<" + "/script>";

  if (activePreset === "tooltip") {
    return `<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useHover, useFocus${arrow ? ", useArrow" : ""} } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
${arrow ? "const arrowEl = ref<HTMLElement | null>(null);\n" : ""}
const context = useFloatingContext({
  anchorEl,
  floatingEl,
  ${arrow ? "arrowEl," : ""}
});

const { styles } = usePosition(context, {
  placement: "${placement}",
  middleware: {
    offset: ${offset},
    flip: ${flip},
    shift: ${shift},
  },
});
${arrow ? '\nconst { arrowStyles } = useArrow(context, { offset: "-5px" });' : ""}
useHover(context, { delay: { open: 80, close: 120 } });
useFocus(context);
${scriptEnd}

<template>
  <button ref="anchorEl" type="button">Hover me</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="tooltip"
    :style="styles"
  >
    Copy link to clipboard
    ${arrow ? '<div ref="arrowEl" class="arrow" :style="arrowStyles" />' : ""}
  </div>
</template>`;
  }

  if (activePreset === "popover") {
    return `<script setup lang="ts">
import { ref } from "vue";
import {
  useFloatingContext,
  usePosition,
  useClick,
  useOutsideClick,
  useEscapeKey${arrow ? ",\n  useArrow" : ""}
} from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
${arrow ? "const arrowEl = ref<HTMLElement | null>(null);\n" : ""}
const context = useFloatingContext({
  anchorEl,
  floatingEl,
  ${arrow ? "arrowEl," : ""}
});

const { styles } = usePosition(context, {
  placement: "${placement}",
  middleware: {
    offset: ${offset},
    flip: ${flip},
    shift: ${shift},
  },
});
${arrow ? '\nconst { arrowStyles } = useArrow(context, { offset: "-5px" });' : ""}
useClick(context);
useOutsideClick(context);
useEscapeKey(context);
${scriptEnd}

<template>
  <button ref="anchorEl" type="button">Open Card</button>

  <div
    v-if="context.state.open.value"
    ref="floatingEl"
    role="dialog"
    :style="styles"
  >
    <h3>Settings</h3>
    <p>Dismiss by clicking outside or pressing Escape.</p>
    <button type="button" @click="context.state.setOpen(false)">Close</button>
    ${arrow ? '<div ref="arrowEl" class="arrow" :style="arrowStyles" />' : ""}
  </div>
</template>`;
  }

  if (activePreset === "menu") {
    return `<script setup lang="ts">
import { ref } from "vue";
import {
  useFloatingContext,
  usePosition,
  useClick,
  useOutsideClick,
  useEscapeKey,
  useCollection,
  useListNavigation,
  useFocusManager,
  useRole${arrow ? ",\n  useArrow" : ""}
} from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
${arrow ? "const arrowEl = ref<HTMLElement | null>(null);\n" : ""}
const context = useFloatingContext({
  anchorEl,
  floatingEl,
  ${arrow ? "arrowEl," : ""}
});

const { styles } = usePosition(context, {
  placement: "${placement}",
  middleware: {
    offset: ${offset},
    flip: ${flip},
    shift: ${shift},
  },
});

const itemEls = ref<HTMLElement[]>([]);
const { activeIndex } = useListNavigation(itemEls, { targetEl: floatingEl, loop: true });
useRole(context, { role: "menu" });
${scriptEnd}

<template>
  <button ref="anchorEl" type="button" aria-haspopup="menu">Actions Menu</button>

  <div
    role="menu"
    tabindex="-1"
    :style="styles"
  >
    <div
      v-for="(item, index) in ['duplicate', 'rename', 'share', 'delete']"
      :key="item"
      ref="itemEls"
      role="menuitem"
      :class="{ 'is-active': activeIndex === index }"
    >
      {{ item }}
    </div>
    ${arrow ? '<div ref="arrowEl" class="arrow" :style="arrowStyles" />' : ""}
  </div>
</template>`;
  }

  return `<script setup lang="ts">
import { ref } from "vue";
import { useFloatingContext, usePosition, useClientPoint } from "v-float";
const trackingAreaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingContext({
  anchorEl,
  floatingEl,
  defaultOpen: true,
});

const { styles } = usePosition(context, {
  placement: "${placement}",
  middleware: {
    offset: ${offset},
    flip: ${flip},
    shift: ${shift},
  },
});

const { coordinates } = useClientPoint(context, {
  trackingAreaEl,
  trackingMode: "follow",
});
${scriptEnd}

<template>
  <div ref="trackingAreaEl" class="tracker-canvas">
    <div
      v-if="context.state.open.value && coordinates.x !== null"
      ref="floatingEl"
      :style="styles"
    >
      Pointer: X={{ Math.round(coordinates.x ?? 0) }}, Y={{ Math.round(coordinates.y ?? 0) }}
    </div>
  </div>
</template>`;
}
