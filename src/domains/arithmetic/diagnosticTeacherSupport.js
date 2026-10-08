export function buildDiagnosticTeacherSupport(detail) {
  const support = []
  if (detail.columnAlignment?.status === 'observed' && detail.columnAlignment.alignment === 'misaligned') support.push({
    code: 'P', reason: 'Entalen står i olika kolumner i den sparade uppställningen.',
    question: 'Kan du visa vilken siffra som är ental i vart och ett av talen?'
  })
  if (detail.visibleResult?.status === 'observed' && detail.visibleResult.consistency === 'different') support.push({
    code: 'Ö', reason: `${detail.visibleResult.visibleResult} står i häftet och ${detail.visibleResult.explicitAnswer} i svarsfältet.`,
    question: 'Vilket svar vill du lämna in, och hur hänger det ihop med din uträkning?'
  })
  if (detail.subtractionPattern?.status === 'matched') support.push({
    code: 'M', reason: 'Det synliga resultatet är förenligt med större siffra minus mindre i varje kolumn.',
    question: 'Kan du visa steg för steg hur du räknade i varje kolumn och hur du hanterade nollan?'
  })
  return support
}
