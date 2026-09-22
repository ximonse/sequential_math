import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authenticateStudent, setActiveStudentClass } from '../lib/storage'
import { getPilotStudentRuntime } from '../lib/pilotStudentRuntime'
import { getClassLogin, resolveStudentLogin } from '../lib/studentLoginClient'
import { loginStudentSession } from '../lib/studentSessionClient'
import PilotStudentLoginForm from './student/PilotStudentLoginForm'
import StudentLoginForm from './student/StudentLoginForm'

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
  if (query) return `/student/${studentId}/practice?${query}`
  return `/student/${studentId}`
}

export default function Login() {
  const [error, setError] = useState('')
  const [classInfo, setClassInfo] = useState(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const classToken = searchParams.get('class') || ''

  useEffect(() => {
    if (!classToken) { setClassInfo(null); return }
    setError('')
    getClassLogin(classToken).then(result => result.ok ? setClassInfo(result) : setError(result.error))
  }, [classToken])

  const bootstrapSecureSession = async (student, classId = '') => {
    if (classId) setActiveStudentClass(classId)
    const bootstrapped = await getPilotStudentRuntime().bootstrap(student.studentId)
    if (!bootstrapped.ok) return bootstrapped
    navigate(getStudentDestination(searchParams, bootstrapped.profile.studentId))
    return { ok: true }
  }

  const handleCardLogin = async ({ studentId, qrSecret, loginCode, pin }) => {
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)
    try {
      const session = await loginStudentSession({ studentId, qrSecret, loginCode, pin })
      if (!session.ok) { setError(session.error); return }
      const started = await bootstrapSecureSession(session.student)
      if (!started.ok) setError(started.error || 'Kunde inte starta din säkra elevsession.')
    } catch {
      setError('Kunde inte logga in just nu.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleClassLogin = async ({ name, code, remember }) => {
    if (isLoggingIn) return
    setError('')
    setIsLoggingIn(true)
    try {
      const resolved = await resolveStudentLogin({ classToken, name, code, remember })
      if (!resolved.ok) { setError(resolved.error); return }
      if (resolved.student) {
        const started = await bootstrapSecureSession(resolved.student, resolved.classId)
        if (!started.ok) setError(started.error || 'Kunde inte starta din säkra elevsession.')
        return
      }
      const legacy = await authenticateStudent(resolved.studentId, resolved.sessionSecret, { classroomSession: true, remember })
      if (!legacy.ok || !setActiveStudentClass(resolved.classId)) {
        setError(legacy.error || 'Kunde inte logga in.')
        return
      }
      navigate(getStudentDestination(searchParams, legacy.profile.studentId))
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
        <p className="text-center text-slate-600 mt-2 mb-7">{classToken ? 'Logga in till din klass' : 'Logga in med ditt elevkort'}</p>
        {classToken ? (
          classInfo
            ? <StudentLoginForm className={classInfo.className} onLogin={handleClassLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} />
            : <p role="alert" className="text-center text-red-700">{error || 'Hämtar klass…'}</p>
        ) : (
          <PilotStudentLoginForm onLogin={handleCardLogin} busy={isLoggingIn} error={error} onClearError={() => setError('')} />
        )}
        {classToken ? <button type="button" onClick={() => navigate('/')} className="mt-4 w-full text-sm text-teal-800 underline">Använd elevkort i stället</button> : null}
        <div className="mt-7 pt-5 border-t border-gray-200 text-center">
          <button onClick={() => navigate('/teacher-login')} className="rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">Lärare? Logga in här</button>
        </div>
      </div>
    </div>
  )
}
