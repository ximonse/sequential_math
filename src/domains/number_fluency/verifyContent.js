export function verifyNumberFluencyContent(problem) {
  const values = problem?.values || {}
  const answer = Number(problem?.answer?.correct)
  let expected = NaN

  if (problem?.skill === 'number_bonds') {
    expected = Number(values.target) - Number(values.knownTerm)
  } else if (problem?.skill === 'doubles') {
    const form = String(values.form || '')
    expected = form === 'double_missing_factor' || form === 'double_halving_transfer'
      ? Number(values.value)
      : Number(values.doubled)
  }

  return {
    valid: Number.isFinite(expected) && expected === answer,
    reason: `expected ${expected}, received ${answer}`
  }
}
