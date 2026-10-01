import { createDiagnosticArchivePoint } from './diagnosticArchivePoint.js'

export const DIAGNOSTIC_ARCHIVE_SERIES_VERSION = 1

// The caller must finish the deletion transaction before this draft can be
// persisted. No active-account key is returned or retained here.
export function buildDiagnosticArchiveSeries(sources) {
  if (!Array.isArray(sources) || sources.length > 10000) {
    throw new Error('Invalid diagnostic archive source list')
  }
  const points = sources.map(createDiagnosticArchivePoint)
  points.sort((left, right) => {
    if (left.month === null) return right.month === null ? 0 : 1
    if (right.month === null) return -1
    return left.month.localeCompare(right.month)
  })
  return { seriesVersion: DIAGNOSTIC_ARCHIVE_SERIES_VERSION, status: 'frozen', points }
}
