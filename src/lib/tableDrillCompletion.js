import { getStockholmDateKey, getStockholmDaysAgoStart } from './teacherEvidencePeriods.js'

const validTable = value => Number.isInteger(Number(value)) && Number(value) >= 2 && Number(value) <= 12

/** A monotonic positive fact. Missing entries never mean "never completed". */
export function completedTablesEver(tableDrill) {
  const tables = new Set()
  for (const value of (Array.isArray(tableDrill?.completedTablesEver) ? tableDrill.completedTablesEver : [])) {
    if (validTable(value)) tables.add(Number(value))
  }
  for (const completion of (Array.isArray(tableDrill?.completions) ? tableDrill.completions : [])) {
    if (validTable(completion?.table) && Number.isFinite(Number(completion?.timestamp)) && Number(completion.timestamp) > 0) {
      tables.add(Number(completion.table))
    }
  }
  return [...tables].sort((a, b) => a - b)
}

export function markTableCompleted(tableDrill, table) {
  if (!validTable(table) || !tableDrill || typeof tableDrill !== 'object') return
  tableDrill.completedTablesEver = [...new Set([...completedTablesEver(tableDrill), Number(table)])].sort((a, b) => a - b)
}

export function tableCompletionStatus(tableDrill, table, now = Date.now()) {
  const knownEver = completedTablesEver(tableDrill).includes(Number(table))
  const today = getStockholmDateKey(now)
  const weekStart = getStockholmDateKey(getStockholmDaysAgoStart(now, 6))
  let todayCompleted = false
  let weekCompleted = false
  for (const completion of (Array.isArray(tableDrill?.completions) ? tableDrill.completions : [])) {
    const timestamp = Number(completion?.timestamp)
    if (Number(completion?.table) !== Number(table) || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now) continue
    const date = getStockholmDateKey(timestamp)
    if (date === today) todayCompleted = true
    if (date >= weekStart && date <= today) weekCompleted = true
  }
  return { knownEver, weekCompleted, todayCompleted }
}
