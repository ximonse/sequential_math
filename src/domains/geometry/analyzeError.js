export function analyzeGeometryError(problem, studentAnswer) {
  const answer = String(studentAnswer ?? '').trim()
  if (answer === String(problem?.answer?.correct || '')) return { category: 'none', patterns: [], detail: '' }
  const selected = (problem?.values?.options || []).find(item => item.id === answer)
  if (!selected) return { category: 'input', patterns: ['invalid_choice'], detail: 'Svaret motsvarar inget visat alternativ.' }
  const pattern = String(selected.errorPattern || '').trim()
  if (pattern) return { category: 'misconception', patterns: [pattern], detail: `Valet ”${selected.label}” prövar felhypotesen ${pattern}.` }
  return { category: 'knowledge', patterns: ['geometry_object_error'], detail: 'Objektet eller egenskapen identifierades inte korrekt.' }
}

