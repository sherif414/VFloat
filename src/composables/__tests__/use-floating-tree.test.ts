import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import type { AnchorElement, FloatingElement } from "@/composables/positioning"
import { createTree, createTreeNode, useFloatingTree } from "@/composables/positioning"

const createMockElement = (tagName = "div", attributes: Record<string, any> = {}) => {
  const element = document.createElement(tagName)
  Object.assign(element, attributes)
  return element
}

describe("createTreeNode", () => {
  it("initializes with data, id, and flags", () => {
    const root = createTreeNode({ name: "root" }, null, { id: "root" }, true)
    expect(root.id).toBe("root")
    expect(root.data).toEqual({ name: "root" })
    expect(root.isRoot).toBe(true)
    expect(root.isLeaf.value).toBe(true)
    expect(root.parent.value).toBe(null)
    expect(root.children.value.length).toBe(0)
    expect(root.getPath().map((n) => n.id)).toEqual(["root"]) 
    expect(root.findChild(() => true)).toBe(null)
    const self = root.findDescendant((n) => n.id === "root")
    expect(self?.id).toBe("root")
  })

  it("supports children operations and traversal helpers", () => {
    const parent = createTreeNode({ name: "parent" }, null, { id: "p" }, true)
    const child = createTreeNode({ name: "child" }, parent, { id: "c" })

    parent.addChild(child)

    expect(parent.isLeaf.value).toBe(false)
    expect(parent.children.value.map((n) => n.id)).toEqual(["c"])
    expect(child.isDescendantOf(parent)).toBe(true)
    expect(child.getPath().map((n) => n.id)).toEqual(["p", "c"])

    const foundChild = parent.findChild((n) => n.id === "c")
    expect(foundChild?.id).toBe("c")

    const foundDesc = parent.findDescendant((n) => n.id === "c")
    expect(foundDesc?.id).toBe("c")

    const removed = parent._removeChildInstance(child)
    expect(removed).toBe(true)
    expect(parent.children.value.length).toBe(0)
    expect(child.parent.value).toBe(null)
    expect(child.isDescendantOf(parent)).toBe(false)
  })
})

describe("createTree", () => {
  it("adds root and children; finds by id", () => {
    const tree = createTree<{ name: string }>()
    const root = tree.addNode({ name: "root" }, null, { id: "root" })!
    expect(tree.root?.id).toBe("root")
    expect(tree.findNodeById("root")?.id).toBe("root")
    expect(tree.nodeMap.has("root")).toBe(true)

    const child = tree.addNode({ name: "child" }, "root", { id: "child" })!
    expect(child.parent.value?.id).toBe("root")
    expect(tree.findNodeById("child")?.id).toBe("child")
    expect(tree.root?.children.value.map((n) => n.id)).toEqual(["child"])
  })

  it("removeNode with recursive strategy removes descendants", () => {
    const tree = createTree<{ name: string }>()
    const root = tree.addNode({ name: "root" }, null, { id: "root" })!
    const child = tree.addNode({ name: "child" }, root.id, { id: "child" })!
    tree.addNode({ name: "grand" }, child.id, { id: "grand" })!

    const ok = tree.removeNode("child", "recursive")
    expect(ok).toBe(true)
    expect(tree.findNodeById("child")).toBe(null)
    expect(tree.findNodeById("grand")).toBe(null)
    expect(root.children.value.length).toBe(0)
  })

  it("removeNode with orphan strategy keeps descendants and orphans them", () => {
    const tree = createTree<{ name: string }>()
    const root = tree.addNode({ name: "root" }, null, { id: "root" })!
    const child = tree.addNode({ name: "child" }, root.id, { id: "child" })!
    const grand = tree.addNode({ name: "grand" }, child.id, { id: "grand" })!

    const ok = tree.removeNode("child", "orphan")
    expect(ok).toBe(true)
    expect(tree.findNodeById("child")).toBe(null)
    expect(tree.findNodeById("grand")?.id).toBe("grand")
    expect(grand.parent.value).toBe(null)
    expect(root.children.value.length).toBe(0)
  })

  it("moveNode supports valid moves and guards invalid ones", () => {
    const tree = createTree<{ name: string }>()
    const root = tree.addNode({ name: "root" }, null, { id: "root" })!
    const a = tree.addNode({ name: "a" }, root.id, { id: "a" })!
    const b = tree.addNode({ name: "b" }, root.id, { id: "b" })!

    const ok1 = tree.moveNode("a", "b")
    expect(ok1).toBe(true)
    expect(a.parent.value?.id).toBe("b")
    expect(b.children.value.map((n) => n.id)).toEqual(["a"])

    const bad1 = tree.moveNode("root", "b")
    const bad2 = tree.moveNode("a", "a")
    const bad3 = tree.moveNode("b", "a") // would make b descendant of itself via a
    const bad4 = tree.moveNode("a", "missing")
    expect(bad1).toBe(false)
    expect(bad2).toBe(false)
    expect(bad3).toBe(false)
    expect(bad4).toBe(false)
  })

  it("traverse returns nodes in DFS and BFS order", () => {
    const tree = createTree<{ name: string }>()
    const root = tree.addNode({ name: "root" }, null, { id: "root" })!
    const c1 = tree.addNode({ name: "c1" }, root.id, { id: "c1" })!
    tree.addNode({ name: "gc1" }, c1.id, { id: "gc1" })!
    tree.addNode({ name: "c2" }, root.id, { id: "c2" })!

    const dfs = tree.traverse("dfs", root).map((n) => n.id)
    expect(dfs).toEqual(["root", "c1", "gc1", "c2"]) 

    const bfs = tree.traverse("bfs", root).map((n) => n.id)
    expect(bfs).toEqual(["root", "c1", "c2", "gc1"]) 
  })

  it("dispose clears node map", () => {
    const tree = createTree<{ name: string }>()
    tree.addNode({ name: "root" }, null, { id: "root" })
    tree.dispose()
    expect(Array.from(tree.nodeMap.values()).length).toBe(0)
    expect(tree.findNodeById("root")).toBe(null)
  })
})

