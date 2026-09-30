import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import mock from './mock.json'

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
      width: 1.2,
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

  useEffect(() => {
    const elements = [
      ...mock.nodes.map((n) => ({
        data: { id: n.id, label: n.id.split('/').pop(), type: n.type, parent: n.parent, depth: n.id.split('/').length },
      })),
      ...mock.edges.map((e) => ({
        data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target },
      })),
    ]
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: 'cose', animate: false, nodeDimensionsIncludeLabels: true },
      style,
    })
    return () => cy.destroy()
  }, [])

  return <div ref={containerRef} className="graph" />
}
