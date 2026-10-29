import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { saveMaterialDraft, readMaterialDraft, approveMaterialDraft, MATERIAL_DRAFT_CAS, materialIndex } from '../api/_teacherMaterialStore.js'
import { recordMaterialDispatch, readMaterialDispatch, MATERIAL_DISPATCH_CAS, dispatchKey } from '../api/_teacherMaterialDispatchStore.js'
import { studentDeletedKey } from '../api/_studentStore.js'

// No implicit credentials, production target, scan, or database-wide cleanup.
export function isolatedMaterialStore(client) {
  const prefix = `verification:material:${randomUUID()}:`, touched = new Set()
  function key(value) {
    assert.equal(typeof value, 'string'); assert.ok(value.length)
    const mapped = prefix + value
    touched.add(mapped)
    return mapped
  }
  return {
    prefix,
    get: value => client.get(key(value)),
    async set(value, data) { return client.set(key(value), data, { ex: 3600 }) },
    async sadd(value, ...members) {
      const mapped = key(value)
      const result = await client.sadd(mapped, ...members)
      await client.expire(mapped, 3600)
      return result
    },
    async eval(script, keys, args) {
      assert.ok([MATERIAL_DRAFT_CAS, MATERIAL_DISPATCH_CAS].includes(script), 'Only material CAS scripts are allowed')
      const mapped = keys.map(key)
      const result = await client.eval(script, mapped, args)
      // Lua SET clears TTL; restore expiry after every acknowledged call.
      for (const value of mapped) await client.expire(value, 3600)
      return result
    },
    async cleanup() {
      const keys = [...touched]
      assert.ok(keys.every(value => value.startsWith(prefix)))
      if (keys.length) await client.del(...keys)
      for (const value of keys) assert.equal(Number(await client.exists(value)), 0)
      touched.clear()
      return keys.length
    }
  }
}

