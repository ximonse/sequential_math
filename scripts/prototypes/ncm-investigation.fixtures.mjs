// Invented audit examples only. Explicit method reviews stand for human judgements.
import { getInvestigationProfile } from './ncm-investigation-content.mjs'

export function investigationFixture(scope = 'single_exchange') {
  const profile = getInvestigationProfile(scope)
  const taskIds = scope === 'single_exchange' ? ['sub-exchange-001', 'sub-exchange-002'] : ['fraction-gap-a', 'fraction-gap-b']
  const answers = scope === 'single_exchange' ? [435, 335] : ['left', 'right']
  const diagnostic = taskIds.map((taskId, i) => ({
    id: `synthetic-source-${i}`, taskId, answer: answers[i], status: 'answered',
    phase: 'investigate', method: 'consistent', assistance: 'none', saved: true,
    source: { ref: `synthetic-source-${i}`, snapshotRevision: 'synthetic-revision' },
  }))
  const review = { id: 'synthetic-review', hypothesisId: profile.hypothesisIds[0], verdict: 'supported',
    basedOn: diagnostic.map(e => e.id), reasonSv: 'Konstruerad granskning: två felkontraster och förenligt synligt resonemang.',
    sourceRevisions: Object.fromEntries(diagnostic.map(e => [e.id, e.source.snapshotRevision])),
    alternativesSv: 'Andra förklaringar behöver prövas vid motsägande arbete; inga slutsvar ger säker felorsak.' }
  const teaching = { id: 'synthetic-teaching', reviewId: review.id, sessionId: 'lesson-a', completedAt: 100,
    goalSv: profile.goalSv, usedTaskIds: ['synthetic-teaching-example'], saved: true }
  const controls = profile.tasks.filter(t => ['independent', 'followup'].includes(t.phase)).map((t, i) => ({
    id: `synthetic-control-${i}`, taskId: t.id, phase: t.phase, answer: t.answer, status: 'answered',
    source: { ref: `synthetic-control-${i}`, snapshotRevision: `synthetic-control-revision-${i}` },
    method: 'consistent', assistance: 'none', saved: true, sessionId: t.phase === 'followup' ? 'lesson-b' : 'lesson-a',
    observedAt: t.phase === 'followup' ? 200 + i : 110 + i,
  }))
  return { scope, observations: diagnostic, review, teaching, controls }
}

export function investigationTrace(scope) {
  const fixture = investigationFixture(scope)
  return [
    { scope, observations: fixture.observations },
    { scope, observations: fixture.observations, review: fixture.review },
    ...Array.from({ length: 5 }, (_, i) => ({ scope, review: fixture.review, teaching: fixture.teaching,
      observations: [...fixture.observations, ...fixture.controls.slice(0, i)] })),
  ]
}
