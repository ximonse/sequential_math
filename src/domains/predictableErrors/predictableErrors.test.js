import { describe, expect, it } from 'vitest'
import { predictableCandidates, candidatesForEvidence } from './index.js'
import { predictableProbes, questionFingerprint, selectPredictableProbe } from './probes.js'

const problem = (domain, skill, values) => ({ domain, skill, type: skill, values })
const cases = [
  [problem('fractions', 'fractions', { text: '2/5 + 1/3' }), '3/8', 'fraction_components_separately', '11/15'],
  [problem('fractions', 'fractions', { text: '3/4 − 1/3' }), '2', 'fraction_components_separately', '5/12'],
  [problem('fractions', 'fractions', { text: '3/7 × 4' }), '3/28', 'fraction_integer_in_denominator', '12/7'],
  [problem('arithmetic_expressions', 'arithmetic_expressions', { text: '4 + 3 × 5' }), 35, 'expression_left_to_right', 19],
  [problem('arithmetic_expressions', 'arithmetic_expressions', { text: '(4 + 3) × 5' }), 19, 'expression_parentheses_ignored', 35],
  [problem('percentage', 'percentage', { kind: 'percent_of', base: 250, percentage: 12 }), 12, 'percentage_number_as_amount', 30],
  [problem('percentage', 'percentage', { kind: 'discount', base: 250, percentage: 20 }), 50, 'percentage_change_amount_only', 200],
  [problem('percentage', 'percentage', { kind: 'share', part: 18, total: 60 }), 0.3, 'percentage_ratio_not_converted', 30],
  [problem('algebra', 'algebra_evaluate', { expression: '4x+3', variables: { x: 5 } }), 12, 'algebra_coefficient_added', 23],
  [problem('algebra', 'algebra_evaluate', { expression: 'x × x', variables: { x: 6 } }), 12, 'algebra_square_as_double', 36],
  [problem('algebra', 'algebra_simplify', { expression: '2x+3x+4' }), '9x', 'algebra_unlike_terms_combined', '5x+4'],
  [problem('number_fluency', 'number_bonds', { target: 15, knownTerm: 6 }), 21, 'bond_sum_instead_of_missing', 9],
  [problem('number_fluency', 'doubles', { value: 28, doubled: 56, form: 'double_addition' }), 46, 'double_no_carry', 56],
  [problem('arithmetic', 'addition', { a: 38, b: 47 }), 715, 'column_sums_concatenated', 85],
  [problem('arithmetic', 'division', { a: 42, b: 6 }), 6, 'divisor_as_answer', 7],
  [problem('arithmetic', 'multiplication', { a: 7, b: 6.7 }), 42.49, 'decimal_parts_multiplied_separately', 46.9],
  [problem('arithmetic', 'multiplication', { a: 3, b: 9 }), 28, 'answer_off_by_one', 27],
  [problem('arithmetic', 'multiplication', { a: 3, b: 4 }), 1, 'partial_answer_entry', 12],
  [problem('arithmetic', 'subtraction', { a: 6.27, b: 5.84 }), 12.11, 'operation_swap', 0.4299999999999997],
  [problem('arithmetic', 'subtraction', { a: 6.42, b: 2.17 }), 4.35, 'smaller_minus_larger', 4.25],
  [problem('arithmetic', 'addition', { a: 3.48, b: 2.67 }), 5.05, 'carry_forget', 6.15],
]

