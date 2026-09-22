import { Navigate, useNavigate } from 'react-router-dom'
import TeacherAdminPanel from './sections/TeacherAdminPanel'
import { getTeacherIdentity, isTeacherAdmin, logoutTeacher } from '../../lib/teacherAuth'
import { getTeacherRoleLabel } from '../../lib/teacherRoles'

export default function TeacherAdminPage() {
  const navigate = useNavigate()
  const identity = getTeacherIdentity()
  if (!isTeacherAdmin()) return <Navigate to="/teacher" replace />

  const isSuperAdmin = identity.role === 'super_admin'
  const surfaceClass = isSuperAdmin
    ? 'teacher-dashboard-surface--super-admin'
    : 'teacher-dashboard-surface--admin'

  return (
    <main className={`teacher-dashboard-surface min-h-screen py-8 ${surfaceClass}`}>
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Administration</h1>
            <p className="text-gray-600">Skolor, lärare, klasser och läsårsbyte</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${isSuperAdmin
              ? 'border-violet-200 bg-violet-100 text-violet-950'
              : 'border-orange-200 bg-orange-100 text-orange-950'}`}>
              <p className="font-semibold">{identity.displayName || 'Administratör'}</p>
              <p className="text-xs opacity-80">{getTeacherRoleLabel(identity.role)}</p>
            </div>
            <button type="button" onClick={() => navigate('/teacher')} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
              Lärarvy
            </button>
            <button type="button" onClick={() => { logoutTeacher(); navigate('/teacher-login') }} className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white">
              Logga ut
            </button>
          </div>
        </header>
        <TeacherAdminPanel />
      </div>
    </main>
  )
}
