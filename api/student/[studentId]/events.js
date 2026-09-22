import { mutateStudentRecord, studentStoreError } from '../../_studentStore.js'
import { assertTeacherStudentAccess } from '../../_studentAccess.js'
import { verifyStudentCredential } from '../../_studentPassword.js'
import {
  isLiveTeacherApiAuthorized,
  withCors
} from '../../_helpers.js'
import {
  isCurrentStudentProfile
} from '../../../src/lib/studentProfileContract.js'
import { isValidTrainingContext } from '../../../src/lib/trainingContext.js'
import { isValidAdaptationDecision, recordAdaptationDecision } from '../../../src/lib/adaptationDecision.js'
import { isValidCurrentNeed, recordCurrentNeed } from '../../../src/lib/currentNeed.js'
import { isContractMasteryFact } from '../../../src/lib/masteryFacts.js'

const MAX_PROBLEM_LOG = 5000
const MAX_RECENT_PROBLEMS = 250
const MAX_TABLE_COMPLETIONS = 1000
const MAX_EVENT_BYTES = 32 * 1024
const MAX_BATCH_BYTES = 256 * 1024
const MAX_TICKET_RESPONSES = 500
const CHECKPOINT_FIELDS = ['currentDifficulty', 'highestDifficulty', 'adaptive', 'operationAbilities', 'assignmentProgress', 'stats', 'telemetry', 'activity']
const EVIDENCE_CLASSES = new Set(['mastery_eligible', 'practice_only', 'diagnostic_only', 'invalid'])

