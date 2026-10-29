import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { launchDemo } from '../src/demo.mjs'

const entry = fileURLToPath(new URL('../src/stdio.mjs', import.meta.url))
async function connect(writes = false, materialWrites = false) {
  const client = new Client({ name: 'synthetic-integration-client', version: '1.0.0' })
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry, '--demo', ...(writes ? ['--allow-report-writes'] : []), ...(materialWrites ? ['--allow-material-writes'] : [])], stderr: 'pipe' })
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
  assert.equal(tools.length, 13)
  assert.equal(tools.some(t => /save|publish|assign|delete/u.test(t.name)), false)
  assert.equal(tools.every(t => t.annotations.readOnlyHint), true)
  assert.equal(meta.assignmentPublication, false)
  assert.equal(meta.teacherCheckInWrites, false)
  assert.equal(meta.dataMode, 'synthetic')
  assert.equal(meta.teacher.teacherId, 'mcp-demo-teacher')
  assert.equal(meta.teacher.role, 'teacher')
  assert.equal(meta.accountBindingRequiredForWrites, false)
  assert.doesNotMatch(JSON.stringify(meta), /robot-larare-losen|token|password/iu)
  const prompt = await reader.getPrompt({ name: 'math_pupil_analysis' })
  assert.match(prompt.messages[0].content.text, /supportRefs/u)
  assert.doesNotMatch(JSON.stringify(prompt), /robot-larare-losen|mathapp_teacher_api_token/u)
})

