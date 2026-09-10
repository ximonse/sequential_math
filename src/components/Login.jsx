import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authenticateStudent, normalizeStudentId } from '../lib/storage'
import { resolveClassStudentId } from '../lib/studentLoginClient'
import StudentLoginForm from './student/StudentLoginForm'

function Login() {
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleLogin = async ({ classId, name, password, schoolId = '' }) => {
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)

    try {
      let studentId = normalizeStudentId(name)
      if (classId) {
        const resolved = await resolveClassStudentId(classId, name, password, schoolId)
        if (!resolved.ok) { setError(resolved.error); return }
        studentId = resolved.studentId
      }
      const result = await authenticateStudent(studentId, password)

      if (!result.ok) {
        setError(result.error || 'Kunde inte logga in.')
        return
      }

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
      let target = `/student/${result.profile.studentId}`
      if (ticketId) {
        target = `/student/${result.profile.studentId}/ticket${query ? `?${query}` : ''}`
      } else if (hasSharedTarget) {
        target = `/student/${result.profile.studentId}/practice${query ? `?${query}` : ''}`
      }

      navigate(target)
    } catch {
      setError('Kunde inte logga in just nu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleTeacherLogin = () => {
    navigate('/teacher-login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Matteträning
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Välj skola och klass och logga in med namn och lösenord
        </p>

        <StudentLoginForm onLogin={handleLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} />

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleTeacherLogin}
            className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Lärare? Logga in
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
