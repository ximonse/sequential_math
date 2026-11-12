import examples from '../domains/predictableErrors/catalogExamples.json' with { type: 'json' }
import { predictableCandidates } from '../domains/predictableErrors/index.js'

// Synthetic evidence for the coverage check in CI. Real pupil answers are never
// committed; the real-data report runs locally with output outside the repo.
// Built from the catalogue's examples plus the cases a coverage report must
// keep visible: a teacher's judgement, unanswered work, an answer no model
// gives and a screening question without structured content.
const promptText = problem => {
  const v = problem.values
  if (v.text) return v.text
  if (v.expression) return v.expression
  if (v.kind) return JSON.stringify(v)
  if (v.target !== undefined) return `? + ${v.knownTerm} = ${v.target}`
  if (v.form) return `${v.form} ${v.value}`
  return `${v.a} ${{ addition: '+', subtraction: '−', multiplication: '·', division: '/' }[problem.type]} ${v.b}`
}

function entry(problem, studentAnswer, index, extra = {}) {
  const correctAnswer = predictableCandidates(problem, '').computedCorrect
  const status = String(studentAnswer) === String(correctAnswer) ? 'correct' : 'incorrect'
  return { source: 'practice', timestamp: 1_700_000_000_000 + index, ref: `synthetic-${index}`,
    reference: { kind: 'observation', observationId: `synthetic-${index}` },
    question: { domain: problem.domain, operation: problem.type, skill: problem.skill ?? problem.type,
      values: problem.values, promptText: promptText(problem) },
    answer: { status, studentAnswer, correctAnswer }, context: {}, interpretation: { category: 'none', patterns: [] }, ...extra }
}

export function syntheticCoverageEntries() {
  const entries = []
  for (const [id, { hit, miss }] of Object.entries(examples.models)) {
    for (const example of hit) entries.push({ ...entry(example.problem, example.answer, entries.length), expectedModel: id })
    for (const example of miss) entries.push(entry(example.problem, example.answer, entries.length))
    entries.push(entry(hit[0].problem, predictableCandidates(hit[0].problem, '').computedCorrect, entries.length))
  }
  const add = { domain: 'arithmetic', type: 'addition', values: { a: 47, b: 35 } }
  entries.push({ ...entry(add, 991, entries.length), expectedReason: 'no_model' })
  // The teacher counted a wrong answer as right; the pupil's own answer is still wrong.
  const judged = entry(add, 72, entries.length)
  entries.push({ ...judged, answer: { ...judged.answer, status: 'correct', studentAnswer: 82, teacherAssessed: true,
    observed: { status: 'incorrect', studentAnswer: 72 } } })
  entries.push({ ...entry(add, null, entries.length), answer: { status: 'unanswered', studentAnswer: null, correctAnswer: 82, workWithoutAnswer: true } })
  entries.push({ source: 'screening', timestamp: 1_700_000_100_000, ref: 'synthetic-screening', reference: { kind: 'screening_attempt', attemptId: 'synthetic' },
    question: { taskId: 'synthetic-text', promptSv: 'Skriv andelen 1/5 som procent.' }, answer: { status: 'incorrect', studentAnswer: '2%', correctAnswer: '20 %' },
    context: { evidenceClass: 'diagnostic_only' }, interpretation: { category: 'unknown', patterns: [] }, expectedReason: 'unsupported_structure' })
  return entries
}
