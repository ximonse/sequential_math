import { useEffect, useState } from 'react'
import { loadStudentLoginClasses } from '../../lib/studentLoginClient'

export function useStudentLoginClasses() {
  const [state, setState] = useState({ classes: [], loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState({ classes: [], loading: true, error: '' })
    loadStudentLoginClasses().then(classes => {
      if (active) setState({ classes, loading: false, error: '' })
    }).catch(() => {
      if (active) setState({ classes: [], loading: false, error: 'Klasserna kunde inte hämtas. Försök igen eller logga in med elev-ID.' })
    })
    return () => { active = false }
  }, [attempt])
  return { ...state, retry: () => setAttempt(previous => previous + 1) }
}
