import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import mock from './mock.json'
import { aggregateEdges, allFolders, defaultExpanded, visibleNodes } from './graphLogic.js'

const style = [
  {
    selector: 'node[type = "folder"]',
    style: {
      shape: 'round-rectangle',
      'background-color': '#eceef1',
      'border-width': 0,
      padding: '18px',
      label: 'data(label)',
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -4,
      color: '#6b7280',
      'font-size': 13,
    },
  },
  { selector: 'node[type = "folder"][depth >= 3]', style: { 'background-color': '#dfe2e7' } },
  {
    selector: 'node[?collapsed]',
    style: {
      width: 'label',
      height: 30,
      padding: '10px',
      'text-valign': 'center',
      'text-margin-y': 0,
      color: '#4b5563',
      'font-size': 12,
    },
  },
  {
    selector: 'node[type = "file"]',
    style: {
      shape: 'round-rectangle',
      'background-color': '#ffffff',
      'border-width': 1,
      'border-color': '#d1d5db',
      width: 'label',
      height: 26,
      padding: '8px',
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      color: '#374151',
      'font-size': 11,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 'mapData(count, 1, 10, 1.2, 6)',
      'line-color': '#cfd4da',
      'target-arrow-color': '#cfd4da',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 0.9,
      'curve-style': 'bezier',
    },
  },
]

export default function Graph() {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const [expanded, setExpanded] = useState(() => defaultExpanded(mock.nodes))

  // 只创建一次 Cytoscape 实例
  useEffect(() => {
    const cy = cytoscape({ container: containerRef.current, style, maxZoom: 1.5 })
    cy.on('tap', 'node[type = "folder"]', (evt) => {
      const id = evt.target.id()
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    })
    cyRef.current = cy
    return () => cy.destroy()
  }, [])

  // expanded 变化后重新计算可见节点和聚合边，并重新布局
  useEffect(() => {
    const cy = cyRef.current
    const nodes = visibleNodes(mock.nodes, expanded).map((n) => ({
      data: {
        id: n.id,
        label: n.id.split('/').pop(),
        type: n.type,
        parent: n.parent ?? undefined,
        depth: n.id.split('/').length,
        collapsed: n.type === 'folder' && !expanded.has(n.id),
      },
    }))
    const edges = aggregateEdges(mock.edges, mock.nodes, expanded).map((e) => ({
      data: { id: `${e.source}->${e.target}`, ...e },
    }))
    cy.batch(() => {
      cy.elements().remove()
      cy.add([...nodes, ...edges])
    })
    cy.layout({ name: 'cose', animate: false, nodeDimensionsIncludeLabels: true }).run()
  }, [expanded])

  return (
    <div className="graph-wrap">
      <div ref={containerRef} className="graph" />
      <div className="graph-toolbar">
        <button onClick={() => setExpanded(allFolders(mock.nodes))}>全部展开</button>
        <button onClick={() => setExpanded(new Set())}>全部折叠</button>
      </div>
    </div>
  )
}
