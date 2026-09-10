import { buildCloudSyncStatusMessage } from './dashboardCoreHelpers'
import {
  addExistingStudentsToClass,
  addStudentsToClass,
  createClassFromRoster,
  deleteProfile,
  getClasses,
  getCloudProfilesSyncStatus,
  normalizeStudentId,
  removeClass,
  moveStudentBetweenClasses,
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
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.classes) ? data.classes : []
  } catch {
    return null
  }
}

async function deleteClassFromServer(classId) {
  const response = await fetch(`/api/teacher-classes?id=${encodeURIComponent(classId)}`, {
    method: 'DELETE', headers: { 'x-teacher-token': getTeacherApiToken() }
  })
  if (!response.ok) throw new Error('Kunde inte ta bort klassen på servern.')
}

export async function syncClassesFromServer() {
  const serverClasses = await fetchClassesFromServer()
  if (!serverClasses) return null
  const serverIds = new Set(serverClasses.map(record => record.id))
  for (const record of getClasses()) {
    if (!serverIds.has(record.id)) removeClass(record.id)
  }
  for (const record of serverClasses) saveClass(record)
  return getClasses()
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
  setDetailStudentId,
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

  const handleCreateClass = async (schoolId = '') => {
    let result
    try {
      result = await createClassFromRoster(classNameInput, rosterInput, 4, schoolId)
    } catch {
      setClassStatus('Kunde inte skapa klass just nu.')
      return
    }
    if (!result.ok) {
      setClassStatus(result.error)
      if (result.classRecord) { setClasses(getClasses()); await loadStudents() }
      return
    }

    setClassNameInput('')
    setRosterInput('')
    setClassStatus(`Klass skapad: ${result.classRecord.name}. Koder: ${(result.results || []).filter(item => item.loginCode).map(item => `${item.name}: ${item.loginCode}`).join(' · ')}`)
    const updatedClasses = getClasses()
    setClasses(updatedClasses)
    setAddToClassId(result.classRecord.id)
    void loadStudents()
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
      if (result.classRecord) { setClasses(getClasses()); await loadStudents() }
      return
    }

    setRosterInput('')
    setClassStatus(`Tillagt ${result.addedCount} elev(er). Koder: ${(result.results || []).filter(item => item.loginCode).map(item => `${item.name}: ${item.loginCode}`).join(' · ')}`)
    setClasses(getClasses())
    void loadStudents()
  }

  const handleDeleteClass = async (classId) => {
    try { await deleteClassFromServer(classId) }
    catch { setClassStatus('Kunde inte ta bort klassen. Försök igen.'); return }
    removeClass(classId)
    setSelectedClassIds(prev => prev.filter(id => id !== classId))
    const updatedClasses = getClasses()
    setClasses(updatedClasses)
    if (addToClassId === classId) {
      setAddToClassId(updatedClasses[0]?.id || '')
    }
    setClassStatus('Klass borttagen.')
    await loadStudents()
  }

  const handleDeleteStudent = async (studentId) => {
    let result
    try {
      result = await deleteProfile(studentId)
    } catch {
      setDashboardStatus('Kunde inte radera eleven just nu.')
      return
    }
    if (!result?.ok) {
      setDashboardStatus(result?.error || 'Kunde inte radera eleven just nu.')
      return
    }

    setDetailStudentId('')
    await loadStudents()
    setClasses(getClasses())
    setDashboardStatus('Elevprofil och träningshistorik är raderade.')
    navigate('/teacher')
  }

  const handleRenameStudent = async (studentId, name) => {
    const profiles = await loadStudents()
    const current = profiles?.find?.(item => item.studentId === studentId)
    if (!current) { setDashboardStatus('Kunde inte hitta eleven.'); return false }
    const response = await fetch(`/api/student/${encodeURIComponent(studentId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() }, body: JSON.stringify({ serverRevision: current.serverRevision, changes: { name } }) })
    if (!response.ok) { setDashboardStatus('Kunde inte byta elevnamn. Uppdatera och försök igen.'); return false }
    await loadStudents(); setDashboardStatus('Elevnamnet är ändrat.'); return true
  }

  const handleRenameClass = async (id, name, schoolId) => {
    const response = await fetch('/api/teacher-classes', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() }, body: JSON.stringify({ id, name, ...(schoolId !== undefined ? { schoolId } : {}) }) })
    const data = await response.json()
    if (!response.ok) { setClassStatus(data.error || 'Kunde inte byta klassnamn.'); return false }
    saveClass(data.class); setClasses(getClasses()); setClassStatus('Klassen är uppdaterad.'); return true
  }

  const handleAddExistingStudentsToClass = async (studentIds) => {
    let result
    try {
      result = await addExistingStudentsToClass(addToClassId, studentIds, 4)
    } catch {
      setClassStatus('Kunde inte lägga till befintliga elever just nu.')
      return false
    }
    if (!result.ok) {
      setClassStatus(result.error)
      if (result.classRecord) { setClasses(getClasses()); await loadStudents() }
      return false
    }

    setClassStatus(`Tillagt ${result.addedCount} befintlig(a) elev(er) i ${result.classRecord.name}.`)
    setClasses(getClasses())
    void loadStudents()
    return true
  }

  const handleMoveStudent = async (studentId, fromClassId, toClassId) => {
    const result = await moveStudentBetweenClasses(studentId, fromClassId, toClassId)
    if (!result.ok) { setClassStatus(result.error); return false }
    setClassStatus('Eleven är flyttad. ID och träningshistorik är kvar.')
    await loadStudents()
    return true
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

  async function handleSaveClassExtras(classId, extras, options = {}) {
    const body = { classId, enabledExtras: extras }
    if (options.highscoreGroup !== undefined) {
      body.highscoreGroup = options.highscoreGroup
    }
    try {
      const response = await fetch('/api/teacher-class-extras', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-teacher-token': getTeacherApiToken()
        },
        body: JSON.stringify(body)
      })
      if (!response.ok) throw new Error('Save failed')
      updateClassExtras(classId, extras)
      const cls = getClasses().find(record => record.id === classId)
      if (cls && options.highscoreGroup !== undefined) saveClass({ ...cls, highscoreGroup: options.highscoreGroup || null })
      setClasses(getClasses())
      setClassStatus('Klassinställningarna är sparade på servern.')
      return true
    } catch { setClassStatus('Kunde inte spara klassinställningarna. Försök igen.'); return false }
  }

  return {
    handleRefresh,
    handleCloudRefreshNow,
    handleLogout,
    handleJumpToPasswordReset,
    handleCreateClass,
    handleAddExistingStudentsToClass, handleMoveStudent,
    handleAddStudentsToClass,
    handleDeleteClass,
    handleDeleteStudent,
    handleRenameStudent,
    handleRenameClass,
    handleToggleClassFilter,
    clearClassFilter,
    handleResetStudentPassword,
    handleOpenStudentDetail,
    handleToggleTableStudent,
    handleSaveClassExtras
  }
}
