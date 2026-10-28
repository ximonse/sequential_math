import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@vercel/kv', () => ({ kv: {} }))
import { kv as store } from '../robots/memoryKv.js'
import { saveScreeningDraft, readScreeningDraft, listScreeningDrafts } from './_screeningDraftStore.js'
import { emptyScreeningDraft } from '../src/domains/arithmetic/screeningDraft.js'

beforeEach(() => store._reset())
const content = () => ({ ...emptyScreeningDraft(), titleSv: 'Decimaler för genomgång',
  writtenTasks: [{ promptSv: 'Beräkna 8,04 - 5,69.', answerKey: { format: 'number', expected: [2.35] }, gridEnabled: true, drawingEnabled: false }] })
const command = (overrides = {}) => ({ requestId: 'request-0001', expectedRevision: 0, content: content(), ...overrides })
const save = (value, teacher = 'teacher-one') => saveScreeningDraft(teacher, value, { store })

it('saves unfinished questions privately, with no pupil assignments, and returns independent copies', async () => {
  const input = command()
  input.content.writtenEditor.draft = { ...input.content.writtenEditor.draft, prompt: 'En fråga under arbete', keyText: 'inte färdigt' }
  const saved = await save(input)
  input.content.writtenTasks[0].answerKey.expected[0] = 99
  expect((await readScreeningDraft('teacher-one', saved.draftId, { store })).versions[0].content.writtenTasks[0].answerKey.expected).toEqual([2.35])
  expect(saved.versions[0].content.writtenEditor.draft.keyText).toBe('inte färdigt')
  expect(await listScreeningDrafts('teacher-two', { store })).toEqual([])
  await expect(readScreeningDraft('teacher-two', saved.draftId, { store })).rejects.toMatchObject({ status: 404 })
  expect(await store.smembers('diagnostic_assignments_by_class:CLASS')).toEqual([])
})

it('preserves old versions and rejects stale revisions without overwriting either editor', async () => {
  const first = await save(command())
  const second = await save(command({ draftId: first.draftId, expectedRevision: 1, requestId: 'request-0002', content: { ...content(), titleSv: 'Reviderade decimaler' } }))
  await expect(save(command({ draftId: first.draftId, expectedRevision: 1, requestId: 'stale-request' }))).rejects.toMatchObject({ status: 409 })
  expect(second.versions.map(version => version.content.titleSv)).toEqual(['Decimaler för genomgång', 'Reviderade decimaler'])
  expect((await readScreeningDraft('teacher-one', first.draftId, { store })).revision).toBe(2)
})

it('recovers a lost successful response using the same request without duplicate versions', async () => {
  const input = command()
  const first = await save(input)
  expect((await save(input)).draftId).toBe(first.draftId)
  expect((await save(input)).versions).toHaveLength(1)
  await expect(save({ ...input, content: { ...content(), titleSv: 'Changed retry' } })).rejects.toMatchObject({ status: 409 })
})

it('allows one winner in concurrent edits and keeps both historical versions', async () => {
  const first = await save(command())
  const results = await Promise.allSettled(['one', 'two'].map(suffix => save(command({ draftId: first.draftId,
    expectedRevision: 1, requestId: `request-${suffix}`, content: { ...content(), titleSv: suffix } }))))
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect((await readScreeningDraft('teacher-one', first.draftId, { store })).versions).toHaveLength(2)
})

it('rejects foreign images in incomplete editors and rejects invalid keys before saving', async () => {
  await store.set('screening_image:foreign-image', { id: 'foreign-image', teacherId: 'teacher-two', version: 1 })
  const input = command()
  input.content.imageEditor.draft.images = [{ source: 'upload', id: 'foreign-image', version: 1 }]
  await expect(save(input)).rejects.toMatchObject({ status: 403 })
  input.content = content(); input.content.writtenTasks[0].answerKey.expected = [NaN]
  await expect(save(input)).rejects.toMatchObject({ status: 400 })
  expect(await listScreeningDrafts('teacher-one', { store })).toEqual([])
})
