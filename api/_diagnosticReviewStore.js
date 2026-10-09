import { kv } from '@vercel/kv'
import { studentDeletedKey } from './_studentStore.js'
import { DiagnosticAppendError } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'

// Review metadata never changes the pupil record/events. Both the evidence
// revision and the shared review revision must still match at commit time.
export const DIAGNOSTIC_REVIEW_CAS_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 or redis.call('EXISTS', KEYS[4]) == 1
  or redis.call('EXISTS', KEYS[5]) == 1 then return -1 end
local raw = redis.call('GET', KEYS[1])
local pupilRaw = redis.call('GET', KEYS[6])
local classRaw = redis.call('GET', KEYS[7])
local assignmentRaw = redis.call('GET', KEYS[8])
if not raw or not pupilRaw or not classRaw or not assignmentRaw then return -1 end
local record = cjson.decode(raw)
local pupil = cjson.decode(pupilRaw)
local class = cjson.decode(classRaw)
local assignment = cjson.decode(assignmentRaw)
if class.archived == true or record.studentId ~= ARGV[4]
  or record.assignmentId ~= assignment.assignmentId
  or record.classIdAtAttempt ~= assignment.classId
  or record.evidenceClass ~= 'diagnostic_only' then return -1 end
local member = pupil.classId == assignment.classId
if pupil.classIds then for _, id in ipairs(pupil.classIds) do
  if id == assignment.classId then member = true end
end end
local assigned = false
for _, id in ipairs(assignment.studentIds) do if id == ARGV[4] then assigned = true end end
local item = false
for _, candidate in ipairs(assignment.items) do
  if candidate.assignmentItemId == record.assignmentItemId
    and candidate.taskId == record.taskId
    and tonumber(candidate.taskVersion) == tonumber(record.taskVersion) then item = true end
end
if not member or not assigned or not item then return -1 end
if tonumber(record.serverRevision) ~= tonumber(ARGV[1])
  or tonumber(record.lastSequence) ~= tonumber(ARGV[2]) then return -2 end
local reviewRaw = redis.call('GET', KEYS[2])
local revision = 0
if reviewRaw then revision = tonumber(cjson.decode(reviewRaw).reviewRevision) end
if revision ~= tonumber(ARGV[3]) then return -3 end
redis.call('SET', KEYS[2], ARGV[5])
return 1
`

export const isCurrentDiagnosticReview = (review, record) => Boolean(review?.reviewed
  && review.evidenceRevision === record.serverRevision && review.evidenceSequence === record.lastSequence)

export async function saveDiagnosticReview(record, input, teacherId, { store = kv, now = Date.now() } = {}) {
  if (input.publishFeedback !== undefined && (input.publishFeedback !== true
    || record.status !== 'submitted' || typeof input.feedbackText !== 'string'
    || !input.feedbackText.trim() || input.feedbackText.length > 1000)) {
    throw new DiagnosticAppendError(400, 'invalid_feedback', 'Återkoppling behöver text och ett inlämnat elevunderlag.')
  }
  if (!teacherId || typeof input.note !== 'string' || input.note.length > 1000
    || typeof input.reviewed !== 'boolean'
    || ![input.expectedReviewRevision, input.evidenceRevision, input.evidenceSequence].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new DiagnosticAppendError(400, 'invalid_review', 'Anteckningen får vara högst 1000 tecken och måste avse en sparad revision.')
  }
  const previous = await store.get(`diagnostic_review:${record.attemptId}`)
  const feedback = input.publishFeedback ? { text: input.feedbackText.trim(), publishedAt: now,
    evidenceRevision: input.evidenceRevision, evidenceSequence: input.evidenceSequence } : previous?.feedback
  const review = { studentId: record.studentId, reviewRevision: input.expectedReviewRevision + 1,
    evidenceRevision: input.evidenceRevision, evidenceSequence: input.evidenceSequence,
    reviewed: input.reviewed, note: input.note, updatedAt: now, updatedBy: teacherId,
    ...(feedback ? { feedback } : {}) }
  const result = Number(await store.eval(DIAGNOSTIC_REVIEW_CAS_SCRIPT,
    [`diagnostic_attempt:${record.attemptId}`, `diagnostic_review:${record.attemptId}`,
      studentDeletedKey(record.studentId), `student_deleted:${record.studentId}`,
      `class_deleted:${record.classIdAtAttempt}`, `student:${record.studentId}`,
      `class:${record.classIdAtAttempt}`, `diagnostic_assignment:${record.assignmentId}`],
    [input.evidenceRevision, input.evidenceSequence, input.expectedReviewRevision, record.studentId, JSON.stringify(review)]))
  if (result === 1) return review
  if (result === -1) throw new DiagnosticAppendError(410, 'attempt_unavailable', 'Elevunderlaget är inte längre tillgängligt.')
  throw new DiagnosticAppendError(409, 'review_conflict', result === -2
    ? 'Eleven har ändrat underlaget. Öppna den nya revisionen innan du sparar.'
    : 'Genomgången har ändrats i en annan flik. Din anteckning är kvar; öppna underlaget igen och jämför.')
}
