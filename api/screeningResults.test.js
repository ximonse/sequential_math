import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { diagnosticClassOverview } from './_diagnosticClassOverview.js'
import { screeningMisconceptionPupils } from './_screeningMisconceptions.js'
import { screeningResults } from './_screeningResults.js'
import { diagnosticAssignablePupilsInClass } from './_diagnosticApiAccess.js'
import { listClassDiagnosticAssignments } from './_diagnosticAssignmentList.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

const manifest = JSON.parse(readFileSync(new URL('../src/domains/arithmetic/diagnosticTasks.v1.json', import.meta.url), 'utf8'))
const S2 = manifest.tasks.find(task => task.analysisCaseId === 'S2') // 402 − 178; 376 is a known misconception
const TASKS = [S2, ...manifest.tasks.filter(task => task !== S2 && task.answerType !== 'text').slice(0, 3)]
const ANSWERS = ['376', '224', '17', '']

// One class with a selected screening `A`, other screenings in the class, and
// pupils who also answered those. `answered` pupils answer the first `items` tasks.
function classFixture({ pupils, answered = pupils, items = 4, otherScreenings = 6, history = 4 }) {
  const time = Date.parse('2026-11-10T09:00Z')
  const toItem = (task, i) => ({ assignmentItemId: `ITEM${i}`, taskId: task.taskId, taskVersion: task.taskVersion, taskSnapshot: task })
  const ids = Array.from({ length: pupils }, (_, i) => `P${i}`)
  const screening = id => ({ assignmentId: id, classId: 'C', studentIds: ids, evidenceClass: 'diagnostic_only', status: 'active',
    items: TASKS.map(toItem), createdAt: time })
  const others = Array.from({ length: otherScreenings }, (_, i) => `H${i}`)
  const data = new Map([['class:C', { classId: 'C' }], ...['A', ...others].map(id => [`diagnostic_assignment:${id}`, screening(id)])])
  const sets = new Map([['class_students:C', ids], ['diagnostic_assignments_by_class:C', ['A', ...others]]])
  const lists = new Map()
  function attempt(id, studentId, assignmentId, item, answer, createdAt = time) {
    let grid = createDiagnosticGrid({ attemptId: id, taskId: item.taskId, taskVersion: item.taskVersion })
    if (answer) grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, time)
    data.set(`diagnostic_attempt:${id}`, { attemptId: id, taskId: item.taskId, taskVersion: item.taskVersion, assignmentId,
      assignmentItemId: item.assignmentItemId, studentId, classIdAtAttempt: 'C', evidenceClass: 'diagnostic_only',
      serverRevision: 1, lastSequence: grid.events.length, status: grid.status, createdAt, grid })
    lists.set(`diagnostic_attempt_events:${id}`, grid.events)
    const byAssignment = `diagnostic_attempts_by_assignment:${assignmentId}`
    sets.set(byAssignment, [...(sets.get(byAssignment) || []), id])
    const byStudent = `diagnostic_attempts_by_student:${studentId}`
    sets.set(byStudent, [...(sets.get(byStudent) || []), id])
  }
  const assignment = data.get('diagnostic_assignment:A')
  ids.forEach((studentId, p) => {
    data.set(`student:${studentId}`, { studentId, classId: 'C' })
    if (p < answered) assignment.items.slice(0, items).forEach((item, i) => {
      // An older attempt on the first task; only the latest counts.
      if (i === 0) attempt(`${studentId}-old`, studentId, 'A', item, '1', time - 10)
      attempt(`${studentId}-${i}`, studentId, 'A', item, ANSWERS[(p + i) % ANSWERS.length])
    })
    for (let h = 0; h < history; h++) attempt(`${studentId}-h${h}`, studentId, others[h % others.length], assignment.items[h % 4], '5')
  })
  // A teacher counts one wrong answer as right and picks a misconception on another.
  data.set('diagnostic_review:P0-0', { studentId: 'P0', reviewRevision: 1, reviewed: true, evidenceRevision: 1, evidenceSequence: 1, markedCorrect: true })
  data.set('diagnostic_review:P2-0', { studentId: 'P2', reviewRevision: 1, reviewed: true, evidenceRevision: 1, evidenceSequence: 1,
    misconceptionIds: ['regrouping_not_understood'], misconception: '' })
  return { assignment, data, sets, lists }
}

function countingStore({ data, sets, lists }, latency = 50) {
  const log = []
  const command = (op, value) => async key => {
    log.push(`${op} ${key}`)
    await new Promise(resolve => setTimeout(resolve, latency))
    return value(key)
  }
  return { log, latency, store: {
    get: command('get', key => structuredClone(data.get(key) ?? null)),
    smembers: command('smembers', key => [...(sets.get(key) || [])]),
    exists: command('exists', () => 0),
    lrange: command('lrange', key => structuredClone(lists.get(key) || []))
  } }
}

// The request prefix every view runs before its own read (teacher auth and the
// class check read kv directly and are the same few commands in every request).
async function request(store, read) {
  const allowed = await diagnosticAssignablePupilsInClass('C', { store })
  const assignment = (await listClassDiagnosticAssignments('C', { store })).find(item => item.assignmentId === 'A')
  return read(assignment, allowed)
}

async function timed(counting, read) {
  const started = Date.now(), before = counting.log.length
  const pending = request(counting.store, read)
  await vi.runAllTimersAsync()
  const value = await pending
  return { value, commands: counting.log.length - before, rounds: Math.round((Date.now() - started) / counting.latency) }
}

