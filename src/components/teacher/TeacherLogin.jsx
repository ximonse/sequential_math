import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  isTeacherAuthenticated,
  loginTeacher
} from '../../lib/teacherAuth'

function TeacherLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isTeacherAuthenticated()) {
      navigate('/teacher', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Ange användarnamn')
      return
    }
    if (!password) {
      setError('Ange lösenord')
      return
    }

    setLoading(true)
    const result = await loginTeacher(username, password)
    setLoading(false)

    if (!result.ok) {
      const messages = {
        INVALID_PASSWORD: 'Fel användarnamn eller lösenord',
        MISSING_CREDENTIALS: 'Ange användarnamn och lösenord',
        NETWORK_ERROR: 'Kunde inte nå servern. Försök igen.',
        AUTH_FAILED: 'Inloggning misslyckades.'
      }
      setError(messages[result.code] || 'Kunde inte logga in just nu.')
      return
    }

    navigate('/teacher', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-700 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Lärarinloggning
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Logga in med ditt lärarkonto
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="teacherUsername" className="block text-sm font-medium text-gray-700 mb-1">
              Användarnamn
            </label>
            <input
              type="text"
              id="teacherUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              autoFocus
              autoComplete="username"
              disabled={loading}
              placeholder="t.ex. anna.larare"
            />
          </div>

          <div>
            <label htmlFor="teacherPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Lösenord
            </label>
            <input
              type="password"
              id="teacherPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeacherLogin
