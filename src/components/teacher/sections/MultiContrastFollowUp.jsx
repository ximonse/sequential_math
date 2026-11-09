import { useRef, useState } from 'react'
import { CONTRAST_LABELS_SV } from '../../../domains/predictableErrors/contrast.js'
import { pupilFollowUpSelection } from '../../../lib/pupilFollowUpSelection.js'
import { isSpeedTrainingEntry } from '../../../lib/practiceModes.js'
import { factCustomTask, factPrompt, isSimpleFact, isSimpleFactItem, REPEAT_MAX_FACTS, REPEAT_MAX_FILLERS } from '../../../lib/repeatCheck.js'
import { call, screeningHistory } from './contrastHistory.js'

// One screening for the chosen suspicions. Suspicions about simple facts are
// asked again ("Fråga igen"); the others get their own contrast questions and
// frozen plan. One private draft; review, approval and dispatch stay in the
// existing material review.
const label = model => CONTRAST_LABELS_SV[model] || model

function repeatPart(items, report, offset) {
  const facts = [], fillers = [], basis = [], prompts = new Set()
  for (const item of items) {
    const own = item.supportRefs.map(ref => report.evidence.find(e => e.ref === ref))
      .filter(entry => entry && !prompts.has(factPrompt(entry)) && prompts.add(factPrompt(entry)))
      .slice(0, REPEAT_MAX_FACTS - facts.length)
    if (!own.length) continue
    // Facts the pupil got right in the same operation, so the repeated ones do not stand out.
    const operation = own[0].question.operation
    const right = report.evidence.filter(entry => entry.answer.status === 'correct' && entry.question.operation === operation
      && isSimpleFact(entry) && !prompts.has(factPrompt(entry)) && prompts.add(factPrompt(entry)))
      .slice(0, REPEAT_MAX_FILLERS - fillers.length)
    const basisIndex = offset + basis.length
    basis.push({ item, supportRefs: own.map(entry => entry.ref), counterRefs: right.map(entry => entry.ref) })
    own.forEach(entry => facts.push({ basisIndex, entry }))
    right.forEach(entry => fillers.push({ basisIndex, entry }))
  }
  // Interleave so the right-answer facts sit between the repeated ones.
  const ordered = []
  facts.forEach((fact, index) => { ordered.push({ kind: 'fact', ...fact }); if (fillers[index]) ordered.push({ kind: 'filler', ...fillers[index] }) })
  fillers.slice(facts.length).forEach(filler => ordered.push({ kind: 'filler', ...filler }))
  return { basis, ordered }
}

