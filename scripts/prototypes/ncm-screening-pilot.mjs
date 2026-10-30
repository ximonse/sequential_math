// Offline decision experiment. Not imported by the pupil app or MCP adapter.
import { readFileSync } from 'node:fs'

export const RULE_VERSION = 'synthetic-as2-v1'
const original = JSON.parse(readFileSync(new URL('../../src/domains/arithmetic/diagnosticTasks.v1.json', import.meta.url)))
const roles = { aligned_columns_without_exchange: 'baseline', single_exchange: 'single_exchange', exchange_through_zero: 'through_zero' }
export const tasks = original.tasks.filter(task => task.operation === 'subtraction').map(task => ({
  id: task.taskId, role: roles[task.intentCode], prompt: task.promptSv, operands: task.operands,
  answer: task.operands[0] - task.operands[1], coverageId: 'M02', grid: true, source: 'original_catalog'
})).concat([
  { id: 'pilot-ag3-a', role: 'prerequisite', prompt: '13 − 8', answer: 5, coverageId: 'M02', grid: false, source: 'proposed_original' },
  { id: 'pilot-ag3-b', role: 'prerequisite', prompt: '14 − 6', answer: 8, coverageId: 'M02', grid: false, source: 'proposed_original' }
])
const bank = new Map(tasks.map(task => [task.id, task]))

