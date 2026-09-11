import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authenticateStudent, setActiveStudentClass } from '../lib/storage'
import { getClassLogin, resolveStudentLogin } from '../lib/studentLoginClient'
import StudentLoginForm from './student/StudentLoginForm'

function getStudentDestination(searchParams, studentId) {
  const redirect = searchParams.get('redirect')
  if (redirect?.startsWith('/student/')) return redirect

  const assignment = searchParams.get('assignment')
  const assignmentPayload = searchParams.get('assignment_payload')
  if (!assignment) return `/student/${studentId}`

  const params = new URLSearchParams({ assignment })
  if (assignmentPayload) params.set('assignment_payload', assignmentPayload)
  return `/student/${studentId}?${params.toString()}`
}

export default function Login() {
  const [error, setError] = useState('')
  const [classInfo, setClassInfo] = useState(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const classToken = searchParams.get('class') || ''

  useEffect(() => {
    if (!classToken) {
      setError('Öppna klassens länk eller QR-kod från din lärare.')
      return
    }
    getClassLogin(classToken).then(result => result.ok ? setClassInfo(result) : setError(result.error))
  }, [classToken])

  const handleLogin = async ({ name, code, remember }) => {
    setError('')
    setIsLoggingIn(true)
    try {
      const resolved = await resolveStudentLogin({ classToken, name, code, remember })
      if (!resolved.ok) {
        setError(resolved.error)
        return
      }
      const result = await authenticateStudent(resolved.studentId, resolved.sessionSecret, { classroomSession: true, remember })
      if (!result.ok || !setActiveStudentClass(resolved.classId)) {
        setError(result.error || 'Kunde inte logga in.')
        return
      }
      navigate(getStudentDestination(searchParams, result.profile.studentId))
    } catch {
      setError('Kunde inte logga in just nu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Matteträning</h1>
        <p className="text-center text-gray-600 mb-8">Logga in till din klass</p>
        {classInfo ? <StudentLoginForm className={classInfo.className} onLogin={handleLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} /> : <p role="alert" className="text-center text-red-700">{error || 'Hämtar klass…'}</p>}
        <div className="mt-8 pt-6 border-t border-gray-200"><button onClick={() => navigate('/teacher-login')} className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm">Lärare? Logga in</button></div>
      </div>
    </div>
  )
}
