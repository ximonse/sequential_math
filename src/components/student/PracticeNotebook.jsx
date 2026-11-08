import { useContext, useState } from 'react'
import { useParams } from 'react-router-dom'
import DiagnosticGridPrototype from '../../dev/DiagnosticGridPrototype'
import { NotebookAnswerTarget } from './practice/notebookAnswerTarget'

// The shared editor is a scratch workspace here, not a diagnostic attempt.
// No diagnostic save/submit/analysis callback or mastery fact is created.
export default function PracticeNotebook() {
  const { studentId = '' } = useParams()
  const [task] = useState(() => ({ taskId: `practice-workspace:${crypto.randomUUID()}`,
    taskVersion: 1, promptSv: '', gridEnabled: true, answerType: 'number' }))
  const answerTarget = useContext(NotebookAnswerTarget)
  return <DiagnosticGridPrototype pilot={{ task }} workspaceOnly guideScope={studentId} answerTarget={answerTarget} />
}
