<template>
    <div class="floating-tree-playground">
        <h2>FloatingTree Playground: closeDescendants</h2>

        <div class="controls">
            <input v-model="newNodeLabel" placeholder="Node Label" @keyup.enter="addRootNode" />
            <button @click="addRootNode" :disabled="!newNodeLabel.trim()">Add Root Node</button>

            <select v-model="selectedParentId" :disabled="!treeInstance || treeInstance.nodeMap.value.size === 0">
                <option value="">Select Parent (or add as root)</option>
                <option v-for="node in allNodes" :key="node.id" :value="node.id">{{ node.data.value.label }} (ID: {{
                    node.id }})</option>
            </select>
            <button @click="addChildNode" :disabled="!newNodeLabel.trim() || !treeInstance">Add Child Node</button>
        </div>

        <div class="actions" v-if="treeInstance && treeInstance.nodeMap.value.size > 0">
            <select v-model="nodeToCloseDescendants">
                <option value="">Select Node to Close Descendants</option>
                <option v-for="node in allNodes" :key="node.id" :value="node.id">{{ node.data.value.label }} (ID: {{
                    node.id }})</option>
            </select>
            <button @click="triggerCloseDescendants" :disabled="!nodeToCloseDescendants">Close Descendants</button>
        </div>

        <div class="tree-visualization" v-if="treeInstance">
            <h3>Tree Structure:</h3>
            <ul v-if="treeInstance.root.value">
                <tree-node-visualizer :node="treeInstance.root.value" />
            </ul>
            <p v-else>Tree is empty. Add a root node.</p>
        </div>

        <div class="debug-info" v-if="treeInstance">
            <h4>Debug: All Nodes</h4>
            <pre>{{ allNodesInfo }}</pre>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useFloatingTree, type FloatingTreeOptions } from '@/composables/use-floating-tree';
import type { TreeNode } from '@/composables/use-tree';

// Minimal mock for FloatingContext for this playground
interface PlaygroundFloatingContext {
    id: string;
    label: string;
    open: { value: boolean };
    onOpenChange: (isOpen: boolean) => void;
    parentId?: string | null;
}

const treeInstance = ref<useFloatingTree<PlaygroundFloatingContext> | null>(null);
const newNodeLabel = ref<string>('Node ');
const selectedParentId = ref<string | null>(null);
const nodeToCloseDescendants = ref<string>('');
let nodeIdCounter = 0;

const createFloatingContext = (label: string, parentId: string | null = null): PlaygroundFloatingContext => {
    const id = `node-${nodeIdCounter++}`;
    const context: PlaygroundFloatingContext = {
        id,
        label: `${label} ${id}`,
        open: ref(true), // Nodes are open by default for visualization
        onOpenChange: (isOpen: boolean) => {
            context.open.value = isOpen;
            // In a real scenario, this would trigger UI updates, etc.
            console.log(`Node ${context.id} (${context.label}) open state changed to: ${isOpen}`);
            // Force reactivity update for visualization if needed
            if (treeInstance.value) {
                // This is a bit of a hack; ideally, the tree structure itself or node data is reactive
                treeInstance.value = new useFloatingTree(treeInstance.value.root.value!.data.value, { ...treeInstance.value.options });
                // Re-populate the tree to reflect changes. This is not efficient for large trees.
                // A better approach would be to make TreeNode.data reactive or have a dedicated reactive list of nodes.
            }
        },
        parentId,
    };
    return context;
};

const addRootNode = () => {
    if (!newNodeLabel.value.trim()) return;
    const rootContext = createFloatingContext(newNodeLabel.value.trim());
    treeInstance.value = useFloatingTree(rootContext);
    newNodeLabel.value = 'Node ';
    selectedParentId.value = null;
    nodeToCloseDescendants.value = '';
};

const addChildNode = () => {
    if (!treeInstance.value || !newNodeLabel.value.trim()) return;
    const parentId = selectedParentId.value || treeInstance.value.root.value?.id;
    if (!parentId) {
        alert('Select a parent node or add a root node first.');
        return;
    }
    const childContext = createFloatingContext(newNodeLabel.value.trim(), parentId);
    try {
        treeInstance.value.addNode(childContext, parentId);
        newNodeLabel.value = 'Node ';
    } catch (error) {
        console.error('Failed to add child node:', error);
        alert(`Failed to add child node: ${error}`);
    }
};

const triggerCloseDescendants = () => {
    if (!treeInstance.value || !nodeToCloseDescendants.value) return;
    console.log(`Calling closeDescendants for node: ${nodeToCloseDescendants.value}`);
    treeInstance.value.closeDescendants(nodeToCloseDescendants.value);
    // Force a re-render if necessary by re-assigning treeInstance or a sub-property
    // This is often needed if Vue doesn't pick up deep changes within class instances
    // A more robust solution would involve making the tree nodes themselves more reactive.
    nextTick(() => {
        if (treeInstance.value) {
            // Create a new instance to trigger reactivity, copying essential state
            // This is a simplified way to force update. In a real app, you'd manage reactivity more granularly.
            const currentRootData = treeInstance.value.root.value?.data.value;
            if (currentRootData) {
                const newTree = new useFloatingTree(currentRootData, { ...treeInstance.value.options });
                // Re-add all nodes to the new tree to maintain structure
                // This is highly inefficient and just for playground purposes
                const allNodesFlat = Array.from(treeInstance.value.nodeMap.value.values());
                allNodesFlat.forEach(node => {
                    if (node.id !== currentRootData.id && node.parent.value) {
                        try {
                            newTree.addNode(node.data.value, node.parent.value.id);
                            // Preserve open state
                            const oldNodeContext = treeInstance.value!.findNodeById(node.id)?.data.value;
                            const newNodeContext = newTree.findNodeById(node.id)?.data.value;
                            if (oldNodeContext && newNodeContext) {
                                newNodeContext.open.value = oldNodeContext.open.value;
                            }
                        } catch (e) { /* ignore if already added or error */ }
                    }
                });
                treeInstance.value = newTree;
            }
        }
    });
    console.log('closeDescendants triggered. Check visualization.');
};

const allNodes = computed(() => {
    if (!treeInstance.value) return [];
    return Array.from(treeInstance.value.nodeMap.value.values());
});

const allNodesInfo = computed(() => {
    if (!treeInstance.value) return {};
    return allNodes.value.map(node => ({
        id: node.id,
        label: node.data.value.label,
        isOpen: node.data.value.open.value,
        parentId: node.parent.value?.id || null,
        childrenIds: node.children.value.map(c => c.id)
    }));
});

// Component for visualizing tree nodes recursively
const TreeNodeVisualizer = {
    name: 'TreeNodeVisualizer',
    props: {
        node: { type: Object as () => TreeNode<PlaygroundFloatingContext>, required: true },
    },
    template: `
    <li>
      <span>{{ node.data.value.label }} (ID: {{ node.id }}) - [{{ node.data.value.open.value ? 'Open' : 'Closed' }}]</span>
      <ul v-if="node.children.value && node.children.value.length > 0">
        <tree-node-visualizer v-for="child in node.children.value" :key="child.id" :node="child" />
      </ul>
    </li>
  `,
    components: { 'tree-node-visualizer': 'self' } // Recursive component registration
};

// Watch for debugging
watch(allNodesInfo, (newInfo) => {
    console.log('Tree nodes updated:', JSON.stringify(newInfo, null, 2));
}, { deep: true });

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