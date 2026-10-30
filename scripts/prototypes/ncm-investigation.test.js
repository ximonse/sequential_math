import { describe, expect, it } from 'vitest'
import { evidencePage, practiceEvidence } from '../../api/_pupilEvidence.js'
import { bindInvestigationEvidence } from './ncm-investigation-evidence.mjs'
import { getInvestigationProfile, evaluateInvestigationAnswer } from './ncm-investigation-content.mjs'
import { investigationFixture, investigationTrace } from './ncm-investigation.fixtures.mjs'
import { decideInvestigation } from './ncm-investigation.mjs'

const full = (scope = 'single_exchange') => {
  const f = investigationFixture(scope)
  return { ...f, observations: [...f.observations, ...f.controls] }
}
function exportFixture() {
  const snapshot = evidencePage({ studentId: 'SYNTHETIC-PUPIL', classId: 'SYNTHETIC-CLASS', source: 'practice',
    period: { startInclusive: 1, endExclusive: 100 }, practice: practiceEvidence({ problemLog: [
      { observationId: 'synthetic-a', timestamp: 10, operation: 'subtraction', promptText: '642 − 217', studentAnswer: 435, correctAnswer: 425, correct: false },
      { observationId: 'synthetic-b', timestamp: 20, operation: 'subtraction', promptText: '753 − 428', studentAnswer: 335, correctAnswer: 325, correct: false },
    ] }), screening: { entries: [], coverage: {} }, query: {} })
  return { snapshot, scope: 'single_exchange', selections: snapshot.entries.map((e, i) => ({
    ref: e.ref, snapshotRevision: snapshot.snapshotRevision, taskId: `sub-exchange-00${i + 1}`, reasonSv: 'Samma egen fråga; syntetisk jämförbarhetsbedömning.',
  })) }
}

