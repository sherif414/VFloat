<script setup lang="ts">
import { flip, offset, shift } from "@floating-ui/dom";
import { ref } from "vue";
import {
  useClick,
  useEscapeKey,
  useFloating,
  useFloatingTree,
  useFloatingTreeNode,
} from "../../src";

const tree = useFloatingTree({ id: "playground-tree-explicit" });

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const rootOpen = ref(false);

const firstSubmenuAnchorEl = ref<HTMLElement | null>(null);
const firstSubmenuFloatingEl = ref<HTMLElement | null>(null);
const firstSubmenuOpen = ref(false);

const secondSubmenuAnchorEl = ref<HTMLElement | null>(null);
const secondSubmenuFloatingEl = ref<HTMLElement | null>(null);
const secondSubmenuOpen = ref(false);

const rootContext = useFloating(rootAnchorEl, rootFloatingEl, {
  open: rootOpen,
  placement: "bottom-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});

const rootNode = useFloatingTreeNode(rootContext, {
  tree,
  id: "root-menu",
});

useClick(rootContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useEscapeKey(rootContext);

const firstSubmenuContext = useFloating(firstSubmenuAnchorEl, firstSubmenuFloatingEl, {
  open: firstSubmenuOpen,
  placement: "right-start",
  middlewares: [offset(6), flip(), shift({ padding: 8 })],
});

const firstSubmenuNode = useFloatingTreeNode(firstSubmenuContext, {
  parent: rootNode,
  id: "first-submenu",
});

useClick(firstSubmenuContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useEscapeKey(firstSubmenuContext);

const secondSubmenuContext = useFloating(secondSubmenuAnchorEl, secondSubmenuFloatingEl, {
  open: secondSubmenuOpen,
  placement: "right-start",
  middlewares: [offset(6), flip(), shift({ padding: 8 })],
});

const secondSubmenuNode = useFloatingTreeNode(secondSubmenuContext, {
  parent: rootNode,
  id: "second-submenu",
});

useClick(secondSubmenuContext, {
  toggle: true,
  closeOnOutsideClick: true,
  outsideClickEvent: "click",
});
useEscapeKey(secondSubmenuContext);
</script>

<template>
  <section class="demo-shell">
    <div class="stage">
      <button ref="rootAnchorEl" type="button" class="primary">Root menu trigger</button>
    </div>

    <Teleport to="body">
      <div
        v-if="rootOpen"
        ref="rootFloatingEl"
        class="floating-panel root-panel"
        :style="rootContext.position.styles.value"
      >
        <button ref="firstSubmenuAnchorEl" type="button" class="menu-item">
          Appearance submenu
        </button>
        <button ref="secondSubmenuAnchorEl" type="button" class="menu-item">Share submenu</button>
        <button type="button" class="menu-item" @click="rootNode.actions.close()">
          Close root menu
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="firstSubmenuOpen"
        ref="firstSubmenuFloatingEl"
        class="floating-panel child-panel"
        :style="firstSubmenuContext.position.styles.value"
      >
        <button type="button" class="menu-item">Theme</button>
        <button type="button" class="menu-item">Density</button>
        <button type="button" class="menu-item" @click="firstSubmenuNode.actions.close()">
          Close this submenu
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="secondSubmenuOpen"
        ref="secondSubmenuFloatingEl"
        class="floating-panel child-panel"
        :style="secondSubmenuContext.position.styles.value"
      >
        <button type="button" class="menu-item">Copy link</button>
        <button type="button" class="menu-item">Invite users</button>
        <button type="button" class="menu-item" @click="secondSubmenuNode.actions.close()">
          Close this submenu
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
  background: #0f7972;
  color: #fff;
  padding: 12px 16px;
  cursor: pointer;
  width: fit-content;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
}

.floating-panel {
  min-width: 210px;
  border: 1px solid #c4d6d3;
  border-radius: 12px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  display: grid;
  gap: 6px;
}

.root-panel {
  z-index: 60;
}

.child-panel {
  z-index: 70;
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

@media (max-width: 640px) {
  .stage {
    width: 100%;
    padding: 22px;
  }
}
</style>
