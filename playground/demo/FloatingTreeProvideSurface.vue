<script setup lang="ts">
import { flip, offset, shift } from "@floating-ui/dom";
import { ref } from "vue";
import { useClick, useEscapeKey, useFloating, useFloatingTreeNode } from "../../src";

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const rootOpen = ref(false);

const childAnchorEl = ref<HTMLElement | null>(null);
const childFloatingEl = ref<HTMLElement | null>(null);
const childOpen = ref(false);

const rootContext = useFloating(rootAnchorEl, rootFloatingEl, {
  open: rootOpen,
  placement: "bottom-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});

const rootNode = useFloatingTreeNode(rootContext, {
  id: "provided-root",
});

const childContext = useFloating(childAnchorEl, childFloatingEl, {
  open: childOpen,
  placement: "right-start",
  middlewares: [offset(6), flip(), shift({ padding: 8 })],
});

const childNode = useFloatingTreeNode(childContext, {
  parent: rootNode,
  id: "provided-child",
});

useClick(rootContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useClick(childContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useEscapeKey(rootContext);
useEscapeKey(childContext);
</script>

<template>
  <div class="surface">
    <button ref="rootAnchorEl" type="button" class="primary">Provided root trigger</button>

    <Teleport to="body">
      <div
        v-if="rootOpen"
        ref="rootFloatingEl"
        class="floating-panel root-panel"
        :style="rootContext.position.styles.value"
      >
        <button ref="childAnchorEl" type="button" class="menu-item">Child submenu trigger</button>
        <button type="button" class="menu-item" @click="rootNode.actions.close()">
          Close provided root
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
        <button type="button" class="menu-item">Nested action</button>
        <button type="button" class="menu-item" @click="childNode.actions.close()">
          Close provided child
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.surface {
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
  background: #145954;
  color: #fff;
  padding: 12px 16px;
  width: fit-content;
  cursor: pointer;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
}

.floating-panel {
  min-width: 206px;
  border: 1px solid #c4d6d3;
  border-radius: 12px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 6px;
}

.root-panel {
  z-index: 62;
}

.child-panel {
  z-index: 72;
}

.menu-item {
  border: 1px solid #deebea;
  border-radius: 8px;
  background: #f9fcfb;
  color: #1e4441;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  border-color: #9bbfbb;
}
</style>
