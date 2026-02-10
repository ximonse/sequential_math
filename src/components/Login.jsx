import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentExists, createAndSaveProfile } from '../lib/storage'

function Login() {
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')

    const id = studentId.trim().toUpperCase()

    if (!id) {
      setError('Ange ditt elev-ID')
      return
    }

    if (id.length !== 6) {
      setError('Elev-ID ska vara 6 tecken')
      return
    }

    // Kontrollera om eleven finns, annars skapa ny
    if (!studentExists(id)) {
      createAndSaveProfile(id, `Elev ${id}`, 4)
    }

    navigate(`/student/${id}`)
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
          Adaptiv matematik för dig
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="studentId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Ditt elev-ID
            </label>
            <input
              type="text"
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              placeholder="T.ex. ABC123"
              maxLength={6}
              className="w-full px-4 py-3 text-2xl text-center tracking-widest border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none uppercase"
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
            Starta
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
