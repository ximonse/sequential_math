import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createClient } from '@vercel/kv'
import { submitDiagnosticCollection, SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT } from '../api/_diagnosticCollectionStore.js'
import { appendDiagnosticAttempt, readDiagnosticAttempt, DIAGNOSTIC_APPEND_CAS_SCRIPT } from '../api/_diagnosticAttemptStore.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

// Every key, including reads and Lua KEYS, is isolated. Never scan or flush a DB.
export function isolatedVerificationStore(client) {
  const prefix = `verification:diagnostic-collection:${randomUUID()}:`
  const touched = new Set()
  const key = value => {
    assert.equal(typeof value, 'string')
    assert.ok(value.length > 0)
    const mapped = prefix + value
    touched.add(mapped)
    return mapped
  }
  const expire = async keys => {
    for (const mapped of keys) await client.expire(mapped, 3600)
  }
  return {
    prefix,
    get: value => client.get(key(value)),
    exists: value => client.exists(key(value)),
    lrange: (value, start, end) => client.lrange(key(value), start, end),
    async set(value, data) { return client.set(key(value), data, { ex: 3600 }) },
    async rpush(value, events) {
      const mapped = key(value)
      const result = await client.rpush(mapped, ...events)
      await expire([mapped])
      return result
    },
    async eval(script, keys, args) {
      assert.ok([SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT, DIAGNOSTIC_APPEND_CAS_SCRIPT].includes(script))
      const mapped = keys.map(key)
      const result = await client.eval(script, mapped, args)
      // Lua SET clears expiry; restore it even after an idempotent retry.
      await expire(mapped)
      return result
    },
    async cleanup() {
      const keys = [...touched]
      assert.ok(keys.every(value => value.startsWith(prefix)))
      if (keys.length) await client.del(...keys)
      for (const mapped of keys) assert.equal(Number(await client.exists(mapped)), 0)
      touched.clear()
      return keys.length
    },
  }
}

