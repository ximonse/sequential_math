// Simon 2026-10-30: speed training (tables, doubles, number bonds, number
// images) is for fluency. Its answers are data for us, not a reason to ask
// follow-up questions; directed follow-up belongs to screening without time
// pressure.
const SPEED_SKILLS = new Set(['number_bonds', 'doubles', 'subitizing'])
const SPEED_PROBLEM_TYPES = new Set(['mul_table_drill'])

// Single slips that are expected under time pressure.
export const SPEED_SLIP_MODELS = new Set(['answer_off_by_one', 'partial_answer_entry'])

export function isSpeedTrainingEntry(entry) {
  const q = entry?.question ?? {}
  return entry?.source === 'practice'
    && (SPEED_SKILLS.has(q.skill) || SPEED_SKILLS.has(q.operation) || SPEED_PROBLEM_TYPES.has(q.problemType))
}

export function speedSlipSummary(entries) {
  const counts = Object.fromEntries([...SPEED_SLIP_MODELS].map(id => [id, 0]))
  let total = 0
  for (const entry of entries) {
    const result = entry?.interpretation?.predictable
    if (!isSpeedTrainingEntry(entry) || entry.answer?.status !== 'incorrect' || result?.status !== 'matched') continue
    const slips = [...new Set(result.matches.map(m => m.modelId))].filter(id => SPEED_SLIP_MODELS.has(id))
    if (!slips.length) continue
    total++
    for (const id of slips) counts[id]++
  }
  return { total, counts }
}

// Directed follow-up is offered for computed models outside speed training.
export function contrastFollowUpEligible(item, report) {
  if (item?.basis !== 'rule_candidate' || !item.signalCode) return false
  const supports = item.supportRefs.map(ref => report.evidence.find(e => e.ref === ref)).filter(Boolean)
  return supports.length > 0 && !supports.every(isSpeedTrainingEntry)
}
