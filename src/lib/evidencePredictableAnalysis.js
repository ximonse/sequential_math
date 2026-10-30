import { candidatesForEvidence } from '../domains/predictableErrors/index.js'
import { selectPredictableProbe, questionFingerprint } from '../domains/predictableErrors/probes.js'
import { isSpeedTrainingEntry } from './practiceModes.js'

const SPEED_TRAINING_PROBE = { status: 'not_in_speed_training',
  purposeSv: 'Ingen följdfråga i snabbhetsträning, där målet är att bli snabb. Ett upprepat förståelsemönster kan i stället föranleda screening utan tidspress.' }

export function evidenceProblem(entry) {
  const q = entry?.question ?? {}, type = q.operation ?? q.skill
  const domain = q.domain ?? (['addition', 'subtraction', 'multiplication', 'division'].includes(type) ? 'arithmetic' : null)
  return { domain, type, skill: q.skill ?? type,
    values: q.values ?? (q.operands?.length === 2 ? { a: q.operands[0], b: q.operands[1] } : {}),
    display: { text: q.promptSv ?? q.promptText } }
}

export function addPredictableEvidence(entries) {
  const seen = new Set(entries.map(e => questionFingerprint(evidenceProblem(e))))
  const probeCache = new Map()
  return entries.map(entry => {
    const predictable = candidatesForEvidence(entry)
    if (isSpeedTrainingEntry(entry)) {
      return { ...entry, interpretation: { ...entry.interpretation, predictable: { ...predictable, nextProbe: structuredClone(SPEED_TRAINING_PROBE) } } }
    }
    const key = JSON.stringify([predictable.domain, predictable.scope, [...new Set(predictable.matches.map(m => m.modelId))].sort()])
    if (!probeCache.has(key)) probeCache.set(key, selectPredictableProbe(predictable, seen))
    const nextProbe = structuredClone(probeCache.get(key))
    return { ...entry, interpretation: { ...entry.interpretation, predictable: { ...predictable, nextProbe } } }
  })
}
