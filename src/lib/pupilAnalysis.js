import { OPERATION_LABELS } from './operations.js'
import { buildRuleHypotheses, comparableRuleCounter } from './pupilRuleHypotheses.js'
export const PUPIL_ANALYSIS_VERSION = 1
const fail = message => { throw Object.assign(new Error(message), { status: 400, code: 'invalid_analysis' }) }
const text = (value, max = 1000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('Rapporttext saknas eller är för lång.')
  return value.trim()
}
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !allowed.includes(key))) fail('Rapporten innehåller okända fält.')
}
const list = (value, max) => {
  if (!Array.isArray(value) || value.length > max) fail('Ogiltig rapportlista.')
  return value
}
const unit = entry => entry.reference.observationId || entry.reference.attemptId || entry.ref

export function analysisCounts(entries) {
  const counts = { total: entries.length, correct: 0, incorrect: 0, partial: 0, unanswered: 0, unassessed: 0, unknown: 0 }
  for (const entry of entries) {
    const status = entry.answer.status
    counts[Object.hasOwn(counts, status) && status !== 'total' ? status : 'unknown']++
  }
  return counts
}

export function validatePupilAnalysis(input, evidence) {
  keys(input, ['schemaVersion', 'snapshotRevision', 'scopeSv', 'provenance', 'strengths', 'hypotheses', 'limitationsSv'])
  if (input.schemaVersion !== PUPIL_ANALYSIS_VERSION || input.snapshotRevision !== evidence.snapshotRevision) {
    fail('Rapporten måste avse rätt schema och källrevision.')
  }
  keys(input.provenance, ['kind', 'model', 'instructionVersion'])
  if (!['rule', 'ai', 'teacher'].includes(input.provenance.kind)) fail('Ange vem som formulerat rapporten.')
  const byRef = new Map(evidence.entries.map(entry => [entry.ref, entry]))
  const references = values => {
    const refs = list(values, 20)
    if (new Set(refs).size !== refs.length || refs.some(ref => typeof ref !== 'string' || !byRef.has(ref))) fail('Okänd eller upprepad källreferens.')
    return refs
  }
  const ids = new Set()
  const identify = value => {
    const id = text(value, 80)
    if (!/^[A-Za-z0-9_-]+$/u.test(id) || ids.has(id)) fail('Rapportdelarnas ID måste vara unika.')
    ids.add(id)
    return id
  }
  const strengths = list(input.strengths, 8).map(item => {
    keys(item, ['id', 'textSv', 'refs'])
    const refs = references(item.refs)
    if (!refs.length || refs.some(ref => byRef.get(ref).answer.status !== 'correct')) fail('Exempel på fungerande innehåll måste peka på rätta svar.')
    return { id: identify(item.id), textSv: text(item.textSv), refs }
  })
  const hypotheses = list(input.hypotheses, 8).map(item => {
    keys(item, ['id', 'textSv', 'basis', 'signalCode', 'ruleVersion', 'supportRefs', 'counterRefs', 'alternativesSv', 'nextCheckSv'])
    const supportRefs = references(item.supportRefs), counterRefs = references(item.counterRefs)
    if (!['existing_signal', 'rule_candidate', 'ai_interpretation', 'teacher_interpretation'].includes(item.basis)
      || counterRefs.some(ref => supportRefs.includes(ref))) fail('Skilj signal, tolkning, stöd och motexempel åt.')
    const signalCode = item.signalCode ? text(item.signalCode, 120) : null
    if (item.ruleVersion !== undefined && item.basis !== 'rule_candidate') fail('Regelversion gäller bara en beräknad regelkandidat.')
    if (item.basis === 'existing_signal' && (!signalCode || !supportRefs.length
      || supportRefs.some(ref => !byRef.get(ref).interpretation.patterns.includes(signalCode)))) {
      fail('Den befintliga signalen måste finnas i varje stödsvar.')
    }
    if (item.basis === 'rule_candidate' && (!signalCode || !supportRefs.length || supportRefs.some(ref => {
      const entry = byRef.get(ref), result = entry.interpretation.predictable
      return entry.answer.status !== 'incorrect' || result?.status !== 'matched'
        || !item.ruleVersion || result.ruleVersion !== item.ruleVersion || !result.matches.some(match => match.modelId === signalCode)
    }) || counterRefs.some(ref => !comparableRuleCounter(byRef.get(ref), supportRefs.map(r => byRef.get(r)), signalCode)))) {
      fail('Regelkandidaten måste vara beräknad i varje stödsvar; motexempel ska pröva jämförbart särskiljande innehåll.')
    }
    const supportCount = new Set(supportRefs.map(ref => unit(byRef.get(ref)))).size
    if (!item.alternativesSv?.length) fail('Beskriv minst en alternativ förklaring eller vad som ännu är okänt.')
    return { id: identify(item.id), textSv: text(item.textSv), basis: item.basis, signalCode,
      ...(item.basis === 'rule_candidate' ? { ruleVersion: text(item.ruleVersion, 80) } : {}),
      supportRefs, counterRefs, supportCount,
      counterCount: new Set(counterRefs.map(ref => unit(byRef.get(ref)))).size,
      evidenceStatus: supportCount < 2 ? 'insufficient' : 'requires_teacher_review',
      alternativesSv: list(item.alternativesSv, 5).map(value => text(value, 500)), nextCheckSv: text(item.nextCheckSv) }
  })
  const exampleRefs = evidence.entries.slice(0, 20).map(entry => entry.ref)
  const refs = new Set([...exampleRefs, ...strengths.flatMap(item => item.refs), ...hypotheses.flatMap(item => [...item.supportRefs, ...item.counterRefs])])
  return { schemaVersion: PUPIL_ANALYSIS_VERSION, scopeSv: text(input.scopeSv, 300),
    provenance: { kind: input.provenance.kind,
      ...(input.provenance.model ? { model: text(input.provenance.model, 100) } : {}),
      instructionVersion: text(input.provenance.instructionVersion, 80) },
    snapshotRevision: evidence.snapshotRevision, period: evidence.period, source: evidence.source,
    counts: analysisCounts(evidence.entries), coverage: evidence.coverage,
    strengths, hypotheses, exampleRefs, limitationsSv: list(input.limitationsSv, 8).map(value => text(value)),
    evidence: evidence.entries.filter(entry => refs.has(entry.ref)) }
}

