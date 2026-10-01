import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid } from './diagnosticGridModel.js'
import { buildDiagnosticArchiveSeries } from './diagnosticArchiveSeries.js'

const task = manifest.tasks[0]
const source = (attemptId, createdAt) => ({
  record: { attemptId, studentId: 'PRIVATE-PUPIL', classIdAtAttempt: 'PRIVATE-CLASS',
    evidenceClass: 'diagnostic_only', taskId: task.taskId, taskVersion: task.taskVersion,
    serverRevision: 0, lastSequence: 0, status: 'in_progress', createdAt },
  task,
  snapshot: createDiagnosticGrid({ attemptId, taskId: task.taskId, taskVersion: task.taskVersion })
})

describe('frozen diagnostic archive series draft', () => {
  it('sorts historical months without retaining active identity or source objects', () => {
    const later = source('LATER', Date.UTC(2026, 7, 4))
    const earlier = source('EARLIER', Date.UTC(2026, 1, 8))
    const unknown = source('UNKNOWN', undefined)
    const series = buildDiagnosticArchiveSeries([later, unknown, earlier])
    expect(series.status).toBe('frozen')
    expect(series.points.map(point => point.month)).toEqual(['2026-02', '2026-08', null])
    expect(JSON.stringify(series)).not.toMatch(/PRIVATE|LATER|EARLIER|UNKNOWN|events|cells/u)
    expect(later.record.createdAt).toBe(Date.UTC(2026, 7, 4))
  })

  it('rejects inconsistent source sets instead of silently dropping a point', () => {
    expect(() => buildDiagnosticArchiveSeries([source('GOOD', Date.now()),
      { ...source('BAD', Date.now()), record: { ...source('BAD', Date.now()).record,
        lastSequence: 1 } }])).toThrow()
  })
})
