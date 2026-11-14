import { ERROR_MODELS } from './catalog.js'
import { MODEL_DESCRIPTIONS } from './modelDescriptions.js'
import { MISCONCEPTIONS } from './misconceptions.js'
import { predictableCandidates } from './index.js'
import { NCM_STRUCTURE } from '../arithmetic/screeningKeys.js'
import bank from '../arithmetic/diagnosticTasks.v1.json' with { type: 'json' }
import examples from './catalogExamples.json' with { type: 'json' }

// The two catalogue fields the governance document asks for besides the code
// (docs/STYRNING_FELFORSTAELSER.md, section 6): where an error is described,
// and its chance risk, how many different answers it predicts per task.
// Both are derived from data that already exists, so they cannot drift apart.

// A source row in Simon's tables or NCM first, then Simon's own reading, then
// the description's source (NCM area, Simon, or an approved agent proposal).
export function modelSource(id) {
  const links = Object.values(MISCONCEPTIONS).flatMap(m => m.errorModels.filter(link => link.id === id))
  const source = links.find(link => link.basis === 'source')
  if (source) return { kind: 'source', textSv: source.noteSv }
  const simon = links.find(link => link.basis === 'simon_observation')
  if (simon) return { kind: 'simon_observation', textSv: simon.noteSv }
  const description = MODEL_DESCRIPTIONS[id]?.sourceSv
  return description ? { kind: 'description', textSv: description } : null
}

// Measured outside the engine: the notebook shows one answer, the pupil wrote another.
export const CHANCE_NOT_COMPUTED = { notebook_answer_mismatch: 'Läses ur räknehäftet, inte beräknat: ett svar per uppgift.' }

// Every task the engine can read: the bank, the NCM structures and the catalogue examples.
function corpus() {
  const problems = new Map()
  const add = problem => problems.set(JSON.stringify(problem), problem)
  for (const model of Object.values(examples.models)) for (const item of [...model.hit, ...model.miss]) add(item.problem)
  for (const problem of Object.values(NCM_STRUCTURE)) add(problem)
  for (const task of bank.tasks) if (task.operation && task.operands?.length === 2) {
    add({ domain: 'arithmetic', type: task.operation, skill: task.operation, values: { a: task.operands[0], b: task.operands[1] } })
  }
  return [...problems.values()]
}

// Average number of different answers a model predicts on the tasks where it applies.
export function modelChance() {
  const sizes = {}
  for (const problem of corpus()) {
    const perModel = {}
    for (const p of predictableCandidates(problem, '').predictions ?? []) (perModel[p.modelId] ??= new Set()).add(String(p.predictedAnswer))
    for (const [id, answers] of Object.entries(perModel)) (sizes[id] ??= []).push(answers.size)
  }
  return Object.fromEntries(Object.keys(ERROR_MODELS).map(id => {
    const list = sizes[id] ?? []
    return [id, list.length ? { tasks: list.length, answersPerTask: Math.round(list.reduce((a, b) => a + b, 0) / list.length * 100) / 100 } : null]
  }))
}

// Simon 2026-11-12 (decision 3): a misconception that predicts more than two
// answers per task is shown only as a pattern over several tasks.
export const CHANCE_THRESHOLD = 2
export const guardedAgainstChance = model => model.kind !== 'misconception' || (model.minDistinctTasks ?? 0) >= 3 || model.needsRepetition === true