// Existing signals propose questions for review. They do not establish a cause.
export function buildPupilAnalysisDraft(evidence) {
  const groups = new Map()
  for (const entry of evidence.entries) {
    const key = entry.question.operation || entry.question.skill || entry.question.problemType || 'okänt område'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  const ruleHypotheses = buildRuleHypotheses(evidence.entries)
  const strengths = [], hypotheses = ruleHypotheses.slice(0, 8).map((item, i) => ({ id: `hypothesis-${i + 1}`, ...item }))
  for (const [area, entries] of groups) {
    const areaLabel = OPERATION_LABELS[area] || 'det granskade området'
    const correct = entries.filter(entry => entry.answer.status === 'correct')
    if (correct.length && strengths.length < 8) strengths.push({ id: `strength-${strengths.length + 1}`,
      textSv: `Rätta svar finns inom ${areaLabel}. Granska exemplens innehåll och svårighet.`, refs: correct.slice(0, 5).map(entry => entry.ref) })
    const fallback = entries.filter(entry => entry.interpretation.predictable?.status !== 'matched')
    const patterns = [...new Set(fallback.flatMap(entry => entry.interpretation.patterns))].filter(code => typeof code === 'string' && code.length <= 120)
    for (const code of patterns) {
      if (hypotheses.length >= 8) break
      const support = fallback.filter(entry => entry.interpretation.patterns.includes(code)).slice(0, 20)
      const detail = support.find(entry => entry.interpretation.detail)?.interpretation.detail
      hypotheses.push({ id: `hypothesis-${hypotheses.length + 1}`, basis: 'existing_signal', signalCode: code,
        textSv: `En tidigare felanalys har markerat ett mönster inom ${areaLabel}.${detail ? ` ${String(detail).slice(0, 600)}` : ''} Det är en signal att undersöka, inte en fastställd felorsak.`,
        supportRefs: support.map(entry => entry.ref), counterRefs: [],
        alternativesSv: ['Slutsvaret kan ha uppstått genom flera olika metoder.', 'Hjälp, avbrott eller en enstaka felskrivning kan ha påverkat svaret.'],
        nextCheckSv: 'Jämför uträkningarna med rätta svar på samma delmoment och låt eleven förklara ett nytt exempel.' })
    }
  }
  return { schemaVersion: 1, snapshotRevision: evidence.snapshotRevision, scopeSv: 'Granskning av tillgängliga svar i vald period',
    provenance: { kind: 'rule', instructionVersion: ruleHypotheses.length ? 'predictable-candidates-v1' : 'existing-signals-v1' }, strengths, hypotheses,
    limitationsSv: ['Historikens fullständighet är okänd. Antal svar beskriver urvalet, inte elevens samlade kunnande.',
      'Rätta svar är inte automatiskt motexempel: kontrollera att de prövar samma innehåll.',
      'Metoden kan inte fastställas från ett slutsvar. Inga nya AI-tolkningar har gjorts i detta regelunderlag.',
      ...(ruleHypotheses.length ? ['Rätta slutsvar väljs som möjliga motexempel bara vid samma kända innehåll/nivå och en särskiljande modell. Stödnivå och metod behöver granskas.',
        ...(ruleHypotheses.length > 8 ? [`Högst åtta modellgrupper visas; ${ruleHypotheses.length - 8} ytterligare grupper finns i underlaget.`] : [])] : [])] }
}

export function validateAnalysisCheckIn(input, report) {
  keys(input, ['decisions', 'goalSv', 'noteSv'])
  const decisions = list(input.decisions, 8)
  if (decisions.length !== report.hypotheses.length || new Set(decisions.map(item => item.hypothesisId)).size !== decisions.length) fail('Stäm av varje hypotes exakt en gång.')
  return { goalSv: text(input.goalSv, 1000), noteSv: typeof input.noteSv === 'string' && !input.noteSv.trim() ? '' : text(input.noteSv, 1500),
    decisions: decisions.map(item => {
      keys(item, ['hypothesisId', 'decision', 'interpretationSv'])
      if (!report.hypotheses.some(hypothesis => hypothesis.id === item.hypothesisId)
        || !['undecided', 'accepted', 'revised', 'rejected'].includes(item.decision)) fail('Ogiltig hypotesavstämning.')
      if (item.interpretationSv !== undefined && typeof item.interpretationSv !== 'string') fail('Tolkningen måste vara text.')
      const interpretationSv = item.interpretationSv?.trim() ? text(item.interpretationSv) : ''
      if (item.decision === 'revised' && !interpretationSv) fail('Beskriv den ändrade tolkningen.')
      return { hypothesisId: item.hypothesisId, decision: item.decision, interpretationSv }
    }) }
}