export default function MultiContrastFollowUp({ items, report, reviewFor, studentId, classId, baseUrl }) {
  const [state, setState] = useState({ busy: false, message: '', receipt: null, summary: null })
  const requestId = useRef(crypto.randomUUID())
  const repeatItems = items.filter(item => isSimpleFactItem(item, report))
  const contrastItems = items.filter(item => !isSimpleFactItem(item, report))

  async function createDraft() {
    setState({ busy: true, message: contrastItems.length ? 'Kontrollerar elevens tidigare screeningar…' : 'Skapar privat utkast…', receipt: null, summary: null })
    try {
      const historyKeys = contrastItems.length ? await screeningHistory(baseUrl) : new Set()
      const used = new Set()
      const sets = contrastItems.map(item => {
        const supports = item.supportRefs.map(ref => report.evidence.find(e => e.ref === ref)).filter(entry => entry && !isSpeedTrainingEntry(entry))
        const set = pupilFollowUpSelection({ modelId: item.signalCode, supports, entries: report.evidence,
          historyKeys: [...historyKeys, ...(item.followUp?.history.excludedFingerprints ?? [])],
          history: { scope: 'source_period_and_screening_since_2024', completeness: 'indexed_screening_window_read_practice_unknown' } })
        if (set.status !== 'proposed' || set.delivery !== 'reviewed_bank') throw new Error(`”${label(item.signalCode)}” saknar granskade kontrastfrågor. Avmarkera den.`)
        // A question belongs to one suspicion only.
        const own = set.items.filter(question => !used.has(question.taskId))
        if (!own.length) throw new Error(`”${label(item.signalCode)}” har inga egna frågor kvar. Pröva den för sig.`)
        own.forEach(question => used.add(question.taskId))
        return { item, supports, questions: own }
      })
      const repeat = repeatPart(repeatItems, report, sets.length)
      const summary = [...sets.map(({ item, questions }) => `${label(item.signalCode)}: ${questions.map(question => question.text).join(', ')}`),
        ...(repeat.ordered.length ? [`Fråga igen: ${repeat.ordered.map(row => factPrompt(row.entry)).join(', ')}`] : [])]
      setState(value => ({ ...value, summary, message: 'Skapar privat utkast…' }))
      const audience = await call(`/api/students?${new URLSearchParams({ resource: 'audience', targetType: 'student', targetId: studentId, limit: 1 })}`)
      const target = (item, index) => {
        const review = reviewFor(item)
        return { schemaVersion: 1, modelId: item.signalCode, ruleVersion: item.ruleVersion,
          ...(review ? { reportReview: { studentId, reportId: review.reportId, hypothesisId: item.id, checkInRevision: review.checkInRevision, reopen: false } } : {}),
          ...(sets.length > 1 ? { taskIds: sets[index].questions.map(question => question.taskId), basisIndexes: [index] } : {}) }
      }
      const names = items.map(item => `”${label(item.signalCode)}”`).join(', ')
      const material = { schemaVersion: 1, kind: 'screening', mode: 'specific',
        ...(sets.length === 1 ? { investigation: target(sets[0].item, 0) } : {}),
        ...(sets.length > 1 ? { investigations: sets.map(({ item }, index) => target(item, index)) } : {}),
        ...(repeat.ordered.length ? { repeatCheck: { schemaVersion: 1,
          facts: repeat.ordered.flatMap((row, customIndex) => row.kind === 'fact' ? [{ basisIndex: row.basisIndex, ref: row.entry.ref, customIndex }] : []),
          fillers: repeat.ordered.flatMap((row, customIndex) => row.kind === 'filler' ? [{ basisIndex: row.basisIndex, ref: row.entry.ref, customIndex }] : []) } } : {}),
        // The title reaches the pupil; the suspicions stay in teacher-only fields.
        titleSv: 'Uppföljning',
        goalSv: `Pröva ${names}. Råd till läraren, inte fastställda orsaker.`,
        instructionSv: 'Räkna uppgifterna. Visa hur du räknar.',
        sourceMaterials: [], audience: { targetType: 'student', targetId: studentId, rosterRevision: audience.rosterRevision },
        classContexts: { [studentId]: classId },
        basis: [...sets.map(({ item, supports }) => ({ supportRefs: supports.map(e => e.ref), counterRefs: item.counterRefs,
          reasonSv: `Beräknad felmodell: ${label(item.signalCode)}. Prövas med egna kontrastfrågor. Inga tips under prövningen.` })),
        ...repeat.basis.map(({ item, supportRefs, counterRefs }) => ({ supportRefs, counterRefs,
          reasonSv: `Fråga igen: ${label(item.signalCode)}. Samma fakta utan tidspress, blandat med fakta eleven kan.` }))]
          .map(basis => ({ studentId, classId, from: report.period.from, to: report.period.to, source: report.source,
            snapshotRevision: report.snapshotRevision, ...basis })),
        content: { taskIds: sets.flatMap(({ questions }) => questions.map(question => question.taskId)),
          ...(repeat.ordered.length ? { customTasks: repeat.ordered.map(row => factCustomTask(row.entry)) } : {}),
          itemOptions: Object.fromEntries(sets.flatMap(({ questions }) => questions.map(question => [question.taskId, { gridEnabled: true }]))) } }
      const preview = await call('/api/teacher-material', { action: 'preview', material })
      const receipt = await call('/api/teacher-material', { action: 'save', material, requestId: requestId.current,
        expectedRevision: 0, expectedContentRevision: preview.contentRevision })
      setState({ busy: false, message: 'Privat utkast sparat. Inget har delats ut.', receipt, summary })
    } catch (error) {
      setState(value => ({ ...value, busy: false, message: error.message }))
    }
  }

  const single = items.length === 1 && repeatItems.length === 1
  return <section aria-label={single ? 'Fråga igen' : 'Gemensam prövning'} className="mt-3 rounded border border-slate-300 p-2 text-sm">
    <p className="font-semibold">{single ? 'Fråga igen' : `Pröva ${items.length} misstankar i samma screening`}</p>
    <p className="mt-1">{repeatItems.length ? 'Enkla fakta ställs igen utan tidspress, blandat med fakta eleven kan. ' : ''}
      {contrastItems.length ? 'Övriga misstankar får egna kontrastfrågor och bedöms bara på dem. ' : ''}Eleven ser en screening som heter Uppföljning.</p>
    {state.summary && <ul className="mt-1 list-disc pl-5">{state.summary.map(line => <li key={line}>{line}</li>)}</ul>}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className="rounded border px-2 py-1" disabled={state.busy || Boolean(state.receipt)} onClick={createDraft}>
        {single ? 'Skapa utkast' : 'Skapa gemensamt utkast'}</button>
      {state.receipt && <a className="underline" href={state.receipt.reviewPath}>Öppna granskning</a>}
    </div>
    {state.message && <p role="status" className="mt-1">{state.message}</p>}
  </section>
}
