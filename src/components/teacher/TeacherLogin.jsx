import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTeacherAuthenticated, loginTeacher } from '../../lib/teacherAuth'

function TeacherLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (isTeacherAuthenticated()) {
      navigate('/teacher', { replace: true })
    }
  }, [navigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (password.trim() === '') {
      setError('Ange lösenord')
      return
    }

    const success = loginTeacher(password)
    if (!success) {
      setError('Fel lösenord')
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
        <p className="text-center text-gray-600 mb-8">
          Ange lösenord för att öppna dashboarden
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="teacherPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Lösenord
            </label>
            <input
              type="password"
              id="teacherPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Logga in
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
