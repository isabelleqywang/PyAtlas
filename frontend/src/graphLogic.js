// Core collapse/expand logic: pure functions, no React or Cytoscape, easy to test and explain.

// All ancestors of `id`, ordered from the top-level folder down to the direct parent
function ancestorsOf(id, parentOf) {
  const chain = []
  for (let p = parentOf.get(id); p; p = parentOf.get(p)) chain.unshift(p)
  return chain
}

export function buildParentMap(nodes) {
  return new Map(nodes.map((n) => [n.id, n.parent ?? null]))
}

// By default only the top level (folders without a parent) is expanded
export function defaultExpanded(nodes) {
  return new Set(nodes.filter((n) => n.type === 'folder' && !n.parent).map((n) => n.id))
}

export function allFolders(nodes) {
  return new Set(nodes.filter((n) => n.type === 'folder').map((n) => n.id))
}

// Who stands in for a node on screen: walk down from the top-level ancestor, and the first
// collapsed folder represents it. If there is none, the node is visible and represents itself.
export function representative(id, parentOf, expanded) {
  for (const a of ancestorsOf(id, parentOf)) {
    if (!expanded.has(a)) return a
  }
  return id
}

// Which nodes should be visible: those whose ancestors are all expanded
export function visibleNodes(nodes, expanded) {
  const parentOf = buildParentMap(nodes)
  return nodes.filter((n) => representative(n.id, parentOf, expanded) === n.id)
}

// Edge aggregation: replace both ends of every edge with its representative, drop edges whose
// ends are the same (hidden inside one collapsed folder), and merge parallel edges between the
// same (source, target) pair into one, with `count` recording how many were merged.
export function aggregateEdges(edges, nodes, expanded) {
  const parentOf = buildParentMap(nodes)
  const merged = new Map()
  for (const e of edges) {
    const source = representative(e.source, parentOf, expanded)
    const target = representative(e.target, parentOf, expanded)
    if (source === target) continue
    const key = `${source}->${target}`
    const hit = merged.get(key)
    if (hit) hit.count += 1
    else merged.set(key, { source, target, count: 1 })
  }
  return [...merged.values()]
}
