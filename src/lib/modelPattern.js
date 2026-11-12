import { ERROR_MODELS } from '../domains/predictableErrors/catalog.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'
import { evidenceProblem } from './evidenceProblem.js'

// How many different tasks a set of answers covers. The same fact answered
// wrongly three times is one task.
export const distinctTasks = entries => new Set(entries.map(entry => questionFingerprint(evidenceProblem(entry)))).size

// Whether a model's answers form a pattern a teacher should see as a suspicion
// (docs/STYRNING_FELFORSTAELSER.md, decision 3). Models without a minimum always do.
export function meetsPattern(modelId, entries) {
  const minimum = ERROR_MODELS[modelId]?.minDistinctTasks
  return !minimum || distinctTasks(entries) >= minimum
}
