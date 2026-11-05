import { planFollowUp } from '../domains/predictableErrors/followUpSelection.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'
import { evidenceProblem } from './evidenceProblem.js'
import { isSpeedTrainingEntry, INPUT_SIGNAL_MODELS } from './practiceModes.js'

export function pupilFollowUpSelection({ modelId, supports, entries, historyKeys = [], history }) {
  if (INPUT_SIGNAL_MODELS.has(modelId) || !supports.length || supports.every(isSpeedTrainingEntry)) return null
  const seenFingerprints = new Set([...entries.map(entry => questionFingerprint(evidenceProblem(entry))), ...historyKeys])
  const plan = planFollowUp({ modelId, supportProblems: supports.filter(entry => !isSpeedTrainingEntry(entry)).map(evidenceProblem),
    seenFingerprints, history })
  return { ...plan, history: { ...plan.history, excludedFingerprints: [...seenFingerprints].sort() } }
}

export function followUpRecommendation(plan) {
  if (!plan) return null
  return plan.status === 'proposed'
    ? `Förslag, inte utdelat: ${plan.items[0].text}. ${plan.delivery === 'reviewed_bank' ? 'Ur den granskade frågebanken.' : 'Råd till läraren; ingen utdelningsbar bankfråga.'} ${plan.unresolved.length ? 'Alla förklaringar skiljs inte åt.' : 'Förklaringarna ger olika svar.'} Historik utanför det angivna urvalet är inte kontrollerad.`
    : plan.reasonSv
}