function jsonBytes(value) {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') } catch { return Number.POSITIVE_INFINITY }
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function resolveClassIdAtAttempt(profile, payload) {
  const memberships = [profile?.classId, ...(Array.isArray(profile?.classIds) ? profile.classIds : [])]
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const requested = String(payload?.classIdAtAttempt || '').trim()
  return requested && memberships.includes(requested) ? requested : (memberships[0] || null)
}

function applyProblemResult(profile, payload) {
  if (!payload || typeof payload !== 'object') return false
  if (!payload.problemId && !payload.timestamp) return false

  // Dedup: kolla om redan finns i problemLog
  const ts = Number(payload.timestamp || 0)
  const pid = payload.problemId || ''
  const oid = String(payload.observationId || '')
  if (Array.isArray(profile.problemLog) && ts > 0 && pid) {
    const exists = profile.problemLog.some(
      p => (oid && p.observationId === oid)
        || (p.problemId === pid && Number(p.timestamp) === ts)
    )
    if (exists) return false // redan applicerad
  }

  if (!Array.isArray(profile.recentProblems)) profile.recentProblems = []
  if (!Array.isArray(profile.problemLog)) profile.problemLog = []

  const attributedPayload = { ...payload, classIdAtAttempt: resolveClassIdAtAttempt(profile, payload) }
  profile.recentProblems.push(attributedPayload)
  if (profile.recentProblems.length > MAX_RECENT_PROBLEMS) {
    profile.recentProblems = profile.recentProblems.slice(-MAX_RECENT_PROBLEMS)
  }

  profile.problemLog.push(attributedPayload)
  if (profile.problemLog.length > MAX_PROBLEM_LOG) {
    profile.problemLog = profile.problemLog.slice(-MAX_PROBLEM_LOG)
  }

  return true
}

function applyMasteryAchieved(profile, payload) {
  if (!payload?.operation || !payload?.level) return false

  if (!profile.masteryFacts || typeof profile.masteryFacts !== 'object') {
    profile.masteryFacts = { version: 1, facts: [], revokedIds: [] }
  }
  if (!Array.isArray(profile.masteryFacts.facts)) {
    profile.masteryFacts.facts = []
  }

  const incomingHasEvidence = Array.isArray(payload.evidenceObservationIds)
    && payload.evidenceObservationIds.some(id => String(id || '').trim())
  const revokedSet = new Set(Array.isArray(profile.masteryFacts.revokedIds)
    ? profile.masteryFacts.revokedIds
    : [])
  // Ett legacyfaktum utan belägg blockerar inte ett nytt kontraktsfaktum.
  const exists = profile.masteryFacts.facts.some(
    f => f.operation === payload.operation
      && f.level === payload.level
      && (!incomingHasEvidence || (isContractMasteryFact(f) && !revokedSet.has(f.id)))
  )
  if (exists) return false

  const achievedAt = Number(payload.achievedAt) || Date.now()
  profile.masteryFacts.facts.push({
    id: `${payload.operation}:${payload.level}:${achievedAt}`,
    operation: payload.operation,
    level: payload.level,
    achievedAt,
    window: payload.window || { attempts: 0, correct: 0, rate: 0 },
    source: 'wal',
    ruleVersion: Math.max(1, Math.round(Number(payload.ruleVersion) || 1)),
    evidenceObservationIds: Array.isArray(payload.evidenceObservationIds)
      ? payload.evidenceObservationIds.map(item => String(item || '').trim()).filter(Boolean).slice(0, 50)
      : []
  })

  return true
}

function applyTableCompleted(profile, payload, entry) {
  const table = Number(payload?.table)
  if (!Number.isFinite(table) || table < 2 || table > 12) return false

  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  if (!Array.isArray(profile.tableDrill.completions)) {
    profile.tableDrill.completions = []
  }

  const timestamp = Number(payload.timestamp || entry.timestamp)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false
  if (profile.tableDrill.completions.some(item =>
    item.eventId === entry.id || (item.table === table && item.timestamp === timestamp)
  )) return false
  profile.tableDrill.completions.push({ table, timestamp, eventId: entry.id })
  if (profile.tableDrill.completions.length > MAX_TABLE_COMPLETIONS) {
    profile.tableDrill.completions = profile.tableDrill.completions.slice(-MAX_TABLE_COMPLETIONS)
  }

  return true
}

function normalizeTicketAnswer(value) {
  const text = String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ')
  const number = Number(text.replace(',', '.'))
  return text && Number.isFinite(number) ? `number:${number}` : `text:${text.toLocaleLowerCase('sv-SE')}`
}

function applyTicketResponse(profile, payload, entry) {
  const dispatch = profile.ticketInbox?.activePayload
  if (!dispatch || String(dispatch.dispatchId || '') !== payload.dispatchId) return false
  if (!Array.isArray(profile.ticketResponses)) profile.ticketResponses = []
  const answeredAt = Number(payload.answeredAt || entry.timestamp || Date.now())
  const studentAnswer = String(payload.studentAnswer)
  const expectedAnswer = String(dispatch.answer || '')
  const next = {
    dispatchId: payload.dispatchId,
    ticketId: String(dispatch.ticketId || '').slice(0, 100),
    title: String(dispatch.title || '').slice(0, 200),
    kind: dispatch.kind === 'exit' ? 'exit' : 'start',
    question: String(dispatch.question || '').slice(0, 1000),
    expectedAnswer: expectedAnswer.slice(0, 500),
    studentAnswer,
    isCorrect: normalizeTicketAnswer(expectedAnswer) === normalizeTicketAnswer(studentAnswer),
    answeredAt,
    responseTimeSec: payload.responseTimeSec == null ? null : Number(payload.responseTimeSec),
    showCorrectnessOnSubmit: dispatch.showCorrectnessOnSubmit !== false,
    teacherRevealAt: Number(profile.ticketRevealAll?.[payload.dispatchId] || 0) || null,
    eventId: entry.id
  }
  const index = profile.ticketResponses.findIndex(item => item.dispatchId === payload.dispatchId)
  if (index >= 0 && profile.ticketResponses[index].eventId === entry.id) return false
  if (index >= 0) profile.ticketResponses[index] = next
  else profile.ticketResponses.unshift(next)
  profile.ticketResponses = profile.ticketResponses.slice(0, MAX_TICKET_RESPONSES)
  return true
}

function applyTicketFinished(profile, payload) {
  if (profile.ticketInbox?.activeDispatchId !== payload.dispatchId) return false
  const finishedAt = Number(payload.finishedAt || Date.now())
  profile.ticketInbox = { ...profile.ticketInbox, activeDispatchId: '', activePayload: null,
    activeEncoded: '', updatedAt: finishedAt, clearedAt: finishedAt }
  return true
}

function validCheckpoint(payload) {
  if (!isRecord(payload) || !Number.isFinite(payload.capturedAt) || payload.capturedAt <= 0) return false
  if (Object.keys(payload).some(key => key !== 'capturedAt' && !CHECKPOINT_FIELDS.includes(key))) return false
  if (payload.currentDifficulty !== undefined && (!Number.isFinite(payload.currentDifficulty) || payload.currentDifficulty < 1 || payload.currentDifficulty > 12)) return false
  if (payload.highestDifficulty !== undefined && (!Number.isFinite(payload.highestDifficulty) || payload.highestDifficulty < 1 || payload.highestDifficulty > 12)) return false
  return CHECKPOINT_FIELDS.filter(field => !['currentDifficulty', 'highestDifficulty'].includes(field))
    .every(field => payload[field] === undefined || isRecord(payload[field]))
}

function applyProfileCheckpoint(profile, payload) {
  if (Number(payload.capturedAt) <= Number(profile.pilotCheckpointAt || 0)) return false
  for (const field of CHECKPOINT_FIELDS) {
    if (payload[field] !== undefined) profile[field] = structuredClone(payload[field])
  }
  profile.pilotCheckpointAt = Number(payload.capturedAt)
  return true
}

export function validEntry(entry, studentId) {
  if (typeof entry?.id !== 'string' || !entry.id || entry.id.length > 100 || !entry.payload || jsonBytes(entry) > MAX_EVENT_BYTES) return false
  if (entry.studentId && String(entry.studentId).toUpperCase() !== studentId) return false
  const payload = entry.payload
  if (entry.type === 'problem_result') return typeof payload.problemId === 'string'
    && Boolean(payload.problemId) && Number.isFinite(payload.timestamp) && payload.timestamp > 0
    && typeof payload.correct === 'boolean'
    && (payload.observationId == null || (typeof payload.observationId === 'string'
      && payload.observationId.length > 0 && payload.observationId.length <= 200))
    && (payload.evidenceSkill == null || (typeof payload.evidenceSkill === 'string'
      && payload.evidenceSkill.length > 0 && payload.evidenceSkill.length <= 100))
    && (payload.evidenceLevel == null || (Number.isInteger(Number(payload.evidenceLevel))
      && Number(payload.evidenceLevel) >= 1 && Number(payload.evidenceLevel) <= 12))
    && (payload.evidenceClass == null || EVIDENCE_CLASSES.has(payload.evidenceClass))
    && (payload.evidenceRuleVersion == null || (Number.isInteger(Number(payload.evidenceRuleVersion))
      && Number(payload.evidenceRuleVersion) >= 1))
    && (payload.trainingContext == null || isValidTrainingContext(payload.trainingContext))
    && (payload.trainingDecisionId == null || (typeof payload.trainingDecisionId === 'string'
      && payload.trainingDecisionId.length <= 250))
    && (payload.trainingDecisionRuleVersion == null || (Number.isInteger(Number(payload.trainingDecisionRuleVersion))
      && Number(payload.trainingDecisionRuleVersion) >= 1))
    && (payload.trainingPurpose == null || ['', 'introduce', 'consolidate', 'challenge', 'recover', 'support']
      .includes(payload.trainingPurpose))
    && (payload.trainingReasonCodes == null || (Array.isArray(payload.trainingReasonCodes)
      && payload.trainingReasonCodes.length <= 10
      && payload.trainingReasonCodes.every(code => typeof code === 'string'
        && code.length > 0 && code.length <= 100)))
  if (entry.type === 'table_completed') return Number.isInteger(payload.table)
    && payload.table >= 2 && payload.table <= 12
    && Number.isFinite(Number(payload.timestamp || entry.timestamp))
    && Number(payload.timestamp || entry.timestamp) > 0
  if (entry.type === 'mastery_achieved') return typeof payload.operation === 'string'
    && Boolean(payload.operation) && Number.isInteger(payload.level) && payload.level >= 1 && payload.level <= 12
    && (payload.achievedAt == null || (Number.isFinite(Number(payload.achievedAt)) && Number(payload.achievedAt) > 0))
    && (payload.ruleVersion == null || (Number.isInteger(Number(payload.ruleVersion)) && Number(payload.ruleVersion) >= 1))
    && (payload.evidenceObservationIds == null || (Array.isArray(payload.evidenceObservationIds)
      && payload.evidenceObservationIds.length <= 50
      && payload.evidenceObservationIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200)))
  if (entry.type === 'adaptation_decision') return isValidAdaptationDecision(payload)
  if (entry.type === 'current_need_updated') return isValidCurrentNeed(payload)
  if (entry.type === 'profile_checkpoint') return validCheckpoint(payload)
  if (entry.type === 'ticket_response') return typeof payload.dispatchId === 'string' && payload.dispatchId.length > 0 && payload.dispatchId.length <= 100
    && typeof payload.studentAnswer === 'string' && payload.studentAnswer.length <= 500
    && (payload.responseTimeSec == null || (Number.isFinite(Number(payload.responseTimeSec)) && Number(payload.responseTimeSec) >= 0 && Number(payload.responseTimeSec) <= 86400))
    && Number.isFinite(Number(payload.answeredAt || entry.timestamp)) && Number(payload.answeredAt || entry.timestamp) > 0
  if (entry.type === 'ticket_finished') return typeof payload.dispatchId === 'string' && payload.dispatchId.length > 0 && payload.dispatchId.length <= 100
    && Number.isFinite(Number(payload.finishedAt || entry.timestamp)) && Number(payload.finishedAt || entry.timestamp) > 0
  return false
}

