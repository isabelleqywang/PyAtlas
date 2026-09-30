import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'
import mock from './mock.json'
import { aggregateEdges, defaultExpanded, visibleNodes } from './graphLogic.js'

cytoscape.use(dagre)

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

const LAYOUT = {
  name: 'dagre',
  rankDir: 'TB',
  nodeSep: 28,
  rankSep: 48,
  padding: 40,
  nodeDimensionsIncludeLabels: true,
}
const ANIMATION_MS = 400

// Walk up the parent chain until we find an ancestor that was on screen before the update
function findPrevPosition(id, parentOf, prevPos) {
  for (let p = parentOf.get(id); p; p = parentOf.get(p)) {
    if (prevPos.has(p)) return prevPos.get(p)
  }
  return null
}

export default function Graph() {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const firstRun = useRef(true)
  const [expanded, setExpanded] = useState(() => defaultExpanded(mock.nodes))

  // Create the Cytoscape instance once
  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      style,
      minZoom: 0.2,
      maxZoom: 1.5,
    })
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
    if (import.meta.env.DEV) window.__cy = cy
    return () => cy.destroy()
  }, [])

  // When `expanded` changes: diff the visible nodes and aggregated edges against
  // what is on screen, so untouched nodes keep their place and animate to the new layout
  useEffect(() => {
    const cy = cyRef.current
    const parentOf = new Map(mock.nodes.map((n) => [n.id, n.parent ?? null]))
    const prevPos = new Map(cy.nodes().map((n) => [n.id(), { ...n.position() }]))

    const nodes = visibleNodes(mock.nodes, expanded)
    const edges = aggregateEdges(mock.edges, mock.nodes, expanded).map((e) => ({
      ...e,
      id: `${e.source}->${e.target}`,
    }))
    const nodeIds = new Set(nodes.map((n) => n.id))
    const edgeIds = new Set(edges.map((e) => e.id))

    cy.batch(() => {
      cy.edges().filter((e) => !edgeIds.has(e.id())).remove()
      cy.nodes().filter((n) => !nodeIds.has(n.id())).remove()

      // Parents first, so children can attach to them
      const sorted = [...nodes].sort((a, b) => a.id.split('/').length - b.id.split('/').length)
      for (const n of sorted) {
        const data = {
          label: n.id.split('/').pop(),
          type: n.type,
          depth: n.id.split('/').length,
          collapsed: n.type === 'folder' && !expanded.has(n.id),
        }
        const existing = cy.getElementById(n.id)
        if (existing.nonempty()) {
          existing.data(data)
          // A folder that just collapsed is a plain node again: keep it where its box was
          if (data.collapsed && prevPos.has(n.id)) existing.position(prevPos.get(n.id))
        } else {
          const origin = findPrevPosition(n.id, parentOf, prevPos)
          cy.add({
            data: { id: n.id, parent: n.parent ?? undefined, ...data },
            ...(origin && { position: { ...origin } }),
          })
        }
      }
      for (const e of edges) {
        const existing = cy.getElementById(e.id)
        if (existing.nonempty()) existing.data('count', e.count)
        else cy.add({ data: e })
      }
    })

    const animate = !firstRun.current
    firstRun.current = false
    cy.layout({
      ...LAYOUT,
      fit: true,
      animate,
      animationDuration: ANIMATION_MS,
      animationEasing: 'ease-in-out',
    }).run()
  }, [expanded])

  return <div ref={containerRef} className="graph" />
}
