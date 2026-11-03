import { describe, expect, it } from 'vitest'
import { normalizeScreeningDraft, screeningDraftFromAssignment } from './screeningDraft.js'

const bank = new Map([['add-no-carry-001', { taskId: 'add-no-carry-001' }]])
const findTask = id => bank.get(id)

describe('reusing a handed-out screening as an editable copy', () => {
  it('copies bank tasks with their options, own questions with answer keys and text questions', () => {
    const { draft, skipped } = screeningDraftFromAssignment({ titleSv: 'Min samling', items: [
      { taskId: 'add-no-carry-001', taskSnapshot: { taskId: 'add-no-carry-001', answerType: 'text', gridEnabled: false, drawingEnabled: true } },
      { taskId: 'custom-a', taskSnapshot: { promptSv: 'Beräkna 5 + 3.', answerKey: { format: 'number', expected: [8] }, gridEnabled: true } },
      { taskId: 'custom-b', taskSnapshot: { promptSv: 'Förklara 6//2.', answerRule: 'teacher_review', gridEnabled: true } },
      { taskId: 'custom-c', taskSnapshot: { promptSv: 'Rita din metod.', answerRule: 'teacher_review', gridEnabled: false, drawingEnabled: true } }
    ] }, findTask)
    expect(skipped).toBe(0)
    expect(draft.titleSv).toBe('Min samling')
    expect(draft.selectedTasks).toEqual(['add-no-carry-001'])
    expect(draft.itemOptions['add-no-carry-001']).toEqual({ answerType: 'text', gridEnabled: false, drawingEnabled: true })
    expect(draft.writtenTasks).toHaveLength(1)
    expect(draft.textTasks).toMatchObject([
      { promptSv: 'Förklara 6//2.', gridEnabled: true, drawingEnabled: false },
      { promptSv: 'Rita din metod.', gridEnabled: false, drawingEnabled: true }])
    // The copy keeps the handed-out order.
    expect(draft.order).toEqual(['bank:add-no-carry-001', `written:${draft.writtenTasks[0].uid}`,
      `text:${draft.textTasks[0].uid}`, `text:${draft.textTasks[1].uid}`])
    // The copy is a valid draft that can be saved.
    expect(() => normalizeScreeningDraft(draft)).not.toThrow()
  })

  it('starts a new screening with the notebook on, not mental arithmetic', () => {
    const { draft } = screeningDraftFromAssignment({ titleSv: 'Tom', items: [] }, findTask)
    expect(draft.customGrid).toBe(true)
  })
})
