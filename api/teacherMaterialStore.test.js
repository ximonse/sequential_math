import { beforeEach, expect, it } from 'vitest'
import { readMaterialDraft, saveMaterialDraft, approveMaterialDraft, materialKey, materialIndex } from './_teacherMaterialStore.js'
import { emulateTeacherMaterial } from './testHelpers/teacherMaterialKv.js'
import { studentDeletedKey } from './_studentStore.js'

let values, sets, store
const preview = title => ({ contentRevision: title, material: { titleSv: title,
  audience: { pupils: [{ studentId: 'P', classIds: ['C'] }] } } })
const command = (requestId = 'save-request-0001', title = 'first') => ({ requestId, expectedRevision: 0,
  expectedContentRevision: title, material: { titleSv: title } })
beforeEach(() => {
  values = new Map(); sets = new Map()
  store = { get: async key => structuredClone(values.get(key) || null),
    eval: async (script, keys, args) => emulateTeacherMaterial(values, sets, script, keys, args).result }
})
it('saves immutable versions, reads them back per teacher and retries exactly without duplicates', async () => {
  const first = await saveMaterialDraft('T', command(), preview('first'), { store })
  const id = first.state.draftId
  expect(first.state.versions).toHaveLength(1)
  expect((await saveMaterialDraft('T', command(), preview('first'), { store })).savedVersion).toBe(1)
  const second = await saveMaterialDraft('T', { ...command('save-request-0002', 'second'), draftId: id, expectedRevision: 1 }, preview('second'), { store })
  expect(second.state.versions.map(v => v.material.titleSv)).toEqual(['first', 'second'])
  expect(await readMaterialDraft('OTHER', id, { store })).toBeNull()
  expect((await readMaterialDraft('T', id, { store })).revision).toBe(2)
  expect([...sets.get(materialIndex('T'))]).toEqual([id])
})
it('makes simultaneous same-request retries idempotent and rejects a conflicting new version', async () => {
  const retry = await Promise.all([1, 2].map(() => saveMaterialDraft('T', command(), preview('first'), { store })))
  expect(retry.map(result => result.savedVersion)).toEqual([1, 1])
  expect(values.size).toBe(1)
  const draftId = retry[0].state.draftId
  await expect(saveMaterialDraft('T', { ...command('save-request-0002', 'second'), draftId }, preview('second'), { store }))
    .rejects.toMatchObject({ status: 409 })
  await expect(saveMaterialDraft('T', { ...command('save-request-0001', 'other'), draftId }, preview('other'), { store }))
    .rejects.toMatchObject({ status: 409 })
})
it('checks the preview revision and blocks writes after pupil or class deletion without resurrecting data', async () => {
  await expect(saveMaterialDraft('T', command(), preview('changed'), { store })).rejects.toMatchObject({ status: 409 })
  values.set(studentDeletedKey('P'), 123)
  await expect(saveMaterialDraft('T', command(), preview('first'), { store })).rejects.toMatchObject({ status: 410 })
  expect([...values.keys()].some(key => key.startsWith('teacher_material:'))).toBe(false)
  values.clear(); values.set('class_deleted:C', 123)
  await expect(saveMaterialDraft('T', command(), preview('first'), { store })).rejects.toMatchObject({ status: 410 })
})
it('preserves prior history when limits are reached or stored identity is inconsistent', async () => {
  const first = await saveMaterialDraft('T', command(), preview('first'), { store })
  const key = materialKey('T', first.state.draftId)
  const full = { ...first.state, revision: 20, versions: Array.from({ length: 20 }, (_, i) => ({ ...first.state.versions[0], requestId: `request-${i}`, version: i + 1 })) }
  values.set(key, full)
  await expect(saveMaterialDraft('T', { ...command('save-request-new'), draftId: full.draftId, expectedRevision: 20 }, preview('first'), { store }))
    .rejects.toMatchObject({ status: 413 })
  expect(values.get(key)).toEqual(full)
  values.set(key, { ...full, teacherId: 'OTHER' })
  await expect(readMaterialDraft('T', full.draftId, { store })).rejects.toMatchObject({ status: 409 })
})
it('binds approval to current content and audience and keeps content version numbers distinct from storage revisions', async () => {
  const saved = await saveMaterialDraft('T', command(), preview('first'), { store })
  const approve = { requestId: 'approval-0001', expectedRevision: 1, version: 1, contentRevision: 'first' }
  const approved = await approveMaterialDraft(saved.state, approve, preview('first'), { store })
  expect(approved.state.revision).toBe(2)
  expect(approved.approval.version).toBe(1)
  expect((await approveMaterialDraft(approved.state, approve, preview('first'), { store })).approval.id).toBe(approved.approval.id)
  await expect(approveMaterialDraft(approved.state, { ...approve, requestId: 'approval-0002' }, preview('changed'), { store })).rejects.toMatchObject({ status: 409 })
  const updated = await saveMaterialDraft('T', { ...command('save-request-0002', 'second'), draftId: saved.state.draftId, expectedRevision: 2 }, preview('second'), { store })
  expect(updated.savedVersion).toBe(2)
  expect(updated.state.revision).toBe(3)
  expect(updated.state.approvals[0].contentRevision).toBe('first')
})
