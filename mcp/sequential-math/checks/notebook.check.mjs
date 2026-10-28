import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile, mkdir } from 'node:fs/promises'
import { Client } from '@modelcontextprotocol/client'
import { createMathServer } from '../src/server.mjs'
import { createDiagnosticGrid, recordDiagnosticGridEvent as record } from '../../../src/domains/arithmetic/diagnosticGridModel.js'
import { diagnosticNotebookExport } from '../../../src/domains/arithmetic/diagnosticNotebookExport.js'
import { BridgeError } from '../src/api-client.mjs'

function transports() {
  const pair = [{}, {}]
  pair.forEach((side, index) => Object.assign(side, { start: async () => {},
    send: async message => { queueMicrotask(() => pair[1 - index].onmessage?.(message)) },
    close: async () => { side.onclose?.() } }))
  return pair
}
function original() {
  let grid = createDiagnosticGrid({ attemptId: 'EXPORT', taskId: 'T', taskVersion: 1 })
  const write = (row, column, digit, layer = 'main') => {
    grid = record(grid, { type: 'write', position: { row, column }, layer, before: grid.cells[`${row}:${column}`]?.[layer] || '', after: digit }, 1000)
  }
  ;['4', '0', '2'].forEach((digit, index) => write(1, index + 2, digit))
  write(2, 1, '−'); ['1', '7', '8'].forEach((digit, index) => write(2, index + 2, digit))
  ;['3', '7', '6'].forEach((digit, index) => write(3, index + 2, digit))
  write(1, 3, '10', 'note')
  grid = record(grid, { type: 'cross_out', position: { row: 1, column: 3 }, before: false, after: true }, 1001)
  grid = record(grid, { type: 'line_add', axis: 'horizontal', placement: 'grid-border',
    from: { row: 2, column: 1 }, to: { row: 2, column: 4 } }, 1002)
  grid = record(grid, { type: 'drawing_stroke', erasing: false, color: 'magenta', points: [[0.1, 0.1], [0.4, 0.4]] }, 1003)
  grid = record(grid, { type: 'drawing_stroke', erasing: true, points: [[0.25, 0.2], [0.25, 0.3]] }, 1004)
  return grid
}
test('MCP notebook text and PNG preserve original work, cropped cell geometry and separate drawing without secrets or writes', async () => {
  const snapshot = original(), before = JSON.stringify(snapshot), ref = 'a'.repeat(64), revision = 'b'.repeat(64)
  let denied = false, revokeAfterRead = false, calls = []
  const server = createMathServer({ getApi: async () => ({ request: async (path, options) => {
    assert.equal(options.body, undefined)
    calls.push(path)
    if (denied) throw new BridgeError('access_denied', 'Access revoked')
    if (revokeAfterRead) denied = true
    return { schemaVersion: 1, ref, snapshotRevision: revision, reference: { attemptId: snapshot.attemptId }, notebook: diagnosticNotebookExport(snapshot) }
  } }) })
  const client = new Client({ name: 'notebook-client', version: '1' })
  const [left, right] = transports()
  await server.connect(left); await client.connect(right)
  const args = { studentId: 'P', classId: 'C', from: '2026-10-27', to: '2026-10-27', source: 'screening', ref, snapshotRevision: revision }
  try {
    const text = await client.callTool({ name: 'math_get_notebook', arguments: args })
    assert.ok(!text.isError)
    assert.equal(text.structuredContent.data.notebook.status.workWithoutAnswer, true)
    assert.match(text.structuredContent.data.notebook.text, /10.*struck/u)
    assert.equal(text.structuredContent.data.notebook.workspace, undefined)
    assert.equal(text.content.length, 1)
    const image = await client.callTool({ name: 'math_get_notebook', arguments: { ...args, format: 'png' } })
    assert.ok(!image.isError, JSON.stringify(image.content))
    const data = image.structuredContent.data
    assert.equal(data.layout.rows, 3); assert.equal(data.layout.columns, 4)
    assert.equal(data.layout.cellWidth, 36)
    assert.ok(Math.abs(data.layout.cellHeight / data.layout.cellWidth - 1.6) < 0.002)
    assert.deepEqual(data.images.map(img => img.kind), ['grid', 'drawing'])
    assert.equal(image.content.filter(block => block.type === 'image').length, 2)
    assert.equal(Buffer.from(image.content[2].data, 'base64').readUInt32BE(16), data.images[1].width)
    const png = Buffer.from(image.content[1].data, 'base64')
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), data.images[0].width)
    assert.equal(png.readUInt32BE(20), data.images[0].height)
    await mkdir(new URL('../../../robots/test-results/notebook-export/', import.meta.url), { recursive: true })
    await writeFile(new URL('../../../robots/test-results/notebook-export/original.png', import.meta.url), png)
    await writeFile(new URL('../../../robots/test-results/notebook-export/drawing.png', import.meta.url), Buffer.from(image.content[2].data, 'base64'))
    assert.ok(calls.every(path => path.includes('format=notebook') && path.includes(`snapshotRevision=${revision}`)))
    assert.equal(JSON.stringify(snapshot), before)
    assert.doesNotMatch(JSON.stringify(data), /correctAnswer|password|facit|teacherName/u)
    denied = true
    const blocked = await client.callTool({ name: 'math_get_notebook', arguments: { ...args, format: 'png' } })
    assert.equal(blocked.isError, true)
    assert.equal(blocked.content.filter(block => block.type === 'image').length, 0)
    denied = false; revokeAfterRead = true
    const changed = await client.callTool({ name: 'math_get_notebook', arguments: { ...args, format: 'png' } })
    assert.equal(changed.isError, true)
    assert.equal(changed.structuredContent.data.error.code, 'access_denied')
    assert.equal(changed.content.filter(block => block.type === 'image').length, 0)
  } finally { await client.close(); await server.close() }
})