export async function verifyMaterialRedis(client, report = console.log) {
  const store = isolatedMaterialStore(client)
  let passed = 0
  const preview = title => ({ contentRevision: title, material: { titleSv: title, audience: {
    rosterRevision: 'roster', pupils: ['P', 'Q', 'R'].map(studentId => ({ studentId, classIds: ['C'] })) } } })
  const command = (requestId, title = 'first', extra = {}) => ({ requestId, expectedRevision: 0,
    expectedContentRevision: title, material: { titleSv: title }, ...extra })
  const save = (requestId, title, extra) => saveMaterialDraft('T', command(requestId, title, extra), preview(title), { store })
  async function check(label, action) { await action(); passed++; report(`PASS ${label}`) }
  let state, item
  try {
    await check('same-request concurrent saves share one immutable version and receipt', async () => {
      const results = await Promise.all([save('same-save-0001', 'first'), save('same-save-0001', 'first')])
      assert.equal(results[0].state.draftId, results[1].state.draftId)
      state = await readMaterialDraft('T', results[0].state.draftId, { store })
      assert.equal(state.revision, 1); assert.equal(state.versions.length, 1)
      assert.equal(await readMaterialDraft('OTHER', state.draftId, { store }), null)
    })
    await check('competing new versions yield exactly one winner without overwriting version one', async () => {
      const results = await Promise.allSettled(['version-race-01', 'version-race-02'].map(id =>
        save(id, id, { draftId: state.draftId, expectedRevision: 1 })))
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 1)
      assert.equal(results.find(row => row.status === 'rejected').reason.status, 409)
      state = await readMaterialDraft('T', state.draftId, { store }); item = state.versions.at(-1)
      assert.equal(state.versions[0].material.titleSv, 'first'); assert.equal(item.version, 2)
    })
    await check('dispatch without approval writes no receipt', async () => {
      await assert.rejects(recordMaterialDispatch(state, item, [], { store }), { status: 409 })
      assert.equal(await readMaterialDispatch(state, item.version, { store }), null)
    })
    await check('approval uses Lua CAS and same-request retry preserves its exact receipt', async () => {
      const approvalCommand = { version: item.version, contentRevision: item.contentRevision, expectedRevision: state.revision }
      const results = await Promise.allSettled(['approval-race-01', 'approval-race-02'].map(requestId =>
        approveMaterialDraft(state, { ...approvalCommand, requestId }, preview(item.contentRevision), { store })))
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 1)
      assert.equal(results.find(row => row.status === 'rejected').reason.status, 409)
      const winner = results.find(row => row.status === 'fulfilled').value
      state = await readMaterialDraft('T', state.draftId, { store })
      const retry = await approveMaterialDraft(state, { ...approvalCommand, requestId: winner.approval.requestId }, preview(item.contentRevision), { store })
      assert.deepEqual(retry.approval, winner.approval)
      assert.equal(state.approvals.length, 1); assert.equal(state.versions.length, 2)
    })
    await check('same content in a new version requires a distinct approval request and receipt', async () => {
      const previous = state.approvals.at(-1)
      const saved = await save('same-content-version', item.contentRevision, { draftId: state.draftId, expectedRevision: state.revision })
      state = saved.state; item = state.versions.at(-1)
      const approvalCommand = { version: item.version, contentRevision: item.contentRevision, expectedRevision: state.revision }
      await assert.rejects(approveMaterialDraft(state, { ...approvalCommand, requestId: previous.requestId }, preview(item.contentRevision), { store }), { status: 409 })
      const approved = await approveMaterialDraft(state, { ...approvalCommand, requestId: 'same-content-approval' }, preview(item.contentRevision), { store })
      state = approved.state
      assert.equal(approved.approval.version, item.version); assert.notEqual(approved.approval.id, previous.id)
    })
    await check('concurrent recipient receipts merge; unknown and failure remain distinct', async () => {
      await Promise.all([
        recordMaterialDispatch(state, item, [{ studentId: 'P', assignmentId: 'A', status: 'confirmed' }], { store }),
        recordMaterialDispatch(state, item, [{ studentId: 'Q', status: 'unknown' }, { studentId: 'R', status: 'failed' }], { store })
      ])
      const receipt = await readMaterialDispatch(state, item.version, { store })
      assert.equal(receipt.confirmed, 1); assert.equal(receipt.unknown, 1); assert.equal(receipt.failed, 1)
      assert.equal(receipt.pending, 0); assert.equal(receipt.status, 'partial')
    })
    await check('retry completes only remaining pupils and cannot replace an earlier confirmed assignment', async () => {
      const receipt = await recordMaterialDispatch(state, item, [{ studentId: 'P', status: 'failed' },
        { studentId: 'Q', assignmentId: 'B', status: 'confirmed' }, { studentId: 'R', assignmentId: 'C', status: 'confirmed' }], { store })
      assert.equal(receipt.status, 'complete'); assert.equal(receipt.confirmed, 3)
      assert.equal(receipt.receipts.find(row => row.studentId === 'P').assignmentId, 'A')
      await assert.rejects(recordMaterialDispatch(state, item, [{ studentId: 'P', assignmentId: 'OTHER', status: 'confirmed' }], { store }), { status: 409 })
    })
    await check('a version saved between receipt read and CAS blocks the old dispatch', async () => {
      const before = await readMaterialDispatch(state, item.version, { store })
      let changed = false
      const raceStore = { ...store, async eval(...args) {
        if (!changed) { changed = true; await save('new-version-0003', 'third', { draftId: state.draftId, expectedRevision: state.revision }) }
        return store.eval(...args)
      } }
      await assert.rejects(recordMaterialDispatch(state, item, [], { store: raceStore }), { status: 409 })
      assert.deepEqual(await readMaterialDispatch(state, item.version, { store }), before)
    })
    await check('pupil deletion between receipt read and CAS prevents stale receipt writes', async () => {
      const saved = await save('deletion-race-save', 'deletion')
      const approved = await approveMaterialDraft(saved.state, { requestId: 'deletion-approval', expectedRevision: 1,
        version: 1, contentRevision: 'deletion' }, preview('deletion'), { store })
      const raceStore = { ...store, async eval(...args) { await store.set(studentDeletedKey('P'), 1); return store.eval(...args) } }
      await assert.rejects(recordMaterialDispatch(approved.state, saved.state.versions[0], [], { store: raceStore }), { status: 410 })
      assert.equal(await store.get(dispatchKey('T', saved.state.draftId, 1)), null)
    })
    await check('pupil tombstone prevents draft creation and approval', async () => {
      await assert.rejects(save('deleted-save-0001', 'deleted'), { status: 410 })
      const current = await readMaterialDraft('T', state.draftId, { store }), last = current.versions.at(-1)
      await assert.rejects(approveMaterialDraft(current, { requestId: 'deleted-approval', expectedRevision: current.revision,
        version: last.version, contentRevision: last.contentRevision }, preview(last.contentRevision), { store }), { status: 410 })
    })
    // Use a different pupil/class for the remaining cases; tombstones stay intact.
    const otherPreview = { contentRevision: 'other', material: { audience: { rosterRevision: 'other-roster',
      pupils: [{ studentId: 'S', classIds: ['D'] }] } } }
    await check('class tombstone blocks draft creation', async () => {
      await store.set('class_deleted:D', 1)
      await assert.rejects(saveMaterialDraft('T', command('class-deleted-save', 'other'), otherPreview, { store }), { status: 410 })
    })
    await check('100-draft cap is enforced by the real Lua script', async () => {
      await store.sadd(materialIndex('FULL'), ...Array.from({ length: 100 }, (_, i) => `existing-${i}`))
      const cleanPreview = { contentRevision: 'clean', material: { audience: { pupils: [{ studentId: 'S', classIds: ['E'] }] } } }
      await assert.rejects(saveMaterialDraft('FULL', command('full-account-save', 'clean'), cleanPreview, { store }), { status: 413 })
    })
    return { passed }
  } finally {
    const cleaned = await store.cleanup()
    report(`CLEANUP verified: ${cleaned} isolated keys absent`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] !== '--local-wsl' || process.argv.length !== 5) {
    console.error('Usage: node scripts/verify-material-redis.mjs --local-wsl ABSOLUTE_REDIS_CLI ABSOLUTE_UNIX_SOCKET. No credentials or implicit target are used.')
    process.exitCode = 1
  } else {
    try {
      const { localWslRedisClient } = await import('./wsl-redis-verification-client.mjs')
      const { passed } = await verifyMaterialRedis(localWslRedisClient(process.argv[3], process.argv[4]))
      console.log(`Real local Redis material verification passed: ${passed} checks.`)
    } catch (error) {
      console.error(`Material Redis verification failed (${error.name}, status ${error.status ?? 'unknown'}).`)
      process.exitCode = 1
    }
  }
}