export function applyWalEntry(profile, entry) {
  if (!entry?.type || !entry?.payload) return false

  switch (entry.type) {
    case 'problem_result':
      return applyProblemResult(profile, entry.payload)
    case 'mastery_achieved':
      return applyMasteryAchieved(profile, entry.payload)
    case 'adaptation_decision':
      return recordAdaptationDecision(profile, entry.payload)
    case 'current_need_updated':
      return recordCurrentNeed(profile, entry.payload)
    case 'table_completed':
      return applyTableCompleted(profile, entry.payload, entry)
    case 'profile_checkpoint':
      return applyProfileCheckpoint(profile, entry.payload)
    case 'ticket_response':
      return applyTicketResponse(profile, entry.payload, entry)
    case 'ticket_finished':
      return applyTicketFinished(profile, entry.payload)
    default:
      return false
  }
}

export async function persistStudentEvents(studentId, entries, authorize) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw studentStoreError(400, 'Missing or empty entries array')
  }
  if (entries.length > 100) throw studentStoreError(400, 'Too many entries (max 100)')
  if (jsonBytes(entries) > MAX_BATCH_BYTES) throw studentStoreError(413, 'Event batch too large')
  if (entries.some(entry => !validEntry(entry, studentId))) throw studentStoreError(400, 'Invalid event batch')
  let appliedCount = 0
  const saved = await mutateStudentRecord(studentId, async existing => {
    if (!existing) throw studentStoreError(404, 'Student not found')
    if (!isCurrentStudentProfile(existing)) throw studentStoreError(409, 'Unsupported student profile schema')
    await authorize(existing)
    const profile = structuredClone(existing)
    appliedCount = 0
    const sorted = [...entries].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    for (const entry of sorted) if (applyWalEntry(profile, entry)) appliedCount++
    return profile
  })
  return { ack: entries.map(entry => entry.id), appliedCount, serverRevision: saved.serverRevision }
}

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type, x-student-password, x-teacher-token' }, req)
  res.setHeader?.('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const studentId = String(req.query.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })

  try {
    const teacherAuthorized = await isLiveTeacherApiAuthorized(req)
    const studentPassword = String(req.headers['x-student-password'] || '')
    const result = await persistStudentEvents(studentId, req.body?.entries, async existing => {
      if (teacherAuthorized) return assertTeacherStudentAccess(req, existing)
      if (!await verifyStudentCredential(existing, studentPassword)) throw studentStoreError(401, 'Unauthorized')
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage backend unavailable' })
  }
}
