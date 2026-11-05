import { describe, expect, it } from 'vitest'
import { practiceEvidence, evidencePage } from '../../api/_pupilEvidence.js'
import { buildAnalyticsSnapshot, buildDetailedProblemExportRows } from './teacherAnalytics.js'
import { buildHeatmapData } from '../components/teacher/sections/classMisconceptionHeatmapData.js'
import { buildPupilAnalysisDraft, validatePupilAnalysis } from './pupilAnalysis.js'
import { teacherPracticeHistory } from './teacherPracticeHistory.js'
import { teacherPracticeRows } from './teacherPracticeRows.js'

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
})