describe('predictable candidates across all six domains', () => {
  for (const [p, answer, id, correct] of cases) it(`${p.domain}: ${id}`, () => {
    const result = predictableCandidates(p, answer)
    expect(result.status).toBe('matched')
    expect(result.matches.some(m => m.modelId === id)).toBe(true)
    expect(result.computedCorrect).toEqual(correct)
    expect(predictableCandidates(p, correct).matches).toEqual([])
  })
  it('does not turn every expression error into an order-of-operations claim', () => {
    const result = predictableCandidates(problem('arithmetic_expressions', 'arithmetic_expressions', { text: '6 × 6 + 7' }), 73)
    expect(result.status).toBe('unmatched'); expect(result.matches).toEqual([])
  })
  it('does not classify an arbitrary small subtraction error as a place-value scaling', () => {
    expect(predictableCandidates(problem('arithmetic', 'subtraction', { a: 13, b: 8 }), 2).status).toBe('unmatched')
  })
  it('does not invent a malformed algebra expression by dropping extra operators', () => {
    expect(predictableCandidates(problem('algebra', 'algebra_simplify', { expression: '2x++3' }), '5x').status).toBe('not_applicable')
  })
  it('requires actual coefficient structure rather than inferring it from level', () => {
    const result = predictableCandidates({ ...problem('algebra', 'algebra_evaluate', { expression: 'x+8', variables: { x: 5 } }), level: 4 }, 7)
    expect(result.status).toBe('not_applicable')
  })
  it('does not accept malformed fractions or decimals as integers', () => {
    for (const answer of ['3abc/8', '3/8xyz', '0.375', '', null]) {
      expect(predictableCandidates(cases[0][0], answer).status).toBe('uninterpretable')
    }
  })
  it('does not fabricate percentage context from a bare number or question prose', () => {
    expect(predictableCandidates(problem('percentage', 'percentage', { text: '12% av 250' }), 12).status).toBe('not_applicable')
  })
  it('retains competing models and chooses a question that actually separates them', () => {
    const p = problem('arithmetic_expressions', 'arithmetic_expressions', { text: '4+3×5' })
    const result = predictableCandidates(p, 35)
    expect(result.matches).toHaveLength(2)
    const probe = selectPredictableProbe(result, new Set([questionFingerprint(p)]))
    expect(probe.status).toBe('proposed')
    expect(probe.taskId).toBe('rule-expr-b')
    expect(probe.distinguishesModelIds).toHaveLength(2)
  })
  it('never repeats an already used probe or silently changes domain', () => {
    const result = predictableCandidates(cases[0][0], cases[0][1])
    const allSeen = new Set(predictableProbes.map(p => questionFingerprint(p.problem)))
    expect(selectPredictableProbe(result, allSeen).status).toBe('needs_review')
  })
  it('finds an unseen fact in the same family when the reviewed item is already used', () => {
    const bond = problem('number_fluency', 'number_bonds', { target: 15, knownTerm: 6, missingFirst: false })
    const result = predictableCandidates(bond, 8)
    expect(result.matches.map(m => m.modelId)).toEqual(['answer_off_by_one'])
    const seen = new Set([questionFingerprint(bond),
      questionFingerprint(problem('number_fluency', 'number_bonds', { target: 10, knownTerm: 1, missingFirst: true }))])
    const next = selectPredictableProbe(result, seen)
    expect(next).toMatchObject({ status: 'proposed', source: 'generated_fact_family', taskId: 'gen-bond-10-2' })
    expect(next.purposeSv).toMatch(/visa hur hen räknar/u)
    const table = problem('arithmetic', 'multiplication', { a: 7, b: 8 })
    const tableNext = selectPredictableProbe(predictableCandidates(table, 63), new Set([questionFingerprint(table),
      questionFingerprint(problem('arithmetic', 'multiplication', { a: 3, b: 3 })),
      questionFingerprint(problem('arithmetic', 'multiplication', { a: 4, b: 3 }))]))
    // 23 × 4 is the reviewed contrast; once seen, 3 × 4 is skipped because 4 × 3 was seen.
    expect(tableNext.taskId).toBe('rule-mul-b')
    const allSeenTables = selectPredictableProbe(predictableCandidates(table, 63), new Set([questionFingerprint(table),
      questionFingerprint(problem('arithmetic', 'multiplication', { a: 23, b: 4 })),
      questionFingerprint(problem('arithmetic', 'multiplication', { a: 3, b: 3 })),
      questionFingerprint(problem('arithmetic', 'multiplication', { a: 4, b: 3 }))]))
    expect(allSeenTables).toMatchObject({ status: 'proposed', taskId: 'gen-table-3-5' })
  })
  it('computes all reviewed probe answers independently from their stored display text', () => {
    for (const p of predictableProbes) {
      const result = predictableCandidates(p.problem, '')
      expect(result.status, p.id).not.toBe('not_applicable')
      expect(result.computedCorrect, p.id).not.toBeUndefined()
    }
  })
  it('does not evaluate injected or unsupported expression text', () => {
    for (const text of ['globalThis.alert(1)', '2**3', '2^3', '1÷0']) {
      expect(predictableCandidates(problem('arithmetic_expressions', 'arithmetic_expressions', { text }), 5).status).toBe('not_applicable')
    }
  })
  it('keeps source grading conflicts and partial answers out of model diagnosis', () => {
    const entry = { question: { domain: 'percentage', operation: 'percentage', values: cases[5][0].values },
      answer: { status: 'incorrect', studentAnswer: 12, correctAnswer: 30 } }
    expect(candidatesForEvidence(entry).status).toBe('matched')
    entry.answer.correctAnswer = 31
    expect(candidatesForEvidence(entry).reason).toBe('computed_and_source_answer_conflict')
    entry.answer.correctAnswer = 30; entry.answer.status = 'correct'
    expect(candidatesForEvidence(entry).reason).toBe('source_grading_requires_review')
    entry.answer.status = 'partial'
    expect(candidatesForEvidence(entry).reason).toBe('source_not_fully_assessed')
  })
})