async function compare(shape) {
  vi.useFakeTimers()
  const fixture = classFixture(shape)
  const counting = countingStore(fixture)
  // Before: the table, then the cards as a second request once the table had arrived.
  const table = await timed(counting, (assignment, allowed) => diagnosticClassOverview(assignment, allowed, { store: counting.store }))
  const cards = await timed(counting, (assignment, allowed) => screeningMisconceptionPupils(assignment, allowed, { store: counting.store }))
  const results = await timed(counting, (assignment, allowed) => screeningResults(assignment, allowed, { store: counting.store }))
  return { table, cards, results }
}

describe('screening results read the table and the misconception cards once', () => {
  afterEach(() => vi.useRealTimers())

  for (const [label, shape] of [['production-like: 28 pupils, 4 answers', { pupils: 28, answered: 4, items: 1 }],
    ['dense: 28 pupils, 4 answers each', { pupils: 28, history: 8 }]]) {
    it(`gives the same table and cards with fewer reads (${label})`, async () => {
      const { table, cards, results } = await compare(shape)
      const { misconceptions, ...overview } = results.value
      expect(overview).toEqual(table.value)
      expect(misconceptions).toEqual(cards.value)
      expect(misconceptions.pupils.some(pupil => pupil.answers.some(answer => answer.bucket === 'misconception'))).toBe(true)
      const before = { commands: table.commands + cards.commands, roundsToTable: table.rounds, roundsToCards: table.rounds + cards.rounds }
      const after = { commands: results.commands, roundsToTable: results.rounds, roundsToCards: results.rounds }
      console.log(`Screening results, ${label}: store commands ${before.commands} → ${after.commands}; ` +
        `sequential rounds to table ${before.roundsToTable} → ${after.roundsToTable}, to cards ${before.roundsToCards} → ${after.roundsToCards}`)
      // The cards add the pupil indexes and the answers each pupil's teacher hid as
      // slips (K5) to the table's read, both in parallel: no sequential round.
      expect(after.commands).toBe(table.commands + 2 * shape.pupils)
      expect(after.roundsToTable).toBe(before.roundsToTable)
      expect(after.roundsToCards).toBeLessThan(before.roundsToCards)
    })
  }

  it('adds little processing time before the table can be sent (dense case, no store latency)', async () => {
    const { store } = countingStore(classFixture({ pupils: 28, history: 8 }), 0)
    const median = async read => {
      const times = []
      for (let run = 0; run < 5; run++) { const started = performance.now(); await request(store, read); times.push(performance.now() - started) }
      return times.sort((a, b) => a - b)[2]
    }
    const table = await median((assignment, allowed) => diagnosticClassOverview(assignment, allowed, { store }))
    const results = await median((assignment, allowed) => screeningResults(assignment, allowed, { store }))
    console.log(`Screening results, processing for 112 answers: table ${table.toFixed(0)} ms, table and cards ${results.toFixed(0)} ms`)
    expect(results - table).toBeLessThan(500)
  })

  it('keeps the teacher assessment beside the observed answer and sends no saved originals with the cards', async () => {
    vi.useFakeTimers()
    const counting = countingStore(classFixture({ pupils: 3 }))
    const { value } = await timed(counting, (assignment, allowed) => screeningResults(assignment, allowed, { store: counting.store }))
    const [p0, , p2] = value.misconceptions.pupils
    expect(p0.answers[0]).toMatchObject({ studentAnswer: '376', status: 'correct', teacherAssessed: true, pupilStatus: 'incorrect', position: 0 })
    expect(p2.answers[0].teacherMisconceptionIds).toEqual(['regrouping_not_understood'])
    expect(JSON.stringify(value.misconceptions)).not.toMatch(/"(events|snapshot|grid)"/)
  })

  it('leaves out an attempt the pupil index does not list, as the pupil evidence read does', async () => {
    vi.useFakeTimers()
    const fixture = classFixture({ pupils: 2 })
    fixture.sets.set('diagnostic_attempts_by_student:P0', fixture.sets.get('diagnostic_attempts_by_student:P0').filter(id => id !== 'P0-0'))
    const counting = countingStore(fixture)
    const old = await timed(counting, (assignment, allowed) => screeningMisconceptionPupils(assignment, allowed, { store: counting.store }))
    const { value } = await timed(counting, (assignment, allowed) => screeningResults(assignment, allowed, { store: counting.store }))
    expect(value.rows[0].items[0].attemptId).toBe('P0-0')
    expect(value.misconceptions).toEqual(old.value)
    expect(value.misconceptions.pupils[0].answers.map(answer => answer.assignmentItemId)).not.toContain('ITEM0')
  })

  it('still returns the table when the cards cannot be read', async () => {
    vi.useFakeTimers()
    const counting = countingStore(classFixture({ pupils: 2 }))
    const smembers = counting.store.smembers
    counting.store.smembers = async key => {
      if (key.startsWith('diagnostic_attempts_by_student:')) throw new Error('store down')
      return smembers(key)
    }
    const { value } = await timed(counting, (assignment, allowed) => screeningResults(assignment, allowed, { store: counting.store }))
    expect(value.rows).toHaveLength(2)
    expect(value.misconceptions).toEqual({ error: 'Kunde inte hämta felförståelserna.' })
  })
})
