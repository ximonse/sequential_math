import { getTicketResponseForDispatch } from '../../../lib/tickets'
import { getRecordClassIds, getRecordClassLabel } from './dashboardCoreHelpers'

const DAY_MS = 24 * 60 * 60 * 1000

export function buildTicketTagOptions(ticketTemplates) {
  const tags = new Set()
  for (const item of ticketTemplates) {
    for (const tag of Array.isArray(item.tags) ? item.tags : []) {
      if (tag) tags.add(tag)
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'sv'))
}

export function buildTicketTemplateRows(ticketTemplates, ticketTemplateFilter, ticketTagFilter, ticketSortBy) {
  const search = ticketTemplateFilter.trim().toLowerCase()
  const rows = ticketTemplates.filter(item => {
    if (ticketTagFilter && !(Array.isArray(item.tags) && item.tags.includes(ticketTagFilter))) return false
    if (!search) return true
    const hay = `${item.question} ${item.answer} ${(item.tags || []).join(' ')}`.toLowerCase()
    return hay.includes(search)
  })
  if (ticketSortBy === 'oldest') {
    rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  } else if (ticketSortBy === 'alpha') {
    rows.sort((a, b) => String(a.question || '').localeCompare(String(b.question || ''), 'sv'))
  } else {
    rows.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
  }
  return rows
}

export function getSelectedTicketDispatch(ticketDispatches, selectedTicketDispatchId) {
  return ticketDispatches.find(item => item.id === selectedTicketDispatchId) || null
}

export function buildTicketResponseRows(filteredStudents, ticketSelectedDispatch, classNameById) {
  if (!ticketSelectedDispatch) return []
  const targetIds = new Set(
    Array.isArray(ticketSelectedDispatch.targetStudentIds)
      ? ticketSelectedDispatch.targetStudentIds
      : []
  )
  const rows = filteredStudents.flatMap(student => {
    const response = getTicketResponseForDispatch(student, ticketSelectedDispatch.id)
    const included = targetIds.has(student.studentId) || Boolean(response)
    if (!included) return []
    return {
      studentId: student.studentId,
      name: student.name,
      className: getRecordClassLabel(student, classNameById),
      answered: Boolean(response),
      isCorrect: response?.isCorrect === true,
      studentAnswer: response?.studentAnswer || '',
      answeredAt: response?.answeredAt || null
    }
  })
  rows.sort((a, b) => {
    if (a.answered !== b.answered) return a.answered ? -1 : 1
    if (a.isCorrect !== b.isCorrect) return a.isCorrect ? -1 : 1
    return a.name.localeCompare(b.name, 'sv')
  })
  return rows
}

export function buildTicketResponseMeta(ticketResponseRows) {
  const answered = ticketResponseRows.filter(item => item.answered).length
  const correct = ticketResponseRows.filter(item => item.answered && item.isCorrect).length
  const wrong = ticketResponseRows.filter(item => item.answered && !item.isCorrect).length
  return {
    answered,
    correct,
    wrong,
    total: ticketResponseRows.length
  }
}

export function buildTicketStudentOptions(students, classNameById) {
  return students
    .map(student => ({
      studentId: student.studentId,
      name: student.name,
      classIds: getRecordClassIds(student),
      className: getRecordClassLabel(student, classNameById)
    }))
    .sort(compareClassAndName)
}

export function filterTicketStudentOptions(ticketStudentOptions, ticketStudentSearch) {
  const search = ticketStudentSearch.trim().toLowerCase()
  if (!search) return ticketStudentOptions
  return ticketStudentOptions.filter(item => (
    `${item.name} ${item.studentId} ${item.className}`.toLowerCase().includes(search)
  ))
}

export function buildTicketResolvedTargetStudentIds({
  ticketTargetClassIds,
  ticketTargetStudentIds,
  filteredStudents,
  students,
  recordMatchesClassFilter
}) {
  const ids = new Set()
  if (ticketTargetClassIds.length === 0 && ticketTargetStudentIds.length === 0) {
    for (const item of filteredStudents) ids.add(item.studentId)
    return ids
  }
  if (ticketTargetClassIds.length > 0) {
    for (const student of students) {
      if (recordMatchesClassFilter(student, ticketTargetClassIds)) {
        ids.add(student.studentId)
      }
    }
  }
  for (const studentId of ticketTargetStudentIds) {
    ids.add(studentId)
  }
  return ids
}

