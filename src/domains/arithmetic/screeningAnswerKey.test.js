import { describe, expect, it } from 'vitest'
import { checkScreeningAnswerKey as check, normalizeScreeningAnswerKey as normalize, screeningAnswerKeyFromText as fromText, screeningAnswerKeyLabel as label } from './screeningAnswerKey.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { summarizeDiagnosticObservation } from './diagnosticObservation.js'

describe('frozen keys for original screening questions', () => {
  it.each([
    ['number', '2,35', '', '2.35', 'correct'], ['number', '2350', '', '2 350', 'correct'],
    ['number', '2,35', 'kg', '2,35 kg', 'correct'], ['number', '2,35', 'kg', '2,35', 'correct'],
    ['number', '2,35', 'kg', '2,35 g', 'incorrect'], ['number', '35', '%', '35 %', 'correct'],
    ['number', '1,07', 'liter', '1,07 l', 'correct'], ['number', '1,07', 'l', '1,07 liter', 'correct'],
    ['number', '35', '%', '0,35', 'incorrect'], ['number', '23', '', 'x = 23', 'correct'],
    ['number', '23', '', '23 + 0', 'incorrect'], ['number', '23', '', '23 procent', 'incorrect'],
    ['fraction', '3/8', '', '6/16', 'correct'], ['fraction', '3/8', '', '0,375', 'incomplete'],
    ['fraction', '-3/8', '', '-6/16', 'correct'], ['fraction', '3/8', '', '3/0', 'incorrect'],
    ['mixed', '2 3/8', '', '2 6/16', 'correct'], ['mixed', '2 3/8', '', '19/8', 'incomplete'],
    ['mixed', '2 3/8', '', '1 11/8', 'incorrect'],
    ['numbers', '0,45; 45', '', '0.45 and 45', 'correct'],
    ['numbers', '0,45; 45', '', '0.45 % and 45 %', 'incorrect'],
    ['numbers', '0,45; 45', '', '0,45; 45', 'correct'],
    ['numbers', '0,45; 45', '', '45; 0,45', 'incorrect'],
    ['numbers', '0,45; 45', '', '0,45 + 45', 'incorrect'],
    ['text', 'två tredjedelar; 2/3', '', 'Två tredjedelar.', 'correct'],
    ['text', 'två tredjedelar; 2/3', '', 'jag tror två tredjedelar', 'incorrect'],
  ])('%s key %s marks %s', (format, value, unit, answer, status) => {
    expect(check(fromText(format, value, unit), answer)).toBe(status)
    expect(check(fromText(format, value, unit), '')).toBe('unanswered')
  })

  it.each([
    { format: 'number', expected: [Infinity] }, { format: 'number', expected: [] },
    { format: 'number', expected: [1, 2] }, { format: 'fraction', expected: [1, 0] },
    { format: 'fraction', expected: [1.1, 2] }, { format: 'mixed', expected: [1, 2] },
    { format: 'numbers', expected: [1] }, { format: 'text', expected: [''] },
    { format: 'number', expected: [1], unit: '<script>' }, { format: 'number', expected: [1], extra: true },
  ])('rejects invalid teacher key %# before assignment', key => expect(() => normalize(key)).toThrow())

  it('copies the expected values and round-trips teacher formats', () => {
    const expected = [2.35], key = normalize({ format: 'number', expected, unit: 'kg' })
    expected[0] = 99
    expect(label(key)).toBe('2,35 kg')
    expect(fromText('mixed', '2 3/8')).toEqual({ format: 'mixed', expected: [19, 8] })
    expect(() => fromText('mixed', '1 9/8')).toThrow()
    expect(check(fromText('number', '1'), '1,0000000001')).toBe('incorrect')
    expect(check(fromText('fraction', '1/1000000000000'), '0/1')).toBe('incorrect')
    expect(check(fromText('fraction', '64/100', '', true), '16/25')).toBe('incorrect')
    expect(check(fromText('fraction', '64/100', '', true), '64/100')).toBe('correct')
  })

  it('uses the screening observation pipeline without treating correct final answers as proof of method', () => {
    const task = { taskId: 'custom-key', taskVersion: 1, answerRule: 'custom_facit', answerType: 'text',
      answerKey: fromText('number', '2,35') }
    const initial = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: 1, answerType: 'text' })
    const answered = recordDiagnosticGridEvent(initial, { type: 'answer_change', before: '', after: '2.35' }, 1)
    expect(summarizeDiagnosticObservation(task, answered)).toMatchObject({ answerStatus: 'correct', expectedAnswer: '2,35',
      submitted: false, finalOccupiedCells: 0, hasWorkHistory: false })
    expect(summarizeDiagnosticObservation(task, initial).answerStatus).toBe('unanswered')
    expect(summarizeDiagnosticObservation({ ...task, answerRule: 'teacher_review' }, answered).answerStatus).toBe('unassessed')
  })
})
