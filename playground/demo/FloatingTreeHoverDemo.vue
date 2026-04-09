<script setup lang="ts">
import { flip, offset, shift } from "@floating-ui/dom";
import { ref } from "vue";
import {
  useEscapeKey,
  useFloating,
  useFloatingTree,
  useFloatingTreeNode,
  useHover,
} from "../../src";

const tree = useFloatingTree({ id: "playground-tree-hover" });

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const rootOpen = ref(false);

const motionAnchorEl = ref<HTMLElement | null>(null);
const motionFloatingEl = ref<HTMLElement | null>(null);
const motionOpen = ref(false);

const workspaceAnchorEl = ref<HTMLElement | null>(null);
const workspaceFloatingEl = ref<HTMLElement | null>(null);
const workspaceOpen = ref(false);

const rootContext = useFloating(rootAnchorEl, rootFloatingEl, {
  open: rootOpen,
  placement: "bottom-start",
  middlewares: [offset(10), flip(), shift({ padding: 8 })],
});

const rootNode = useFloatingTreeNode(rootContext, {
  tree,
  id: "hover-root-menu",
});

useHover(rootContext, {
  delay: { open: 70, close: 120 },
  safePolygon: true,
});
useEscapeKey(rootContext);

const motionContext = useFloating(motionAnchorEl, motionFloatingEl, {
  open: motionOpen,
  placement: "right-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});

useFloatingTreeNode(motionContext, {
  parent: rootNode,
  id: "hover-motion-submenu",
});

useHover(motionContext, {
  delay: { open: 40, close: 100 },
  safePolygon: true,
});
useEscapeKey(motionContext);

const workspaceContext = useFloating(workspaceAnchorEl, workspaceFloatingEl, {
  open: workspaceOpen,
  placement: "right-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});

useFloatingTreeNode(workspaceContext, {
  parent: rootNode,
  id: "hover-workspace-submenu",
});

useHover(workspaceContext, {
  delay: { open: 40, close: 100 },
  safePolygon: true,
});
useEscapeKey(workspaceContext);
</script>

<template>
  <section class="demo-shell">
    <div class="stage">
      <button ref="rootAnchorEl" type="button" class="primary">Hover menu trigger</button>
    </div>

    <Teleport to="body">
      <div
        v-if="rootOpen"
        ref="rootFloatingEl"
        class="floating-panel root-panel"
        :style="rootContext.position.styles.value"
      >
        <button ref="motionAnchorEl" type="button" class="menu-item">Motion submenu</button>
        <button ref="workspaceAnchorEl" type="button" class="menu-item">Workspace submenu</button>
        <button type="button" class="menu-item">Library</button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="motionOpen"
        ref="motionFloatingEl"
        class="floating-panel child-panel"
        :style="motionContext.position.styles.value"
      >
        <button type="button" class="menu-item">Springs</button>
        <button type="button" class="menu-item">Transitions</button>
        <button type="button" class="menu-item">Scroll scenes</button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="workspaceOpen"
        ref="workspaceFloatingEl"
        class="floating-panel child-panel"
        :style="workspaceContext.position.styles.value"
      >
        <button type="button" class="menu-item">Canvases</button>
        <button type="button" class="menu-item">Shortcuts</button>
        <button type="button" class="menu-item">Share links</button>
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
  background: #8a5b14;
  color: #fffdf7;
  padding: 12px 16px;
  cursor: pointer;
  width: fit-content;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
}

.floating-panel {
  min-width: 210px;
  border: 1px solid #d9d2c5;
  border-radius: 12px;
  background: #fffdfa;
  padding: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 6px;
}

.root-panel {
  z-index: 64;
}

.child-panel {
  z-index: 74;
}

.menu-item {
  border: 1px solid #ece3d4;
  border-radius: 8px;
  background: #fffaf2;
  color: #4c3920;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  border-color: #d0b587;
  background: #fff4de;
}

@media (max-width: 640px) {
  .stage {
    width: 100%;
    padding: 22px;
  }
}
</style>