export function buildTicketDispatchMap(ticketDispatches) {
  const map = new Map()
  for (const dispatch of ticketDispatches) map.set(dispatch.id, dispatch)
  return map
}

export function buildTicketHistoryStudentOptions(filteredStudents, classNameById) {
  return filteredStudents
    .map(student => ({
      studentId: student.studentId,
      name: student.name,
      className: getRecordClassLabel(student, classNameById)
    }))
    .sort(compareClassAndName)
}

export function buildTicketHistorySummary(ticketHistoryStudent) {
  const empty = {
    total: 0,
    correct: 0,
    wrong: 0,
    last7Days: 0,
    last30Days: 0,
    uniqueDispatches: 0,
    accuracy: 0,
    latestAnsweredAt: null
  }
  if (!ticketHistoryStudent) return empty
  const responses = Array.isArray(ticketHistoryStudent.ticketResponses) ? ticketHistoryStudent.ticketResponses : []
  if (responses.length === 0) return empty

  const now = Date.now()
  let correct = 0
  let last7Days = 0
  let last30Days = 0
  let latestAnsweredAt = 0
  const uniqueDispatches = new Set()

  for (const response of responses) {
    if (response?.isCorrect === true) correct += 1
    const answeredAt = Number(response?.answeredAt || 0)
    if (answeredAt > 0) {
      if (answeredAt >= now - (7 * DAY_MS)) last7Days += 1
      if (answeredAt >= now - (30 * DAY_MS)) last30Days += 1
      if (answeredAt > latestAnsweredAt) latestAnsweredAt = answeredAt
    }
    if (response?.dispatchId) uniqueDispatches.add(response.dispatchId)
  }

  const total = responses.length
  const wrong = total - correct
  return {
    total,
    correct,
    wrong,
    last7Days,
    last30Days,
    uniqueDispatches: uniqueDispatches.size,
    accuracy: total > 0 ? (correct / total) : 0,
    latestAnsweredAt: latestAnsweredAt > 0 ? latestAnsweredAt : null
  }
}

export function buildTicketHistoryRows({
  ticketHistoryStudent,
  ticketHistorySearch,
  ticketHistoryKindFilter,
  ticketHistoryResultFilter,
  ticketDispatchMap
}) {
  if (!ticketHistoryStudent) return []
  const search = ticketHistorySearch.trim().toLowerCase()
  const responses = Array.isArray(ticketHistoryStudent.ticketResponses) ? ticketHistoryStudent.ticketResponses : []
  const rows = responses.map(response => {
    const dispatch = ticketDispatchMap.get(response?.dispatchId || '')
    const kind = response?.kind === 'exit'
      ? 'exit'
      : (response?.kind === 'start' ? 'start' : (dispatch?.kind === 'exit' ? 'exit' : 'start'))
    const title = String(response?.title || dispatch?.title || (kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'))
    const question = String(response?.question || dispatch?.question || '')
    const expectedAnswer = String(response?.expectedAnswer || dispatch?.answer || '')
    const studentAnswer = String(response?.studentAnswer || '')
    const tags = Array.isArray(dispatch?.tags) ? dispatch.tags : []
    return {
      dispatchId: String(response?.dispatchId || ''),
      kind,
      title,
      question,
      expectedAnswer,
      studentAnswer,
      isCorrect: response?.isCorrect === true,
      answeredAt: Number(response?.answeredAt || 0) || null,
      tags
    }
  })

  const filtered = rows.filter(row => {
    if (ticketHistoryKindFilter !== 'all' && row.kind !== ticketHistoryKindFilter) return false
    if (ticketHistoryResultFilter === 'correct' && !row.isCorrect) return false
    if (ticketHistoryResultFilter === 'wrong' && row.isCorrect) return false
    if (!search) return true
    const hay = `${row.title} ${row.question} ${row.studentAnswer} ${row.expectedAnswer} ${row.tags.join(' ')}`.toLowerCase()
    return hay.includes(search)
  })

  filtered.sort((a, b) => (Number(b.answeredAt || 0) - Number(a.answeredAt || 0)))
  return filtered
}

function compareClassAndName(a, b) {
  const classCompare = String(a.className).localeCompare(String(b.className), 'sv')
  if (classCompare !== 0) return classCompare
  return String(a.name).localeCompare(String(b.name), 'sv')
}
