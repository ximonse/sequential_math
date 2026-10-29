import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
} from './sections/dashboardTableStatusUtils'
import {
  getAllProfilesWithSync,
  getCloudProfilesSyncStatus,
  getClasses,
} from '../../lib/storage'
import { getActiveAssignment, hydrateAssignmentsFromServer } from '../../lib/assignments'
import { activeAssignmentIds } from '../../lib/activeAssignments'
import { getTeacherClassIds } from '../../lib/teacherAuth'
import { hydrateTicketsFromServer } from '../../lib/tickets'
import { loadTeacherWorkspace } from '../../lib/teacherWorkspaceSync'
import { fillTeacherPupilLabelsFromCreationNames, loadTeacherPupilLabels } from '../../lib/teacherPupilLabels'
import { loadTeacherGroups } from './sections/teacherGroupsApi'
// The teacher's choice to see code names instead of private labels, per device.
const CODE_NAMES_KEY = 'mathapp_teacher_code_names_only'
function prefersCodeNames() {
  try { return localStorage.getItem(CODE_NAMES_KEY) === '1' } catch { return false }
}
function storeCodeNamesPreference(enabled) {
  try { if (enabled) localStorage.setItem(CODE_NAMES_KEY, '1'); else localStorage.removeItem(CODE_NAMES_KEY) } catch { /* Preferences are optional. */ }
}

