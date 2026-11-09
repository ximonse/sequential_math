import { useRef, useState } from 'react'
import { CONTRAST_LABELS_SV } from '../../../domains/predictableErrors/contrast.js'
import { pupilFollowUpSelection } from '../../../lib/pupilFollowUpSelection.js'
import { isSpeedTrainingEntry } from '../../../lib/practiceModes.js'
import { call, screeningHistory } from './contrastHistory.js'

// Several suspicions in one screening: the same contrast selection as each card,
// one private draft with one frozen plan per suspicion. Review, approval and
// dispatch stay in the existing material review.
const label = model => CONTRAST_LABELS_SV[model] || model

export default function MultiContrastFollowUp({ items, report, reviewFor, studentId, classId, baseUrl }) {
  const [state, setState] = useState({ busy: false, message: '', receipt: null, sets: null })
  const requestId = useRef(crypto.randomUUID())

  async function createDraft() {
    setState({ busy: true, message: 'Kontrollerar elevens tidigare screeningar…', receipt: null, sets: null })
    try {
      const historyKeys = await screeningHistory(baseUrl)
      const used = new Set()
      const sets = items.map(item => {
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
      setState(value => ({ ...value, sets, message: 'Skapar privat utkast…' }))
      const audience = await call(`/api/students?${new URLSearchParams({ resource: 'audience', targetType: 'student', targetId: studentId, limit: 1 })}`)
      const material = { schemaVersion: 1, kind: 'screening', mode: 'specific',
        investigations: sets.map(({ item, questions }, index) => {
          const review = reviewFor(item)
          return { schemaVersion: 1, modelId: item.signalCode, ruleVersion: item.ruleVersion,
            taskIds: questions.map(question => question.taskId), basisIndexes: [index],
            ...(review ? { reportReview: { studentId, reportId: review.reportId, hypothesisId: item.id,
              checkInRevision: review.checkInRevision, reopen: false } } : {}) }
        }),
        // The title reaches the pupil; the suspicions stay in teacher-only fields.
        titleSv: 'Uppföljning',
        goalSv: `Pröva ${sets.length} misstankar i samma screening: ${sets.map(({ item }) => `”${label(item.signalCode)}”`).join(', ')}. Råd till läraren, inte fastställda orsaker.`,
        instructionSv: 'Räkna uppgifterna. Visa hur du räknar.',
        sourceMaterials: [], audience: { targetType: 'student', targetId: studentId, rosterRevision: audience.rosterRevision },
        classContexts: { [studentId]: classId },
        basis: sets.map(({ item, supports }) => ({ studentId, classId, from: report.period.from, to: report.period.to, source: report.source,
          snapshotRevision: report.snapshotRevision, supportRefs: supports.map(e => e.ref), counterRefs: item.counterRefs,
          reasonSv: `Beräknad felmodell: ${label(item.signalCode)}. Prövas med egna kontrastfrågor i en gemensam screening. Inga tips under prövningen.` })),
        content: { taskIds: sets.flatMap(({ questions }) => questions.map(question => question.taskId)),
          itemOptions: Object.fromEntries(sets.flatMap(({ questions }) => questions.map(question => [question.taskId, { gridEnabled: true }]))) } }
      const preview = await call('/api/teacher-material', { action: 'preview', material })
      const receipt = await call('/api/teacher-material', { action: 'save', material, requestId: requestId.current,
        expectedRevision: 0, expectedContentRevision: preview.contentRevision })
      setState({ busy: false, message: 'Privat utkast sparat. Inget har delats ut.', receipt, sets })
    } catch (error) {
      setState(value => ({ ...value, busy: false, message: error.message }))
    }
  }

  return <section aria-label="Gemensam prövning" className="mt-3 rounded border border-slate-300 p-2 text-sm">
    <p className="font-semibold">Pröva {items.length} misstankar i samma screening</p>
    <p className="mt-1">Varje misstanke får sina egna kontrastfrågor och bedöms bara på dem. Eleven ser en screening som heter Uppföljning.</p>
    {state.sets && <ul className="mt-1 list-disc pl-5">{state.sets.map(({ item, questions }) =>
      <li key={item.id}>{label(item.signalCode)}: {questions.map(question => question.text).join(', ')}</li>)}</ul>}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" className="rounded border px-2 py-1" disabled={state.busy || Boolean(state.receipt)} onClick={createDraft}>Skapa gemensamt utkast</button>
      {state.receipt && <a className="underline" href={state.receipt.reviewPath}>Öppna granskning</a>}
    </div>
    {state.message && <p role="status" className="mt-1">{state.message}</p>}
  </section>
}
