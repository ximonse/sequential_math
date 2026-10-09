import { useState } from 'react'
import DiagnosticGridPrototype from '../../dev/DiagnosticGridPrototype'

// The shared editor is a scratch workspace here, not a diagnostic attempt.
// No diagnostic save/submit/analysis callback or mastery fact is created.
export default function PracticeNotebook() {
  const [task] = useState(() => ({ taskId: `practice-workspace:${crypto.randomUUID()}`,
    taskVersion: 1, promptSv: '', gridEnabled: true, answerType: 'number' }))
  return <DiagnosticGridPrototype pilot={{ task }} workspaceOnly />
}
