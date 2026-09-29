import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPilotStudentRuntime } from '../lib/pilotStudentRuntime'
import { loginStudentSession, resumeStudentSession } from '../lib/studentSessionClient'
import SessionLoadingView from './student/SessionLoadingView'
import { decodeAssignmentPayload } from '../lib/assignments'
import PilotStudentLoginForm from './student/PilotStudentLoginForm'

function getStudentDestination(searchParams, studentId) {
  const redirect = searchParams.get('redirect')
  if (redirect?.startsWith('/student/')) return redirect
  const params = new URLSearchParams()
  for (const key of ['assignment', 'assignment_payload', 'mode', 'ticket', 'ticket_payload']) {
    const value = searchParams.get(key)
    if (value) params.set(key, value)
  }
  const query = params.toString()
  if (params.has('ticket')) return `/student/${studentId}/ticket${query ? `?${query}` : ''}`
  if (query) {
    const kind = decodeAssignmentPayload(params.get('assignment_payload'))?.kind
    return `/student/${studentId}/${kind === 'subitizing' ? 'subitizing' : 'practice'}?${query}`
  }
  return `/student/${studentId}`
}

const DESTINATION_KEYS = ['assignment', 'assignment_payload', 'mode', 'ticket', 'ticket_payload', 'redirect']

export default function Login() {
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const hasDestination = DESTINATION_KEYS.some(key => searchParams.get(key))
  const [resuming, setResuming] = useState(hasDestination)

  useEffect(() => {
    if (!hasDestination) return undefined
    let active = true
    ;(async () => {
      try {
        const session = await resumeStudentSession()
        if (!active) return
        if (session.ok) {
          const bootstrapped = await getPilotStudentRuntime().bootstrap(session.student.studentId)
          if (!active) return
          if (bootstrapped.ok) {
            navigate(getStudentDestination(searchParams, bootstrapped.profile.studentId), { replace: true })
            return
          }
        }
      } catch {
        // No usable session: fall back to the login form.
      }
      if (active) setResuming(false)
    })()
    return () => { active = false }
  }, [hasDestination, searchParams, navigate])

  const handleCardLogin = async ({ loginCode, pin }) => {
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)
    try {
      const session = await loginStudentSession({ loginCode, pin })
      if (!session.ok) { setError(session.error); return }
      const bootstrapped = await getPilotStudentRuntime().bootstrap(session.student.studentId)
      if (!bootstrapped.ok) {
        setError(bootstrapped.error || 'Kunde inte starta din säkra elevsession.')
        return
      }
      navigate(getStudentDestination(searchParams, bootstrapped.profile.studentId))
    } catch {
      setError('Kunde inte logga in just nu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (resuming) return <SessionLoadingView />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-700 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-8 w-full max-w-md">
        <p className="text-center text-xs font-bold tracking-[0.18em] text-teal-700">MATEMATIK.XIMON.SE</p>
        <h1 className="mt-2 text-3xl font-bold text-center text-slate-900">Matteträning</h1>
        <p className="text-center text-slate-600 mt-2 mb-7">Logga in med ditt elevkort</p>
        <PilotStudentLoginForm onLogin={handleCardLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} />
        <div className="mt-7 pt-5 border-t border-gray-200 text-center">
          <button onClick={() => navigate('/teacher-login')} className="rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">Lärare? Logga in här</button>
        </div>
      </div>
    </div>
  )
}