export async function verifyDiagnosticCollectionRedis(client, report = console.log) {
  const store = isolatedVerificationStore(client)
  const entries = [1, 2].map(index => ({ attemptId: `attempt-${index}`, revision: 0, sequence: 0 }))
  const assignment = { assignmentId: 'collection', classId: 'class', status: 'active',
    evidenceClass: 'diagnostic_only', studentIds: ['pupil'], items: entries.map((entry, index) => ({
      assignmentItemId: `item-${index}`, taskId: `task-${index}`, taskVersion: 1,
    })) }
  const pupil = { studentId: 'pupil', classIds: ['class'], problemLog: [{ marker: 'untouched' }] }
  const recordKey = entry => `diagnostic_attempt:${entry.attemptId}`
  const eventKey = entry => `diagnostic_attempt_events:${entry.attemptId}`
  const submit = (attempts = entries, target = store) => submitDiagnosticCollection({
    assignmentId: 'collection', studentId: 'pupil', attempts,
  }, { store: target })
  const saveGrid = async (index, grid, revision) => {
    const record = await store.get(recordKey(entries[index]))
    const { events, ...snapshot } = grid
    await store.set(recordKey(entries[index]), { ...record, grid: snapshot,
      status: snapshot.status, serverRevision: revision, lastSequence: events.length })
    if (events.length) await store.rpush(eventKey(entries[index]), events)
  }
  const seed = async () => {
    await store.cleanup()
    await store.set('class:class', { id: 'class' })
    await store.set('student:pupil', pupil)
    await store.set('diagnostic_assignment:collection', assignment)
    for (const [index, entry] of entries.entries()) {
      const item = assignment.items[index]
      const { events: _events, ...grid } = createDiagnosticGrid({ attemptId: entry.attemptId,
        taskId: item.taskId, taskVersion: item.taskVersion, answerType: index ? 'text' : 'number' })
      await store.set(recordKey(entry), { attemptId: entry.attemptId, studentId: 'pupil',
        assignmentId: 'collection', assignmentItemId: item.assignmentItemId,
        classIdAtAttempt: 'class', taskId: item.taskId, taskVersion: item.taskVersion,
        evidenceClass: 'diagnostic_only', serverRevision: 0, lastSequence: 0, status: 'in_progress', grid })
    }
  }
  const unchanged = async () => {
    for (const entry of entries) {
      const saved = await readDiagnosticAttempt(entry.attemptId, { store })
      assert.equal(saved.record.status, 'in_progress')
      assert.deepEqual(saved.snapshot.events, [])
    }
  }
  let passed = 0
  const check = async (label, fn) => {
    await seed()
    await fn()
    passed++
    report(`PASS ${label}`)
  }
  try {
    await check('whole collection, reload, empty arrays and lost-ack retry', async () => {
      const result = await submit()
      assert.deepEqual(result.attempts.map(item => item.snapshot.status), ['submitted', 'submitted'])
      const before = await Promise.all(entries.map(entry => store.get(recordKey(entry))))
      await submit()
      for (const [index, entry] of entries.entries()) {
        const saved = await readDiagnosticAttempt(entry.attemptId, { store })
        assert.deepEqual(saved.record, before[index])
        assert.equal(saved.snapshot.events.length, 1)
        assert.equal(saved.snapshot.events[0].type, 'submit')
        assert.deepEqual(saved.snapshot.lines, [])
        assert.deepEqual(saved.snapshot.drawing, [])
      }
      assert.deepEqual(await store.get('student:pupil'), pupil)
    })
    await check('numeric/text answers, drawing and exact event preservation', async () => {
      const requests = []
      for (const [index, entry] of entries.entries()) {
        const record = await store.get(recordKey(entry))
        let grid = createDiagnosticGrid({ ...record.grid })
        grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: index ? 'Jag växlar ett tiotal.' : '42' }, 1)
        if (index) grid = recordDiagnosticGridEvent(grid, { type: 'drawing_stroke', points: [[0.1, 0.2], [0.3, 0.4]], erasing: false }, 2)
        await saveGrid(index, grid, 1)
        requests.push({ ...entry, revision: 1, sequence: grid.events.length })
      }
      await submit(requests)
      const saved = await readDiagnosticAttempt(entries[1].attemptId, { store })
      assert.equal(saved.snapshot.answer, 'Jag växlar ett tiotal.')
      assert.deepEqual(saved.snapshot.drawing, [{ points: [[0.1, 0.2], [0.3, 0.4]], erasing: false }])
      assert.deepEqual(saved.snapshot.events[1], recordDiagnosticGridEvent(
        recordDiagnosticGridEvent(createDiagnosticGrid({ attemptId: 'attempt-2', taskId: 'task-1', taskVersion: 1, answerType: 'text' }),
          { type: 'answer_change', before: '', after: 'Jag växlar ett tiotal.' }, 1),
        { type: 'drawing_stroke', points: [[0.1, 0.2], [0.3, 0.4]], erasing: false }, 2).events[1])
      assert.deepEqual(await store.get('student:pupil'), pupil)
    })
    await check('missing/duplicate/stale input cannot freeze any question', async () => {
      await assert.rejects(submit(entries.slice(0, 1)), { status: 400 })
      await assert.rejects(submit([entries[0], entries[0]]), { status: 400 })
      await assert.rejects(submit([entries[0], { ...entries[1], revision: 9 }]), { status: 409 })
      await unchanged()
    })
    const raceStore = mutate => ({ ...store, eval: async (script, keys, args) => {
      await mutate()
      return store.eval(script, keys, args)
    } })
    await check('revision race checked inside Lua before first write', async () => {
      await assert.rejects(submit(entries, raceStore(async () => {
        const record = await store.get(recordKey(entries[1]))
        await store.set(recordKey(entries[1]), { ...record, serverRevision: 1 })
      })), { status: 409 })
      await unchanged()
    })
    await check('event-log race cannot partially submit', async () => {
      await assert.rejects(submit(entries, raceStore(() => store.rpush(eventKey(entries[1]), [{ type: 'unexpected' }]))), { status: 409 })
      assert.equal((await store.get(recordKey(entries[0]))).status, 'in_progress')
      assert.deepEqual(await store.lrange(eventKey(entries[0]), 0, -1), [])
    })
    await check('membership removal inside Lua blocks submission', async () => {
      await assert.rejects(submit(entries, raceStore(() => store.set('student:pupil', { ...pupil, classIds: [] }))), { status: 410 })
      await unchanged()
    })
    await check('class archival inside Lua blocks submission', async () => {
      await assert.rejects(submit(entries, raceStore(() => store.set('class:class', { id: 'class', archived: true }))), { status: 410 })
      await unchanged()
    })
    await check('assignment closure inside Lua blocks submission', async () => {
      await assert.rejects(submit(entries, raceStore(() => store.set('diagnostic_assignment:collection', { ...assignment, status: 'stopped' }))), { status: 410 })
      await unchanged()
    })
    await check('test-only tombstone blocks every write', async () => {
      await assert.rejects(submit(entries, raceStore(() => store.set('student_deleted:pupil', 1))), { status: 410 })
      for (const entry of entries) {
        assert.equal((await store.get(recordKey(entry))).status, 'in_progress')
        assert.deepEqual(await store.lrange(eventKey(entry), 0, -1), [])
      }
    })
    await check('two concurrent submissions produce one immutable original', async () => {
      const results = await Promise.allSettled([submit(), submit()])
      assert.ok(results.some(result => result.status === 'fulfilled'))
      for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.status, 409)
      for (const entry of entries) assert.equal((await readDiagnosticAttempt(entry.attemptId, { store })).snapshot.events.length, 1)
    })
    await check('1024-event quota still permits exactly one final submit', async () => {
      const record = await store.get(recordKey(entries[0]))
      let grid = createDiagnosticGrid({ ...record.grid })
      for (let index = 1; index <= 1024; index++) grid = recordDiagnosticGridEvent(grid, { type: 'focus_lost' }, index)
      await saveGrid(0, grid, 1)
      await submit([{ ...entries[0], revision: 1, sequence: 1024 }, entries[1]])
      const saved = await readDiagnosticAttempt(entries[0].attemptId, { store })
      assert.equal(saved.snapshot.events.length, 1025)
      assert.equal(saved.snapshot.events.at(-1).type, 'submit')
    })
    await check('submitted original rejects further edits', async () => {
      const saved = await readDiagnosticAttempt(entries[0].attemptId, { store })
      const event = recordDiagnosticGridEvent(saved.snapshot, { type: 'answer_change', before: '', after: '7' }, 1).events[0]
      await submit()
      await assert.rejects(appendDiagnosticAttempt({ attemptId: entries[0].attemptId,
        studentId: 'pupil', expectedRevision: 1, events: [event] }, { store }), { status: 409 })
      assert.equal((await readDiagnosticAttempt(entries[0].attemptId, { store })).snapshot.events.length, 1)
    })
    return { passed }
  } finally {
    const cleaned = await store.cleanup()
    report(`CLEANUP verified: ${cleaned} isolated keys absent`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Missing KV_REST_API_URL/KV_REST_API_TOKEN. No storage writes performed.')
    process.exitCode = 1
  } else {
    const client = createClient({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN,
      automaticDeserialization: true, retry: { retries: 0 } })
    try {
      const { passed } = await verifyDiagnosticCollectionRedis(client)
      console.log(`Real Redis collection verification passed: ${passed} checks.`)
    } catch (error) {
      // Do not print client errors: connection details may contain credentials.
      console.error(`Redis collection verification failed (${error.name}, status ${error.status ?? 'unknown'}).`)
      process.exitCode = 1
    }
  }
}
