import { filterAttentionResults, summarizeAttentionResults } from '../../../lib/attentionStatistics'
import { isComparableAttentionPass } from '../../../lib/attentionHistory'

export const FOCUS_MODES = ['discover', 'choose', 'multi']

export function buildAttentionGroup(students, records, { days = 'all', now = Date.now() } = {}) {
  return students.map(student => {
    const record = records[student.studentId]
    const history = record?.status === 'ready' ? filterAttentionResults(record.history, { days, now }) : []
    return {
      studentId: student.studentId, name: student.name || student.displayAlias || student.studentId,
      classIds: [...new Set([student.classId, ...(student.classIds || [])].filter(Boolean))],
      status: record?.status || 'loading', history,
      groups: Object.fromEntries(summarizeAttentionResults(history).map(group => [group.mode, group]))
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'sv') || a.studentId.localeCompare(b.studentId))
}

// Different exercises keep separate axes; no joint score or pooled reaction median.
export function attentionCoordinates(row, mode) {
  if (mode === 'discover') {
    const latest = row.history.find(pass => pass.mode === mode && isComparableAttentionPass(pass) && pass.summary.median !== null)
    return latest ? { x: latest.summary.median, y: latest.summary.early * 60000 / latest.activeMs, row } : null
  }
  const group = row.groups[mode]
  if (!group?.completed) return null
  const x = mode === 'discover' ? group.earlyPerMinute : mode === 'choose' ? group.go.percent : group.repeat.percent
  const y = mode === 'multi' ? group.switch.percent : mode === 'choose' ? group.stop.percent : group.go.percent
  return x === null || y === null ? null : { x, y, row }
}

// Bounded requests use the existing teacher access checks. A failed read is never
// represented as an empty history. Obsolete group selections stop scheduling reads.
export async function loadAttentionGroup(students, loadProfile, onRecord, isActive = () => true) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, students.length) }, async () => {
    while (isActive() && next < students.length) {
      const student = students[next++]
      let profile = null
      try { profile = await loadProfile(student.studentId) } catch { /* Shown as a read error. */ }
      if (!isActive()) return
      const valid = profile?.studentId === student.studentId
      onRecord(student.studentId, valid ? { status: 'ready', history: profile.attentionHistory || [] } : { status: 'error' })
    }
  }))
}
