import { candidatesForEvidence } from '../domains/predictableErrors/index.js'
import { selectPredictableProbe, questionFingerprint } from '../domains/predictableErrors/probes.js'

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
    const key = JSON.stringify([predictable.domain, predictable.scope, [...new Set(predictable.matches.map(m => m.modelId))].sort()])
    if (!probeCache.has(key)) probeCache.set(key, selectPredictableProbe(predictable, seen))
    const nextProbe = structuredClone(probeCache.get(key))
    return { ...entry, interpretation: { ...entry.interpretation, predictable: { ...predictable, nextProbe } } }
  })
}
