import { beforeEach, expect, it } from 'vitest'
import { recordMaterialDispatch, readMaterialDispatch } from './_teacherMaterialDispatchStore.js'
import { materialKey } from './_teacherMaterialStore.js'
import { emulateMaterialDispatch } from './testHelpers/teacherMaterialDispatchKv.js'
import { studentDeletedKey } from './_studentStore.js'

let values, store, state, item
beforeEach(() => {
  values = new Map()
  item = { version: 1, contentRevision: 'content', material: { audience: {
    rosterRevision: 'roster', pupils: [{ studentId: 'P' }, { studentId: 'Q' }] } } }
  state = { teacherId: 'T', draftId: 'D', versions: [item], approvals: [{ version: 1, contentRevision: 'content' }] }
  values.set(materialKey('T', 'D'), state)
  store = { get: async key => structuredClone(values.get(key) || null),
    eval: async (script, keys, args) => emulateMaterialDispatch(values, script, keys, args).result }
})
it('keeps confirmed receipts across conflicting retries, distinguishes unknown from failure, and reaches complete exactly once', async () => {
  await recordMaterialDispatch(state, item, [], { store })
  await Promise.all([
    recordMaterialDispatch(state, item, [{ studentId: 'P', assignmentId: 'A', status: 'confirmed' }], { store }),
    recordMaterialDispatch(state, item, [{ studentId: 'Q', status: 'unknown', message: 'No receipt' }], { store })
  ])
  const partial = await readMaterialDispatch(state, 1, { store })
  expect(partial).toMatchObject({ confirmed: 1, unknown: 1, failed: 0, pending: 0, status: 'partial' })
  const complete = await recordMaterialDispatch(state, item, [{ studentId: 'P', status: 'failed' }, { studentId: 'Q', assignmentId: 'B', status: 'confirmed' }], { store })
  expect(complete).toMatchObject({ confirmed: 2, unknown: 0, status: 'complete' })
  expect(complete.receipts.find(row => row.studentId === 'P').assignmentId).toBe('A')
})
it('blocks receipt commits for deleted pupils, an unapproved version, or a new latest version', async () => {
  values.set(studentDeletedKey('P'), 1)
  await expect(recordMaterialDispatch(state, item, [], { store })).rejects.toMatchObject({ status: 410 })
  values.delete(studentDeletedKey('P'))
  values.set(materialKey('T', 'D'), { ...state, approvals: [] })
  await expect(recordMaterialDispatch(state, item, [], { store })).rejects.toMatchObject({ status: 409 })
  values.set(materialKey('T', 'D'), { ...state, versions: [item, { ...item, version: 2 }] })
  await expect(recordMaterialDispatch(state, item, [], { store })).rejects.toMatchObject({ status: 409 })
})
