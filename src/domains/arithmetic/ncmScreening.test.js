import { describe, expect, it } from 'vitest'
import writtenManifest from './diagnosticTasks.v1.json'
import writtenPacks from './diagnosticTaskPacks.v1.json'
import ncmManifest from './ncmScreeningTasks.v1.json'
import { buildDiagnosticCatalog } from './diagnosticCatalog.js'
import { checkNcmAnswer } from './ncmAnswerCheck.js'

const catalog = buildDiagnosticCatalog({ writtenManifest, writtenPacks, ncmManifest })
const task = id => catalog.findTask(id)

// Independently computed answers; a mistyped facit entry fails here.
const computed = {
  'ncm-AG4-4a': 84 + 9, 'ncm-AG4-4b': 63 - 8, 'ncm-AG4-1b': 90 - 50, 'ncm-AS1-4': 347 + 288,
  'ncm-AS2-5': 703 - 256, 'ncm-AS3-6': 525 - 378, 'ncm-AS9-1': 11.63, 'ncm-AS9-4': 0.43,
  'ncm-AG6-3b': 7 * 8, 'ncm-AG8-2b': 56 / 8, 'ncm-AG7-1b': 6 * 6 + 7, 'ncm-AG7-2b': 7 * 60,
  'ncm-AS4-4': 8 * 67, 'ncm-AS5-3': 176 / 4, 'ncm-AS6-7': 405 / 9,
  'ncm-RD1-1d': 0.03, 'ncm-RD1-2b': 0.25, 'ncm-RD1-4c': 0.8, 'ncm-RD2-2b': 2.4, 'ncm-RD2-6b': 0.25,
  'ncm-RD3-2b': 1.25, 'ncm-RD3-6a': 2, 'ncm-RB3-4d': 8 * 3 / 4, 'ncm-RB3-6': (12 - 4) / 2,
  'ncm-RB4-5c': 15 * 2 / 3, 'ncm-RB5-5b': 3, 'ncm-RP1-1a': 4, 'ncm-RP1-2c': 400 / 4 * 12,
  'ncm-RP1-4a': 300 * 2 / 3, 'ncm-RP3-1b': 30, 'ncm-RP3-2a': 20, 'ncm-RP3-5b': 480 / 4,
  'ncm-RP4-1': 25, 'ncm-RP4-4': 800 / 2000 * 100, 'ncm-TAt3-2b': 59 - 5, 'ncm-TAe1-1c': 6 / 3,
  'ncm-TAe1-2a': 1, 'ncm-TAu2-2a': 2 * 0.5 + 3 * 0.2, 'ncm-TAe2-1': (10 - 4) / 3, 'ncm-TAe2-4': (7 + 2) / 3
}

describe('NCM Diamant screening', () => {
  it('keeps every task unique, packed and backed by its diagnosis analysis', () => {
    const ids = ncmManifest.tasks.map(item => item.taskId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(catalog.tasks.map(item => item.taskId)).size).toBe(catalog.tasks.length)
    for (const pack of ncmManifest.packs) for (const id of pack.taskIds) expect(task(id), id).toBeTruthy()
    for (const item of ncmManifest.tasks) {
      expect(ncmManifest.codes[item.ncmCode], item.taskId).toBeTruthy()
      expect(catalog.guideFor(item).questionSv).toBe(ncmManifest.codes[item.ncmCode].followUpSv)
      expect(['number', 'text']).toContain(item.answerType)
    }
    expect(catalog.guideFor(writtenManifest.tasks[0]).goalSv).toBeTruthy()
  })

  it('has a facit that matches an independent calculation', () => {
    for (const [id, value] of Object.entries(computed)) {
      expect(Math.abs(task(id).expected[0] - value), id).toBeLessThan(1e-9)
      expect(checkNcmAnswer(task(id), String(value).replace('.', ',')), id).toBe('correct')
    }
  })

  it('accepts units, "x =", spaces in large numbers and point or comma', () => {
    expect(checkNcmAnswer(task('ncm-AS3-6'), '147 kr')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-TAe2-4'), 'x = 3')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-RP1-2c'), '1 200')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-AS9-4'), '0.43')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-AS9-4'), '0,53')).toBe('incorrect')
    expect(checkNcmAnswer(task('ncm-AS9-4'), '')).toBe('unanswered')
    expect(checkNcmAnswer(task('ncm-AS9-4'), 'vet ej')).toBe('incomplete')
  })

  it('marks open answers, fractions, sequences and words', () => {
    expect(checkNcmAnswer(task('ncm-RD1-3c'), '0,45')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-RD1-3c'), '0,5')).toBe('incorrect')
    expect(checkNcmAnswer(task('ncm-RB5-2c'), '2/8')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-RB5-2c'), '1/3')).toBe('incorrect')
    expect(checkNcmAnswer(task('ncm-RB5-2c'), '0,25')).toBe('incomplete')
    expect(checkNcmAnswer(task('ncm-RB1-5a'), ' 1/3 ')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-RB1-5a'), '2/6')).toBe('incorrect')
    expect(checkNcmAnswer(task('ncm-AG8-3a'), '9 rest 2')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-AG8-3a'), '9')).toBe('incorrect')
    expect(checkNcmAnswer(task('ncm-TAt1-7'), '52, 62, 72')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-TAt3-5b'), 'Jämnt')).toBe('correct')
    expect(checkNcmAnswer(task('ncm-TAt3-5b'), 'udda')).toBe('incorrect')
  })
})
