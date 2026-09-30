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

test('全部折叠：只剩最顶层文件夹，没有边', () => {
  const expanded = new Set()
  assert.deepEqual(visibleNodes(nodes, expanded).map((n) => n.id), ['src'])
  assert.equal(aggregateEdges(edges, nodes, expanded).length, 0)
})

test('默认：只展开最顶层，显示 src 和 src/demo', () => {
  const expanded = defaultExpanded(nodes)
  assert.deepEqual(
    visibleNodes(nodes, expanded).map((n) => n.id).sort(),
    ['src', 'src/demo'],
  )
})

test('全部展开：25 个节点，30 条边，每条边 count 为 1', () => {
  const expanded = allFolders(nodes)
  assert.equal(count(expanded), 25)
  const agg = aggregateEdges(edges, nodes, expanded)
  assert.equal(agg.length, 30)
  assert.ok(agg.every((e) => e.count === 1))
})

test('只展开一个（src + src/demo + src/demo/core）', () => {
  const expanded = new Set(['src', 'src/demo', 'src/demo/core'])
  const ids = visibleNodes(nodes, expanded).map((n) => n.id)
  assert.ok(ids.includes('src/demo/core/engine.py'))
  assert.ok(!ids.includes('src/demo/web/routes.py'))
  assert.ok(ids.includes('src/demo/web'))
  const agg = aggregateEdges(edges, nodes, expanded)
  // web 里的 routes、views、forms 都 import core/models.py -> 合并成一条，count 为 3
  const e = agg.find((x) => x.source === 'src/demo/web' && x.target === 'src/demo/core/models.py')
  assert.equal(e.count, 3)
  // 折叠进同一文件夹内部的边被丢弃
  assert.ok(agg.every((x) => x.source !== x.target))
  // 边的两端必须都是可见节点
  const visible = new Set(ids)
  assert.ok(agg.every((x) => visible.has(x.source) && visible.has(x.target)))
})

test('representative：被折叠的祖先代表自己的后代', () => {
  const parentOf = buildParentMap(nodes)
  const expanded = new Set(['src', 'src/demo'])
  assert.equal(representative('src/demo/web/forms.py', parentOf, expanded), 'src/demo/web')
  assert.equal(representative('src/demo/app.py', parentOf, expanded), 'src/demo/app.py')
})
