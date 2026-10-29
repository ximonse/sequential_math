import { useRef, useState } from 'react'
import QuestionText from '../QuestionText.jsx'
import DiagnosticAttemptHistory from './sections/DiagnosticAttemptHistory.jsx'
import { diagnosticRequest } from './sections/diagnosticRequest.js'
import '../../dev/diagnosticGridPrototype.css'

function questionText(question) {
  if (question.promptSv || question.promptText) return question.promptSv || question.promptText
  const operator = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' }[question.operation]
  const values = question.values
  return operator && typeof values?.a === 'number' && typeof values?.b === 'number'
    ? `${values.a} ${operator} ${values.b}` : 'Frågetext saknas i det sparade underlaget.'
}

export default function MaterialBasis({ basis, codeName }) {
  const [selected, setSelected] = useState(null), [message, setMessage] = useState('')
  const active = useRef('')
  async function load(ref) {
    active.current = ref; setSelected(null); setMessage('Hämtar källsvaret…')
    const params = new URLSearchParams({ resource: 'evidence', classId: basis.classId, from: basis.from, to: basis.to,
      source: basis.source, ref, snapshotRevision: basis.snapshotRevision })
    try {
      const result = await diagnosticRequest(`/api/teacher-students/${encodeURIComponent(basis.studentId)}?${params}`)
      if (active.current !== ref) return
      if (!result.ok) throw new Error(result.data.error || 'Källsvaret kunde inte hämtas.')
      setSelected(result.data.entry); setMessage('')
    } catch (error) { if (active.current === ref) setMessage(error.message || 'Källsvaret kunde inte hämtas.') }
  }
  return <article className="material-question"><h3>{codeName}</h3><p>{basis.reasonSv}</p>
    <p>{basis.from}–{basis.to} · {basis.supportRefs.length} stödsvar · {basis.counterRefs.length} valda motexempel</p>
    <div className="material-actions">
      {basis.supportRefs.map((ref, index) => <button key={ref} onClick={() => load(ref)}>Stödsvar {index + 1}</button>)}
      {basis.counterRefs.map((ref, index) => <button key={ref} onClick={() => load(ref)}>Motexempel {index + 1}</button>)}
    </div>
    {message && <p role="status">{message}</p>}
    {selected && <section className="material-source" aria-label="Analysens källsvar">
      <QuestionText>{questionText(selected.question)}</QuestionText>
      <p>Elevens svar: <strong>{selected.answer.studentAnswer ?? 'Svarsfältet är tomt'}</strong></p>
      <p>Facit/bedömningsunderlag: {selected.answer.correctAnswer ?? 'Lärarbedömning eller okänt'}</p>
      {selected.answer.workWithoutAnswer && <p>Sparat arbete finns trots tomt svarsfält.</p>}
      {selected.detail?.snapshot && <DiagnosticAttemptHistory snapshot={selected.detail.snapshot} task={selected.question}
        imageContext={{ teacher: true, assignmentId: selected.reference.assignmentId, classId: basis.classId }} />}
    </section>}
  </article>
}
