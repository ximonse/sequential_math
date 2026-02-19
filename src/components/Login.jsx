import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authenticateStudent, normalizeStudentId } from '../lib/storage'

function Login() {
  const [studentIdInput, setStudentIdInput] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)

    try {
      const normalizedId = normalizeStudentId(studentIdInput)
      const result = await authenticateStudent(normalizedId, password)

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
          Logga in med namn/inloggningsnamn och lösenord
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="studentId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Inloggningsnamn
            </label>
            <input
              type="text"
              id="studentId"
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
              placeholder="T.ex. Simon eller klass-id"
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              disabled={isLoggingIn}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Lösenord
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ditt lösenord"
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              disabled={isLoggingIn}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <p className="text-xs text-gray-500">
            För klasslistor är startlösenord normalt elevens namn.
          </p>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoggingIn ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

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
