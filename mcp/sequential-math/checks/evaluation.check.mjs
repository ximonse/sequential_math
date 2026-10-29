import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

test('ten read-only evaluation answer keys agree with the real synthetic MCP API', async () => {
  const client = new Client({ name: 'evaluation-answer-key-check', version: '1' })
  const entry = fileURLToPath(new URL('../src/stdio.mjs', import.meta.url))
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry, '--demo'], stderr: 'pipe' }))
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args })
    assert.ok(!result.isError, JSON.stringify(result.content))
    return result.structuredContent.data
  }
  try {
    const meta = await call('math_get_capabilities')
    const search = query => call('math_find_pupils', { query })
    const target = async name => ({ studentId: (await search(name)).pupils[0].studentId,
      classId: meta.demo.classId, from: meta.demo.from, to: meta.demo.to })
    const one = await target('MCP Demo One'), two = await target('MCP Demo Two')
    const observed = [meta.reportWritesEnabled, meta.assignmentPublication,
      (await search('MCP Demo')).total, (await search('MCP Demo Other')).total,
      (await call('math_get_pupil_evidence', one)).total, (await call('math_get_pupil_evidence', two)).total,
      (await call('math_get_pupil_evidence', one)).coverage.practice.completeness,
      (await call('math_preview_analysis', one)).counts.correct, (await call('math_preview_analysis', two)).counts.incorrect,
      (await call('math_get_analysis_history', { studentId: one.studentId, classId: one.classId })).total]
    const xml = await readFile(new URL('../evaluation.xml', import.meta.url), 'utf8')
    const expected = [...xml.matchAll(/<answer>([^<]+)<\/answer>/gu)].map(match => match[1])
    assert.equal(expected.length, 10)
    assert.deepEqual(observed.map(String), expected)
  } finally { await client.close() }
})
