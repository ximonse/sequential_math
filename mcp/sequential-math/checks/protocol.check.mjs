import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { launchDemo } from '../src/demo.mjs'

const entry = fileURLToPath(new URL('../src/stdio.mjs', import.meta.url))
async function connect(writes = false) {
  const client = new Client({ name: 'synthetic-integration-client', version: '1.0.0' })
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry, '--demo', ...(writes ? ['--allow-report-writes'] : [])], stderr: 'pipe' })
  await client.connect(transport)
  return client
}
async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args })
  assert.equal(Boolean(result.isError), false, JSON.stringify(result.content))
  return result.structuredContent.data
}
let reader, writer, target, meta
before(async () => {
  reader = await connect()
  meta = await call(reader, 'math_get_capabilities')
  const found = await call(reader, 'math_find_pupils', { query: 'MCP Demo One' })
  target = { studentId: found.pupils[0].studentId, classId: meta.demo.classId, from: meta.demo.from, to: meta.demo.to }
})
after(async () => { await reader?.close(); await writer?.close() })

test('SDK client discovers bounded read tools, prompt and the closed assignment/check-in boundary', async () => {
  const tools = (await reader.listTools()).tools
  assert.equal(tools.length, 8)
  assert.equal(tools.some(t => /save|publish|assign|delete/u.test(t.name)), false)
  assert.equal(tools.every(t => t.annotations.readOnlyHint), true)
  assert.equal(meta.assignmentPublication, false)
  assert.equal(meta.teacherCheckInWrites, false)
  assert.equal(meta.dataMode, 'synthetic')
  const prompt = await reader.getPrompt({ name: 'math_pupil_analysis' })
  assert.match(prompt.messages[0].content.text, /supportRefs/u)
  assert.doesNotMatch(JSON.stringify(prompt), /robot-larare-losen|mathapp_teacher_api_token/u)
})

test('search returns candidates rather than guessing, projects minimal metadata, and excludes another class', async () => {
  const data = await call(reader, 'math_find_pupils', { query: 'MCP Demo', limit: 1 })
  assert.equal(data.ambiguous, true)
  assert.equal(data.total, 2)
  assert.equal(data.nextOffset, 1)
  const next = await call(reader, 'math_find_pupils', { query: 'MCP Demo', limit: 1, offset: data.nextOffset })
  assert.notEqual(next.pupils[0].studentId, data.pupils[0].studentId)
  assert.equal((await call(reader, 'math_find_pupils', { query: 'MCP Demo Other' })).total, 0)
  assert.doesNotMatch(JSON.stringify(data), /problemLog|mastery|password|auth|teacherName/u)
})

test('paged evidence preserves correct answers, unknown history, exact source detail and revocation errors', async () => {
  const first = await call(reader, 'math_get_pupil_evidence', { ...target, limit: 2 })
  assert.equal(first.total, 4)
  assert.equal(first.coverage.practice.completeness, 'unknown')
  const second = await call(reader, 'math_get_pupil_evidence', { ...target, limit: 2, cursor: first.nextCursor, snapshotRevision: first.snapshotRevision })
  assert.equal(second.entries.filter(e => e.answer.status === 'incorrect').length, 2)
  const detail = await call(reader, 'math_get_evidence_detail', { ...target, ref: second.entries[0].ref, snapshotRevision: first.snapshotRevision })
  assert.deepEqual(detail.entry.answer, second.entries[0].answer)
  const forbidden = await reader.callTool({ name: 'math_get_pupil_evidence', arguments: { ...target, classId: 'mcp-other' } })
  assert.equal(forbidden.isError, true)
  assert.equal(forbidden.structuredContent.data.error.code, 'access_denied')
  const screen = await reader.callTool({ name: 'math_get_pupil_evidence', arguments: { ...target, source: 'screening' } })
  assert.equal(screen.structuredContent.data.error.code, 'access_denied')
})

