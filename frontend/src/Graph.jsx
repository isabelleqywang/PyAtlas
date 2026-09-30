import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import mock from './mock.json'

export default function Graph() {
  const containerRef = useRef(null)

  useEffect(() => {
    const elements = [
      ...mock.nodes.map((n) => ({
        data: { id: n.id, label: n.id.split('/').pop() },
      })),
      ...mock.edges.map((e) => ({
        data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target },
      })),
    ]
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: 'grid' },
      style: [{ selector: 'node', style: { label: 'data(label)' } }],
    })
    return () => cy.destroy()
  }, [])

  return <div ref={containerRef} className="graph" />
}
