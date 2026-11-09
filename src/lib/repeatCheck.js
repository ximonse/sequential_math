// "Fråga igen": simple facts (tables, number bonds, doubles) have no method to
// tell apart, only whether the pupil slipped or does not know the fact. The
// same facts are asked again, mixed with facts the pupil got right, without
// time pressure. Repetition is the point here, unlike contrast and new controls.
const fail = message => { throw Object.assign(new Error(message), { status: 400, code: 'invalid_repeat_check' }) }
const SYMBOLS = { addition: '+', subtraction: '−', multiplication: '·', division: '/' }
export const REPEAT_MAX_FACTS = 6
export const REPEAT_MAX_FILLERS = 3

const operands = entry => {
  const values = entry?.question?.values || {}
  const [a, b] = Array.isArray(entry?.question?.operands) ? entry.question.operands : [values.a, values.b]
  return [a, b]
}

export function isSimpleFact(entry) {
  const [a, b] = operands(entry), operation = entry?.question?.operation
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false
  if (operation === 'multiplication') return a <= 10 && b <= 10
  if (operation === 'addition') return a + b <= 20
  if (operation === 'subtraction') return a <= 20 && b <= a
  return false
}

// A report suspicion whose every support answer is a simple fact.
export const isSimpleFactItem = (item, report) => item.supportRefs.length > 0
  && item.supportRefs.every(ref => isSimpleFact(report.evidence.find(entry => entry.ref === ref)))

export const factPrompt = entry => { const [a, b] = operands(entry); return `${a} ${SYMBOLS[entry.question.operation]} ${b}` }
export const factCorrect = entry => {
  const [a, b] = operands(entry)
  return { addition: a + b, subtraction: a - b, multiplication: a * b }[entry.question.operation]
}
export const factCustomTask = entry => ({ promptSv: factPrompt(entry), gridEnabled: false,
  answerKey: { format: 'number', expected: [factCorrect(entry)] } })

const sameNumber = (left, right) => {
  const parse = value => Number(String(value ?? '').trim().replace(',', '.'))
  return String(right ?? '').trim() !== '' && parse(left) === parse(right)
}

// Server side: every repeated fact is one of the pupil's own wrong answers on a
// simple fact, every filler one of their right answers, and every custom task
// asks exactly that fact with its key. Clients name references only.
export function buildRepeatCheck(input, { records, customTasks }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['schemaVersion', 'facts', 'fillers'].includes(key)) || input.schemaVersion !== 1
    || !Array.isArray(input.facts) || !input.facts.length || input.facts.length > REPEAT_MAX_FACTS
    || !Array.isArray(input.fillers) || input.fillers.length > REPEAT_MAX_FILLERS) fail('Ogiltig fråga igen.')
  const usedTasks = new Set(), prompts = new Set()
  const resolve = (item, wantWrong) => {
    if (!item || Object.keys(item).some(key => !['basisIndex', 'ref', 'customIndex'].includes(key))) fail('Ogiltig fråga igen.')
    const record = records[item.basisIndex]
    const listed = wantWrong ? record?.basis.supportRefs : record?.basis.counterRefs
    const entry = listed?.includes(item.ref) && record.evidence.entries.find(value => value.ref === item.ref)
    if (!entry || entry.answer.status !== (wantWrong ? 'incorrect' : 'correct') || !isSimpleFact(entry)) {
      fail('Fråga igen gäller elevens egna svar på enkla fakta.')
    }
    const task = customTasks?.[item.customIndex]
    const expected = factCustomTask(entry)
    if (!Number.isInteger(item.customIndex) || usedTasks.has(item.customIndex) || !task || task.promptSv !== expected.promptSv
      || task.answerKey?.format !== 'number' || task.answerKey.expected?.[0] !== expected.answerKey.expected[0]) {
      fail('Frågan stämmer inte med elevens ursprungliga uppgift.')
    }
    if (prompts.has(expected.promptSv)) fail('Samma faktum är valt två gånger.')
    usedTasks.add(item.customIndex); prompts.add(expected.promptSv)
    return { prompt: expected.promptSv, correct: factCorrect(entry), sourceRef: entry.ref,
      ...(wantWrong ? { previousAnswer: entry.answer.studentAnswer } : {}) }
  }
  return { schemaVersion: 1, facts: input.facts.map(item => resolve(item, true)), fillers: input.fillers.map(item => resolve(item, false)) }
}

// Result per repeated fact: right now, the same wrong answer again, another wrong answer, or not answered.
export function repeatOutcome(fact, entry) {
  if (!entry || !['correct', 'incorrect'].includes(entry.answer?.status)) return 'unanswered'
  if (entry.answer.status === 'correct') return 'correct'
  return sameNumber(fact.previousAnswer, entry.answer.studentAnswer) ? 'same_wrong' : 'other_wrong'
}
