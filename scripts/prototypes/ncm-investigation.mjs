// Stateless offline contract experiment. This module is not imported by the app or MCP.
import { decidePilot } from './ncm-screening-pilot.mjs'
import { getInvestigationProfile, evaluateInvestigationAnswer } from './ncm-investigation-content.mjs'

export const INVESTIGATION_RULE_VERSION = 'synthetic-investigation-v1'

export function decideInvestigation({ scope = 'single_exchange', observations = [], review = null, teaching = null } = {}) {
  const profile = getInvestigationProfile(scope), bank = new Map(profile.tasks.map(t => [t.id, t]))
  const seen = new Map(), evidence = []
  const base = { ruleVersion: INVESTIGATION_RULE_VERSION, scope, coverageIds: profile.coverageIds,
    evidenceClass: 'diagnostic_only', limitation: 'Offline design rules; no validated diagnosis, app writes or permanent mastery claim.' }
  const decide = (phase, action, reasonCode, reasonSv, extra = {}) => ({ ...base, phase, action,
    reasonCode, reasonSv, evidenceIds: evidence.map(e => e.id), ...extra })
  for (const item of observations) {
    if (!item.id || !bank.has(item.taskId) || item.phase !== bank.get(item.taskId).phase
      || !['answered', 'blank', 'interrupted'].includes(item.status)
      || !['consistent', 'contradictory', 'unreviewed'].includes(item.method)
      || !['none', 'helped', 'unknown'].includes(item.assistance)) throw Error('Invalid investigation observation')
    if (seen.has(item.id)) {
      if (seen.get(item.id) !== JSON.stringify(item)) return decide('review', 'stop', 'conflicting_observation', 'Motstridiga kopior av samma observation behöver granskas.')
      continue
    }
    seen.set(item.id, JSON.stringify(item)); evidence.push(item)
  }
  if (evidence.some(e => e.saved !== true)) return decide('saving', 'wait', 'save_pending', 'Invänta sparbekräftelse innan nästa steg.')
  const diagnostic = evidence.filter(e => e.phase === 'investigate')
  function ask(phase, candidates, reasonCode, reasonSv) {
    const usedTasks = new Set(evidence.map(e => e.taskId))
    const task = candidates.find(t => !usedTasks.has(t.id))
    return task ? decide(phase, 'ask', reasonCode, reasonSv, { task, purposeSv: reasonSv })
      : decide('review', 'stop', 'no_unseen_contrast', 'Ingen oanvänd granskad kontrast finns. Lämna en lärarfråga i stället för upprepningar.')
  }
  if (!review) {
    if (teaching || evidence.some(e => e.phase !== 'investigate')) throw Error('Later stages require an explicit hypothesis review')
    if (diagnostic.some(e => e.origin !== 'history' && e.assistance !== 'none')) return decide('review', 'stop', 'diagnostic_support_unknown',
      'Hjälpta försök eller okänd stödnivå kan inte räknas som självständiga diagnostiska belägg.')
    if (scope === 'single_exchange') {
      const result = decidePilot({ history: diagnostic.filter(e => e.origin === 'history').map(e => ({ ...e,
        // History may start an inquiry without becoming independent confirmation.
        method: e.assistance === 'none' ? e.method : e.method === 'contradictory' ? 'contradictory' : 'unreviewed' })),
        responses: diagnostic.filter(e => e.origin !== 'history') })
      return decide(result.outcome === 'supported' ? 'no_current_concern' : 'investigate', result.action,
        result.reasonCode, result.reasonSv, { diagnosticDecision: result, ...(result.task ? { task: result.task, purposeSv: result.reasonSv } : {}) })
    }
    if (diagnostic.some(e => e.status !== 'answered')) return decide('review', 'stop', 'incomplete_response', 'Obesvarat eller avbrutet fastställer ingen kunskapsbrist.')
    if (diagnostic.some(e => evaluateInvestigationAnswer(bank.get(e.taskId), e.answer) === null)) {
      return decide('review', 'stop', 'uninterpretable_response', 'Svaret behöver tolkas före matematisk bedömning.')
    }
    if (diagnostic.some(e => e.method === 'contradictory')) return decide('review', 'stop', 'method_conflict', 'Rättmarkering kan inte ersätta ett motsägande resonemang.')
    if (diagnostic.filter(e => e.origin !== 'history').length >= 5) return decide('review', 'stop', 'question_budget', 'Frågebudgeten är slut; behåll osäkerheten.')
    return ask('investigate', profile.tasks.filter(t => t.phase === 'investigate'), 'separate_fraction_rules',
      'Skilj bråkens storlek från antalet saknade delar och från nämnarens storlek; granska förklaringen innan slutsats.')
  }
  if (!['supported', 'not_supported'].includes(review.verdict) || !profile.hypothesisIds.includes(review.hypothesisId)
    || !review.id || !review.reasonSv?.trim() || !review.alternativesSv?.trim()
    || !Array.isArray(review.basedOn) || !review.basedOn.length || new Set(review.basedOn).size !== review.basedOn.length) throw Error('Invalid hypothesis review')
  const reviewed = review.basedOn.map(id => diagnostic.find(e => e.id === id))
  if (reviewed.some(e => !e || !e.source?.ref || !e.source?.snapshotRevision)) throw Error('Review must cite revision-bound diagnostic observations')
  if (reviewed.some(e => review.sourceRevisions?.[e.id] !== e.source.snapshotRevision)) {
    return decide('review', 'stop', 'review_revision_changed', 'Granskningen gäller en annan källrevision och behöver förnyas.')
  }
  if (diagnostic.some(e => !review.basedOn.includes(e.id))) return decide('review', 'stop', 'unresolved_diagnostic_evidence',
    'Granskningen måste även hantera övriga diagnostiska observationer och möjliga motexempel.')
  if (reviewed.some(e => e.status !== 'answered' || e.method !== 'consistent' || e.assistance !== 'none')) {
    return decide('review', 'stop', 'review_not_grounded', 'Underlaget är ofullständigt, hjälpt eller saknar förenlig metodgranskning.')
  }
  if (review.verdict === 'not_supported') return decide('no_current_concern', 'stop', 'hypothesis_not_supported', 'Misstanken får inte stöd i det granskade underlaget; ingen automatisk träning startas.')
  const contrasts = reviewed.filter(e => bank.get(e.taskId).discriminates.includes(review.hypothesisId))
  if (new Set(contrasts.map(e => e.taskId)).size < 2 || contrasts.some(e => evaluateInvestigationAnswer(bank.get(e.taskId), e.answer) !== false)) {
    return decide('review', 'stop', 'review_not_grounded', 'Denna pilot kräver två olika relevanta felkontraster och metodgranskning för en stödd hypotes.')
  }
  if (!teaching) return decide('teaching', 'propose_teaching', 'reviewed_learning_need', review.reasonSv,
    { goalSv: profile.goalSv, instructionSv: profile.instructionSv, reviewId: review.id })
  if (teaching.reviewId !== review.id || !teaching.id || !teaching.sessionId || !Number.isFinite(teaching.completedAt)
    || !teaching.goalSv?.trim() || !Array.isArray(teaching.usedTaskIds)
    || teaching.usedTaskIds.some(id => typeof id !== 'string' || !id.trim())) throw Error('Teaching must reference the reviewed need, session and used questions')
  if (teaching.saved !== true) return decide('saving', 'wait', 'teaching_save_pending', 'Invänta sparad undervisningsnotering.')
  const controls = evidence.filter(e => e.phase !== 'investigate')
  if (controls.some(e => teaching.usedTaskIds.includes(e.taskId))) return decide('review', 'stop',
    'control_seen_during_teaching', 'En fråga som användes under undervisningen är inte en ny oberoende kontroll.')
  if (controls.some(e => !e.source?.ref || !e.source?.snapshotRevision)) return decide('review', 'stop',
    'control_source_missing', 'Varje kontroll behöver en sparad originalreferens och källrevision.')
  const minimumTime = teaching.completedAt
  if (controls.some(e => !Number.isFinite(e.observedAt) || e.observedAt <= minimumTime || !e.sessionId)) {
    return decide('review', 'stop', 'control_timing_unknown', 'Självständiga kontroller behöver känd ordning efter undervisningen.')
  }
  if (controls.some(e => e.status !== 'answered')) return decide('review', 'stop', 'incomplete_control', 'Avbrott eller obesvarat lämnar kontrollen öppen.')
  if (controls.some(e => e.assistance !== 'none')) return decide('review', 'stop', 'control_not_independent', 'Stöd eller okänd stödnivå kan inte bekräfta självständig förståelse.')
  if (controls.some(e => e.method !== 'consistent')) return decide('review', 'stop', 'control_method_review', 'Granska resonemanget även om slutsvaret är rätt.')
  if (controls.some(e => evaluateInvestigationAnswer(bank.get(e.taskId), e.answer) === null)) return decide('review', 'stop', 'uninterpretable_control', 'Kontrollsvaret behöver tolkas.')
  const failed = controls.filter(e => !evaluateInvestigationAnswer(bank.get(e.taskId), e.answer))
  if (failed.length) return decide('review', 'stop', 'reopen_question', 'Ett kontrollfel återöppnar frågan; det fastställer inte att samma felförståelse återkommit.',
    { failedIds: failed.map(e => e.id), requiresNewReview: true })
  const independent = controls.filter(e => e.phase === 'independent')
  if (new Set(independent.map(e => e.taskId)).size < 2) {
    if (controls.some(e => e.phase === 'followup')) return decide('review', 'stop', 'out_of_order_followup', 'Senare uppföljning kan inte ersätta den första självständiga kontrollen.')
    return ask('independent', profile.tasks.filter(t => t.phase === 'independent'), 'check_without_help', 'Pröva samma delmoment med nya tal utan hjälp; träningsframgång räcker inte.')
  }
  const followup = controls.filter(e => e.phase === 'followup')
  const independentEnd = Math.max(...independent.map(e => e.observedAt))
  const initialSessions = new Set([teaching.sessionId, ...independent.map(e => e.sessionId)])
  if (followup.some(e => e.observedAt <= independentEnd || initialSessions.has(e.sessionId))) return decide('review', 'stop',
    'followup_not_later', 'Senare kontroll behöver ett annat undervisningstillfälle efter de självständiga kontrollerna.')
  if (new Set(followup.map(e => e.taskId)).size < 2) return ask('followup', profile.tasks.filter(t => t.phase === 'followup'),
    'followup_required', 'Det fungerar självständigt nu. Pröva senare och i förändrat sammanhang innan aktiv utredning avslutas.')
  return decide('closed', 'stop', 'supported_in_tested_scope', 'Stabil självständig förståelse i prövade situationer, även vid senare uppföljning. Inget besked om oprövade delmoment eller permanent borttagen felförståelse.',
    { reviewId: review.id, teachingId: teaching.id, controlIds: controls.map(e => e.id) })
}
