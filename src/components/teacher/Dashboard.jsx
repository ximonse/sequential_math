import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from './sections/DashboardLayout'
import {
  formatAssignmentSummaryLine
} from './sections/dashboardAssignmentRiskHelpers'
import { buildDashboardAssignmentActions } from './sections/dashboardAssignmentActions'
import { buildDashboardClassAndAuthActions, syncClassesFromServer } from './sections/dashboardClassAndAuthActions'
import {
  ALL_OPERATIONS,
  DEFAULT_WEEKLY_GOAL,
  DETAIL_LEVEL_ERROR_HELP,
  DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
  LEVELS,
  PASSWORD_RESET_SECTION_ID,
  RESULT_HEADER_HELP,
  TABLES,
  TEACHER_AUTO_REFRESH_INTERVAL_MS
} from './sections/dashboardConstants'
import { buildDashboardExportActions } from './sections/dashboardExportActions'
import { useDashboardViewData } from './sections/useDashboardViewData'
import { useDashboardStudentSelection } from './sections/useDashboardStudentSelection'
import {
  loadSavedTeacherClassFilter,
  saveTeacherClassFilterSelection
} from './sections/dashboardTeacherClassFilterHelpers'
import {
  buildClassFilterOptions,
  formatSyncTimestamp,
  getCloudSyncSourceLabel,
  recordMatchesClassFilter,
  shouldTeacherAutoRefreshNow
} from './sections/dashboardCoreHelpers'
import {
  formatDuration,
  formatTimeAgo,
  getDefaultDetailLevelErrorSortDir,
  getErrorShareColorClass,
  getReasonableColorClass,
  getSuccessColorClass,
  toPercent
} from './sections/dashboardSortUtils'
import {
  getCompactMasteryColorClass,
  getTableSpeedColorClass,
  getTeacherTableStatusClass,
  getTeacherTableStatusLabel
} from './sections/dashboardTableStatusUtils'
import {
  getAllProfilesWithSync,
  getCloudProfilesSyncStatus,
  getClasses,
} from '../../lib/storage'
import { getActiveAssignment, getAssignments } from '../../lib/assignments'
import { getTeacherClassIds } from '../../lib/teacherAuth'
function Dashboard() {
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [viewMode, setViewMode] = useState('daily')
  const [sortBy, setSortBy] = useState('active_today')
  const [sortDir, setSortDir] = useState('desc')
  const [classes, setClasses] = useState([])
  const [selectedClassIds, setSelectedClassIds] = useState(() => loadSavedTeacherClassFilter())
  const [classNameInput, setClassNameInput] = useState('')
  const [addToClassId, setAddToClassId] = useState('')
  const [rosterInput, setRosterInput] = useState('')
  const [classStatus, setClassStatus] = useState('')
  const [dashboardStatus, setDashboardStatus] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [activeAssignmentId, setActiveAssignmentId] = useState('')
  const [tableSelectedStudentIds, setTableSelectedStudentIds] = useState([])
  const [tableStudentSearch, setTableStudentSearch] = useState('')
  const [stickySortBy, setStickySortBy] = useState('name')
  const [stickySortDir, setStickySortDir] = useState('asc')
  const [supportSortBy, setSupportSortBy] = useState('risk')
  const [supportSortDir, setSupportSortDir] = useState('desc')
  const [detailStudentId, setDetailStudentId] = useState('')
  const [detailLevelErrorSortBy, setDetailLevelErrorSortBy] = useState('error_share')
  const [detailLevelErrorSortDir, setDetailLevelErrorSortDir] = useState('desc')
  const [passwordResetSearch, setPasswordResetSearch] = useState('')
  const [passwordResetStatus, setPasswordResetStatus] = useState('')
  const [passwordResetBusyId, setPasswordResetBusyId] = useState('')
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => getCloudProfilesSyncStatus())
  const [isCloudRefreshBusy, setIsCloudRefreshBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { studentId: routeStudentIdParam } = useParams()
  const routeStudentId = String(routeStudentIdParam || '').trim()
  const isDirectStudentView = String(location?.pathname || '').startsWith('/teacher/student')
  const classFilterOptions = useMemo(
    () => buildClassFilterOptions(classes, students),
    [classes, students]
  )

  const loadStudents = useCallback(async () => {
    const profiles = await getAllProfilesWithSync()
    profiles.sort((a, b) => {
      const aLast = a.recentProblems[a.recentProblems.length - 1]?.timestamp || 0
      const bLast = b.recentProblems[b.recentProblems.length - 1]?.timestamp || 0
      return bLast - aLast
    })
    setStudents(profiles)
    setCloudSyncStatus(getCloudProfilesSyncStatus())

    const serverClasses = await syncClassesFromServer()
    setClasses(serverClasses || [])
    return profiles
  }, [])

  useEffect(() => {
    void loadStudents()
    const allClasses = getClasses()
    const teacherClassIds = getTeacherClassIds()
    const initialClasses = teacherClassIds === null
      ? allClasses
      : allClasses.filter(c => teacherClassIds.includes(String(c.id || '')))
    setClasses(initialClasses)
    if (initialClasses.length > 0) {
      setAddToClassId(initialClasses[0].id)
    }
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
  }, [loadStudents])

  useEffect(() => {
    if (classFilterOptions.length === 0) {
      if (selectedClassIds.length > 0) setSelectedClassIds([])
      return
    }
    const valid = new Set(classFilterOptions.map(item => item.id))
    setSelectedClassIds(prev => prev.filter(id => valid.has(id)))
  }, [classFilterOptions, selectedClassIds.length])

  useEffect(() => {
    saveTeacherClassFilterSelection(selectedClassIds)
  }, [selectedClassIds])

  useEffect(() => {
    if (students.length === 0) {
      if (tableSelectedStudentIds.length > 0) setTableSelectedStudentIds([])
      return
    }
    const valid = new Set(students.map(item => item.studentId))
    setTableSelectedStudentIds(prev => prev.filter(id => valid.has(id)))
  }, [students, tableSelectedStudentIds.length])

  useEffect(() => {
    const runAutoRefreshIfAllowed = () => {
      if (!shouldTeacherAutoRefreshNow()) return
      void loadStudents()
    }

    const timer = window.setInterval(runAutoRefreshIfAllowed, TEACHER_AUTO_REFRESH_INTERVAL_MS)
    const onVisibilityOrFocus = () => runAutoRefreshIfAllowed()

    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisibilityOrFocus)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
    }
  }, [loadStudents])

  useEffect(() => {
    if (!isDirectStudentView) return
    if (typeof document === 'undefined') return
    const timer = window.setTimeout(() => {
      const section = document.getElementById('teacher-student-detail-section')
      if (section && typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [isDirectStudentView, routeStudentId, students.length])

  const {
    handleRefresh,
    handleCloudRefreshNow,
    handleLogout,
    handleJumpToPasswordReset,
    handleCreateClass,
    handleAddExistingStudentsToClass,
    handleMoveStudent,
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
  } = buildDashboardClassAndAuthActions({
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
    passwordResetSectionId: PASSWORD_RESET_SECTION_ID,
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
  })

  const activeAssignment = useMemo(
    () => assignments.find(item => item.id === activeAssignmentId) || null,
    [assignments, activeAssignmentId]
  )
  const classNameById = useMemo(
    () => new Map(classFilterOptions.map(item => [item.id, item.name])),
    [classFilterOptions]
  )

  const {
    hasMissingDirectStudent,
    filteredStudents,
    detailStudentSource,
    detailStudentOptions,
    detailStudentProfile
  } = useDashboardStudentSelection({
    students,
    isDirectStudentView,
    routeStudentId,
    selectedClassIds,
    detailStudentId,
    setDetailStudentId,
    classNameById,
    navigate,
    setDashboardStatus
  })

  const {
    classStats,
    weekGoal,
    filteredRows,
    visibleRows,
    detailStudentRow,
    detailStudentViewData,
    detailLevelErrorRows,
    detailLevelErrorUnderSampleCount,
    classBenchmarks,
    studentOperationStats7d,
    classTableBenchmarks,
    trainingPriorityList,
    dailyActivityBreakdown,
    passwordResetRows,
    supportRows,
    inactivityBuckets,
    classSummaries,
    classOverviewMeta,
    handleStickySort,
    getStickySortIndicator,
    renderDetailLevelErrorSortHeader,
    tableStudentSet,
    filteredTableStudentOptions,
    tableDevelopmentOverview,
    tableStickyStatusRows,
    dataQualitySummary,
    usageInsights,
    renderResultSortHeader
  } = useDashboardViewData({
    students,
    filteredStudents,
    classes,
    selectedClassIds,
    isDirectStudentView,
    detailStudentId,
    activeAssignment,
    classNameById,
    detailStudentProfile,
    detailStudentSource,
    detailLevelErrorSortBy,
    detailLevelErrorSortDir,
    setDetailLevelErrorSortBy,
    setDetailLevelErrorSortDir,
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
    stickySortBy,
    stickySortDir,
    setStickySortBy,
    setStickySortDir,
    supportSortBy,
    supportSortDir,
    setSupportSortBy,
    setSupportSortDir,
    tableSelectedStudentIds,
    tableStudentSearch,
    setTableSelectedStudentIds,
    passwordResetSearch,
    detailLevelErrorMinAttempts: DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
    defaultWeeklyGoal: DEFAULT_WEEKLY_GOAL
  })
  const {
    handleCreatePreset,
    handleCopyAssignmentLink,
    handleActivateForAll,
    handleClearActiveForAll,
    handleDeleteAssignment,
    handleClearAllAssignments,
    handleCreateQuickAssignment
  } = buildDashboardAssignmentActions({
    assignments,
    setAssignments,
    setDashboardStatus,
    setCopiedId,
    setActiveAssignmentId
  })

  const {
    handleExportSnapshotCsv,
    handleExportDetailedProblemCsv,
    handleExportSkillComparisonCsv,
    handleExportTableDevelopmentCsv,
    handleExportActivityCsv,
    handleExportStudentDetailCsv
  } = buildDashboardExportActions({
    visibleRows,
    viewMode,
    weekGoal,
    filteredStudents,
    filteredRows,
    detailStudentProfile,
    detailStudentRow,
    detailStudentViewData,
    setDashboardStatus
  })

  const handleDetailLevelErrorSortByChange = useCallback((nextSortBy) => {
    const normalized = String(nextSortBy || '').trim()
    if (!normalized) return
    setDetailLevelErrorSortBy(normalized)
    setDetailLevelErrorSortDir(getDefaultDetailLevelErrorSortDir(normalized))
  }, [])

  const handleDetailLevelErrorSortDirChange = useCallback((nextSortDir) => {
    if (nextSortDir !== 'asc' && nextSortDir !== 'desc') return
    setDetailLevelErrorSortDir(nextSortDir)
  }, [])

  const resultsPanelProps = {
    students,
    viewMode,
    onSetViewMode: setViewMode,
    visibleRows,
    sortBy,
    onSetSortBy: setSortBy,
    sortDir,
    onToggleSortDir: () => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc'),
    onExportSnapshotCsv: handleExportSnapshotCsv,
    onExportDetailedProblemCsv: handleExportDetailedProblemCsv,
    onExportSkillComparisonCsv: handleExportSkillComparisonCsv,
    onExportTableDevelopmentCsv: handleExportTableDevelopmentCsv,
    onExportActivityCsv: handleExportActivityCsv,
    renderResultSortHeader,
    resultHeaderHelp: RESULT_HEADER_HELP,
    formatDuration,
    formatTimeAgo,
    getSuccessColorClass,
    getReasonableColorClass,
    toPercent,
    onOpenStudentDetail: handleOpenStudentDetail,
    onCreateQuickAssignment: handleCreateQuickAssignment,
    onResetStudentPassword: handleResetStudentPassword,
    passwordResetBusyId
  }

  return (
    <>
    <DashboardLayout
      {...{
        isDirectStudentView, detailStudentProfile, cloudSyncStatus, formatTimeAgo,
        handleJumpToPasswordReset, handleRefresh, navigate, handleLogout, dashboardStatus,
        isCloudRefreshBusy, handleCloudRefreshNow, formatSyncTimestamp, getCloudSyncSourceLabel,
        selectedClassIds, students, filteredStudents, classFilterOptions, clearClassFilter,
        handleToggleClassFilter, classStats, dataQualitySummary, usageInsights, formatDuration,
        toPercent, assignments, activeAssignmentId, copiedId,
        formatAssignmentSummaryLine, handleCreatePreset, handleClearActiveForAll, handleClearAllAssignments,
        handleActivateForAll, handleDeleteAssignment, handleCopyAssignmentLink, classNameById,
        recordMatchesClassFilter, setStudents, setDashboardStatus, handleOpenStudentDetail,
        classOverviewMeta, filteredRows, tableStickyStatusRows, TABLES, handleStickySort,
        getStickySortIndicator, getTeacherTableStatusClass, getTeacherTableStatusLabel, detailStudentId,
        detailStudentOptions, hasMissingDirectStudent, setDetailStudentId, handleExportStudentDetailCsv,
        detailStudentRow, detailStudentViewData, trainingPriorityList, getTableSpeedColorClass,
        classTableBenchmarks, getCompactMasteryColorClass, LEVELS, DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
        ALL_OPERATIONS, classBenchmarks, studentOperationStats7d, detailLevelErrorRows,
        detailLevelErrorUnderSampleCount, renderDetailLevelErrorSortHeader, DETAIL_LEVEL_ERROR_HELP,
        detailLevelErrorSortBy, detailLevelErrorSortDir,
        handleDetailLevelErrorSortByChange, handleDetailLevelErrorSortDirChange,
        getErrorShareColorClass, dailyActivityBreakdown, inactivityBuckets, classSummaries, weekGoal,
        tableSelectedStudentIds, setTableSelectedStudentIds, tableStudentSearch, setTableStudentSearch,
        filteredTableStudentOptions, tableStudentSet, handleToggleTableStudent, tableDevelopmentOverview,
        supportRows, handleCreateQuickAssignment,
        classNameInput, setClassNameInput, handleCreateClass, addToClassId, setAddToClassId,
        classes, handleAddExistingStudentsToClass, handleMoveStudent, handleAddStudentsToClass, rosterInput, setRosterInput, classStatus, handleDeleteClass, handleRenameClass, handleSaveClassExtras,
        handleDeleteStudent, handleRenameStudent,
        resultsPanelProps, PASSWORD_RESET_SECTION_ID, passwordResetRows, passwordResetSearch,
        setPasswordResetSearch, passwordResetStatus, handleResetStudentPassword, passwordResetBusyId
      }}
    />
    </>
  )
}

export default Dashboard
