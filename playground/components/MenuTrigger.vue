<script setup lang="ts">
import type { UseFloatingTreeReturn } from "@/composables"
import { inject, ref } from "vue"

const menuId = inject<string>("currentMenuId")
const tree = inject<UseFloatingTreeReturn>("floatingTree")

if (!tree || !menuId) {
  throw new Error("no menu parent found")
}

const node = tree.findNodeById(menuId)
const anchorEl = node?.data.refs.anchorEl ?? ref(null)
</script>

<template>
  <button
    ref="anchorEl"
    class="menu-trigger-button"
    type="button"
    :aria-expanded="node?.data.open.value"
    aria-controls="menu-panel"
    aria-haspopup="true"
  >
    <slot />
  </button>
</template>
