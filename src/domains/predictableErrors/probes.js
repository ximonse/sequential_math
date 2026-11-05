import { planFollowUp } from './followUpSelection.js'
export { predictableProbes } from './probeCatalog.js'
export { questionFingerprint } from './questionFingerprint.js'

// Compatibility projection for evidence clients. The selector is shared with
// report recommendations and material creation; this adapter makes no choices.
export function selectPredictableProbe(analysis, seenQuestions = new Set(), supportProblems = []) {
  const ids = [...new Set(analysis.matches.map(m => m.modelId))]
  if (!ids.length) return { status: 'not_needed' }
  const plan = planFollowUp({ modelId: ids[0], models: ids, supportProblems,
    analysis, seenFingerprints: seenQuestions })
  const first = plan.items[0]
  if (!first) return { status: 'needs_review', reason: plan.reason,
    requiresTeacherReview: true, purposeSv: plan.reasonSv }
  return { status: 'proposed', taskId: first.taskId, question: first.problem,
    expectedAnswer: first.correct, distinguishesModelIds: plan.models,
    requiresTeacherReview: true, unresolved: plan.unresolved,
    purposeSv: plan.unresolved.length
      ? 'Ny kontroll skiljer vissa förklaringar. Alla modeller kan inte skiljas åt; elevens metod behöver granskas.'
      : 'Ny kontroll där aktuella felmodeller ger andra svar än facit och från varandra. Elevens metod behöver fortfarande belägg.' }
}
