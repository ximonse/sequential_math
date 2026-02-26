import { buildCloudSyncStatusMessage } from './dashboardCoreHelpers'
import {
  addStudentsToClass,
  createClassFromRoster,
  getClasses,
  getCloudProfilesSyncStatus,
  normalizeStudentId,
  removeClass,
  resetStudentPasswordToLoginName,
  updateClassExtras
} from '../../../lib/storage'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import {
  getActiveAssignment,
  getAssignments
} from '../../../lib/assignments'
import { logoutTeacher } from '../../../lib/teacherAuth'
import { saveClass } from '../../../lib/storage'

// ── Server sync helpers ───────────────────────────────────────────────────────

async function fetchClassesFromServer() {
  try {
    const res = await fetch('/api/teacher-classes', {
      headers: { 'x-teacher-token': getTeacherApiToken() }
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.classes) ? data.classes : []
  } catch {
    return []
  }
}

async function pushClassToServer(classRecord) {
  try {
    await fetch('/api/teacher-classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-teacher-token': getTeacherApiToken()
      },
      body: JSON.stringify({
        id: classRecord.id,
        name: classRecord.name,
        enabledExtras: classRecord.enabledExtras || [],
        createdAt: classRecord.createdAt
      })
    })
  } catch { /* best-effort */ }
}

async function deleteClassFromServer(classId) {
  try {
    await fetch(`/api/teacher-classes?id=${encodeURIComponent(classId)}`, {
      method: 'DELETE',
      headers: { 'x-teacher-token': getTeacherApiToken() }
    })
  } catch { /* best-effort */ }
}

// Bidirectional sync: push local → server, pull server → local
async function syncClassesFromServer() {
  const local = getClasses()
  const serverClasses = await fetchClassesFromServer()

  const serverIds = new Set(serverClasses.map(c => c.id))

  // Push local classes that aren't on server yet
  for (const lc of local) {
    if (!serverIds.has(lc.id)) {
      void pushClassToServer(lc)
    }
  }

  // Pull server classes into localStorage (add missing, update enabledExtras)
  const localMap = new Map(local.map(c => [c.id, c]))
  for (const sc of serverClasses) {
    const existing = localMap.get(sc.id)
    if (!existing) {
      saveClass(sc)
    } else if (JSON.stringify(existing.enabledExtras) !== JSON.stringify(sc.enabledExtras)) {
      saveClass({ ...existing, enabledExtras: sc.enabledExtras ?? [] })
    }
  }
}

// ── Action builders ───────────────────────────────────────────────────────────

