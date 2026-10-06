import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import packs from './diagnosticTaskPacks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { analyzeDiagnosticSubtractionPattern } from './diagnosticSubtractionPattern.js'

const answers = {
  'add-no-carry-001': 699, 'add-no-carry-002': 778,
  'add-carry-001': 575, 'add-tens-carry-001': 745,
  'add-chain-carry-001': 625, 'add-chain-carry-002': 833,
  'sub-no-exchange-001': 533, 'sub-no-exchange-002': 534,
  'sub-exchange-001': 425, 'sub-exchange-002': 325,
  'sub-through-zero-001': 224, 'sub-through-zero-002': 236
}

describe('written arithmetic diagnostic content', () => {
  it('keeps the original four task identities and versions while extending the manifest', () => {
    expect(manifest.manifestVersion).toBe(2)
    expect(manifest.tasks.slice(0, 4).map(task => [task.taskId, task.taskVersion, task.operands])).toEqual([
      ['add-no-carry-001', 1, [268, 431]], ['add-carry-001', 1, [248, 327]],
      ['sub-no-exchange-001', 1, [764, 231]], ['sub-through-zero-001', 1, [402, 178]]
    ])
    expect(manifest.tasks).toHaveLength(12)
    expect(new Set(manifest.tasks.map(task => task.taskId)).size).toBe(12)
  })
  it('checks every independent answer key through the actual observation path', () => {
    for (const task of manifest.tasks) {
      const grid = createDiagnosticGrid({ attemptId: task.taskId, taskId: task.taskId, taskVersion: task.taskVersion })
      const answered = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: String(answers[task.taskId]) }, 1)
      expect(summarizeDiagnosticObservation(task, answered)).toMatchObject({ expectedAnswer: answers[task.taskId], answerStatus: 'correct' })
      expect(packs.guides[task.intentCode]?.questionSv).toBeTruthy()
    }
  })
  it('offers ordered packs without duplicate, missing or mixed-operation tasks', () => {
    expect(packs.packs.map(pack => pack.taskIds.length)).toEqual([6, 6, 12])
    for (const pack of packs.packs) {
      expect(new Set(pack.taskIds).size).toBe(pack.taskIds.length)
      for (const id of pack.taskIds) expect(manifest.tasks.find(task => task.taskId === id)).toBeTruthy()
    }
    const operations = pack => pack.taskIds.map(id => manifest.tasks.find(task => task.taskId === id).operation)
    expect(operations(packs.packs[0])).toEqual(Array(6).fill('addition'))
    expect(operations(packs.packs[1])).toEqual(Array(6).fill('subtraction'))
    expect(packs.packs[2].taskIds).toEqual([...packs.packs[0].taskIds, ...packs.packs[1].taskIds])
  })
  it('does not generalize the existing task-specific subtraction hypothesis to new questions', () => {
    const task = manifest.tasks.find(task => task.taskId === 'sub-through-zero-002')
    const snapshot = createDiagnosticGrid({ attemptId: 'NEW', taskId: task.taskId, taskVersion: task.taskVersion })
    expect(analyzeDiagnosticSubtractionPattern(task, snapshot).status).toBe('not_applicable')
  })
})
