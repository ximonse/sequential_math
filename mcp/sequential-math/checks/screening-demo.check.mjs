import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

test('opt-in screening demo reads authenticated real API originals, empty answer work and correct contrast without report writes', async () => {
  const client = new Client({ name: 'screening-demo-check', version: '1' })
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../src/stdio.mjs', import.meta.url)), '--demo-screening'], stderr: 'pipe' })
  await client.connect(transport)
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args })
    assert.ok(!result.isError, JSON.stringify(result.content))
    return result.structuredContent.data
  }
  try {
    const meta = await call('math_get_capabilities')
    assert.equal(meta.demo.screening, true)
    assert.equal(meta.reportWritesEnabled, false)
    assert.equal(meta.assignmentPublication, false)
    const found = await call('math_find_pupils', { query: 'MCP Demo One' })
    const target = { studentId: found.pupils[0].studentId, classId: meta.demo.classId,
      from: meta.demo.from, to: meta.demo.to, source: 'screening' }
    const evidence = await call('math_get_pupil_evidence', target)
    assert.equal(evidence.total, 2)
    const empty = evidence.entries.find(e => e.question.taskId === 'sub-through-zero-001')
    const correct = evidence.entries.find(e => e.question.taskId === 'sub-no-exchange-001')
    assert.equal(empty.answer.studentAnswer, null)
    assert.equal(correct.answer.studentAnswer, '533')
    assert.equal(correct.answer.status, 'correct')
    const original = await call('math_get_notebook', { ...target, ref: empty.ref, snapshotRevision: evidence.snapshotRevision })
    assert.equal(original.notebook.status.workWithoutAnswer, true)
    assert.match(original.notebook.text, /376|3.*7.*6/u)
    assert.match(original.notebook.text, /10.*struck/u)
    assert.doesNotMatch(JSON.stringify(original), /correctAnswer|password|teacherName/u)
    assert.equal((await call('math_get_analysis_history', { classId: target.classId, studentId: target.studentId })).total, 0)
  } finally { await client.close() }
})
