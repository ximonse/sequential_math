import { ARITHMETIC_OPERATIONS, questionOperation } from '../domains/predictableErrors/core.js'

export function evidenceProblem(entry) {
  const q = entry?.question ?? {}, type = questionOperation(q)
  const domain = q.domain ?? (ARITHMETIC_OPERATIONS.includes(type) ? 'arithmetic' : null)
  return { domain, type, skill: q.skill ?? type,
    values: q.values ?? (q.operands?.length === 2 ? { a: q.operands[0], b: q.operands[1] } : {}),
    display: { text: q.promptSv ?? q.promptText } }
}