describe('offline didactic investigation contract', () => {
  for (const scope of ['single_exchange', 'through_zero', 'fraction_comparison']) {
    it(`${scope}: separates diagnosis, teaching, independent work and later transfer`, () => {
      const trace = investigationTrace(scope).map(decideInvestigation)
      expect(trace.map(d => d.phase)).toEqual([scope === 'through_zero' ? 'review' : 'investigate', 'teaching', 'independent', 'independent', 'followup', 'followup', 'closed'])
      expect(trace.at(-1).controlIds).toHaveLength(4)
      expect(trace.slice(0, -1).every(d => d.reasonCode !== 'supported_in_tested_scope')).toBe(true)
      for (const step of trace) {
        expect(step.evidenceClass).toBe('diagnostic_only')
        expect(step.reasonSv).toBeTruthy()
        if (step.action === 'ask') expect(step.purposeSv).toBeTruthy()
      }
    })
    it(`${scope}: never closes on helped controls or an unknown support level`, () => {
      for (const assistance of ['helped', 'unknown']) {
        const input = full(scope); input.observations.at(-1).assistance = assistance
        expect(decideInvestigation(input).reasonCode).toBe('control_not_independent')
      }
    })
    it(`${scope}: a wrong transfer answer reopens a question without asserting relapse`, () => {
      const input = full(scope); input.observations.at(-1).answer = scope === 'single_exchange' ? 43 : scope === 'through_zero' ? 427 : 'right'
      expect(decideInvestigation(input)).toMatchObject({ phase: 'review', reasonCode: 'reopen_question', requiresNewReview: true })
    })
    it(`${scope}: keeps the caller's observations and old source history unchanged`, () => {
      const input = full(scope), before = JSON.stringify(input)
      decideInvestigation(input)
      expect(JSON.stringify(input)).toBe(before)
    })
  }
  it('uses the existing subtraction selector rather than a second diagnostic engine', () => {
    expect(decideInvestigation()).toMatchObject({ action: 'ask', task: { id: 'sub-no-exchange-001' }, diagnosticDecision: { ruleVersion: 'synthetic-as2-v2' } })
  })
  it('keeps reviewed history separate from the new-question budget and uses a new confirmation', () => {
    const item = investigationFixture().observations[0]
    Object.assign(item, { answer: 425, origin: 'history', selectedForScope: true,
      selectionReason: 'Comparable reviewed example.', snapshotRevision: 'synthetic-revision' })
    const result = decideInvestigation({ observations: [item] })
    expect(result).toMatchObject({ action: 'ask', task: { id: 'sub-exchange-002' }, diagnosticDecision: { usedNewQuestions: 0 } })
  })
  it('does not treat same-numerator fractions as a contrast to missing-parts counting', () => {
    const f = full('fraction_comparison'), t = getInvestigationProfile(f.scope).tasks[0]
    expect(t.answer).toBe('left'); expect(t.discriminates).not.toContain('missing_parts_count')
    f.observations[0].taskId = t.id; f.observations[0].answer = 'right'
    expect(decideInvestigation(f).reasonCode).toBe('review_not_grounded')
  })
  it('checks the fraction contrasts against both the exact ratio and the wrong missing-parts rule', () => {
    const profile = getInvestigationProfile('fraction_comparison')
    const answers = new Set()
    for (const task of profile.tasks.filter(t => t.discriminates.includes('missing_parts_count'))) {
      const [a, b] = task.fractions
      const wrong = a[1] - a[0] < b[1] - b[0] ? 'left' : 'right'
      expect(task.answer).not.toBe(wrong)
      expect(evaluateInvestigationAnswer(task, task.answer)).toBe(true)
      answers.add(task.answer)
    }
    expect([...answers].sort()).toEqual(['left', 'right'])
  })
  it('cannot suppress a contradictory diagnostic observation by omitting its reference', () => {
    const input = full(); input.observations.unshift({ ...input.observations[0], id: 'another-source', answer: 425 })
    expect(decideInvestigation(input).reasonCode).toBe('unresolved_diagnostic_evidence')
  })
  it('does not convert two correct diagnostic answers into a supported misunderstanding', () => {
    const input = full(); input.observations[0].answer = 425
    expect(decideInvestigation(input).reasonCode).toBe('review_not_grounded')
  })
  it('requires a revision-bound human review before offering teaching', () => {
    const f = full(); delete f.observations[0].source.snapshotRevision
    expect(() => decideInvestigation(f)).toThrow(/revision-bound/u)
    const diagnostic = investigationFixture()
    diagnostic.review.basedOn = ['missing']
    expect(() => decideInvestigation(diagnostic)).toThrow()
  })
  it('invalidates a review when one of its exact source revisions changes', () => {
    const f = full(); f.observations[0].source.snapshotRevision = 'changed-source'
    expect(decideInvestigation(f).reasonCode).toBe('review_revision_changed')
  })
  it('requires original references for controls as well as diagnosis', () => {
    const f = full(); delete f.observations.at(-1).source
    expect(decideInvestigation(f).reasonCode).toBe('control_source_missing')
  })
  it('does not close when later controls were actually part of the initial lesson', () => {
    const f = full(); f.observations.at(-1).sessionId = 'lesson-a'
    expect(decideInvestigation(f).reasonCode).toBe('followup_not_later')
  })
  it('checks chronology even when a later lesson has a different ID', () => {
    const f = full(); f.observations.at(-1).observedAt = 110
    expect(decideInvestigation(f).reasonCode).toBe('followup_not_later')
  })
  it('does not invent reliable control times from missing metadata', () => {
    const f = full(); f.observations.at(-1).observedAt = null
    expect(decideInvestigation(f).reasonCode).toBe('control_timing_unknown')
  })
  it('does not count a practised question as a new control even when answered without help later', () => {
    const f = full(); f.teaching.usedTaskIds.push('check-sub-a')
    expect(decideInvestigation(f).reasonCode).toBe('control_seen_during_teaching')
    delete f.teaching.usedTaskIds
    expect(() => decideInvestigation(f)).toThrow(/used questions/u)
  })
  it('waits for any older unsaved response, including when all later responses are correct', () => {
    const f = full(); f.observations[0].saved = false
    expect(decideInvestigation(f).reasonCode).toBe('save_pending')
  })
  it('keeps a blank or interrupted control distinct from a mathematical failure', () => {
    for (const status of ['blank', 'interrupted']) {
      const f = full(); f.observations.at(-1).status = status
      expect(decideInvestigation(f).reasonCode).toBe('incomplete_control')
    }
  })
  it('keeps a correct answer with contradictory reasoning open', () => {
    const f = full(); f.observations.at(-1).method = 'contradictory'
    expect(decideInvestigation(f).reasonCode).toBe('control_method_review')
  })
  it('neither duplicates support nor overwrites conflicting originals', () => {
    const f = full(); f.observations.push(structuredClone(f.observations[0]))
    expect(decideInvestigation(f).phase).toBe('closed')
    f.observations.at(-1).answer = 1
    expect(decideInvestigation(f).reasonCode).toBe('conflicting_observation')
  })
})

