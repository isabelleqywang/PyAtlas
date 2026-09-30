// 折叠/展开的核心逻辑：纯函数，不依赖 React 或 Cytoscape，方便测试和讲解。

// 返回 id 的所有祖先，顺序从最顶层到直接父级
function ancestorsOf(id, parentOf) {
  const chain = []
  for (let p = parentOf.get(id); p; p = parentOf.get(p)) chain.unshift(p)
  return chain
}

export function buildParentMap(nodes) {
  return new Map(nodes.map((n) => [n.id, n.parent ?? null]))
}

// 默认只展开最顶层（没有 parent 的文件夹）
export function defaultExpanded(nodes) {
  return new Set(nodes.filter((n) => n.type === 'folder' && !n.parent).map((n) => n.id))
}

export function allFolders(nodes) {
  return new Set(nodes.filter((n) => n.type === 'folder').map((n) => n.id))
}

// 节点"代表谁"：从最顶层祖先往下找，遇到第一个被折叠的文件夹就由它代表；
// 找不到说明自己可见，代表自己
export function representative(id, parentOf, expanded) {
  for (const a of ancestorsOf(id, parentOf)) {
    if (!expanded.has(a)) return a
  }
  return id
}

// 当前应该显示哪些节点：所有祖先都展开的节点
export function visibleNodes(nodes, expanded) {
  const parentOf = buildParentMap(nodes)
  return nodes.filter((n) => representative(n.id, parentOf, expanded) === n.id)
}

// 边聚合：把每条边的两端换成各自的"代表"，丢掉两端相同的边（折叠到同一个文件夹内部），
// 同一对 (source, target) 的多条边合并成一条，count 记录合并了几条
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
