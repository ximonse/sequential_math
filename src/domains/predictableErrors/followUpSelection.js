import manifest from '../arithmetic/diagnosticTasks.v1.json' with { type: 'json' }
import { predictableProbes } from './probeCatalog.js'
import { buildContrastSet } from './contrast.js'
import { predictableCandidates } from './index.js'
import { didacticForModel, didacticSupportsProblem } from '../arithmetic/didacticPackages.js'

// One pure selector for evidence, reports and contrast drafts. Advisory probes
// outside arithmetic have no reviewed screening-bank identity and cannot be saved.
export function planFollowUp({ modelId, supportProblems = [], seenFingerprints = new Set(),
  history = { scope: 'source_period', completeness: 'unknown' }, analysis, models }) {
  const current = analysis ?? predictableCandidates(supportProblems[0], '')
  const bank = current.domain === 'arithmetic'
  const definition = didacticForModel(modelId, current.scope)
  const packageEligible = definition && supportProblems.length > 0 && supportProblems.every(problem => didacticSupportsProblem(definition.pack.id, problem))
  const tasks = bank ? [...manifest.tasks, ...(packageEligible ? definition.tasks.filter(task => task.didacticRole === 'contrast') : [])]
    : predictableProbes.map(task => ({ taskId: task.id, problem: task.problem }))
  const set = buildContrastSet({ modelId, supportProblems, bankTasks: tasks, seenFingerprints, analysis: current, models })
  return { schemaVersion: 1, ...set, history: { ...history, excludedQuestionCount: seenFingerprints.size },
    delivery: bank ? 'reviewed_bank' : 'teacher_advisory',
    ...(set.status !== 'proposed' ? { reason: 'no_unseen_discriminating_question',
      reasonSv: 'Ingen oanvänd fråga i det tillgängliga underlaget skiljer modellen från rätt svar. Granska metoden; en säker orsak kan inte föreslås.' } : {}) }
}
