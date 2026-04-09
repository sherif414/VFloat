<script setup lang="ts">
import { flip, offset, shift } from "@floating-ui/dom";
import { ref } from "vue";
import {
  useClick,
  useEscapeKey,
  useFloating,
  useFloatingTree,
  useFloatingTreeNode,
  useListNavigation,
} from "../../src";

const tree = useFloatingTree({ id: "playground-tree-keyboard" });

const rootItems = [
  { id: "overview", label: "Overview" },
  { id: "workspace", label: "Workspace" },
  { id: "publish", label: "Publish" },
] as const;

const childItems = [
  { id: "members", label: "Members" },
  { id: "permissions", label: "Permissions" },
  { id: "activity", label: "Activity" },
] as const;

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const rootOpen = ref(false);
const rootActiveIndex = ref<number | null>(null);
const rootListRef = ref<Array<HTMLElement | null>>([]);

const childAnchorEl = ref<HTMLElement | null>(null);
const childFloatingEl = ref<HTMLElement | null>(null);
const childOpen = ref(false);
const childActiveIndex = ref<number | null>(null);
const childListRef = ref<Array<HTMLElement | null>>([]);
let childNode: ReturnType<typeof useFloatingTreeNode> | null = null;

const rootContext = useFloating(rootAnchorEl, rootFloatingEl, {
  open: rootOpen,
  placement: "bottom-start",
  middlewares: [offset(10), flip(), shift({ padding: 8 })],
});

const rootNode = useFloatingTreeNode(rootContext, {
  tree,
  id: "keyboard-root-menu",
});

useClick(rootContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useEscapeKey(rootContext);
useListNavigation(rootContext, {
  listRef: rootListRef,
  activeIndex: rootActiveIndex,
  onNavigate: (index) => {
    rootActiveIndex.value = index;
  },
  focusItemOnHover: true,
  focusItemOnOpen: true,
  getChildNode: (index) => (index === 1 ? childNode : null),
  loop: true,
  openOnArrowKeyDown: true,
  orientation: "vertical",
});

const childContext = useFloating(childAnchorEl, childFloatingEl, {
  open: childOpen,
  placement: "right-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});

childNode = useFloatingTreeNode(childContext, {
  parent: rootNode,
  id: "keyboard-child-menu",
});

useClick(childContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useEscapeKey(childContext);
useListNavigation(childContext, {
  listRef: childListRef,
  activeIndex: childActiveIndex,
  onNavigate: (index) => {
    childActiveIndex.value = index;
  },
  focusItemOnHover: true,
  focusItemOnOpen: true,
  loop: true,
  orientation: "vertical",
});

const setRootItemEl = (index: number, el: Element | null) => {
  const itemEl = el instanceof HTMLElement ? el : null;
  rootListRef.value[index] = itemEl;

  if (index === 1) {
    childAnchorEl.value = itemEl;
  }
};

const setChildItemEl = (index: number, el: Element | null) => {
  childListRef.value[index] = el instanceof HTMLElement ? el : null;
};

const handleRootItemClick = (index: number) => {
  if (index !== 1) {
    rootNode.actions.close();
  }
};

const handleChildItemClick = () => {
  childNode?.actions.closeBranch();
};
</script>

<template>
  <section class="demo-shell">
    <div class="stage">
      <button ref="rootAnchorEl" type="button" class="primary">Keyboard menu trigger</button>
    </div>

    <Teleport to="body">
      <div
        v-if="rootOpen"
        ref="rootFloatingEl"
        class="floating-panel root-panel"
        :style="rootContext.position.styles.value"
      >
        <button
          v-for="(item, index) in rootItems"
          :key="item.id"
          :ref="(el) => setRootItemEl(index, el)"
          type="button"
          class="menu-item"
          :class="{ active: rootActiveIndex === index, child: index === 1 }"
          tabindex="-1"
          @click="handleRootItemClick(index)"
        >
          <span>{{ item.label }}</span>
          <span v-if="index === 1" class="arrow" aria-hidden="true">›</span>
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="childOpen"
        ref="childFloatingEl"
        class="floating-panel child-panel"
        :style="childContext.position.styles.value"
      >
        <button
          v-for="(item, index) in childItems"
          :key="item.id"
          :ref="(el) => setChildItemEl(index, el)"
          type="button"
          class="menu-item"
          :class="{ active: childActiveIndex === index }"
          tabindex="-1"
          @click="handleChildItemClick()"
        >
          {{ item.label }}
        </button>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.demo-shell {
  width: min(100%, 30rem);
}

.stage {
  border: 1px solid #d7e1df;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  padding: 28px;
  min-height: 11rem;
  display: grid;
  align-content: center;
  justify-items: start;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
}

.primary {
  border: 0;
  border-radius: 12px;
  background: #3558d8;
  color: #f8faff;
  padding: 12px 16px;
  cursor: pointer;
  width: fit-content;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.14);
}

.floating-panel {
  min-width: 218px;
  border: 1px solid #cad6f7;
  border-radius: 12px;
  background: #fdfefe;
  padding: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 6px;
}

.root-panel {
  z-index: 66;
}

.child-panel {
  z-index: 76;
}

.menu-item {
  border: 1px solid #dfe7ff;
  border-radius: 8px;
  background: #f7f9ff;
  color: #23345f;
  padding: 9px 10px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.menu-item:hover,
.menu-item.active,
.menu-item:focus-visible {
  border-color: #8ea6ff;
  background: #eaf0ff;
  outline: none;
}

.menu-item.child .arrow {
  font-size: 16px;
  line-height: 1;
  color: #5270d9;
}

@media (max-width: 640px) {
  .stage {
    width: 100%;
    padding: 22px;
  }
}
</style>
