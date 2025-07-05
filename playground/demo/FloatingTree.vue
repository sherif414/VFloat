<template>
  <div class="floating-tree-playground">
    <h2>FloatingTree Playground: closeDescendants</h2>

    <div class="controls">
      <input v-model="newNodeLabel" placeholder="Node Label" @keyup.enter="addRootNode" />
      <button @click="addRootNode" :disabled="!newNodeLabel.trim()">Add Root Node</button>

      <select
        v-model="selectedParentId"
        :disabled="!treeInstance || treeInstance.nodeMap.size === 0"
      >
        <option value="">Select Parent (or add as root)</option>
        <option v-for="node in allNodes" :key="node.id" :value="node.id">
          {{ node.data.label }} (ID: {{ node.id }})
        </option>
      </select>
      <button @click="addChildNode" :disabled="!newNodeLabel.trim() || !treeInstance">
        Add Child Node
      </button>
    </div>

    <div class="actions" v-if="treeInstance && treeInstance.nodeMap.size > 0">
      <select v-model="nodeToCloseDescendants">
        <option value="">Select Node to Close Descendants</option>
        <option v-for="node in allNodes" :key="node.id" :value="node.id">
          {{ node.data.label }} (ID: {{ node.id }})
        </option>
      </select>
      <button @click="triggerCloseDescendants" :disabled="!nodeToCloseDescendants">
        Close Descendants
      </button>
    </div>

    <div class="tree-visualization" v-if="treeInstance" :style="treeInstance.root.data.floatingStyles.value">
      <h3>Tree Structure:</h3>
      <ul v-if="treeInstance.root">
        <TreeNodeVisualizer :node="treeInstance.root" />
      </ul>
      <p v-else>Tree is empty. Add a root node.</p>
    </div>
  </div>
</template>

<script lang="ts">
// Define the interface and recursive component outside <script setup>
// so they are standard declarations available to both the template and setup
import type { Tree, TreeNode } from "@/composables/use-tree"
import type { FloatingContext, UseFloatingTreeReturn } from "@/composables"
import { defineComponent, h, type PropType, type DefineComponent, type VNode } from "vue"

// Minimal mock for FloatingContext for this playground
interface PlaygroundFloatingContext {
  id: string
  label: string
  open: { value: boolean }
  setOpen: (isOpen: boolean) => void
  parentId?: string | null
}

// Define Props interface for clarity and type safety
interface TreeNodeVisualizerProps {
  node: TreeNode<PlaygroundFloatingContext>
}

const TreeNodeVisualizer: DefineComponent<TreeNodeVisualizerProps> = defineComponent({
  name: "TreeNodeVisualizer",
  props: {
    node: { type: Object as PropType<TreeNode<PlaygroundFloatingContext>>, required: true },
  },
  setup(props): () => VNode | null {
    return () =>
      h("li", [
        h(
          "span",
          `${props.node.data.label} (ID: ${props.node.id}) - [${props.node.data.open.value ? "Open" : "Closed"}]`
        ),
        props.node.children.value && props.node.children.value.length > 0
          ? h(
              "ul",
              props.node.children.value.map((child: TreeNode<PlaygroundFloatingContext>): VNode => {
                // @ts-ignore (self-reference for recursion can sometimes confuse TS, explicit type on TreeNodeVisualizer helps)
                return h(TreeNodeVisualizer, { key: child.id, node: child })
              })
            )
          : null,
      ])
  },
})

// Export the component to make it available if needed elsewhere
// export { TreeNodeVisualizer, type PlaygroundFloatingContext }; // Not strictly necessary for SFC internal use but good practice
</script>

<script setup lang="ts">
import { ref, computed, watch, shallowRef } from "vue"
import { useFloatingTree } from "@/composables/use-floating-tree"

let treeInstance: UseFloatingTreeReturn | null = null
const newNodeLabel = ref<string>("")
const selectedParentId = ref<string>("")
const nodeToCloseDescendants = ref<string>("")
let nodeIdCounter = 0

const createFloatingContext = (
  label: string,
  parentId: string | null = null
): PlaygroundFloatingContext => {
  const id = `node-${nodeIdCounter++}`
  const context: PlaygroundFloatingContext = {
    id,
    label: `${label} ${id}`,
    open: ref(true), // Nodes are open by default for visualization
    setOpen: (isOpen: boolean) => {
      // Ensure reactivity by updating the ref's value
      context.open.value = isOpen
      console.log(`Node ${context.id} (${context.label}) open state changed to: ${isOpen}`)
    },
    parentId,
  }
  return context
}

const addRootNode = () => {
  if (!newNodeLabel.value.trim()) return
  const rootContext = createFloatingContext(newNodeLabel.value.trim())
  treeInstance =  useFloatingTree(rootContext as any as FloatingContext)
  // Reset to empty string
  newNodeLabel.value = ""
  selectedParentId.value = ""
  nodeToCloseDescendants.value = ""
}

const addChildNode = () => {
  if (!treeInstance || !newNodeLabel.value.trim()) return
  const parentId = selectedParentId.value || treeInstance.root.id
  console.log("root id: ", treeInstance.root.id)

  if (!parentId) {
    alert("Select a parent node or add a root node first.")
    return
  }
  const childContext = createFloatingContext(newNodeLabel.value.trim(), parentId)
  try {
    treeInstance.addNode(childContext as any as FloatingContext, parentId)
    newNodeLabel.value = ""
  } catch (error) {
    console.error("Failed to add child node:", error)
    alert(`Failed to add child node: ${error}`)
  }
}

const triggerCloseDescendants = () => {
  if (!treeInstance || !nodeToCloseDescendants.value) return
  console.log(`Calling closeDescendants for node: ${nodeToCloseDescendants.value}`)
  // This call is expected to internally update the 'open.value' property
  // of the descendant nodes by calling their setOpen methods.
  treeInstance.forEach(nodeToCloseDescendants.value, (descendent)=>{
    descendent.data.setOpen(false)
  }, {relationship: 'descendants-only'})
  console.log("closeDescendants triggered. Check visualization.")
}

const allNodes = shallowRef<TreeNode<FloatingContext>[]>([])
</script>

<style scoped>
.floating-tree-playground {
  font-family: sans-serif;
  padding: 20px;
  background-color: #f4f4f4;
  border-radius: 8px;
}

.controls,
.actions {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls input,
.controls select,
.actions select {
  margin-right: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.controls button,
.actions button {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:disabled,
.actions button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.controls button:hover:not(:disabled),
.actions button:hover:not(:disabled) {
  background-color: #0056b3;
}

.tree-visualization {
  margin-top: 20px;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 4px;
}

.tree-visualization ul {
  list-style-type: none;
  padding-left: 20px;
}

.tree-visualization li {
  margin: 5px 0;
  padding: 5px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #333;
  color: #fff;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.debug-info pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
