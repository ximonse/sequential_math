import { describe, expect, it } from 'vitest'
import { practiceEvidence, evidencePage } from '../../api/_pupilEvidence.js'
import { buildAnalyticsSnapshot, buildDetailedProblemExportRows } from './teacherAnalytics.js'
import { buildHeatmapData } from '../components/teacher/sections/classMisconceptionHeatmapData.js'
import { buildPupilAnalysisDraft, validatePupilAnalysis } from './pupilAnalysis.js'
import { teacherPracticeHistory } from './teacherPracticeHistory.js'
import { teacherPracticeRows } from './teacherPracticeRows.js'
import { isKnowledgeError } from '../components/teacher/sections/dashboardTableStatusUtils.js'

describe('one current observation across teacher readers', () => {
  it('ignores invalid clocks when choosing a collection and uses the fuller collection on equal clocks', () => {
    const log = [{ timestamp: 10 }, { timestamp: 10 }], recent = [{ timestamp: 10 }]
    expect(teacherPracticeHistory({ problemLog: log, recentProblems: recent }).source).toBe('problemLog')
    expect(teacherPracticeHistory({ problemLog: log, recentProblems: [{ timestamp: Infinity }] }).source).toBe('problemLog')
    expect(teacherPracticeHistory({ problemLog: log, recentProblems: [{ timestamp: '1000' }] }).source).toBe('problemLog')
    expect(teacherPracticeHistory({ recentProblems: recent }).source).toBe('recentProblems')
  })
  it('deduplicates identified observations across readers but preserves conflicting and unidentified versions', () => {
    const row = { observationId: 'SAME', timestamp: 10, domain: 'arithmetic', operation: 'subtraction',
      targetLevel: 4, difficulty: { conceptual_level: 4 }, values: { a: 402, b: 178 },
      studentAnswer: 376, correctAnswer: 224, correct: false, errorCategory: 'misconception' }
    const profile = { studentId: 'P', name: 'Synthetic', problemLog: [row, structuredClone(row)] }
    expect(practiceEvidence(profile).entries).toHaveLength(1)
    expect(buildDetailedProblemExportRows(buildAnalyticsSnapshot([profile]))).toHaveLength(1)
    const cell = buildHeatmapData([profile]).subtraction[0].cells.find(cell => cell.level === 4)
    expect(cell.currentCandidates).toContainEqual(['smaller_minus_larger', 1])
    expect(cell.attempts).toBe(1)
    expect(teacherPracticeRows(profile).duplicates).toBe(1)
    const conflict = teacherPracticeRows({ problemLog: [row, { ...row, studentAnswer: 300 }] })
    expect(conflict.entries).toHaveLength(2)
    expect(conflict.warnings).toContain('conflicting_observation_ids')
    const legacy = { ...row }; delete legacy.observationId
    expect(teacherPracticeRows({ problemLog: [legacy, { ...legacy }] }).entries).toHaveLength(2)
    expect(teacherPracticeRows({ problemLog: [{ ...row, timestamp: 0 }] }).invalidTimestamps).toBe(1)
  })
  it('keeps all current candidates and source identity while preserving historical grading and mastery', () => {
    const profile = { studentId: 'P', name: 'Synthetic', masteryFacts: { retained: true },
      problemLog: [{ observationId: 'old', timestamp: 1 }], recentProblems: [{ observationId: 'OBS', timestamp: 10,
        operation: 'subtraction', domain: 'arithmetic', problemType: 'subtraction_A',
        difficulty: { conceptual_level: 4 }, targetLevel: 4, values: { a: 402, b: 178 },
        studentAnswer: 376, correctAnswer: 224, correct: false,
        errorCategory: 'misconception', errorPatterns: ['historic_first_match'] }] }
    const before = JSON.stringify(profile)
    const practice = practiceEvidence(profile)
    expect(practice.coverage.source).toBe('recentProblems')
    const evidence = evidencePage({ studentId: 'P', classId: 'C', source: 'practice',
      period: { from: '2026-11-04', to: '2026-11-04', startInclusive: 1, endExclusive: 100 },
      practice, screening: { entries: [], coverage: {} }, query: {} })
    const modelIds = [...new Set(evidence.entries[0].interpretation.predictable.matches.map(model => model.modelId))].sort()
    expect(modelIds).toContain('smaller_minus_larger')
    const report = validatePupilAnalysis(buildPupilAnalysisDraft(evidence), evidence)
    expect(report.hypotheses.find(item => item.signalCode === 'smaller_minus_larger').supportRefs).toEqual([evidence.entries[0].ref])
    const exported = buildDetailedProblemExportRows(buildAnalyticsSnapshot([profile]))
    expect(exported).toHaveLength(1)
    expect(exported[0].ObservationsID).toBe('OBS')
    expect(exported[0].HistoriskFelkategori).toBe('misconception')
    expect(exported[0].AktuellaModellkandidater.split('|').sort()).toEqual(modelIds)
    const cell = buildHeatmapData([profile]).subtraction[0].cells.find(cell => cell.level === 4)
    expect(cell.currentCandidates.map(([id]) => id).sort()).toEqual(modelIds)
    expect(cell.candidateExamples[0].observationId).toBe('OBS')
    expect(evidence.entries[0].interpretation.patterns).toEqual(['historic_first_match'])
    expect(JSON.stringify(profile)).toBe(before)
  })
  it('lets the class heatmap list name a wrong answer by its current explanation, not a contradicting saved label', () => {
    const base = { domain: 'arithmetic', operation: 'subtraction', targetLevel: 4, difficulty: { conceptual_level: 4 },
      values: { a: 402, b: 178 }, correctAnswer: 224, correct: false, errorCategory: 'knowledge',
      patterns: ['calculation_error'], errorDetail: 'Fel svar utan identifierat mönster.' }
    const profile = { studentId: 'P', name: 'Synthetic', problemLog: [
      { ...base, observationId: 'EXPLAINED', timestamp: 10, studentAnswer: 376 },
      { ...base, observationId: 'UNEXPLAINED', timestamp: 20, studentAnswer: 999 }] }
    const cell = buildHeatmapData([profile]).subtraction[0].cells.find(cell => cell.level === 4)
    const explained = cell.wrongAnswers.find(answer => answer.studentAnswer === 376)
    expect(explained.currentModelIds).toContain('smaller_minus_larger')
    expect(cell.currentCandidates.map(([id]) => id)).toEqual(expect.arrayContaining(explained.currentModelIds))
    expect(cell.wrongAnswers.find(answer => answer.studentAnswer === 999).currentModelIds).toEqual([])
    // The saved label still counts for the answer nothing explains now, and only for it.
    expect(cell.topPatterns).toEqual(['calculation_error'])
    const onlyExplained = buildHeatmapData([{ ...profile, problemLog: [profile.problemLog[0]] }]).subtraction[0].cells.find(cell => cell.level === 4)
    expect(onlyExplained.topPatterns).toEqual([])
  })
  it('counts a wrong operation saved as inattention as a knowledge error in teacher views, and nothing else', () => {
    const base = { domain: 'arithmetic', operation: 'subtraction', problemType: 'subtraction_A', targetLevel: 4,
      difficulty: { conceptual_level: 4 }, values: { a: 402, b: 178 }, result: 224, answer: { correct: 224 },
      correctAnswer: 224, correct: false, errorCategory: 'inattention' }
    const swap = { ...base, observationId: 'SWAP', timestamp: 10, studentAnswer: 580 }
    const other = { ...base, observationId: 'OTHER', timestamp: 20, studentAnswer: 999 }
    const profile = { studentId: 'P', name: 'Synthetic', problemLog: [swap, other] }
    const before = JSON.stringify(profile)
    expect(isKnowledgeError(swap)).toBe(true)
    expect(isKnowledgeError(other)).toBe(false)
    const rows = buildDetailedProblemExportRows(buildAnalyticsSnapshot([profile]))
    expect(rows.map(row => [row.ObservationsID, row.Kunskapsfel, row['Ouppmärksamhetsfel'], row.HistoriskFelkategori]))
      .toEqual(expect.arrayContaining([['SWAP', 1, 0, 'inattention'], ['OTHER', 0, 1, 'inattention']]))
    const cell = buildHeatmapData([profile]).subtraction[0].cells.find(cell => cell.level === 4)
    expect(cell.wrongAnswers.map(answer => answer.studentAnswer)).toEqual([580])
    expect(cell.wrongAnswers[0].currentModelIds).toContain('operation_swap')
    expect(JSON.stringify(profile)).toBe(before)
  })
})