test('preview is read-only, invalid tool arguments and unavailable publication cannot bypass the boundary', async () => {
  const preview = await call(reader, 'math_preview_analysis', target)
  assert.equal(preview.counts.correct, 2)
  assert.equal(preview.counts.incorrect, 2)
  assert.equal((await call(reader, 'math_get_analysis_history', { studentId: target.studentId, classId: target.classId })).total, 0)
  const invalid = await reader.callTool({ name: 'math_get_pupil_evidence', arguments: { ...target, password: 'DO_NOT_ECHO_SECRET' } })
  assert.equal(invalid.isError, true)
  assert.doesNotMatch(JSON.stringify(invalid), /DO_NOT_ECHO_SECRET/u)
  try {
    const result = await reader.callTool({ name: 'math_publish_approved_followup', arguments: {} })
    assert.equal(result.isError, true)
  } catch (error) { assert.match(error.message, /not found|unknown|method|tool/iu) }
})

test('write-enabled SDK client saves a real API-validated AI draft with idempotent receipt, not an assignment', async () => {
  writer = await connect(true)
  const evidence = await call(writer, 'math_get_pupil_evidence', target)
  const preview = await call(writer, 'math_preview_analysis', target)
  const draft = { ...preview.draft, provenance: { kind: 'ai', instructionVersion: 'synthetic-check-v1' } }
  const args = { ...target, report: draft, expectedRevision: preview.historyRevision, requestId: 'protocol-save-0001' }
  const saved = await call(writer, 'math_save_analysis_draft', args)
  assert.equal(saved.assigned, false)
  assert.equal(saved.version, 1)
  assert.equal((await call(writer, 'math_save_analysis_draft', args)).reportId, saved.reportId)
  const history = await call(writer, 'math_get_analysis_history', { studentId: target.studentId, classId: target.classId })
  assert.equal(history.total, 1)
  const scope = { studentId: target.studentId, classId: target.classId, reportId: saved.reportId }
  const report = await call(writer, 'math_get_analysis_report', scope)
  assert.equal(report.report.provenance.kind, 'ai')
  assert.equal(report.checkInCount, 0)
  const frozen = await call(writer, 'math_get_analysis_report', { ...scope, section: 'evidence', evidenceRef: evidence.entries[0].ref })
  assert.deepEqual(frozen.entry.answer, evidence.entries[0].answer)
  assert.equal((await call(writer, 'math_get_analysis_report', { ...scope, section: 'check_ins' })).total, 0)
  assert.equal((await call(writer, 'math_get_pupil_evidence', target)).snapshotRevision, evidence.snapshotRevision)
})

test('a legacy initialize client can list tools without SDK-v2 metadata and stdout remains JSON-only', async () => {
  const child = spawn(process.execPath, [entry, '--demo'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
  const lines = createInterface({ input: child.stdout })
  const responses = new Map()
  lines.on('line', line => { const message = JSON.parse(line); responses.set(message.id, message) })
  const wait = async id => {
    const deadline = Date.now() + 5000
    while (!responses.has(id) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10))
    assert.ok(responses.has(id), 'MCP compatibility response timed out')
    return responses.get(id)
  }
  const send = message => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
  try {
    send({ id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-client', version: '1' } } })
    assert.equal((await wait(1)).result.protocolVersion, '2025-11-25')
    send({ method: 'notifications/initialized' })
    send({ id: 2, method: 'tools/list', params: {} })
    assert.equal((await wait(2)).result.tools.length, 8)
  } finally { child.stdin.end(); child.kill(); lines.close() }
})

test('synthetic app cleanup closes its ephemeral HTTP port', async () => {
  const demo = launchDemo()
  const config = await demo.ready
  assert.equal((await fetch(`${config.baseUrl}/__robot/mcp-info`)).status, 200)
  await demo.close()
  await assert.rejects(fetch(`${config.baseUrl}/__robot/mcp-info`))
})
