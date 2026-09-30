import './App.css'
import Graph from './Graph.jsx'

export default function App() {
  return (
    <div className="app">
      <h1 className="title">PyAtlas</h1>
      <div className="layout">
        <main className="graph-pane">
          <Graph />
        </main>
        <aside className="detail-pane">详情</aside>
      </div>
    </div>
  )
}