describe('revision-bound evidence adapter', () => {
  it('consumes the existing export contract and preserves originals without inventing support or methods', () => {
    const args = exportFixture(), before = JSON.stringify(args)
    const result = bindInvestigationEvidence(args)
    expect(result.observations).toHaveLength(2)
    expect(result.observations[0]).toMatchObject({ answer: 435, assistance: 'unknown', method: 'unreviewed',
      sessionId: null, observedAt: null, source: { ref: args.snapshot.entries[0].ref } })
    expect(result.observations[0].original).toEqual(args.snapshot.entries[0])
    expect(result.coverage.practice.completeness).toBe('unknown')
    expect(JSON.stringify(args)).toBe(before)
    expect(decideInvestigation({ observations: result.observations })).toMatchObject({
      action: 'ask', diagnosticDecision: { usedNewQuestions: 0, supportIds: [] } })
  })
  it('refuses to relabel a source as another task with different operands', () => {
    const f = exportFixture(); f.selections[0].taskId = 'sub-exchange-002'
    expect(() => bindInvestigationEvidence(f)).toThrow(/relabelled/u)
  })
  it('rejects stale reviews, duplicate selections and partial exports', () => {
    const stale = exportFixture(); stale.selections[0].snapshotRevision = 'old'
    expect(() => bindInvestigationEvidence(stale)).toThrow()
    const duplicate = exportFixture(); duplicate.selections.push(duplicate.selections[0])
    expect(() => bindInvestigationEvidence(duplicate)).toThrow()
    const partial = exportFixture(); partial.snapshot.nextCursor = 'next'
    expect(() => bindInvestigationEvidence(partial)).toThrow(/complete/u)
  })
  it('binds work and its explicit method review to the same pupil, class and exact revision', () => {
    const f = exportFixture(), entry = f.snapshot.entries[0]
    f.details = [{ studentId: f.snapshot.studentId, classId: f.snapshot.classId,
      snapshotRevision: f.snapshot.snapshotRevision, entry: { ...entry, detail: { snapshot: { synthetic: true, grid: [] } } } }]
    Object.assign(f.selections[0], { method: 'consistent', methodReasonSv: 'Simulerad granskning av originalrutnätet.', assistance: 'none' })
    expect(bindInvestigationEvidence(f).observations[0].originalWork.snapshot.synthetic).toBe(true)
    f.details[0].classId = 'ANOTHER-CLASS'
    expect(() => bindInvestigationEvidence(f)).toThrow(/same pupil/u)
  })
  it('does not claim a method from a wrong-answer label or from a list entry alone', () => {
    const f = exportFixture(); f.selections[0].method = 'consistent'
    expect(() => bindInvestigationEvidence(f)).toThrow(/original work/u)
  })
  it('preserves partial answers as such and reports unselected evidence instead of hiding it', () => {
    const f = exportFixture(); f.snapshot.entries[0].answer.status = 'partial'
    f.selections = f.selections.slice(0, 1)
    const result = bindInvestigationEvidence(f)
    expect(result.observations[0]).toMatchObject({ status: 'blank', sourceAnswerStatus: 'partial' })
    expect(result.unselectedRefs).toEqual([f.snapshot.entries[1].ref])
  })
  it('accepts the actual screening detail envelope and keeps work without an answer', () => {
    const args = { studentId: 'SYNTHETIC-PUPIL', classId: 'SYNTHETIC-CLASS', source: 'screening',
      period: { startInclusive: 1, endExclusive: 100 }, practice: { entries: [], coverage: {} },
      screening: { coverage: { completeness: 'unknown' }, entries: [{ timestamp: 10,
        reference: { kind: 'screening_attempt', attemptId: 'synthetic-attempt' },
        source: 'screening', question: { taskId: 'sub-exchange-001', operation: 'subtraction', operands: [642, 217] },
        answer: { status: 'unanswered', studentAnswer: '', workWithoutAnswer: true },
        detail: { snapshot: { synthetic: true, events: [{ type: 'write' }] } } }] } }
    const snapshot = evidencePage({ ...args, query: {} })
    const entry = snapshot.entries[0]
    const detail = evidencePage({ ...args, query: { ref: entry.ref, snapshotRevision: snapshot.snapshotRevision } })
    const result = bindInvestigationEvidence({ scope: 'single_exchange', snapshot, details: [detail], selections: [{
      ref: entry.ref, snapshotRevision: snapshot.snapshotRevision, taskId: 'sub-exchange-001', reasonSv: 'Exact operands.' }] })
    expect(result.observations[0].originalWork.snapshot.events).toHaveLength(1)
    expect(result.observations[0].original.answer.workWithoutAnswer).toBe(true)
    expect(result.observations[0].sourceAnswerStatus).toBe('unanswered')
    expect(result.observations[0].method).toBe('unreviewed')
  })
})