describe("useFloatingTree", () => {
  let anchorEl: HTMLElement
  let floatingEl: HTMLElement

  beforeEach(() => {
    anchorEl = createMockElement("button", {
      getBoundingClientRect: () => ({
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        top: 10,
        left: 10,
        right: 110,
        bottom: 60,
      }),
    })
    floatingEl = createMockElement("div", {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        top: 0,
        left: 0,
        right: 200,
        bottom: 100,
      }),
    })
    document.body.appendChild(anchorEl)
    document.body.appendChild(floatingEl)
  })

  afterEach(() => {
    document.body.innerHTML = ""
    vi.clearAllMocks()
  })

  const makeRefs = () => {
    const anchorRef = ref<AnchorElement>(anchorEl)
    const floatingRef = ref<FloatingElement>(floatingEl)
    return { anchorRef, floatingRef }
  }

  it("addNode creates root and child nodes with contexts and ids", () => {
    const tree = useFloatingTree()
    const { anchorRef, floatingRef } = makeRefs()
    const rootOpen = ref(false)

    const root = tree.addNode(anchorRef, floatingRef, { open: rootOpen })
    expect(root).not.toBeNull()
    expect(tree.root?.id).toBe(root!.id)
    expect(root!.data.id).toBe(root!.id)
    expect(root!.data.refs.anchorEl).toBeDefined()
    expect(root!.data.refs.floatingEl).toBeDefined()

    const { anchorRef: a2, floatingRef: f2 } = makeRefs()
    const child = tree.addNode(a2, f2, { parentId: root!.id, open: ref(false) })
    expect(child?.parent.value?.id).toBe(root!.id)
    expect(tree.findNodeById(child!.id)?.id).toBe(child!.id)
  })

  it("getAllOpenNodes returns only open nodes", () => {
    const tree = useFloatingTree()
    const { anchorRef, floatingRef } = makeRefs()
    const root = tree.addNode(anchorRef, floatingRef, { open: ref(true) })!

    const { anchorRef: a2, floatingRef: f2 } = makeRefs()
    const childClosed = tree.addNode(a2, f2, { parentId: root.id, open: ref(false) })!

    const { anchorRef: a3, floatingRef: f3 } = makeRefs()
    const childOpen = tree.addNode(a3, f3, { parentId: root.id, open: ref(true) })!

    const openNodes = tree.getAllOpenNodes().map((n) => n.id)
    expect(openNodes).toEqual([root.id, childOpen.id])
    expect(openNodes).not.toContain(childClosed.id)
  })

  it("getDeepestOpenNode returns deepest open node", () => {
    const tree = useFloatingTree()
    const { anchorRef, floatingRef } = makeRefs()
    const root = tree.addNode(anchorRef, floatingRef, { open: ref(true) })!

    const { anchorRef: a2, floatingRef: f2 } = makeRefs()
    const child = tree.addNode(a2, f2, { parentId: root.id, open: ref(true) })!

    const { anchorRef: a3, floatingRef: f3 } = makeRefs()
    const grand = tree.addNode(a3, f3, { parentId: child.id, open: ref(true) })!

    expect(tree.getDeepestOpenNode()?.id).toBe(grand.id)

    // Close deepest and ensure next deepest is returned
    grand.data.setOpen(false)
    expect(tree.getDeepestOpenNode()?.id).toBe(child.id)
  })

  it("applyToNodes supports relationship filters and applyToMatching toggle", () => {
    const tree = useFloatingTree()

    const mk = () => makeRefs()
    const A = tree.addNode(mk().anchorRef, mk().floatingRef, { open: ref(false) })!
    const B = tree.addNode(mk().anchorRef, mk().floatingRef, { parentId: A.id, open: ref(false) })!
    const C = tree.addNode(mk().anchorRef, mk().floatingRef, { parentId: A.id, open: ref(false) })!
    const D = tree.addNode(mk().anchorRef, mk().floatingRef, { parentId: B.id, open: ref(false) })!
    const E = tree.addNode(mk().anchorRef, mk().floatingRef, { parentId: B.id, open: ref(false) })!
    const F = tree.addNode(mk().anchorRef, mk().floatingRef, { parentId: C.id, open: ref(false) })!

    const collect = () => {
      const hits: string[] = []
      return { hits, cb: (n: typeof A) => hits.push(n.id) }
    }

    let { hits, cb } = collect()
    tree.applyToNodes(B.id, cb, { relationship: "ancestors-only" })
    expect(new Set(hits)).toEqual(new Set([A.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "siblings-only" })
    expect(new Set(hits)).toEqual(new Set([C.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "descendants-only" })
    expect(new Set(hits)).toEqual(new Set([D.id, E.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "children-only" })
    expect(new Set(hits)).toEqual(new Set([D.id, E.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "self-and-ancestors" })
    expect(new Set(hits)).toEqual(new Set([A.id, B.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "self-and-children" })
    expect(new Set(hits)).toEqual(new Set([B.id, D.id, E.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "self-and-descendants" })
    expect(new Set(hits)).toEqual(new Set([B.id, D.id, E.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "self-and-siblings" })
    expect(new Set(hits)).toEqual(new Set([B.id, C.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "self-ancestors-and-children" })
    expect(new Set(hits)).toEqual(new Set([A.id, B.id, D.id, E.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "full-branch" })
    expect(new Set(hits)).toEqual(new Set([A.id, B.id, D.id, E.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "all-except-branch" })
    expect(new Set(hits)).toEqual(new Set([C.id, F.id]))

    ;({ hits, cb } = collect())
    tree.applyToNodes(B.id, cb, { relationship: "children-only", applyToMatching: false })
    expect(new Set(hits)).toEqual(new Set([A.id, B.id, C.id, F.id]))

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    ;({ hits, cb } = collect())
    // @ts-expect-error testing unknown relationship branch
    tree.applyToNodes(B.id, cb, { relationship: "unknown" })
    expect(hits.length).toBe(0)
    warnSpy.mockRestore()
  })

  it("closing a parent cascades close to descendants with reason 'tree-ancestor-close'", async () => {
    const tree = useFloatingTree()

    const mk = () => makeRefs()
    const parentOnChange = vi.fn()
    const childOnChange = vi.fn()

    const parent = tree.addNode(mk().anchorRef, mk().floatingRef, {
      open: ref(true),
      onOpenChange: parentOnChange,
    })!
    const child = tree.addNode(mk().anchorRef, mk().floatingRef, {
      parentId: parent.id,
      open: ref(true),
      onOpenChange: childOnChange,
    })!

    expect(parent.data.open.value).toBe(true)
    expect(child.data.open.value).toBe(true)

    parent.data.setOpen(false, "programmatic")
    await nextTick()

    expect(child.data.open.value).toBe(false)
    expect(childOnChange).toHaveBeenCalled()
    const last = childOnChange.mock.calls.at(-1)
    expect(last?.[0]).toBe(false)
    expect(last?.[1]).toBe("tree-ancestor-close")
  })

  it("adding a non-root with missing parent before root exists fails gracefully", () => {
    const tree = useFloatingTree()
    const { anchorRef, floatingRef } = makeRefs()

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const node = tree.addNode(anchorRef, floatingRef, { parentId: "missing" })
    expect(node).toBeNull()
    expect(tree.root).toBeNull()
    errorSpy.mockRestore()
  })
})
