import { normalizeText, numeric } from './core.js'

export function questionFingerprint(problem) {
  const values = problem?.values ?? {}, domain = problem?.domain
  const keys = domain === 'arithmetic' ? ['a', 'b'] : domain === 'percentage'
    ? ['kind', 'base', 'percentage', 'part', 'total'] : domain === 'algebra' ? ['expression', 'variables']
      : domain === 'number_fluency' ? ['value', 'doubled', 'form', 'target', 'knownTerm', 'missingFirst'] : ['text']
  const compact = Object.fromEntries(keys.filter(k => values[k] !== undefined).map(k => [k,
    ['a', 'b'].includes(k) && numeric(values[k]) !== null ? numeric(values[k])
      : typeof values[k] === 'string' ? normalizeText(values[k]).replace(/\(Förenklasvaret\.\)$/u, '')
      : k === 'variables' ? Object.fromEntries(Object.entries(values[k] ?? {}).sort(([a], [b]) => a.localeCompare(b))) : values[k]]))
  return JSON.stringify([domain, problem?.type ?? problem?.skill, compact])
}
