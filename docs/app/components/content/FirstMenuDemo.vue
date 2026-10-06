<script setup lang="ts">
import {
  useClick,
  useEscapeKey,
  useFloatingNode,
  useOutsideClick,
  usePosition,
  useRovingFocus,
} from "v-float";
import { ref } from "vue";

const items = ["Profile", "Settings", "Billing", "Sign out"];

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const itemEls = ref<(HTMLElement | null)[]>([]);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
  },
});

useClick(node);
useOutsideClick(node);
useEscapeKey(node);

const { getTabindex } = useRovingFocus(node, {
  elementsList: itemEls,
  loop: true,
  openOnArrowKeyDown: true,
});

function handleSelect(item: string) {
  console.log("Selected:", item);
  node.open.value = false;
}
</script>

<template>
  <div class="relative flex items-center justify-center">
    <button
      ref="anchorEl"
      class="inline-flex items-center gap-2 px-3.5 py-2 border border-default rounded-lg bg-elevated text-highlighted text-sm font-medium cursor-pointer select-none touch-manipulation shadow-xs hover:border-primary hover:bg-muted hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition-all duration-150"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="node.open.value"
    >
      <span>Actions</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 text-muted transition-transform duration-150"
        :class="{ 'rotate-180 text-highlighted': node.open.value }"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="node.open.value"
        ref="floatingEl"
        class="w-44 p-1 border border-default rounded-lg bg-elevated text-highlighted shadow-lg z-50 flex flex-col gap-0.5 outline-none"
        role="menu"
      >
        <button
          v-for="(item, index) in items"
          :key="item"
          :ref="(el) => (itemEls[index] = el as HTMLElement | null)"
          type="button"
          role="menuitem"
          :tabindex="getTabindex(index)"
          class="w-full flex items-center px-2.5 py-1.5 rounded-md text-[13px] font-medium text-left cursor-pointer select-none touch-manipulation transition-colors duration-150 outline-none text-muted hover:text-highlighted hover:bg-muted focus:text-highlighted focus:bg-muted focus-visible:outline-none"
          @click="handleSelect(item)"
        >
          <span>{{ item }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>
