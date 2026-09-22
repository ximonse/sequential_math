import { Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import TeacherAdminPanel from './sections/TeacherAdminPanel'
import CloudSyncStatusPanel from './sections/CloudSyncStatusPanel'
import { getCloudProfilesSyncStatus, getAllProfilesWithSync } from '../../lib/storage'
import { getTeacherIdentity, isTeacherAdmin, logoutTeacher } from '../../lib/teacherAuth'
import { getTeacherRoleLabel } from '../../lib/teacherRoles'

export default function TeacherAdminPage() {
  const navigate = useNavigate()
  const identity = getTeacherIdentity()
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => getCloudProfilesSyncStatus())
  const [isCloudRefreshBusy, setIsCloudRefreshBusy] = useState(false)
  if (!isTeacherAdmin()) return <Navigate to="/teacher" replace />

  const isSuperAdmin = identity.role === 'super_admin'
  const surfaceClass = isSuperAdmin
    ? 'teacher-dashboard-surface--super-admin'
    : 'teacher-dashboard-surface--admin'

  const refreshCloudStatus = async () => {
    setIsCloudRefreshBusy(true)
    try { await getAllProfilesWithSync(); setCloudSyncStatus(getCloudProfilesSyncStatus()) }
    finally { setIsCloudRefreshBusy(false) }
  }

  return (
    <main className={`teacher-dashboard-surface min-h-screen pb-5 pt-14 sm:pb-6 sm:pt-16 ${surfaceClass}`}>
      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <header className="teacher-dashboard-header mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-gray-800">Administration</h1>
            <p className="text-sm text-gray-600">Skolor, lärare, klasser och läsårsbyte</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <CloudSyncStatusPanel cloudSyncStatus={cloudSyncStatus} isCloudRefreshBusy={isCloudRefreshBusy} onRefreshNow={() => { void refreshCloudStatus() }} />
            <div className={`rounded-md border px-2 py-1 text-xs shadow-sm ${isSuperAdmin
              ? 'border-violet-200 bg-violet-100 text-violet-950'
              : 'border-orange-200 bg-orange-100 text-orange-950'}`}>
              <p className="font-semibold">{identity.displayName || 'Administratör'}</p>
              <p className="text-[10px] leading-tight opacity-80">{getTeacherRoleLabel(identity.role)}</p>
            </div>
            <button type="button" onClick={() => navigate('/teacher')} className="rounded-md bg-indigo-600 px-2 py-1.5 text-xs text-white hover:bg-indigo-700">
              Lärarvy
            </button>
            <button type="button" onClick={() => { logoutTeacher(); navigate('/teacher-login') }} className="rounded-md bg-gray-800 px-2 py-1.5 text-xs text-white hover:bg-gray-900">
              Logga ut
            </button>
          </div>
        </header>
        <TeacherAdminPanel />
      </div>
    </main>
  )
}
