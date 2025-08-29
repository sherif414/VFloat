<script setup lang="ts">
import { ref, computed, watch, shallowRef } from "vue"
import { useFloatingTree } from "@/composables/use-floating-tree"

// Mock elements for demonstration
const mockAnchor = ref<HTMLElement | null>(null)
const mockFloating = ref<HTMLElement | null>(null)

// Create tree with new API - no need for separate useFloating call
const tree = useFloatingTree(mockAnchor, mockFloating, {
  placement: "bottom-start"
})

// Add nodes using new addNode API with element refs
const nodeParent1 = tree.addNode(mockAnchor, mockFloating, {})
const nodeParent2 = tree.addNode(mockAnchor, mockFloating, {})

const nodeChild1 = tree.addNode(mockAnchor, mockFloating, { parentId: nodeParent1?.id })
const nodeChild2 = tree.addNode(mockAnchor, mockFloating, { parentId: nodeParent1?.id })

const nodeChild3 = tree.addNode(mockAnchor, mockFloating, { parentId: nodeParent2?.id })
const nodeChild4 = tree.addNode(mockAnchor, mockFloating, { parentId: nodeParent2?.id })

console.log("dfs: ", tree.traverse("dfs"))
console.log("bfs: ", tree.traverse("bfs"))
</script>

<template>
  <div>hello world</div>
</template>
