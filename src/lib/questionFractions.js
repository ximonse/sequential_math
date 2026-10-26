// Presentation only: the original question stays unchanged in storage.
export function parseQuestionFractions(value) {
  const text = String(value ?? '')
  const pattern = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}|([−-]?\d+(?:[,.]\d+)?)\s*\/\/\s*([−-]?\d+(?:[,.]\d+)?)(?![\p{L}\p{N}_/]|[.,]\d)/gu
  const parts = []
  let end = 0
  for (const match of text.matchAll(pattern)) {
    // Check the left boundary without requiring RegExp lookbehind on tablets.
    if (match[3] !== undefined && /[\p{L}\p{N}_/.,]/u.test(text[match.index - 1] || '')) continue
    const numerator = (match[1] ?? match[3]).trim()
    const denominator = (match[2] ?? match[4]).trim()
    if (!numerator || !denominator) continue
    if (match.index > end) parts.push(text.slice(end, match.index))
    parts.push({ numerator, denominator })
    end = match.index + match[0].length
  }
  if (end < text.length) parts.push(text.slice(end))
  return parts
}
