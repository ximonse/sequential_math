// Keep the latest available collection, with the fuller collection as tie-break.
// This is a teacher read policy; it does not change pupil progression or saving.
export function teacherPracticeHistory(profile) {
  const log = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  const latest = entries => entries.reduce((value, entry) => {
    const timestamp = entry?.timestamp
    return Number.isFinite(timestamp) ? Math.max(value, timestamp) : value
  }, 0)
  const logLatest = latest(log), recentLatest = latest(recent)
  const useRecent = !log.length || (recent.length > 0 && (recentLatest > logLatest || (recentLatest === logLatest && recent.length > log.length)))
  return { source: useRecent ? 'recentProblems' : 'problemLog', entries: useRecent ? recent : log }
}