export function buildDashboardClassAndAuthActions({
  loadStudents,
  addToClassId,
  setClasses,
  setAddToClassId,
  setAssignments,
  setActiveAssignmentId,
  setDashboardStatus,
  setCloudSyncStatus,
  setIsCloudRefreshBusy,
  navigate,
  passwordResetSectionId,
  setClassStatus,
  classNameInput,
  rosterInput,
  setClassNameInput,
  setRosterInput,
  setSelectedClassIds,
  setPasswordResetBusyId,
  setPasswordResetStatus,
  setTableSelectedStudentIds
}) {
  const handleRefresh = () => {
    void loadStudents()
    const refreshedClasses = getClasses()
    setClasses(refreshedClasses)
    if (!addToClassId && refreshedClasses.length > 0) {
      setAddToClassId(refreshedClasses[0].id)
    }
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setDashboardStatus('Uppdaterat.')
  }

  const handleCloudRefreshNow = async () => {
    setIsCloudRefreshBusy(true)
    try {
      await loadStudents()
      // Restore classes from server if localStorage is missing any
      await syncClassesFromServer()
      const latestSyncStatus = getCloudProfilesSyncStatus()
      setCloudSyncStatus(latestSyncStatus)
      setDashboardStatus(buildCloudSyncStatusMessage(latestSyncStatus))
      const refreshedClasses = getClasses()
      setClasses(refreshedClasses)
      if (!addToClassId && refreshedClasses.length > 0) {
        setAddToClassId(refreshedClasses[0].id)
      }
    } finally {
      setIsCloudRefreshBusy(false)
    }
  }

  const handleLogout = () => {
    logoutTeacher()
    navigate('/teacher-login')
  }

  const handleJumpToPasswordReset = () => {
    if (typeof document === 'undefined') return
    const section = document.getElementById(passwordResetSectionId)
    if (section && typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleCreateClass = async () => {
    let result
    try {
      result = await createClassFromRoster(classNameInput, rosterInput, 4)
    } catch {
      setClassStatus('Kunde inte skapa klass just nu.')
      return
    }
    if (!result.ok) {
      setClassStatus(result.error)
      return
    }

    setClassNameInput('')
    setRosterInput('')
    setClassStatus(`Klass skapad: ${result.classRecord.name} (${result.classRecord.studentIds.length} elever)`)
    const updatedClasses = getClasses()
    setClasses(updatedClasses)
    setAddToClassId(result.classRecord.id)
    void loadStudents()
    // Sync new class to server
    void pushClassToServer(result.classRecord)
  }

  const handleAddStudentsToClass = async () => {
    let result
    try {
      result = await addStudentsToClass(addToClassId, rosterInput, 4)
    } catch {
      setClassStatus('Kunde inte lägga till elever just nu.')
      return
    }
    if (!result.ok) {
      setClassStatus(result.error)
      return
    }

    setRosterInput('')
    setClassStatus(`Tillagt ${result.addedCount} elev(er) i ${result.classRecord.name}.`)
    setClasses(getClasses())
    void loadStudents()
  }

  const handleDeleteClass = (classId) => {
    removeClass(classId)
    setSelectedClassIds(prev => prev.filter(id => id !== classId))
    const updatedClasses = getClasses()
    setClasses(updatedClasses)
    if (addToClassId === classId) {
      setAddToClassId(updatedClasses[0]?.id || '')
    }
    setClassStatus('Klass borttagen.')
    void deleteClassFromServer(classId)
  }

  const handleToggleClassFilter = (classId) => {
    const normalizedClassId = String(classId || '').trim()
    if (!normalizedClassId) return
    setSelectedClassIds(prev => (
      prev.includes(normalizedClassId)
        ? prev.filter(id => id !== normalizedClassId)
        : [...prev, normalizedClassId]
    ))
  }

  const clearClassFilter = () => {
    setSelectedClassIds([])
  }

  const handleResetStudentPassword = async (studentId) => {
    const normalizedStudentId = normalizeStudentId(studentId)
    if (!normalizedStudentId) {
      const errorMessage = 'Kunde inte läsa elev-ID för lösenordsåterställning.'
      setDashboardStatus(errorMessage)
      setPasswordResetStatus(errorMessage)
      return
    }

    setPasswordResetBusyId(normalizedStudentId)
    let result
    try {
      result = await resetStudentPasswordToLoginName(normalizedStudentId)
    } catch {
      const errorMessage = `Kunde inte återställa lösenord för ${normalizedStudentId}.`
      setDashboardStatus(errorMessage)
      setPasswordResetStatus(errorMessage)
      setPasswordResetBusyId('')
      return
    }

    setPasswordResetBusyId('')
    if (!result.ok) {
      const errorMessage = result.error || `Kunde inte återställa lösenord för ${normalizedStudentId}.`
      setDashboardStatus(errorMessage)
      setPasswordResetStatus(errorMessage)
      return
    }

    const successMessage = `Lösenord återställt för ${normalizedStudentId}. Nytt lösenord: ${result.password || normalizedStudentId}`
    setDashboardStatus(successMessage)
    setPasswordResetStatus(successMessage)
    void loadStudents()
  }

  const handleOpenStudentDetail = (studentId) => {
    const normalized = String(studentId || '').trim()
    if (!normalized) return
    navigate(`/teacher/student/${encodeURIComponent(normalized)}`)
  }

  const handleToggleTableStudent = (studentId) => {
    setTableSelectedStudentIds(prev => (
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    ))
  }

  async function handleSaveClassExtras(classId, extras) {
    updateClassExtras(classId, extras)
    setClasses(getClasses())
    try {
      await fetch('/api/teacher-class-extras', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-teacher-token': getTeacherApiToken()
        },
        body: JSON.stringify({ classId, enabledExtras: extras })
      })
    } catch { /* best-effort */ }
  }

  return {
    handleRefresh,
    handleCloudRefreshNow,
    handleLogout,
    handleJumpToPasswordReset,
    handleCreateClass,
    handleAddStudentsToClass,
    handleDeleteClass,
    handleToggleClassFilter,
    clearClassFilter,
    handleResetStudentPassword,
    handleOpenStudentDetail,
    handleToggleTableStudent,
    handleSaveClassExtras
  }
}
