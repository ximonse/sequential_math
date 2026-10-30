// Pure adapter of an already-authorized evidence export. No fetch, files or credentials.
import { getInvestigationProfile } from './ncm-investigation-content.mjs'

const canonical = value => String(value ?? '').replace(/\s+/gu, '').replace(/[−–]/gu, '-').replace(/,/gu, '.')

export function bindInvestigationEvidence({ snapshot, selections = [], details = [], scope }) {
  const profile = getInvestigationProfile(scope)
  if (snapshot?.schemaVersion !== 1 || !snapshot.studentId || !snapshot.classId || !snapshot.snapshotRevision
    || !Array.isArray(snapshot.entries) || snapshot.nextCursor || snapshot.total !== snapshot.entries.length) {
    throw Error('A complete, revision-bound evidence export is required')
  }
  const entries = new Map()
  for (const entry of snapshot.entries) {
    if (!entry.ref || entries.has(entry.ref)) throw Error('Missing or duplicate evidence reference')
    entries.set(entry.ref, entry)
  }
  const originals = new Map()
  for (const detail of details) {
    if (detail.snapshotRevision !== snapshot.snapshotRevision || detail.studentId !== snapshot.studentId
      || detail.classId !== snapshot.classId || !entries.has(detail.entry?.ref) || originals.has(detail.entry.ref)) {
      throw Error('Original work must belong to the same pupil, class, reference and revision')
    }
    const { detail: _work, ...listed } = detail.entry
    if (JSON.stringify(listed) !== JSON.stringify(entries.get(detail.entry.ref))) throw Error('Original entry differs from exported evidence')
    originals.set(detail.entry.ref, detail.entry.detail ?? null)
  }
  const seen = new Set()
  const observations = selections.map(selection => {
    const entry = entries.get(selection.ref)
    const task = profile.tasks.find(t => t.id === selection.taskId)
    if (!entry || !task || seen.has(selection.ref) || selection.snapshotRevision !== snapshot.snapshotRevision
      || !selection.reasonSv?.trim()) throw Error('Selection needs a unique source reference, task, revision and justification')
    seen.add(selection.ref)
    const operandsMatch = task.operands && entry.question?.operation === 'subtraction'
      && JSON.stringify(entry.question.operands) === JSON.stringify(task.operands)
    const prompt = canonical(entry.question?.promptSv ?? entry.question?.promptText)
    const plainCalculation = task.operands && entry.question?.operation === 'subtraction'
      && prompt === task.operands.join('-')
    if (entry.question?.operands && !operandsMatch) throw Error('Source operands contradict the selected task')
    if (!operandsMatch && !plainCalculation && prompt !== canonical(task.prompt)) {
      throw Error('A source question cannot be relabelled as a different task')
    }
    const assistance = selection.assistance ?? 'unknown'
    const method = selection.method ?? 'unreviewed'
    if (!['none', 'helped', 'unknown'].includes(assistance)
      || !['consistent', 'contradictory', 'unreviewed'].includes(method)) throw Error('Invalid review state')
    // A listed answer or error label is never a method review.
    if (method !== 'unreviewed' && (!originals.get(entry.ref) || !selection.methodReasonSv?.trim())) {
      throw Error('A method judgement needs the original work and an explicit justification')
    }
    return { id: entry.ref, taskId: task.id, answer: entry.answer?.studentAnswer,
      status: ['correct', 'incorrect'].includes(entry.answer?.status) ? 'answered' : 'blank',
      sourceAnswerStatus: entry.answer?.status ?? 'unknown',
      saved: true, method, assistance, phase: task.phase,
      origin: 'history', selectedForScope: true, snapshotRevision: snapshot.snapshotRevision,
      source: { ref: entry.ref, snapshotRevision: snapshot.snapshotRevision, studentId: snapshot.studentId,
        classId: snapshot.classId, period: structuredClone(snapshot.period), timestamp: entry.timestamp,
        timeBasis: entry.timeBasis, reference: structuredClone(entry.reference) },
      original: structuredClone(entry), originalWork: structuredClone(originals.get(entry.ref) ?? null),
      selectionReason: selection.reasonSv, methodReasonSv: selection.methodReasonSv ?? null,
      // Do not manufacture a session, trusted time or unsupported diagnostic signal.
      sessionId: null, observedAt: null,
    }
  })
  return { scope, snapshotRevision: snapshot.snapshotRevision, coverage: structuredClone(snapshot.coverage),
    observations, unselectedRefs: snapshot.entries.filter(e => !seen.has(e.ref)).map(e => e.ref) }
}
