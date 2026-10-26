import { useEffect, useMemo, useRef, useState } from 'react'
import { loadTeacherProfile } from '../../../lib/storage'
import { getRecordClassLabel, recordMatchesClassFilter } from './dashboardCoreHelpers'

export function useDashboardStudentSelection({
  students,
  isDirectStudentView,
  routeStudentId,
  selectedClassIds,
  detailStudentId,
  setDetailStudentId,
  classNameById,
  navigate,
  setDashboardStatus
}) {
  const directStudentProfile = useMemo(() => {
    if (!isDirectStudentView) return null
    const needle = routeStudentId.toLowerCase()
    return students.find(student => String(student?.studentId || '').toLowerCase() === needle) || null
  }, [students, isDirectStudentView, routeStudentId])

  const hasMissingDirectStudent = isDirectStudentView
    && routeStudentId.length > 0
    && students.length > 0
    && !directStudentProfile

  useEffect(() => {
    if (!isDirectStudentView) return
    if (!routeStudentId) return
    if (students.length === 0) return
    if (directStudentProfile) return
    setDashboardStatus(`Kunde inte hitta elev med ID: ${routeStudentId}`)
  }, [isDirectStudentView, routeStudentId, students.length, directStudentProfile, setDashboardStatus])

  useEffect(() => {
    if (!isDirectStudentView) return
    if (routeStudentId) return
    if (!detailStudentId) return
    navigate(`/teacher/student/${encodeURIComponent(detailStudentId)}`, { replace: true })
  }, [isDirectStudentView, routeStudentId, detailStudentId, navigate])

  const filteredStudents = useMemo(() => (
    isDirectStudentView
      ? (detailStudentId
        ? students.filter(student => String(student?.studentId || '') === String(detailStudentId))
        : [])
      : selectedClassIds.length > 0
        ? students.filter(student => recordMatchesClassFilter(student, selectedClassIds))
        : students
  ), [isDirectStudentView, detailStudentId, selectedClassIds, students])

  useEffect(() => {
    if (!isDirectStudentView) return
    if (!directStudentProfile) return
    if (detailStudentId !== directStudentProfile.studentId) {
      setDetailStudentId(directStudentProfile.studentId)
    }
  }, [isDirectStudentView, directStudentProfile, detailStudentId, setDetailStudentId])

  const detailStudentSource = useMemo(
    () => (isDirectStudentView ? students : filteredStudents),
    [isDirectStudentView, students, filteredStudents]
  )

  useEffect(() => {
    if (detailStudentSource.length === 0) {
      if (detailStudentId !== '') setDetailStudentId('')
      return
    }
    if (hasMissingDirectStudent) {
      if (detailStudentId !== '') setDetailStudentId('')
      return
    }
    if (!detailStudentId || !detailStudentSource.some(item => item.studentId === detailStudentId)) {
      setDetailStudentId(detailStudentSource[0].studentId)
    }
  }, [detailStudentSource, detailStudentId, hasMissingDirectStudent, setDetailStudentId])

  const detailStudentOptions = useMemo(
    () => detailStudentSource
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        className: getRecordClassLabel(student, classNameById)
      }))
      .sort((a, b) => {
        const classCompare = String(a.className || '').localeCompare(String(b.className || ''), 'sv')
        if (classCompare !== 0) return classCompare
        return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
      }),
    [detailStudentSource, classNameById]
  )

  const selectedListProfile = useMemo(
    () => detailStudentSource.find(item => item.studentId === detailStudentId) || null,
    [detailStudentSource, detailStudentId]
  )

  const [loadedDetail, setLoadedDetail] = useState(null)
  // The full history is fetched again only when the pupil or the pupil's data
  // changes, never because the list was refreshed or a name changed. Refetching
  // on every new list object blanked the panel and made the page jump.
  const selectedRef = useRef(selectedListProfile)
  useEffect(() => { selectedRef.current = selectedListProfile })
  const lastProblem = selectedListProfile?.recentProblems?.[selectedListProfile.recentProblems.length - 1]
  const detailKey = selectedListProfile
    ? [selectedListProfile.studentId, selectedListProfile.serverRevision ?? '', selectedListProfile.recentProblems?.length ?? '', lastProblem?.timestamp ?? '',
      selectedListProfile.teacherListSchemaVersion ? 'list' : 'full'].join(':')
    : ''
  useEffect(() => {
    let active = true
    const listProfile = selectedRef.current
    if (!listProfile) { setLoadedDetail(null); return undefined }
    if (!listProfile.teacherListSchemaVersion) {
      setLoadedDetail(listProfile)
      return undefined
    }
    void loadTeacherProfile(listProfile.studentId).then(profile => {
      if (!active) return
      setLoadedDetail(profile)
      if (!profile) setDashboardStatus('Kunde inte hämta elevens fullständiga historik. Försök uppdatera.')
    })
    return () => { active = false }
  }, [detailKey, setDashboardStatus])
  // The name always comes from the current list entry, so a label change shows
  // at once and a fetched profile can never carry an old name.
  const detailStudentProfile = useMemo(() => (
    loadedDetail && selectedListProfile && loadedDetail.studentId === selectedListProfile.studentId
      ? { ...loadedDetail, name: selectedListProfile.name, teacherPupilLabel: selectedListProfile.teacherPupilLabel }
      : null
  ), [loadedDetail, selectedListProfile])

  return {
    hasMissingDirectStudent,
    filteredStudents,
    detailStudentSource,
    detailStudentOptions,
    detailStudentProfile
  }
}
