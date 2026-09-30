import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  aggregateEdges,
  allFolders,
  defaultExpanded,
  representative,
  buildParentMap,
  visibleNodes,
} from './graphLogic.js'

const { nodes, edges } = JSON.parse(readFileSync(new URL('./mock.json', import.meta.url)))
const count = (expanded) => visibleNodes(nodes, expanded).length

test('all collapsed: only the top folder, no edges', () => {
  const expanded = new Set()
  assert.deepEqual(visibleNodes(nodes, expanded).map((n) => n.id), ['src'])
  assert.equal(aggregateEdges(edges, nodes, expanded).length, 0)
})

test('default: only the top level expanded, shows src and src/demo', () => {
  const expanded = defaultExpanded(nodes)
  assert.deepEqual(
    visibleNodes(nodes, expanded).map((n) => n.id).sort(),
    ['src', 'src/demo'],
  )
})

test('all expanded: 25 nodes, 30 edges, every count is 1', () => {
  const expanded = allFolders(nodes)
  assert.equal(count(expanded), 25)
  const agg = aggregateEdges(edges, nodes, expanded)
  assert.equal(agg.length, 30)
  assert.ok(agg.every((e) => e.count === 1))
})

test('one folder expanded (src + src/demo + src/demo/core)', () => {
  const expanded = new Set(['src', 'src/demo', 'src/demo/core'])
  const ids = visibleNodes(nodes, expanded).map((n) => n.id)
  assert.ok(ids.includes('src/demo/core/engine.py'))
  assert.ok(!ids.includes('src/demo/web/routes.py'))
  assert.ok(ids.includes('src/demo/web'))
  const agg = aggregateEdges(edges, nodes, expanded)
  // routes, views and forms in web all import core/models.py -> merged into one edge, count 3
  const e = agg.find((x) => x.source === 'src/demo/web' && x.target === 'src/demo/core/models.py')
  assert.equal(e.count, 3)
  // edges hidden inside one collapsed folder are dropped
  assert.ok(agg.every((x) => x.source !== x.target))
  // both ends of every edge must be visible nodes
  const visible = new Set(ids)
  assert.ok(agg.every((x) => visible.has(x.source) && visible.has(x.target)))
})

test('representative: a collapsed ancestor stands in for its descendants', () => {
  const parentOf = buildParentMap(nodes)
  const expanded = new Set(['src', 'src/demo'])
  assert.equal(representative('src/demo/web/forms.py', parentOf, expanded), 'src/demo/web')
  assert.equal(representative('src/demo/app.py', parentOf, expanded), 'src/demo/app.py')
})
