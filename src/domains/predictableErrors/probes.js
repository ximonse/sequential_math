import { predictableCandidates, matchesComputedCorrect } from './index.js'
import { normalizeText, numeric } from './core.js'

const probe = (id, domain, skill, values, text) => ({ id, problem: { domain, skill, type: skill, values, display: { text } } })
export const predictableProbes = [
  probe('rule-add-a', 'arithmetic', 'addition', { a: 38, b: 47 }, '38 + 47'),
  probe('rule-add-b', 'arithmetic', 'addition', { a: 57, b: 68 }, '57 + 68'),
  probe('rule-decimal-add', 'arithmetic', 'addition', { a: 3.48, b: 2.67 }, '3,48 + 2,67'),
  probe('rule-decimal-sub', 'arithmetic', 'subtraction', { a: 6.42, b: 2.17 }, '6,42 − 2,17'),
  probe('rule-sub-a', 'arithmetic', 'subtraction', { a: 62, b: 27 }, '62 − 27'),
  probe('rule-zero-a', 'arithmetic', 'subtraction', { a: 503, b: 267 }, '503 − 267'),
  probe('rule-zero-b', 'arithmetic', 'subtraction', { a: 804, b: 376 }, '804 − 376'),
  probe('rule-mul-a', 'arithmetic', 'multiplication', { a: 7, b: 8 }, '7 × 8'),
  probe('rule-mul-b', 'arithmetic', 'multiplication', { a: 23, b: 4 }, '23 × 4'),
  probe('rule-div-a', 'arithmetic', 'division', { a: 42, b: 6 }, '42 ÷ 6'),
  probe('rule-div-b', 'arithmetic', 'division', { a: 56, b: 7 }, '56 ÷ 7'),
  probe('rule-frac-add-a', 'fractions', 'fractions', { text: '2/5 + 1/3' }, '2/5 + 1/3'),
  probe('rule-frac-add-b', 'fractions', 'fractions', { text: '3/7 + 1/2' }, '3/7 + 1/2'),
  probe('rule-frac-add-c', 'fractions', 'fractions', { text: '2/7 + 1/4' }, '2/7 + 1/4'),
  probe('rule-frac-sub-a', 'fractions', 'fractions', { text: '3/4 − 1/3' }, '3/4 − 1/3'),
  probe('rule-frac-mul-a', 'fractions', 'fractions', { text: '2/3 × 3/5' }, '2/3 × 3/5'),
  probe('rule-frac-int-a', 'fractions', 'fractions', { text: '3/7 × 4' }, '3/7 × 4'),
  probe('rule-expr-a', 'arithmetic_expressions', 'arithmetic_expressions', { text: '4 + 3 × 5' }, '4 + 3 × 5'),
  probe('rule-expr-b', 'arithmetic_expressions', 'arithmetic_expressions', { text: '4 × (3 + 5) + 2 × 6' }, '4 × (3 + 5) + 2 × 6'),
  probe('rule-pct-a', 'percentage', 'percentage', { kind: 'percent_of', percentage: 12, base: 250 }, 'Vad är 12% av 250?'),
  probe('rule-pct-discount', 'percentage', 'percentage', { kind: 'discount', percentage: 20, base: 250 }, 'Vad kostar 250 kr efter 20% rabatt?'),
  probe('rule-pct-increase', 'percentage', 'percentage', { kind: 'increase', percentage: 15, base: 200 }, 'Vad blir 200 kr efter 15% höjning?'),
  probe('rule-pct-share', 'percentage', 'percentage', { kind: 'share', part: 18, total: 60 }, 'Hur många procent är 18 av 60?'),
  probe('rule-algebra-eval', 'algebra', 'algebra_evaluate', { expression: '4x + 3', variables: { x: 5 } }, 'Beräkna 4x + 3 när x = 5.'),
  probe('rule-algebra-square', 'algebra', 'algebra_evaluate', { expression: 'x × x', variables: { x: 6 } }, 'Beräkna x × x när x = 6.'),
  probe('rule-algebra-simplify', 'algebra', 'algebra_simplify', { expression: '2x + 3x + 4' }, 'Förenkla 2x + 3x + 4.'),
  probe('rule-bond-a', 'number_fluency', 'number_bonds', { target: 15, knownTerm: 6, missingFirst: false }, '6 + ? = 15'),
  probe('rule-double-a', 'number_fluency', 'doubles', { value: 28, doubled: 56, form: 'double_addition' }, '28 + 28'),
  probe('rule-half-a', 'number_fluency', 'doubles', { value: 14, doubled: 28, form: 'double_halving_transfer' }, '28 ÷ 2'),
]

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

export function selectPredictableProbe(analysis, seenQuestions = new Set()) {
  const ids = [...new Set(analysis.matches.map(m => m.modelId))]
  if (!ids.length) return { status: 'not_needed' }
  for (const task of predictableProbes) {
    if (task.problem.domain !== analysis.domain || seenQuestions.has(questionFingerprint(task.problem))) continue
    const result = predictableCandidates(task.problem, '')
    if (result.scope !== analysis.scope) continue
    const groups = ids.map(id => result.predictions.filter(p => p.modelId === id))
    if (groups.some(g => !g.length)) continue
    const overlaps = groups.some((g, i) => groups.slice(i + 1).some(other => g.some(a => other.some(b =>
      matchesComputedCorrect({ ...result, computedCorrect: a.predictedAnswer }, b.predictedAnswer)))))
    if (overlaps) continue
    return { status: 'proposed', taskId: task.id, question: structuredClone(task.problem), expectedAnswer: result.computedCorrect,
      distinguishesModelIds: ids, requiresTeacherReview: true,
      purposeSv: 'Ny kontroll där aktuella felmodeller ger andra svar än facit och från varandra. Elevens metod behöver fortfarande belägg.' }
  }
  return { status: 'needs_review', reason: 'no_unseen_discriminating_probe',
    purposeSv: 'Ingen oanvänd granskad kontrast skiljer alla aktuella kandidater. Föreslå inte en säker orsak eller repetera samma fråga.' }
}
