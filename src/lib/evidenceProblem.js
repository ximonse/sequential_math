export function evidenceProblem(entry) {
  const q = entry?.question ?? {}, type = q.operation ?? q.skill
  const domain = q.domain ?? (['addition', 'subtraction', 'multiplication', 'division'].includes(type) ? 'arithmetic' : null)
  return { domain, type, skill: q.skill ?? type,
    values: q.values ?? (q.operands?.length === 2 ? { a: q.operands[0], b: q.operands[1] } : {}),
    display: { text: q.promptSv ?? q.promptText } }
}