test('search returns candidates rather than guessing, projects minimal metadata, and excludes another class', async () => {
  const classes = await call(reader, 'math_find_classes', { query: 'mcp' })
  assert.deepEqual(classes.classes.map(c => c.classId), ['mcp-demo'])
  assert.doesNotMatch(JSON.stringify(classes), /loginToken|teacherIds|studentIds/u)
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
  assert.equal((await call(reader, 'math_get_pupil_evidence', { ...target, from: `${target.from}T00:00`, to: `${target.to}T23:59` })).total, 4)
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

test('audience tools resolve exact current class/group members and reject a stale roster page', async () => {
  const groups = await call(reader, 'math_find_groups', { query: 'MCP' })
  assert.deepEqual(groups.groups, [{ groupId: 'mcp-demo-group', name: 'MCP-demogrupp' }])
  const group = await call(reader, 'math_get_audience', { targetType: 'group', targetId: groups.groups[0].groupId })
  assert.equal(group.total, 1)
  assert.equal(group.pupils[0].studentId, target.studentId)
  const first = await call(reader, 'math_get_audience', { targetType: 'class', targetId: target.classId, limit: 1 })
  assert.equal(first.total, 2)
  assert.equal(first.historicalMembership, 'unknown')
  const second = await call(reader, 'math_get_audience', { targetType: 'class', targetId: target.classId,
    offset: first.nextOffset, rosterRevision: first.rosterRevision })
  assert.notEqual(first.pupils[0].studentId, second.pupils[0].studentId)
  const stale = await reader.callTool({ name: 'math_get_audience', arguments: { targetType: 'class', targetId: target.classId,
    offset: 1, rosterRevision: '0'.repeat(64) } })
  assert.equal(stale.structuredContent.data.error.code, 'revision_conflict')
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

test('MCP material preview validates generic and specific content without creating reports or assignments', async () => {
  const audience = await call(reader, 'math_get_audience', { targetType: 'class', targetId: target.classId })
  const evidence = await call(reader, 'math_get_pupil_evidence', target)
  const material = { schemaVersion: 1, kind: 'practice', mode: 'general', titleSv: 'Tabell 7', goalSv: 'Undersök tabellfakta',
    instructionSv: 'Räkna och förklara.', audience: { targetType: 'class', targetId: target.classId, rosterRevision: audience.rosterRevision },
    content: { kind: 'table', tables: [7], targetCount: 10 } }
  const generic = await call(reader, 'math_preview_material', { material })
  assert.equal(generic.saved, false); assert.equal(generic.assigned, false)
  const specific = await call(reader, 'math_preview_material', { material: { ...material, mode: 'specific', basis: [{ ...target,
    snapshotRevision: evidence.snapshotRevision, supportRefs: [evidence.entries[2].ref], counterRefs: [], reasonSv: 'Undersök felsvaret utan att tillskriva hela klassen en felorsak.' }] } })
  assert.equal(specific.material.pupilsWithoutAnalysis.length, 1)
  const invalid = await reader.callTool({ name: 'math_preview_material', arguments: { material: { ...material, mode: 'specific' } } })
  assert.equal(invalid.isError, true)
  assert.equal((await call(reader, 'math_get_analysis_history', { studentId: target.studentId, classId: target.classId })).total, 0)
  const prompt = await reader.getPrompt({ name: 'math_assignment_authoring' })
  assert.match(prompt.messages[0].content.text, /Specifikt/u)
})

test('partial practice settings are rejected with recovery guidance and explicit settings preserve the requested frame', async () => {
  const audience = await call(reader, 'math_get_audience', { targetType: 'class', targetId: target.classId })
  const material = { schemaVersion: 1, kind: 'practice', mode: 'general', titleSv: 'Jämna och udda tal',
    goalSv: 'Öva addition och subtraktion', instructionSv: 'Visa inte nedräkningen.',
    audience: { targetType: 'class', targetId: target.classId, rosterRevision: audience.rosterRevision },
    content: { kind: 'math_practice', operations: ['addition', 'subtraction'], targetCount: 8,
      numberRange: { first: { min: 10, max: 20, filter: 'even' }, second: { min: 1, max: 9, filter: 'odd' } },
      settings: { hideCountdown: true } } }
  const rejected = await reader.callTool({ name: 'math_preview_material', arguments: { material } })
  assert.equal(rejected.isError, true)
  assert.equal(rejected.structuredContent.data.error.code, 'invalid_material')
  assert.match(rejected.structuredContent.data.error.message, /maxTimePerProblem/u)
  material.content.settings = { maxTimePerProblem: 120, randomizeOrder: false, hideCountdown: true }
  const preview = await call(reader, 'math_preview_material', { material })
  assert.deepEqual(preview.material.content.frame.settings, material.content.settings)
  assert.deepEqual(preview.material.content.frame.numberRange, material.content.numberRange)
  assert.equal(preview.saved, false)
  assert.equal(preview.assigned, false)
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

test('separately enabled material saves preserve frozen versions and idempotent receipts without assignment or approval', async () => {
  const client = await connect(false, true)
  try {
    const capability = await call(client, 'math_get_capabilities')
    assert.equal(capability.materialDraftWritesEnabled, true)
    assert.equal(capability.reportWritesEnabled, false)
    const audience = await call(client, 'math_get_audience', { targetType: 'class', targetId: target.classId })
    const material = { schemaVersion: 1, kind: 'practice', mode: 'general', titleSv: 'Tabell 7', goalSv: 'Träna tabellfakta', instructionSv: 'Räkna.',
      audience: { targetType: 'class', targetId: target.classId, rosterRevision: audience.rosterRevision }, content: { kind: 'table', tables: [7], targetCount: 10 } }
    const preview = await call(client, 'math_preview_material', { material })
    const args = { material, expectedRevision: 0, requestId: 'material-save-0001', expectedContentRevision: preview.contentRevision }
    const saved = await call(client, 'math_save_material_draft', args)
    assert.equal(saved.assigned, false); assert.equal(saved.approval, 'not_requested')
    assert.match(saved.reviewUrl, /^http:\/\/localhost:\d+\/teacher\/material\//u)
    assert.equal((await call(client, 'math_save_material_draft', args)).draftId, saved.draftId)
    const summary = await call(client, 'math_get_material_draft', { draftId: saved.draftId })
    assert.equal(summary.titleSv, 'Tabell 7'); assert.equal(summary.version, 1)
    const frozen = await call(client, 'math_get_material_draft', { draftId: saved.draftId, section: 'input' })
    assert.deepEqual(frozen.input, material)
    const changed = { ...material, titleSv: 'Tabell 7, ny version' }
    const next = await call(client, 'math_preview_material', { material: changed })
    await call(client, 'math_save_material_draft', { material: changed, draftId: saved.draftId, expectedRevision: 1,
      expectedContentRevision: next.contentRevision, requestId: 'material-save-0002' })
    const history = await call(client, 'math_get_material_draft', { draftId: saved.draftId, section: 'history' })
    assert.equal(history.versions.length, 2)
    const original = await call(client, 'math_get_material_draft', { draftId: saved.draftId, version: 1 })
    assert.equal(original.titleSv, 'Tabell 7')
  } finally { await client.close() }
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
    assert.equal((await wait(2)).result.tools.length, 13)
  } finally { child.stdin.end(); child.kill(); lines.close() }
})

test('synthetic app cleanup closes its ephemeral HTTP port', async () => {
  const demo = launchDemo()
  const config = await demo.ready
  assert.equal((await fetch(`${config.baseUrl}/__robot/mcp-info`)).status, 200)
  await demo.close()
  await assert.rejects(fetch(`${config.baseUrl}/__robot/mcp-info`))
})