export function decidePilot({ scope = 'single_exchange', history = [], responses = [] } = {}) {
  if (!['single_exchange', 'through_zero'].includes(scope)) throw Error('Unsupported pilot scope')
  const ignored = [], seen = new Map(), selectedHistory = [], current = []
  let conflict = false
  for (const [source, entries] of [['history', history], ['current', responses]]) {
    for (const entry of entries) {
      if (!entry.id || !bank.has(entry.taskId) || !['answered', 'blank', 'interrupted'].includes(entry.status)
        || !['consistent', 'contradictory', 'unreviewed'].includes(entry.method)) {
        throw Error('Synthetic observation needs an ID, known task, status and explicit method-review state')
      }
      const identity = JSON.stringify(entry)
      if (seen.has(entry.id)) {
        if (seen.get(entry.id) !== identity) conflict = true
        continue
      }
      seen.set(entry.id, identity)
      const task = bank.get(entry.taskId)
      // History eligibility is an explicit reviewer decision in this experiment,
      // not an unvalidated freshness score inferred from elapsed days.
      if (source === 'history' && (!entry.selectedForScope || !entry.selectionReason || !entry.snapshotRevision)) {
        ignored.push({ id: entry.id, reason: 'history_not_reviewed_for_scope' })
        continue
      }
      if (source === 'history' && task.role !== scope) {
        ignored.push({ id: entry.id, reason: 'different_subskill' })
        continue
      }
      const numeric = typeof entry.answer === 'number' ? entry.answer
        : typeof entry.answer === 'string' && /^-?\d+(?:[.,]\d+)?$/.test(entry.answer.trim())
          ? Number(entry.answer.trim().replace(',', '.')) : NaN
      const observation = { ...entry, source, task, invalidInput: entry.status === 'answered' && !Number.isFinite(numeric), correct: entry.status === 'answered'
        && Number.isFinite(numeric) && numeric === task.answer }
      ;(source === 'history' ? selectedHistory : current).push(observation)
    }
  }
  const evidence = [...selectedHistory, ...current]
  const contrast = evidence.filter(item => item.task.role === scope)
  const newContrasts = current.filter(item => item.task.role === scope)
  const prerequisite = current.filter(item => item.task.role === 'prerequisite')
  const errors = evidence.filter(item => item.status === 'answered' && !item.correct)
  const support = contrast.filter(item => item.correct && item.method === 'consistent')
  const independentSupport = [...new Map(support.map(item => [item.taskId, item])).values()]
  const base = { ruleVersion: RULE_VERSION, scope, coverageIds: ['M02', 'N2'],
    evidenceClass: 'diagnostic_only', usedNewQuestions: current.length, maxNewQuestions: 5,
    evidenceIds: evidence.map(item => item.id), supportIds: independentSupport.map(item => item.id), ignored,
    limitation: 'Synthetic rule, not a validated diagnosis or mastery decision.' }
  const stop = (outcome, reasonCode, reasonSv) => ({ ...base, action: 'stop', outcome, reasonCode, reasonSv })
  const latest = current.at(-1)
  if (conflict) return stop('insufficient', 'conflicting_observation', 'Samma observation har motstridigt innehåll; ingen ny fråga väljs.')
  // Never navigate away from any unacknowledged response, including an older one.
  if (current.some(item => item.saved !== true)) return { ...base, action: 'wait',
    reasonCode: 'save_pending', reasonSv: 'Invänta sparbekräftelse; bevara arbetet och samma fråga.' }
  if (latest && ['blank', 'interrupted'].includes(latest.status)) return stop('insufficient',
    'incomplete_response', 'Obesvarat eller avbrutet är inte en kunskapsbrist. Bevara arbetet för uppföljning.')
  if (evidence.some(item => item.invalidInput)) return stop('insufficient', 'uninterpretable_response',
    'Svaret kan inte tolkas som ett tal. Kontrollera inmatningen före matematisk tolkning.')
  if (current.length > 5) return stop('insufficient', 'question_budget', 'Underlaget överskrider pilotens budget; ingen ny fråga väljs.')
  if (evidence.some(item => item.method === 'contradictory')) return stop('needs_review',
    'method_conflict', 'Slutsvar och granskat arbete motsäger varandra; lärargranskning behövs.')
  if (independentSupport.length >= 2 && newContrasts.some(item => item.correct)
    && errors.length === 0 && contrast.every(item => item.method === 'consistent')) {
    return stop('supported', 'subskill_supported', 'Två olika särskiljande frågor ger förenligt stöd för just detta delmoment. Avsluta här.')
  }
  if (current.length >= 5) return stop('insufficient', 'question_budget', 'Frågebudgeten är slut; kvarvarande osäkerhet redovisas.')
  const seenTasks = new Set([...history, ...responses].map(item => item.taskId))
  function ask(role, reasonCode, reasonSv) {
    const task = tasks.find(item => item.role === role && !seenTasks.has(item.id))
    if (!task) return stop('insufficient', 'no_unseen_contrast', 'Ingen oanvänd granskad fråga finns för nästa steg. Fyll inte ut med upprepningar.')
    return { ...base, action: 'ask', task, reasonCode, reasonSv }
  }
  // Existing pattern labels are deliberately not used as causal routing rules.
  if (errors.length) {
    if (!prerequisite.length) return ask('prerequisite', 'check_prerequisite',
      'Ett fel säger inte varför. Pröva relevant AG3-förkunskap innan fler skriftliga frågor.')
    if (prerequisite.some(item => !item.correct)) {
      if (prerequisite.length < 2) return ask('prerequisite', 'contrast_prerequisite',
        'Förkunskapen är osäker; välj en annan kontroll utan att fastställa felorsak.')
      return stop('needs_review', 'prerequisite_uncertain', 'Även förkunskapskontrollen är osäker. Lämna frågor och svar till läraren, utan orsaksdiagnos.')
    }
    if (newContrasts.length < 2) return ask(scope, 'contrast_written_method',
      'AG3-kontrollen fungerar. Pröva en annan skriftlig kontrast för att skilja representation från beräkning.')
    return stop('needs_review', 'written_prerequisite_difference',
      'Förkunskapskontroll och skriftligt resultat skiljer sig. Följ upp växling/metod; fastställ ingen missuppfattning automatiskt.')
  }
  if (!selectedHistory.length && current.length === 0) return ask('baseline', 'establish_baseline',
    'Jämförbart historiskt underlag saknas. Börja med kolumnplacering utan växling; rätt svar här bevisar inte växling.')
  if (newContrasts.length >= 2) return stop('needs_review', 'method_not_reviewed',
    'Slutsvaren räcker inte för metodbedömning. Granska arbetet i stället för att ge fler likadana frågor.')
  return ask(scope, 'discriminating_contrast',
    selectedHistory.length ? 'Relevant historik finns; välj en ny särskiljande bekräftelse.' : 'Välj en fråga där de två felmodellerna ger andra svar än facit.')
}
