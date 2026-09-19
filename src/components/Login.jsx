import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginStudentSession } from '../lib/studentSessionClient'
import { getPilotStudentRuntime } from '../lib/pilotStudentRuntime'
import PilotStudentLoginForm from './student/PilotStudentLoginForm'

function Login() {
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const navigateAfterLogin = profile => {
    const assignmentId = searchParams.get('assignment')
    const assignmentPayload = searchParams.get('assignment_payload')
    const mode = searchParams.get('mode')
    const ticketId = searchParams.get('ticket')
    const ticketPayload = searchParams.get('ticket_payload')
    const redirect = searchParams.get('redirect')

    if (redirect && redirect.startsWith('/student/')) {
      navigate(redirect)
      return
    }

    const params = new URLSearchParams()
    if (assignmentId) params.set('assignment', assignmentId)
    if (assignmentPayload) params.set('assignment_payload', assignmentPayload)
    if (mode) params.set('mode', mode)
    if (ticketId) params.set('ticket', ticketId)
    if (ticketPayload) params.set('ticket_payload', ticketPayload)

    const hasSharedTarget = assignmentId || assignmentPayload || mode || ticketId
    const query = params.toString()
    let target = `/student/${profile.studentId}`
    if (ticketId) {
      target = `/student/${profile.studentId}/ticket${query ? `?${query}` : ''}`
    } else if (hasSharedTarget) {
      target = `/student/${profile.studentId}/practice${query ? `?${query}` : ''}`
    }
    navigate(target)
  }

  const handlePilotLogin = async ({ studentId, qrSecret, loginCode, pin }) => {
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)
    try {
      const session = await loginStudentSession({ studentId, qrSecret, loginCode, pin })
      if (!session.ok) { setError(session.error); return }
      const bootstrapped = await getPilotStudentRuntime().bootstrap(session.student.studentId)
      if (!bootstrapped.ok) { setError(bootstrapped.error || 'Kunde inte starta din säkra elevsession.'); return }
      navigateAfterLogin(bootstrapped.profile)
    } catch {
      setError('Kunde inte logga in just nu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-700 px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-8 w-full max-w-md">
        <p className="text-center text-xs font-bold tracking-[0.18em] text-teal-700">MATEMATIK.XIMON.SE</p>
        <h1 className="mt-2 text-3xl font-bold text-center text-slate-900">Matteträning</h1>
        <p className="text-center text-slate-600 mt-2 mb-7">
          Logga in med ditt elevkort
        </p>
        <PilotStudentLoginForm onLogin={handlePilotLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} />
        <div className="mt-7 pt-5 border-t border-gray-200 text-center">
          <button onClick={() => navigate('/teacher-login')}
            className="rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
            Lärare? Logga in här
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
