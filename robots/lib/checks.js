// Rule checks that need no knowledge of how the app is built: they compare
// what the pupil chose with what the pupil got.
export const ARITHMETIC = ['addition', 'subtraction', 'multiplication', 'division']
const SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' }

export function taskKey(problem) {
  const text = problem?.metadata?.promptText || problem?.display?.text
  if (text) return String(text).replace(/\s+/g, ' ').trim()
  return `${problem?.type}:${problem?.values?.a}:${problem?.values?.b}`
}

export function taskLabel(problem) {
  return `${taskKey(problem)} (${problem?.skill || problem?.type}, nivå ${problem?.level ?? problem?.metadata?.targetLevel ?? '?'})`
}

export function taskOperation(problem) {
  return String(problem?.skill || problem?.type || '')
}

export function taskLevel(problem) {
  const level = Number(problem?.level ?? problem?.metadata?.evidenceLevel ?? problem?.metadata?.targetLevel)
  return Number.isFinite(level) ? level : null
}

// Independent answer for the four basic operations.
export function independentAnswer(problem) {
  if (!ARITHMETIC.includes(problem?.type)) return null
  const a = Number(problem?.values?.a); const b = Number(problem?.values?.b)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return { addition: a + b, subtraction: a - b, multiplication: a * b, division: b === 0 ? NaN : a / b }[problem.type]
}

export function checkChosenContent(problem, choice, findings) {
  const op = taskOperation(problem)
  const detail = { uppgift: taskLabel(problem), valt: choice.label }
  if (choice.mode) {
    const visibleOp = ARITHMETIC.includes(choice.mode) ? problem?.type : op
    if (visibleOp !== choice.mode && op !== choice.mode) findings.add('R1', `Valde ${choice.label} men fick en annan sorts uppgift`, { ...detail, fick: visibleOp || op })
    if (ARITHMETIC.includes(choice.mode) && problem?.type !== choice.mode) findings.add('R1', `Valde ${choice.label} men räknetecknet är ett annat`, { ...detail, fick: problem?.type })
  }
  if (choice.tables) {
    const table = Number(problem?.metadata?.table)
    const { a, b } = problem?.values || {}
    const hitsChosen = choice.tables.some(t => t === a || t === b)
    if (problem?.type !== 'multiplication') findings.add('R1', 'Tabellträning gav något annat än multiplikation', detail)
    else if (!hitsChosen || (Number.isFinite(table) && !choice.tables.includes(table))) findings.add('R1', `Valde tabell ${choice.tables.join(', ')} men fick en annan tabell`, detail)
    const factor = a === table ? b : a
    if (Number(factor) > 10 || Number(factor) < 0) findings.add('R1', 'Tabellträning gav en faktor utanför 0–10', detail)
  }
  if (choice.allowedOperations && op && !choice.allowedOperations.includes(op) && !choice.allowedOperations.includes(problem?.type)) {
    findings.add('R1', 'Fri träning gav ett räknesätt som klassen inte har aktiverat', { ...detail, aktiverat: choice.allowedOperations.join(',') })
  }
}

export function checkAnswerKey(problem, findings) {
  const expected = independentAnswer(problem)
  if (expected === null) return
  const stated = Number(problem?.answer?.correct ?? problem?.result)
  if (!Number.isFinite(expected)) { findings.add('C1', 'Uppgiften går inte att räkna ut (t.ex. delat med noll)', { uppgift: taskLabel(problem) }); return }
  if (Math.abs(expected - stated) > 1e-7) findings.add('C1', 'Facit är fel', { uppgift: taskLabel(problem), facit: stated, rätt: expected })
  const shown = String(problem?.display?.text || '')
  if (shown && !shown.includes(SYMBOL[problem.type])) findings.add('C1', 'Visad uppgift har fel räknetecken', { uppgift: taskLabel(problem) })
}

// Runs the domain's own content check on the robot server (works for both
// the dev server and the production bundle).
export async function domainVerify(page, problem) {
  const response = await page.request.post('/__robot/verify', { data: { problem } })
  return response.json()
}

export function repetitionStats(keys) {
  const counts = new Map()
  for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1)
  let immediate = 0; let withinFive = 0
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] === keys[i - 1]) immediate++
    if (keys.slice(Math.max(0, i - 5), i).includes(keys[i])) withinFive++
  }
  const sorted = [...counts.entries()].sort((x, y) => y[1] - x[1])
  return { total: keys.length, distinct: counts.size, immediate, withinFive, top: sorted.slice(0, 5) }
}