function Dashboard() {
  const [rawStudents, setStudents] = useState([])
  const [pupilLabels, setPupilLabels] = useState({})
  const [labelsLoaded, setLabelsLoaded] = useState(false)
  const labelsRequest = useRef(null)
  const labelsReady = useRef(false)
  const loadSequence = useRef(0)
  const fillAttempted = useRef(new Set())
  const [assignments, setAssignments] = useState([])
  const [viewMode, setViewMode] = useState('daily')
  const [sortBy, setSortBy] = useState('active_today')
  const [sortDir, setSortDir] = useState('desc')
  const [classes, setClasses] = useState([])
  const [teacherGroups, setTeacherGroups] = useState([])
  const [classesReady, setClassesReady] = useState(false)
  const [groupsReady, setGroupsReady] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState(() => loadSavedTeacherClassFilter())
  const [classNameInput, setClassNameInput] = useState('')
  const [addToClassId, setAddToClassId] = useState('')
  const [rosterInput, setRosterInput] = useState('')
  const [classStatus, setClassStatus] = useState('')
  const [dashboardStatus, setDashboardStatus] = useState('')
  const [fillingPupilNames, setFillingPupilNames] = useState(false)
  const [codeNamesOnly, setCodeNamesOnly] = useState(prefersCodeNames)
  // The name shown for a pupil is decided here, from the label map and the
  // teacher's own choice, so no refresh can ever reset it to the code name.
  const students = useMemo(() => rawStudents.map(profile => {
    const label = pupilLabels[profile.studentId] || ''
    return { ...profile, name: (!codeNamesOnly && label) || profile.displayAlias || profile.studentId, teacherPupilLabel: label,
      groupIds: teacherGroups.filter(group => (group.pupilIds || []).includes(profile.studentId)).map(group => group.id) }
  }), [rawStudents, pupilLabels, codeNamesOnly, teacherGroups])
  const [copiedId, setCopiedId] = useState('')
  const [activeAssignmentId, setActiveAssignmentId] = useState('')
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
    () => [
      ...buildClassFilterOptions(classes, students),
      ...teacherGroups.map(group => ({ id: group.id, name: `Grupp: ${group.name}`, kind: 'group' }))
    ],
    [classes, students, teacherGroups]
  )

  const [exportRange, setExportRange] = useState({ from: '', to: '' })

  // Fetched once, then only changed by the teacher's own actions. A failed
  // request keeps the labels already known and is retried on the next load.
  const ensureLabels = useCallback(() => {
    if (labelsReady.current) return Promise.resolve(true)
    if (labelsRequest.current) return labelsRequest.current
    labelsRequest.current = loadTeacherPupilLabels().then(labels => {
      if (labels) { labelsReady.current = true; setPupilLabels(labels); setLabelsLoaded(true) }
      return Boolean(labels)
    }).finally(() => { labelsRequest.current = null })
    return labelsRequest.current
  }, [])

  const loadStudents = useCallback(async () => {
    void ensureLabels()
    const sequence = ++loadSequence.current
    const [profiles] = await Promise.all([
      getAllProfilesWithSync(),
      loadTeacherGroups().then(data => {
        if (sequence === loadSequence.current) {
          setTeacherGroups(Array.isArray(data?.groups) ? data.groups : [])
          setGroupsReady(true)
        }
      }).catch(() => setDashboardStatus('Grupplistan kunde inte hämtas. Tidigare val är kvar.')),
      syncClassesFromServer().then(serverClasses => {
        if (sequence === loadSequence.current && serverClasses) {
          setClasses(serverClasses)
          setClassesReady(true)
        }
      })
    ])
    const enrichedProfiles = profiles.map(profile => ({
      ...profile,
      name: profile.displayAlias || profile.studentId,
      teacherPupilLabel: ''
    }))
    enrichedProfiles.sort((a, b) => {
      const aLast = a.recentProblems[a.recentProblems.length - 1]?.timestamp || 0
      const bLast = b.recentProblems[b.recentProblems.length - 1]?.timestamp || 0
      return bLast - aLast
    })
    if (sequence === loadSequence.current) {
      setStudents(enrichedProfiles)
      setCloudSyncStatus(getCloudProfilesSyncStatus())
    }
    return enrichedProfiles
  }, [ensureLabels])

  const showCodeNames = () => {
    storeCodeNamesPreference(true)
    setCodeNamesOnly(true)
    setDashboardStatus('Kodnamnen visas nu i dina lärarvyer.')
  }

  // Copies the names typed when pupils were created into this teacher's own
  // labels. Only adds missing ones; nothing already saved is replaced.
  const fillPupilLabels = useCallback(async () => {
    const result = await fillTeacherPupilLabelsFromCreationNames()
    if (result.ok) { labelsReady.current = true; setPupilLabels(result.labels || {}); setLabelsLoaded(true) }
    return result
  }, [])

  const showPupilNames = async () => {
    storeCodeNamesPreference(false)
    setCodeNamesOnly(false)
    setFillingPupilNames(true)
    try {
      const result = await fillPupilLabels()
      if (!result.ok) {
        setDashboardStatus(result.error || 'Kunde inte hämta tilltalsnamnen.')
        return
      }
      setDashboardStatus(result.added > 0
        ? `${result.added} tilltalsnamn visas nu i dina lärarvyer.`
        : 'Tilltalsnamnen visas i dina lärarvyer där de finns sparade.')
    } finally {
      setFillingPupilNames(false)
    }
  }

  // Names are the default. Pupils that have no label yet get one from their
  // creation name, once per pupil, unless the teacher chose code names.
  useEffect(() => {
    if (codeNamesOnly || !labelsLoaded) return
    const missing = rawStudents.map(profile => profile.studentId).filter(id => !pupilLabels[id] && !fillAttempted.current.has(id))
    if (missing.length === 0) return
    for (const id of missing) fillAttempted.current.add(id)
    void fillPupilLabels()
  }, [rawStudents, pupilLabels, labelsLoaded, codeNamesOnly, fillPupilLabels])

  useEffect(() => {
    const onGroupsUpdated = () => { void loadStudents() }
    window.addEventListener('teacher-groups-updated', onGroupsUpdated)
    return () => window.removeEventListener('teacher-groups-updated', onGroupsUpdated)
  }, [loadStudents])

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
    void loadTeacherWorkspace().then(workspace => {
      hydrateTicketsFromServer(workspace)
      setAssignments(hydrateAssignmentsFromServer(workspace))
      setActiveAssignmentId(getActiveAssignment()?.id || '')
    })
  }, [loadStudents])

  useEffect(() => {
    // The class list is empty until it has loaded; clearing then would wipe
    // (and save over) the teacher's saved choice on every reload.
    if (!classesReady || !groupsReady || classFilterOptions.length === 0) return
    const valid = new Set(classFilterOptions.map(item => item.id))
    setSelectedClassIds(prev => prev.filter(id => valid.has(id)))
  }, [classFilterOptions, selectedClassIds.length, classesReady, groupsReady])

  useEffect(() => {
    saveTeacherClassFilterSelection(selectedClassIds)
  }, [selectedClassIds])


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
    handleCloudRefreshNow,
    handleLogout,
    handleAddExistingStudentsToClass,
    handleMoveStudent,
    handleAddStudentsToClass,
    handleSetTeacherPupilLabel,
    handleToggleClassFilter,
    clearClassFilter,
    handleResetStudentPassword,
    handleOpenStudentDetail
  } = buildDashboardClassAndAuthActions({
    loadStudents,
    setPupilLabels,
    addToClassId,
    setClasses,
    setAddToClassId,
    setAssignments,
    setActiveAssignmentId,
    setDashboardStatus,
    setCloudSyncStatus,
    setIsCloudRefreshBusy,
    navigate,
    isDirectStudentView,
    setClassStatus,
    classNameInput,
    rosterInput,
    setClassNameInput,
    setRosterInput,
    setDetailStudentId,
    setSelectedClassIds,
    setPasswordResetBusyId,
    setPasswordResetStatus,
    })

  const activeAssignment = useMemo(
    () => assignments.find(item => item.id === activeAssignmentId) || null,
    [assignments, activeAssignmentId]
  )
  const classNameById = useMemo(
    () => new Map(classFilterOptions.map(item => [item.id, item.name])),
    [classFilterOptions]
  )
  // Where each assignment is active, from the server's class, group and pupil records.
  const assignmentTargets = useMemo(() => [
    ...classes.map(item => ({ type: 'class', id: String(item.id), name: item.name || String(item.id), assignmentIds: activeAssignmentIds(item) })),
    ...teacherGroups.map(item => ({ type: 'group', id: String(item.id), name: `Grupp: ${item.name}`, assignmentIds: activeAssignmentIds(item) })),
    ...students.map(item => ({ type: 'student', id: String(item.studentId), name: item.name || item.studentId, assignmentIds: activeAssignmentIds(item) }))
  ], [classes, teacherGroups, students])
  // Who to hand work to. Until the teacher picks, it follows the class filter above.
  const [deliveryPicks, setDeliveryPicks] = useState(null)
  const recipients = useMemo(() => deliveryPicks ?? selectedClassIds.map(id => ({
    type: teacherGroups.some(group => String(group.id) === String(id)) ? 'group' : 'class', id: String(id)
  })), [deliveryPicks, selectedClassIds, teacherGroups])

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
    trainingPriorityList,
    dailyActivityBreakdown,
    passwordResetRows,
    supportRows,
    inactivityBuckets,
    classSummaries,
    classOverviewMeta,
    renderDetailLevelErrorSortHeader,
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
    supportSortBy,
    supportSortDir,
    setSupportSortBy,
    setSupportSortDir,
    passwordResetSearch,
    detailLevelErrorMinAttempts: DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
    defaultWeeklyGoal: DEFAULT_WEEKLY_GOAL
  })
  const {
    handleCreatePreset,
    handleCreateMathPractice,
    handleCopyAssignmentLink,
    handleActivateAssignment,
    handleDeactivateAssignment,
    handleDeleteAssignment,
    handleClearAllAssignments,
    handleCreateQuickAssignment
  } = buildDashboardAssignmentActions({
    assignments,
    setAssignments,
    setDashboardStatus,
    setCopiedId,
    setActiveAssignmentId,
    getSelectedClassLoginToken: () => {
      if (selectedClassIds.length !== 1) return ''
      return String(classes.find(item => String(item.id) === String(selectedClassIds[0]))?.loginToken || '').trim()
    },
    getTargets: ({ selectedOnly = false } = {}) => {
      if (recipients.length > 0) return recipients.flatMap(pick => {
        const target = assignmentTargets.find(item => item.type === pick.type && item.id === pick.id)
        return target ? [{ type: target.type, id: target.id, name: target.name }] : []
      })
      return selectedOnly ? [] : assignmentTargets.filter(item => item.type === 'class').map(({ type, id, name }) => ({ type, id, name }))
    },
    getActiveTargets: assignmentId => assignmentTargets.filter(item => item.assignmentIds.includes(assignmentId)),
    onTargetActiveChange: (target, activeAssignments) => {
      const update = list => list.map(item => String(item.id) === target.id
        ? { ...item, activeAssignments, activeAssignmentPayload: activeAssignments[0]?.payload || null } : item)
      if (target.type === 'group') setTeacherGroups(update)
      else if (target.type === 'student') {
        setStudents(list => list.map(item => String(item.studentId) === target.id ? { ...item, activeAssignments } : item))
      } else setClasses(update)
    }
  })

  const {
    handleExportSnapshotCsv,
    handleExportDetailedProblemCsv,
    handleExportSkillComparisonCsv,
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
    exportRange,
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
    exportRange,
    onExportRangeChange: setExportRange,
    onExportSkillComparisonCsv: handleExportSkillComparisonCsv,
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
      isFocusView={location.pathname === '/teacher/focus'}
      initialWorkspace={location.state?.workspace}
      {...{
        isDirectStudentView, detailStudentProfile, cloudSyncStatus, formatTimeAgo,
        navigate, handleLogout, dashboardStatus,
        isCloudRefreshBusy, handleCloudRefreshNow, formatSyncTimestamp, getCloudSyncSourceLabel,
        selectedClassIds, students, filteredStudents, classFilterOptions, clearClassFilter,
        handleToggleClassFilter, classStats, dataQualitySummary, usageInsights, formatDuration,
        toPercent, assignments, copiedId,
        formatAssignmentSummaryLine, handleCreatePreset, handleCreateMathPractice, handleDeactivateAssignment, handleClearAllAssignments,
        handleActivateAssignment, assignmentTargets, recipients, setDeliveryPicks, teacherGroups,
        recipientsFollowFilter: deliveryPicks === null, handleDeleteAssignment, handleCopyAssignmentLink, classNameById,
        recordMatchesClassFilter, setStudents, setDashboardStatus, handleOpenStudentDetail,
        classOverviewMeta, filteredRows, detailStudentId,
        detailStudentOptions, hasMissingDirectStudent, setDetailStudentId, handleExportStudentDetailCsv,
        detailStudentRow, detailStudentViewData, trainingPriorityList, getCompactMasteryColorClass, LEVELS, DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
        ALL_OPERATIONS, classBenchmarks, studentOperationStats7d, detailLevelErrorRows,
        detailLevelErrorUnderSampleCount, renderDetailLevelErrorSortHeader, DETAIL_LEVEL_ERROR_HELP,
        detailLevelErrorSortBy, detailLevelErrorSortDir,
        handleDetailLevelErrorSortByChange, handleDetailLevelErrorSortDirChange,
        getErrorShareColorClass, dailyActivityBreakdown, inactivityBuckets, classSummaries, weekGoal,
        supportRows, handleCreateQuickAssignment,
        addToClassId, setAddToClassId,
        classes, onLocalTestDataImported: loadStudents, handleAddExistingStudentsToClass, handleMoveStudent, handleAddStudentsToClass, rosterInput, setRosterInput, classStatus,
        handleSetTeacherPupilLabel, showPupilNames, fillingPupilNames, showCodeNames,
        pupilLabelsShown: !codeNamesOnly,
        resultsPanelProps, PASSWORD_RESET_SECTION_ID, passwordResetRows, passwordResetSearch,
        setPasswordResetSearch, passwordResetStatus, handleResetStudentPassword, passwordResetBusyId
      }}
    />
    </>
  )
}

export default Dashboard
