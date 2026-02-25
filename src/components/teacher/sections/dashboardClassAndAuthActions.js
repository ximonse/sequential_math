import { buildCloudSyncStatusMessage } from './dashboardCoreHelpers'
import {
  addStudentsToClass,
  createClassFromRoster,
  getClasses,
  getCloudProfilesSyncStatus,
  normalizeStudentId,
  removeClass,
  resetStudentPasswordToLoginName
} from '../../../lib/storage'
import {
  getActiveAssignment,
  getAssignments
} from '../../../lib/assignments'
import { logoutTeacher } from '../../../lib/teacherAuth'

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
      const latestSyncStatus = getCloudProfilesSyncStatus()
      setCloudSyncStatus(latestSyncStatus)
      setDashboardStatus(buildCloudSyncStatusMessage(latestSyncStatus))
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
    handleToggleTableStudent
  }
}
