import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authenticateStudent, clearActiveStudentSession, setActiveStudentClass } from '../lib/storage'
import { resolveStudentLogin } from '../lib/studentLoginClient'
import StudentLoginForm from './student/StudentLoginForm'
import AssignedClassPicker from './student/AssignedClassPicker'

function Login() {
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [pendingLogin, setPendingLogin] = useState(null)
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

  const handleLogin = async ({ name, password }) => {
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)

    try {
      const resolved = await resolveStudentLogin(name, password)
      if (!resolved.ok) { setError(resolved.error); return }
      const result = await authenticateStudent(resolved.studentId, password)
      if (!result.ok) {
        setError(result.error || 'Kunde inte logga in.')
        return
      }
      setPendingLogin({ profile: result.profile, assignments: resolved.assignments })
    } catch {
      setError('Kunde inte logga in just nu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const chooseAssignedClass = classId => {
    if (isLoggingIn || !pendingLogin?.assignments.some(item => item.classId === classId)) return
    if (!setActiveStudentClass(classId)) return
    navigateAfterLogin(pendingLogin.profile)
  }

  const resetLogin = () => {
    clearActiveStudentSession()
    setPendingLogin(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Matteträning</h1>
        <p className="text-center text-gray-600 mb-8">
          {pendingLogin ? 'Välj din tilldelade skola och grupp' : 'Logga in med namn eller elev-ID och lösenord'}
        </p>
        {pendingLogin ? (
          <AssignedClassPicker assignments={pendingLogin.assignments} onChoose={chooseAssignedClass}
            onBack={resetLogin} busy={isLoggingIn} />
        ) : (
          <StudentLoginForm onLogin={handleLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} />
        )}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button onClick={() => navigate('/teacher-login')}
            className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm">
            Lärare? Logga in
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
