import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addStudentsToClass,
  createClassFromRoster,
  getAllProfilesWithSync,
  getClasses,
  normalizeStudentId,
  removeClass,
  resetStudentPasswordToLoginName,
  saveProfile
} from '../../lib/storage'
import {
  logoutTeacher
} from '../../lib/teacherAuth'
import { evaluateAnswerQuality } from '../../lib/answerQuality'
import { getOperationLabel } from '../../lib/operations'
import { getStartOfWeekTimestamp } from '../../lib/studentProfile'
import {
  buildAssignmentLink,
  clearAllAssignments,
  clearActiveAssignment,
  createAssignment,
  deleteAssignment,
  getActiveAssignment,
  getAssignments,
  setActiveAssignment
} from '../../lib/assignments'
import {
  buildAnalyticsSnapshot,
  buildDetailedProblemExportRows,
  buildSkillComparisonExportRows,
  buildTableDevelopmentExportRows
} from '../../lib/teacherAnalytics'
import { getStudentPresenceStatus } from '../../lib/studentPresence'
import { summarizeTelemetryWindow } from '../../lib/telemetry'
import {
  buildTicketLink,
  createTicketDispatch,
  createTicketTemplate,
  deleteTicketDispatch,
  deleteTicketTemplate,
  encodeTicketPayload,
  getTicketDispatches,
  getTicketResponseForDispatch,
  getTicketTemplates,
  importTicketTemplatesFromCsv,
  normalizeTags,
  recordTicketDispatchTargets,
  setTicketDispatchReveal,
  setTicketRevealAllForProfile
} from '../../lib/tickets'

const ALL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']
const SUPPORT_THRESHOLD = 45
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_WEEKLY_GOAL = 20
const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const LEVELS = Array.from({ length: 12 }, (_, index) => index + 1)
const MASTERY_MIN_ATTEMPTS = 5
const MASTERY_MIN_SUCCESS_RATE = 0.8
const DETAIL_LEVEL_ERROR_MIN_ATTEMPTS = 8
const TEACHER_CLASS_FILTER_STORAGE_KEY = 'mathapp_teacher_selected_classes_v1'
const PASSWORD_RESET_SECTION_ID = 'teacher-password-reset-section'
const RESULT_HEADER_HELP = {
  today_attempts: 'Antal uppgifter eleven har svarat pa idag.',
  today_wrong: 'Visar ratt/fel idag. Ouppmarksamhetsfel raknas som fel har.',
  today_engaged: 'Tid pa uppgift = fokus + interaktion, inte bara oppen flik.',
  today_struggle: 'Skill med tydligast kunskapsfel i dagens underlag.',
  today_answer_length: 'Medel antal tecken i elevsvar idag. Tolkas tillsammans med andra matt.',
  week_attempts: 'Antal uppgifter sedan veckostart (mandag 00:00).',
  week_active_time: 'Aktiv tid (svar) summerar speed-tider pa loggade svar.',
  week_engaged: 'Tid pa uppgift = fokus + interaktion senaste 7 dagar.',
  week_wrong: 'Visar ratt/fel under veckan. Se ocksa kunskapsfel/ouppmarksamhet i andra vyer.',
  week_struggle: 'Skill med tydligast kunskapsfel i veckans underlag.',
  week_answer_length: 'Medel antal tecken i elevsvar denna vecka.',
  success_rate: 'Andel ratt av total antal forsok.',
  reasonable_rate: 'Andel svar inom rimlighetstolerans for respektive uppgift.',
  avg_relative_error: 'Genomsnittlig relativ avvikelse pa kunskapsfel.',
  trend: 'Skillnad i traff mellan senaste 10 och foregaende 10 svar.'
}

const DETAIL_LEVEL_ERROR_HELP = {
  operation: 'Raknesatt som nivan tillhor.',
  level: 'Konceptuell niva (1-12) inom raknesattet.',
  attempts: `Antal forsok pa nivan. Minst ${DETAIL_LEVEL_ERROR_MIN_ATTEMPTS} kravs for visning.`,
  correct: 'Antal korrekta svar pa nivan.',
  wrong: 'Antal felaktiga svar pa nivan.',
  error_share: 'Felandel = Fel/Forsok pa nivan. Jamfor inom samma raknesatt + niva.',
  knowledge_wrong: 'Fel som klassats som kunskapsfel.',
  inattention_wrong: 'Fel som klassats som ouppmarksamhet.'
}

const SUPPORT_HEADER_HELP = {
  status: 'Aktivitetsstatus: gron/orange/svart/rod utifran fokus och senaste interaktion.',
  risk: 'Riskniva byggs av regelbaserade signaler som inaktivitet, lag traff och liknande.',
  support_score: 'Stodscore (0-100) sammanvager risksignaler for prioritering av insats.',
  today_wrong: 'Ratt/fel idag. Tolka tillsammans med mangd och feltyp.',
  week_success: 'Andel ratt under veckan.',
  struggle: 'Skill dar eleven visar tydligast kunskapskamp i aktuellt underlag.',
  flags: 'Korta riskkoder som forklarar varfor eleven prioriteras.'
}

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
  const [ticketTemplates, setTicketTemplates] = useState([])
  const [ticketDispatches, setTicketDispatches] = useState([])
  const [ticketQuestionInput, setTicketQuestionInput] = useState('')
  const [ticketAnswerInput, setTicketAnswerInput] = useState('')
  const [ticketTagsInput, setTicketTagsInput] = useState('')
  const [ticketKindInput, setTicketKindInput] = useState('start')
  const [ticketCsvInput, setTicketCsvInput] = useState('')
  const [ticketTemplateFilter, setTicketTemplateFilter] = useState('')
  const [ticketTagFilter, setTicketTagFilter] = useState('')
  const [ticketSortBy, setTicketSortBy] = useState('newest')
  const [ticketDispatchImmediateFeedback, setTicketDispatchImmediateFeedback] = useState(true)
  const [selectedTicketDispatchId, setSelectedTicketDispatchId] = useState('')
  const [copiedTicketDispatchId, setCopiedTicketDispatchId] = useState('')
  const [ticketTargetClassIds, setTicketTargetClassIds] = useState([])
  const [ticketTargetStudentIds, setTicketTargetStudentIds] = useState([])
  const [ticketStudentSearch, setTicketStudentSearch] = useState('')
  const [ticketSectionOpen, setTicketSectionOpen] = useState(false)
  const [ticketHistoryStudentId, setTicketHistoryStudentId] = useState('')
  const [ticketHistoryKindFilter, setTicketHistoryKindFilter] = useState('all')
  const [ticketHistoryResultFilter, setTicketHistoryResultFilter] = useState('all')
  const [ticketHistorySearch, setTicketHistorySearch] = useState('')
  const [tableSelectedStudentIds, setTableSelectedStudentIds] = useState([])
  const [tableStudentSearch, setTableStudentSearch] = useState('')
  const [stickySortBy, setStickySortBy] = useState('name')
  const [stickySortDir, setStickySortDir] = useState('asc')
  const [supportSortBy, setSupportSortBy] = useState('support_score')
  const [supportSortDir, setSupportSortDir] = useState('desc')
  const [detailStudentId, setDetailStudentId] = useState('')
  const [detailLevelErrorSortBy, setDetailLevelErrorSortBy] = useState('error_share')
  const [detailLevelErrorSortDir, setDetailLevelErrorSortDir] = useState('desc')
  const [classOverviewSortBy, setClassOverviewSortBy] = useState('name')
  const [classOverviewSortDir, setClassOverviewSortDir] = useState('asc')
  const [passwordResetSearch, setPasswordResetSearch] = useState('')
  const [passwordResetStatus, setPasswordResetStatus] = useState('')
  const [passwordResetBusyId, setPasswordResetBusyId] = useState('')
  const navigate = useNavigate()
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
  }, [])

  useEffect(() => {
    void loadStudents()
    const initialClasses = getClasses()
    setClasses(initialClasses)
    if (initialClasses.length > 0) {
      setAddToClassId(initialClasses[0].id)
    }
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    const initialTemplates = getTicketTemplates()
    const initialDispatches = getTicketDispatches()
    setTicketTemplates(initialTemplates)
    setTicketDispatches(initialDispatches)
    if (initialDispatches.length > 0) {
      setSelectedTicketDispatchId(initialDispatches[0].id)
    }
  }, [loadStudents])

  useEffect(() => {
    if (ticketDispatches.length === 0) {
      setSelectedTicketDispatchId('')
      return
    }
    if (!selectedTicketDispatchId || !ticketDispatches.some(item => item.id === selectedTicketDispatchId)) {
      setSelectedTicketDispatchId(ticketDispatches[0].id)
    }
  }, [ticketDispatches, selectedTicketDispatchId])

  useEffect(() => {
    if (classFilterOptions.length === 0) {
      setTicketTargetClassIds([])
      return
    }
    const valid = new Set(classFilterOptions.map(item => item.id))
    setTicketTargetClassIds(prev => prev.filter(id => valid.has(id)))
  }, [classFilterOptions])

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
      setTicketTargetStudentIds([])
      return
    }
    const valid = new Set(students.map(item => item.studentId))
    setTicketTargetStudentIds(prev => prev.filter(id => valid.has(id)))
  }, [students])

  useEffect(() => {
    if (students.length === 0) {
      if (tableSelectedStudentIds.length > 0) setTableSelectedStudentIds([])
      return
    }
    const valid = new Set(students.map(item => item.studentId))
    setTableSelectedStudentIds(prev => prev.filter(id => valid.has(id)))
  }, [students, tableSelectedStudentIds.length])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadStudents()
    }, 15000)
    return () => window.clearInterval(timer)
  }, [loadStudents])

  const handleRefresh = () => {
    void loadStudents()
    const refreshedClasses = getClasses()
    setClasses(refreshedClasses)
    if (!addToClassId && refreshedClasses.length > 0) {
      setAddToClassId(refreshedClasses[0].id)
    }
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setTicketTemplates(getTicketTemplates())
    setTicketDispatches(getTicketDispatches())
    setDashboardStatus('Uppdaterat.')
  }

  const handleLogout = () => {
    logoutTeacher()
    navigate('/teacher-login')
  }

  const handleJumpToPasswordReset = () => {
    if (typeof document === 'undefined') return
    const section = document.getElementById(PASSWORD_RESET_SECTION_ID)
    if (section && typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const activeAssignment = useMemo(
    () => assignments.find(item => item.id === activeAssignmentId) || null,
    [assignments, activeAssignmentId]
  )
  const classNameById = useMemo(
    () => new Map(classFilterOptions.map(item => [item.id, item.name])),
    [classFilterOptions]
  )

  const filteredStudents = selectedClassIds.length > 0
    ? students.filter(student => recordMatchesClassFilter(student, selectedClassIds))
    : students
  useEffect(() => {
    if (filteredStudents.length === 0) {
      if (detailStudentId !== '') setDetailStudentId('')
      return
    }
    if (!detailStudentId || !filteredStudents.some(item => item.studentId === detailStudentId)) {
      setDetailStudentId(filteredStudents[0].studentId)
    }
  }, [filteredStudents, detailStudentId])

  const detailStudentOptions = useMemo(
    () => filteredStudents
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
    [filteredStudents, classNameById]
  )
  const detailStudentProfile = useMemo(
    () => filteredStudents.find(item => item.studentId === detailStudentId) || null,
    [filteredStudents, detailStudentId]
  )

  const classStats = {
    totalStudents: filteredStudents.length,
    activeToday: filteredStudents.filter(s => {
      const last = s.recentProblems[s.recentProblems.length - 1]?.timestamp
      if (!last) return false
      const today = new Date().setHours(0, 0, 0, 0)
      return last > today
    }).length,
    avgSuccessRate: filteredStudents.length > 0
      ? filteredStudents.reduce((sum, s) => sum + (s.stats.overallSuccessRate || 0), 0) / filteredStudents.length
      : 0,
    totalProblems: filteredStudents.reduce((sum, s) => sum + (s.stats.totalProblems || 0), 0)
  }

  const weekGoal = activeAssignment?.targetCount || DEFAULT_WEEKLY_GOAL

  const allRows = useMemo(
    () => students.map(student => buildStudentRow(student, activeAssignment, classNameById)),
    [students, activeAssignment, classNameById]
  )
  const filteredRows = selectedClassIds.length > 0
    ? allRows.filter(row => recordMatchesClassFilter(row, selectedClassIds))
    : allRows
  const tableRows = getSortedRows(filteredRows, sortBy, sortDir)
  const detailStudentRow = useMemo(
    () => filteredRows.find(row => row.studentId === detailStudentId) || null,
    [filteredRows, detailStudentId]
  )
  const detailStudentViewData = useMemo(
    () => buildTeacherStudentViewData(detailStudentProfile),
    [detailStudentProfile]
  )
  const detailLevelErrorRows = useMemo(() => {
    const source = Array.isArray(detailStudentViewData?.levelErrorRows)
      ? detailStudentViewData.levelErrorRows
      : []
    const qualifiedRows = source.filter(item => Number(item?.attempts || 0) >= DETAIL_LEVEL_ERROR_MIN_ATTEMPTS)
    return getSortedDetailLevelErrorRows(qualifiedRows, detailLevelErrorSortBy, detailLevelErrorSortDir)
  }, [detailStudentViewData, detailLevelErrorSortBy, detailLevelErrorSortDir])
  const detailLevelErrorUnderSampleCount = useMemo(() => {
    const source = Array.isArray(detailStudentViewData?.levelErrorRows)
      ? detailStudentViewData.levelErrorRows
      : []
    return source.filter(item => Number(item?.attempts || 0) > 0 && Number(item?.attempts || 0) < DETAIL_LEVEL_ERROR_MIN_ATTEMPTS).length
  }, [detailStudentViewData])
  const passwordResetRows = useMemo(() => {
    const search = passwordResetSearch.trim().toLowerCase()
    const rows = filteredStudents
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        className: getRecordClassLabel(student, classNameById),
        lastLoginAt: Number(student?.auth?.lastLoginAt || 0) || null
      }))
      .filter(row => {
        if (!search) return true
        return `${row.name} ${row.studentId} ${row.className}`.toLowerCase().includes(search)
      })

    rows.sort((a, b) => compareClassNameAndName(a, b))
    return rows
  }, [filteredStudents, classNameById, passwordResetSearch])
  const visibleRows = tableRows
  const supportCandidateRows = useMemo(
    () => tableRows.filter(row => row.supportScore >= SUPPORT_THRESHOLD || row.riskLevel === 'high'),
    [tableRows]
  )
  const supportRows = useMemo(
    () => getSortedSupportRows(supportCandidateRows, supportSortBy, supportSortDir).slice(0, 10),
    [supportCandidateRows, supportSortBy, supportSortDir]
  )
  const inactivityBuckets = buildInactivityBuckets(tableRows)
  const classSummaries = buildClassSummaries(classes, students, selectedClassIds, weekGoal)
  const classOverviewRows = useMemo(
    () => getSortedClassOverviewRows(filteredRows, classOverviewSortBy, classOverviewSortDir),
    [filteredRows, classOverviewSortBy, classOverviewSortDir]
  )
  const classOverviewMeta = useMemo(() => {
    const selectedClassNames = selectedClassIds
      .map(classId => String(classNameById.get(classId) || '').trim())
      .filter(Boolean)
    const activeNowCount = classOverviewRows.filter(row => row.activeNow).length
    return {
      className: selectedClassNames.length > 0 ? selectedClassNames.join(', ') : 'Alla klasser',
      studentCount: classOverviewRows.length,
      activeNowCount
    }
  }, [selectedClassIds, classNameById, classOverviewRows])

  const handleClassOverviewSort = (nextSortBy) => {
    if (classOverviewSortBy === nextSortBy) {
      setClassOverviewSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setClassOverviewSortBy(nextSortBy)
    setClassOverviewSortDir(getDefaultClassOverviewSortDir(nextSortBy))
  }

  const getClassOverviewSortIndicator = (sortKey) => {
    if (classOverviewSortBy !== sortKey) return '↕'
    return classOverviewSortDir === 'asc' ? '▲' : '▼'
  }

  const handleResultSort = (nextSortBy) => {
    if (sortBy === nextSortBy) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(nextSortBy)
    setSortDir(getDefaultResultSortDir(nextSortBy))
  }

  const getResultSortIndicator = (sortKey) => {
    if (sortBy !== sortKey) return '↕'
    return sortDir === 'asc' ? '▲' : '▼'
  }

  const handleStickySort = (nextSortBy) => {
    if (stickySortBy === nextSortBy) {
      setStickySortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setStickySortBy(nextSortBy)
    setStickySortDir(getDefaultStickySortDir(nextSortBy))
  }

  const getStickySortIndicator = (sortKey) => {
    if (stickySortBy !== sortKey) return '↕'
    return stickySortDir === 'asc' ? '▲' : '▼'
  }

  const handleSupportSort = (nextSortBy) => {
    if (supportSortBy === nextSortBy) {
      setSupportSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSupportSortBy(nextSortBy)
    setSupportSortDir(getDefaultSupportSortDir(nextSortBy))
  }

  const getSupportSortIndicator = (sortKey) => {
    if (supportSortBy !== sortKey) return '↕'
    return supportSortDir === 'asc' ? '▲' : '▼'
  }

  const handleDetailLevelErrorSort = (nextSortBy) => {
    if (detailLevelErrorSortBy === nextSortBy) {
      setDetailLevelErrorSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setDetailLevelErrorSortBy(nextSortBy)
    setDetailLevelErrorSortDir(getDefaultDetailLevelErrorSortDir(nextSortBy))
  }

  const getDetailLevelErrorSortIndicator = (sortKey) => {
    if (detailLevelErrorSortBy !== sortKey) return '↕'
    return detailLevelErrorSortDir === 'asc' ? '▲' : '▼'
  }

  const renderDetailLevelErrorSortHeader = (label, sortKey, options = {}) => {
    const {
      className = 'py-1 pr-2',
      helpText = ''
    } = options
    return (
      <th className={className}>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleDetailLevelErrorSort(sortKey)}
            className="inline-flex items-center gap-1 hover:text-gray-700"
          >
            {label}
            <span className="text-[10px] text-gray-400">{getDetailLevelErrorSortIndicator(sortKey)}</span>
          </button>
          {helpText ? <InlineHelp text={helpText} /> : null}
        </div>
      </th>
    )
  }

  const renderResultSortHeader = (label, sortKey, options = {}) => {
    const {
      className = 'px-4 py-0 font-semibold',
      helpText = ''
    } = options
    return (
      <th className={className}>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleResultSort(sortKey)}
            className="inline-flex items-center gap-1 hover:text-gray-700"
          >
            {label}
            <span className="text-[10px] text-gray-400">{getResultSortIndicator(sortKey)}</span>
          </button>
          {helpText ? <InlineHelp text={helpText} /> : null}
        </div>
      </th>
    )
  }

  const tableStudentSet = useMemo(
    () => new Set(tableSelectedStudentIds),
    [tableSelectedStudentIds]
  )
  const tableScopedStudents = useMemo(() => {
    if (tableStudentSet.size === 0) return filteredStudents
    return filteredStudents.filter(student => tableStudentSet.has(student.studentId))
  }, [filteredStudents, tableStudentSet])
  const tableStudentOptions = useMemo(
    () => filteredStudents
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        className: getRecordClassLabel(student, classNameById)
      }))
      .sort((a, b) => {
        const classCompare = String(a.className).localeCompare(String(b.className), 'sv')
        if (classCompare !== 0) return classCompare
        return String(a.name).localeCompare(String(b.name), 'sv')
      }),
    [filteredStudents, classNameById]
  )
  const filteredTableStudentOptions = useMemo(() => {
    const search = tableStudentSearch.trim().toLowerCase()
    if (!search) return tableStudentOptions
    return tableStudentOptions.filter(item => (
      `${item.name} ${item.studentId} ${item.className}`.toLowerCase().includes(search)
    ))
  }, [tableStudentOptions, tableStudentSearch])
  useEffect(() => {
    const valid = new Set(tableStudentOptions.map(item => item.studentId))
    setTableSelectedStudentIds(prev => {
      const next = prev.filter(id => valid.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [tableStudentOptions])
  const tableDevelopmentOverview = useMemo(
    () => buildTableDevelopmentOverview(tableScopedStudents),
    [tableScopedStudents]
  )
  const tableStickyStatusRows = useMemo(
    () => getSortedTableStickyRows(
      tableScopedStudents
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        className: getRecordClassLabel(student, classNameById),
        ...buildStickyTableStatusForStudent(student)
      })),
      stickySortBy,
      stickySortDir
    ),
    [tableScopedStudents, classNameById, stickySortBy, stickySortDir]
  )
  const dataQualitySummary = useMemo(
    () => buildDataQualitySummary(filteredRows),
    [filteredRows]
  )
  const usageInsights = useMemo(
    () => buildUsageInsights(filteredRows, filteredStudents),
    [filteredRows, filteredStudents]
  )
  const ticketTagOptions = useMemo(() => {
    const tags = new Set()
    for (const item of ticketTemplates) {
      for (const tag of Array.isArray(item.tags) ? item.tags : []) {
        if (tag) tags.add(tag)
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b, 'sv'))
  }, [ticketTemplates])
  const ticketTemplateRows = useMemo(() => {
    const search = ticketTemplateFilter.trim().toLowerCase()
    const rows = ticketTemplates.filter(item => {
      if (ticketTagFilter && !(Array.isArray(item.tags) && item.tags.includes(ticketTagFilter))) return false
      if (!search) return true
      const hay = `${item.question} ${item.answer} ${(item.tags || []).join(' ')}`.toLowerCase()
      return hay.includes(search)
    })
    if (ticketSortBy === 'oldest') {
      rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    } else if (ticketSortBy === 'alpha') {
      rows.sort((a, b) => String(a.question || '').localeCompare(String(b.question || ''), 'sv'))
    } else {
      rows.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    }
    return rows
  }, [ticketTemplates, ticketTemplateFilter, ticketTagFilter, ticketSortBy])
  const ticketSelectedDispatch = useMemo(
    () => ticketDispatches.find(item => item.id === selectedTicketDispatchId) || null,
    [ticketDispatches, selectedTicketDispatchId]
  )
  const ticketResponseRows = useMemo(() => {
    if (!ticketSelectedDispatch) return []
    const targetIds = new Set(
      Array.isArray(ticketSelectedDispatch.targetStudentIds)
        ? ticketSelectedDispatch.targetStudentIds
        : []
    )
    const rows = filteredStudents.flatMap(student => {
      const response = getTicketResponseForDispatch(student, ticketSelectedDispatch.id)
      const included = targetIds.has(student.studentId) || Boolean(response)
      if (!included) return []
      return {
        studentId: student.studentId,
        name: student.name,
        className: getRecordClassLabel(student, classNameById),
        answered: Boolean(response),
        isCorrect: response?.isCorrect === true,
        studentAnswer: response?.studentAnswer || '',
        answeredAt: response?.answeredAt || null
      }
    })
    rows.sort((a, b) => {
      if (a.answered !== b.answered) return a.answered ? -1 : 1
      if (a.isCorrect !== b.isCorrect) return a.isCorrect ? -1 : 1
      return a.name.localeCompare(b.name, 'sv')
    })
    return rows
  }, [ticketSelectedDispatch, filteredStudents, classNameById])
  const ticketResponseMeta = useMemo(() => {
    const answered = ticketResponseRows.filter(item => item.answered).length
    const correct = ticketResponseRows.filter(item => item.answered && item.isCorrect).length
    const wrong = ticketResponseRows.filter(item => item.answered && !item.isCorrect).length
    return {
      answered,
      correct,
      wrong,
      total: ticketResponseRows.length
    }
  }, [ticketResponseRows])
  const ticketTargetClassSet = useMemo(() => new Set(ticketTargetClassIds), [ticketTargetClassIds])
  const ticketTargetStudentSet = useMemo(() => new Set(ticketTargetStudentIds), [ticketTargetStudentIds])
  const ticketStudentOptions = useMemo(
    () => students
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        classIds: getRecordClassIds(student),
        className: getRecordClassLabel(student, classNameById)
      }))
      .sort((a, b) => {
        const classCompare = String(a.className).localeCompare(String(b.className), 'sv')
        if (classCompare !== 0) return classCompare
        return String(a.name).localeCompare(String(b.name), 'sv')
      }),
    [students, classNameById]
  )
  const ticketFilteredStudentOptions = useMemo(() => {
    const search = ticketStudentSearch.trim().toLowerCase()
    if (!search) return ticketStudentOptions
    return ticketStudentOptions.filter(item => (
      `${item.name} ${item.studentId} ${item.className}`.toLowerCase().includes(search)
    ))
  }, [ticketStudentOptions, ticketStudentSearch])
  const ticketResolvedTargetStudentIds = useMemo(() => {
    const ids = new Set()

    if (ticketTargetClassIds.length === 0 && ticketTargetStudentIds.length === 0) {
      for (const item of filteredStudents) ids.add(item.studentId)
      return ids
    }

    if (ticketTargetClassIds.length > 0) {
      for (const student of students) {
        if (recordMatchesClassFilter(student, ticketTargetClassIds)) {
          ids.add(student.studentId)
        }
      }
    }

    for (const studentId of ticketTargetStudentIds) {
      ids.add(studentId)
    }

    return ids
  }, [ticketTargetClassIds, ticketTargetStudentIds, filteredStudents, students])
  const ticketHasExplicitTargets = ticketTargetClassIds.length > 0 || ticketTargetStudentIds.length > 0
  const ticketDispatchMap = useMemo(() => {
    const map = new Map()
    for (const dispatch of ticketDispatches) {
      map.set(dispatch.id, dispatch)
    }
    return map
  }, [ticketDispatches])
  const ticketHistoryStudentOptions = useMemo(
    () => filteredStudents
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        className: getRecordClassLabel(student, classNameById)
      }))
      .sort((a, b) => {
        const classCompare = String(a.className).localeCompare(String(b.className), 'sv')
        if (classCompare !== 0) return classCompare
        return String(a.name).localeCompare(String(b.name), 'sv')
      }),
    [filteredStudents, classNameById]
  )
  const ticketHistoryStudent = useMemo(
    () => students.find(item => item.studentId === ticketHistoryStudentId) || null,
    [students, ticketHistoryStudentId]
  )
  useEffect(() => {
    if (ticketHistoryStudentOptions.length === 0) {
      if (ticketHistoryStudentId !== '') setTicketHistoryStudentId('')
      return
    }
    if (!ticketHistoryStudentId || !ticketHistoryStudentOptions.some(item => item.studentId === ticketHistoryStudentId)) {
      setTicketHistoryStudentId(ticketHistoryStudentOptions[0].studentId)
    }
  }, [ticketHistoryStudentOptions, ticketHistoryStudentId])
  const ticketHistorySummary = useMemo(() => {
    const empty = {
      total: 0,
      correct: 0,
      wrong: 0,
      last7Days: 0,
      last30Days: 0,
      uniqueDispatches: 0,
      accuracy: 0,
      latestAnsweredAt: null
    }
    if (!ticketHistoryStudent) return empty

    const responses = Array.isArray(ticketHistoryStudent.ticketResponses) ? ticketHistoryStudent.ticketResponses : []
    if (responses.length === 0) return empty

    const now = Date.now()
    let correct = 0
    let last7Days = 0
    let last30Days = 0
    let latestAnsweredAt = 0
    const uniqueDispatches = new Set()

    for (const response of responses) {
      if (response?.isCorrect === true) correct += 1
      const answeredAt = Number(response?.answeredAt || 0)
      if (answeredAt > 0) {
        if (answeredAt >= now - (7 * DAY_MS)) last7Days += 1
        if (answeredAt >= now - (30 * DAY_MS)) last30Days += 1
        if (answeredAt > latestAnsweredAt) latestAnsweredAt = answeredAt
      }
      if (response?.dispatchId) uniqueDispatches.add(response.dispatchId)
    }

    const total = responses.length
    const wrong = total - correct
    return {
      total,
      correct,
      wrong,
      last7Days,
      last30Days,
      uniqueDispatches: uniqueDispatches.size,
      accuracy: total > 0 ? (correct / total) : 0,
      latestAnsweredAt: latestAnsweredAt > 0 ? latestAnsweredAt : null
    }
  }, [ticketHistoryStudent])
  const ticketHistoryRows = useMemo(() => {
    if (!ticketHistoryStudent) return []

    const search = ticketHistorySearch.trim().toLowerCase()
    const responses = Array.isArray(ticketHistoryStudent.ticketResponses) ? ticketHistoryStudent.ticketResponses : []
    const rows = responses.map(response => {
      const dispatch = ticketDispatchMap.get(response?.dispatchId || '')
      const kind = response?.kind === 'exit'
        ? 'exit'
        : (response?.kind === 'start' ? 'start' : (dispatch?.kind === 'exit' ? 'exit' : 'start'))
      const title = String(
        response?.title
        || dispatch?.title
        || (kind === 'exit' ? 'Exit-ticket' : 'Start-ticket')
      )
      const question = String(response?.question || dispatch?.question || '')
      const expectedAnswer = String(response?.expectedAnswer || dispatch?.answer || '')
      const studentAnswer = String(response?.studentAnswer || '')
      const tags = Array.isArray(dispatch?.tags) ? dispatch.tags : []
      return {
        dispatchId: String(response?.dispatchId || ''),
        kind,
        title,
        question,
        expectedAnswer,
        studentAnswer,
        isCorrect: response?.isCorrect === true,
        answeredAt: Number(response?.answeredAt || 0) || null,
        tags
      }
    })

    const filtered = rows.filter(row => {
      if (ticketHistoryKindFilter !== 'all' && row.kind !== ticketHistoryKindFilter) return false
      if (ticketHistoryResultFilter === 'correct' && !row.isCorrect) return false
      if (ticketHistoryResultFilter === 'wrong' && row.isCorrect) return false
      if (!search) return true
      const hay = `${row.title} ${row.question} ${row.studentAnswer} ${row.expectedAnswer} ${row.tags.join(' ')}`.toLowerCase()
      return hay.includes(search)
    })

    filtered.sort((a, b) => (Number(b.answeredAt || 0) - Number(a.answeredAt || 0)))
    return filtered
  }, [
    ticketHistoryStudent,
    ticketHistorySearch,
    ticketHistoryKindFilter,
    ticketHistoryResultFilter,
    ticketDispatchMap
  ])

  const handleCreatePreset = (presetKey) => {
    const preset = getPresetConfig(presetKey)
    createAssignment(preset)
    setAssignments(getAssignments())
    setDashboardStatus(`Nytt uppdrag skapat: ${preset.title}`)
  }

  const handleCopyAssignmentLink = async (assignmentId) => {
    const link = buildAssignmentLink(assignmentId)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(assignmentId)
      window.setTimeout(() => setCopiedId(''), 1200)
      setDashboardStatus('Länk kopierad.')
    } catch {
      setDashboardStatus('Kunde inte kopiera länk just nu.')
    }
  }

  const handleActivateForAll = (assignmentId) => {
    setActiveAssignment(assignmentId)
    setActiveAssignmentId(assignmentId)
    setDashboardStatus(`Aktivt uppdrag ändrat till ${assignmentId}.`)
  }

  const handleClearActiveForAll = () => {
    clearActiveAssignment()
    setActiveAssignmentId('')
    setDashboardStatus('Aktivt uppdrag rensat.')
  }

  const handleDeleteAssignment = (assignmentId) => {
    deleteAssignment(assignmentId)
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setDashboardStatus(`Uppdrag ${assignmentId} borttaget.`)
  }

  const handleClearAllAssignments = () => {
    clearAllAssignments()
    setAssignments([])
    setActiveAssignmentId('')
    setDashboardStatus('Alla uppdrag rensade.')
  }

  const handleCreateTicketTemplate = () => {
    const created = createTicketTemplate({
      question: ticketQuestionInput,
      answer: ticketAnswerInput,
      tags: normalizeTags(ticketTagsInput),
      kind: ticketKindInput
    })
    if (!created) {
      setDashboardStatus('Ticket kräver både fråga och facit.')
      return
    }
    setTicketTemplates(getTicketTemplates())
    setTicketQuestionInput('')
    setTicketAnswerInput('')
    setTicketTagsInput('')
    setDashboardStatus('Ticket-fråga sparad.')
  }

  const handleImportTicketCsv = () => {
    const result = importTicketTemplatesFromCsv(ticketCsvInput, { kind: ticketKindInput })
    setTicketTemplates(getTicketTemplates())
    setDashboardStatus(`Ticket-import klar: ${result.imported} importerade, ${result.skipped} hoppade över.`)
    if (result.imported > 0) {
      setTicketCsvInput('')
    }
  }

  const handleDeleteTicketTemplate = (templateId) => {
    deleteTicketTemplate(templateId)
    setTicketTemplates(getTicketTemplates())
    setDashboardStatus('Ticket-fråga borttagen.')
  }

  const handleCreateTicketDispatch = (template) => {
    const dispatch = createTicketDispatch({
      ticketId: template.id,
      title: `${template.kind === 'exit' ? 'Exit' : 'Start'}-ticket: ${template.question.slice(0, 40)}`,
      question: template.question,
      answer: template.answer,
      tags: template.tags,
      kind: template.kind,
      showCorrectnessOnSubmit: ticketDispatchImmediateFeedback
    })
    if (!dispatch) {
      setDashboardStatus('Kunde inte skapa ticket-utskick.')
      return
    }
    const nextDispatches = getTicketDispatches()
    setTicketDispatches(nextDispatches)
    setSelectedTicketDispatchId(dispatch.id)
    setDashboardStatus('Ticket-länk skapad.')
  }

  const handleCopyTicketLink = async (dispatchId) => {
    const dispatch = ticketDispatches.find(item => item.id === dispatchId)
    if (!dispatch) return
    const link = buildTicketLink(dispatch)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedTicketDispatchId(dispatchId)
      window.setTimeout(() => setCopiedTicketDispatchId(''), 1200)
      setDashboardStatus('Ticket-länk kopierad.')
    } catch {
      setDashboardStatus('Kunde inte kopiera ticket-länk just nu.')
    }
  }

  const handleDeleteTicketDispatch = (dispatchId) => {
    deleteTicketDispatch(dispatchId)
    const next = getTicketDispatches()
    setTicketDispatches(next)
    if (selectedTicketDispatchId === dispatchId) {
      setSelectedTicketDispatchId(next[0]?.id || '')
    }
    setDashboardStatus('Ticket-utskick borttaget.')
  }

  const handleToggleTicketReveal = (dispatchId, reveal) => {
    const updated = setTicketDispatchReveal(dispatchId, reveal)
    if (!updated) return

    const nextStudents = students.map(student => {
      const next = { ...student }
      setTicketRevealAllForProfile(next, dispatchId, reveal)
      saveProfile(next)
      return next
    })
    setStudents(nextStudents)
    setTicketDispatches(getTicketDispatches())
    setDashboardStatus(reveal ? 'Facit visas nu för alla elever.' : 'Facit är dolt igen.')
  }

  const handleToggleTicketTargetClass = (classId) => {
    setTicketTargetClassIds(prev => (
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    ))
  }

  const handleToggleTicketTargetStudent = (studentId) => {
    setTicketTargetStudentIds(prev => (
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    ))
  }

  const handleTicketTargetsFromClassFilter = () => {
    setTicketTargetClassIds(selectedClassIds)
    setTicketTargetStudentIds([])
  }

  const handleClearTicketTargets = () => {
    setTicketTargetClassIds([])
    setTicketTargetStudentIds([])
  }

  const handlePublishTicketToHome = (dispatchId) => {
    const dispatch = ticketDispatches.find(item => item.id === dispatchId)
    if (!dispatch) return
    const now = Date.now()
    const payload = {
      dispatchId: dispatch.id,
      ticketId: dispatch.ticketId || '',
      title: dispatch.title || '',
      kind: dispatch.kind || 'start',
      question: dispatch.question || '',
      answer: dispatch.answer || '',
      showCorrectnessOnSubmit: dispatch.showCorrectnessOnSubmit !== false
    }
    const encoded = encodeTicketPayload(payload)
    const targetIds = new Set(ticketResolvedTargetStudentIds)
    if (targetIds.size === 0) {
      setDashboardStatus('Välj minst en klass eller elev att skicka ticket till.')
      return
    }
    recordTicketDispatchTargets(dispatch.id, Array.from(targetIds))

    const nextStudents = students.map(student => {
      if (!targetIds.has(student.studentId)) return student
      const next = { ...student }
      if (!next.ticketInbox || typeof next.ticketInbox !== 'object') {
        next.ticketInbox = {}
      }
      next.ticketInbox.activeDispatchId = dispatch.id
      next.ticketInbox.activePayload = payload
      next.ticketInbox.activeEncoded = encoded
      next.ticketInbox.publishedAt = now
      next.ticketInbox.updatedAt = now
      next.ticketInbox.clearedAt = 0
      saveProfile(next)
      return next
    })
    setStudents(nextStudents)
    setTicketDispatches(getTicketDispatches())
    setDashboardStatus(`Ticket publicerad till startsidan för ${targetIds.size} elev(er).`)
  }

  const handleClearTicketFromHome = (dispatchId) => {
    const now = Date.now()
    const targetIds = new Set(ticketResolvedTargetStudentIds)
    if (targetIds.size === 0) {
      setDashboardStatus('Välj minst en klass eller elev att rensa ticket från.')
      return
    }
    const nextStudents = students.map(student => {
      if (!targetIds.has(student.studentId)) return student
      if (!student.ticketInbox || student.ticketInbox.activeDispatchId !== dispatchId) return student
      const next = { ...student }
      next.ticketInbox = {
        ...next.ticketInbox,
        activeDispatchId: '',
        activePayload: null,
        activeEncoded: '',
        updatedAt: now,
        clearedAt: now
      }
      saveProfile(next)
      return next
    })
    setStudents(nextStudents)
    setDashboardStatus('Ticket borttagen från startsidan för valt urval.')
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
    setTicketTargetClassIds(prev => prev.filter(id => id !== classId))
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
    setDetailStudentId(studentId)
    if (typeof document === 'undefined') return
    window.setTimeout(() => {
      const section = document.getElementById('teacher-student-detail-section')
      if (section && typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 40)
  }

  const handleCreateQuickAssignment = async (row, variant) => {
    const preset = buildQuickAssignmentPreset(row, variant)
    const assignment = createAssignment(preset)
    setAssignments(getAssignments())
    setActiveAssignment(assignment.id)
    setActiveAssignmentId(assignment.id)

    const link = buildAssignmentLink(assignment.id)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(assignment.id)
      window.setTimeout(() => setCopiedId(''), 1200)
      setDashboardStatus(`Nytt uppdrag skapat och aktiverat: ${assignment.title}. Länk kopierad.`)
    } catch {
      setDashboardStatus(`Nytt uppdrag skapat och aktiverat: ${assignment.title}.`)
    }
  }

  const handleExportSnapshotCsv = () => {
    const csvRows = buildSnapshotCsvRows(visibleRows, viewMode, weekGoal)
    if (csvRows.length === 0) {
      setDashboardStatus('Inget att exportera i aktuell vy.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(csv, `elevoversikt_${viewMode}_${stamp}.csv`, 'text/csv;charset=utf-8;')
    setDashboardStatus(`CSV export klar (${csvRows.length} rader).`)
  }

  const handleExportDetailedProblemCsv = () => {
    const snapshot = buildAnalyticsSnapshot(filteredStudents)
    const csvRows = buildDetailedProblemExportRows(snapshot)
    if (csvRows.length === 0) {
      setDashboardStatus('Ingen rå problemdata att exportera.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(csv, `problemdata_detalj_${stamp}.csv`, 'text/csv;charset=utf-8;')
    setDashboardStatus(`Detalj-CSV klar (${csvRows.length} rader).`)
  }

  const handleExportSkillComparisonCsv = () => {
    const snapshot = buildAnalyticsSnapshot(filteredStudents)
    const csvRows = buildSkillComparisonExportRows(snapshot)
    if (csvRows.length === 0) {
      setDashboardStatus('Ingen skill-jämförelsedata att exportera.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(csv, `skill_jamforelse_${stamp}.csv`, 'text/csv;charset=utf-8;')
    setDashboardStatus(`Skill-CSV klar (${csvRows.length} rader).`)
  }

  const handleExportTableDevelopmentCsv = () => {
    const snapshot = buildAnalyticsSnapshot(filteredStudents)
    const csvRows = buildTableDevelopmentExportRows(snapshot)
    if (csvRows.length === 0) {
      setDashboardStatus('Ingen tabellutvecklingsdata att exportera.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(csv, `tabellutveckling_${stamp}.csv`, 'text/csv;charset=utf-8;')
    setDashboardStatus(`Tabell-CSV klar (${csvRows.length} rader).`)
  }

  const handleExportActivityCsv = () => {
    const csvRows = buildActivityExportRows(filteredRows)
    if (csvRows.length === 0) {
      setDashboardStatus('Ingen aktivitetsdata att exportera.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(csv, `aktivitet_telemetri_${stamp}.csv`, 'text/csv;charset=utf-8;')
    setDashboardStatus(`Aktivitets-CSV klar (${csvRows.length} rader).`)
  }

  const handleExportStudentDetailCsv = () => {
    if (!detailStudentProfile || !detailStudentRow || !detailStudentViewData) {
      setDashboardStatus('Välj en elev i elevvyn först.')
      return
    }

    const csvRows = buildStudentDetailExportRows(detailStudentProfile, detailStudentRow, detailStudentViewData)
    if (csvRows.length === 0) {
      setDashboardStatus('Ingen elevdata att exportera.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const safeId = String(detailStudentProfile.studentId || 'elev').replace(/[^a-zA-Z0-9_-]+/g, '_')
    downloadTextFile(csv, `elevvy_${safeId}_${stamp}.csv`, 'text/csv;charset=utf-8;')
    setDashboardStatus(`Elevvy-CSV klar (${csvRows.length} rader).`)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Elevöversikt</h1>
            <p className="text-gray-600">Matteträning - Dashboard</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleJumpToPasswordReset}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
            >
              Lösenord (längst ner)
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white hover:bg-gray-50 border rounded-lg text-gray-600"
            >
              Uppdatera
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Tillbaka
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg"
            >
              Logga ut
            </button>
          </div>
        </div>

        <div className="mb-4 min-h-6 text-sm text-gray-600">{dashboardStatus || ' '}</div>

        <div className="flex flex-col">
        <div className="bg-white rounded-lg shadow p-4 mb-6" style={{ order: -70 }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-semibold text-gray-800">Urval: klass/grupp</h2>
            <p className="text-xs text-gray-500">
              {selectedClassIds.length === 0
                ? `Alla klasser/grupper (${students.length} elever)`
                : `${selectedClassIds.length} klass/grupp(er) valda (${filteredStudents.length} elever)`}
            </p>
          </div>
          <p className="text-[11px] text-gray-500 mb-2">
            Valda klasser/grupper sparas som förval till nästa gång.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearClassFilter}
              className={`px-2 py-1 rounded text-xs ${
                selectedClassIds.length === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alla klasser
            </button>
            {classFilterOptions.length === 0 && (
              <span className="text-xs text-gray-400">
                Inga klass-/grupptaggar hittades ännu.
              </span>
            )}
            {classFilterOptions.map(item => (
              <button
                type="button"
                key={`top-filter-${item.id}`}
                onClick={() => handleToggleClassFilter(item.id)}
                className={`px-2 py-1 rounded text-xs ${
                  selectedClassIds.includes(item.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Antal elever</p>
            <p className="text-3xl font-bold text-gray-800">{classStats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Aktiva idag</p>
            <p className="text-3xl font-bold text-green-600">{classStats.activeToday}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Genomsnitt success</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(classStats.avgSuccessRate * 100)}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Totalt problem</p>
            <p className="text-3xl font-bold text-purple-600">{classStats.totalProblems}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Datakvalitet</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                dataQualitySummary.overallQuality >= 0.8
                  ? 'bg-green-100 text-green-700'
                  : dataQualitySummary.overallQuality >= 0.6
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {Math.round(dataQualitySummary.overallQuality * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 text-xs">Telemetry täckning</p>
                <p className="font-semibold text-gray-800">
                  {dataQualitySummary.withTelemetry}/{dataQualitySummary.totalStudents}
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 text-xs">Närvarosignal idag</p>
                <p className="font-semibold text-gray-800">
                  {dataQualitySummary.withPresenceToday}/{dataQualitySummary.totalStudents}
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 text-xs">Session-gap idag</p>
                <p className="font-semibold text-gray-800">{dataQualitySummary.sessionGapStudents}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-gray-500 text-xs">Datamismatch idag</p>
                <p className="font-semibold text-gray-800">{dataQualitySummary.answerMismatchStudents}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Behöver extra koll: {dataQualitySummary.needsFollowUpNames.length > 0
                ? dataQualitySummary.needsFollowUpNames.join(', ')
                : 'Ingen just nu'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Insikter från användning (7d)</h2>
              <span className="text-xs text-gray-500">För förbättring av appen</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-blue-700 text-xs">Tid på uppgift / aktiv elev</p>
                <p className="font-semibold text-blue-800">{formatDuration(usageInsights.avgEngagedSecondsPerActiveStudent)}</p>
              </div>
              <div className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p className="text-indigo-700 text-xs">Median sessionslängd</p>
                <p className="font-semibold text-indigo-800">{formatDuration(usageInsights.medianSessionDurationSeconds)}</p>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-amber-700 text-xs">Pausacceptans</p>
                <p className="font-semibold text-amber-800">{toPercent(usageInsights.breakTakeRate)}</p>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-emerald-700 text-xs">Ticket träffsäkerhet (idag)</p>
                <p className="font-semibold text-emerald-800">{toPercent(usageInsights.ticketAccuracyToday)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Vanligaste träningsstart: {usageInsights.topLaunchModes.length > 0
                ? usageInsights.topLaunchModes.map(item => `${item.label} (${item.count})`).join(', ')
                : 'Ingen data ännu'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Vanligaste felkategori: {usageInsights.topErrorCategories.length > 0
                ? usageInsights.topErrorCategories.map(item => `${item.label} (${item.count})`).join(', ')
                : 'Ingen data ännu'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8" style={{ order: -60 }}>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Uppdrag via länk</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleCreatePreset('addition')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Nytt: Bara addition
            </button>
            <button
              onClick={() => handleCreatePreset('multiplication')}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
            >
              Nytt: Bara multiplikation
            </button>
            <button
              onClick={() => handleCreatePreset('subtraction')}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              Nytt: Bara subtraktion
            </button>
            <button
              onClick={() => handleCreatePreset('division')}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
            >
              Nytt: Bara division
            </button>
            <button
              onClick={() => handleCreatePreset('mixed')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
            >
              Nytt: Kombination
            </button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500">Inga uppdrag skapade ännu.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <p className="text-xs text-gray-500">
                  Aktivt för alla: {activeAssignmentId ? activeAssignmentId : 'Ingen (fri träning)'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearActiveForAll}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs"
                  >
                    Rensa aktivt
                  </button>
                  <button
                    onClick={handleClearAllAssignments}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                  >
                    Rensa alla
                  </button>
                </div>
              </div>
              {assignments.slice(0, 10).map(assignment => (
                <div
                  key={assignment.id}
                  className={`flex flex-wrap items-center justify-between gap-2 border rounded p-2 ${
                    activeAssignmentId === assignment.id ? 'border-green-400 bg-green-50' : ''
                  }`}
                >
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">{assignment.title}</p>
                    <p className="text-gray-500">
                      {assignment.problemTypes.join(', ')} | Nivå {assignment.minLevel}-{assignment.maxLevel}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{assignment.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleActivateForAll(assignment.id)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                    >
                      Aktivera för alla
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                    >
                      Ta bort
                    </button>
                    <button
                      onClick={() => handleCopyAssignmentLink(assignment.id)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white rounded text-xs"
                    >
                      {copiedId === assignment.id ? 'Kopierad' : 'Kopiera länk'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/90 rounded-2xl shadow-[0_16px_42px_-26px_rgba(146,64,14,0.55)] p-4 md:p-5 mb-8" style={{ order: -50 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
          <button
            onClick={() => setTicketSectionOpen(prev => !prev)}
            className="w-full flex items-center justify-between text-left mb-4 pt-1"
          >
            <div>
              <h2 className="text-xl font-extrabold text-amber-900">Ticket</h2>
              <span className="text-xs text-amber-800 font-medium">Start-ticket / Exit-ticket</span>
            </div>
            <span className="px-3 py-1.5 rounded-full border border-amber-300 bg-white text-xs font-semibold text-amber-900 shadow-sm">
              {ticketSectionOpen ? 'Dölj' : 'Visa'}
            </span>
          </button>

          {!ticketSectionOpen ? (
            <p className="text-xs text-amber-800 bg-amber-100/70 border border-amber-200 rounded-lg px-3 py-2 inline-block">Ticket-sektionen är minimerad.</p>
          ) : (
            <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 shadow-sm">
              <h3 className="text-base font-bold text-gray-800 mb-2">Ny ticket-fråga</h3>
              <textarea
                value={ticketQuestionInput}
                onChange={(e) => setTicketQuestionInput(e.target.value)}
                placeholder="Fråga"
                className="w-full min-h-20 px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm mb-2 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              />
              <input
                value={ticketAnswerInput}
                onChange={(e) => setTicketAnswerInput(e.target.value)}
                placeholder="Facit / rätt svar"
                className="w-full px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm mb-2 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={ticketTagsInput}
                  onChange={(e) => setTicketTagsInput(e.target.value)}
                  placeholder="Taggar, kommaseparerat"
                  className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                />
                <select
                  value={ticketKindInput}
                  onChange={(e) => setTicketKindInput(e.target.value)}
                  className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                >
                  <option value="start">Start-ticket</option>
                  <option value="exit">Exit-ticket</option>
                </select>
                <button
                  onClick={handleCreateTicketTemplate}
                  className="px-3 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Spara ticket
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                CSV-import: `Fråga;Svar` per rad (valfritt tredje fält: `Taggar`).
              </p>
              <textarea
                value={ticketCsvInput}
                onChange={(e) => setTicketCsvInput(e.target.value)}
                placeholder={'Fråga 1;Svar 1\nFråga 2;Svar 2'}
                className="w-full min-h-24 px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm mt-2 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              />
              <button
                onClick={handleImportTicketCsv}
                className="mt-2 px-3 py-2.5 bg-gray-800 hover:bg-black text-white rounded-xl text-sm font-medium"
              >
                Importera CSV
              </button>
            </div>

            <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <input
                  value={ticketTemplateFilter}
                  onChange={(e) => setTicketTemplateFilter(e.target.value)}
                  placeholder="Sök fråga/tagg"
                  className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm flex-1 min-w-40 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                />
                <select
                  value={ticketTagFilter}
                  onChange={(e) => setTicketTagFilter(e.target.value)}
                  className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                >
                  <option value="">Alla taggar</option>
                  {ticketTagOptions.map(tag => (
                    <option key={`ticket-tag-${tag}`} value={tag}>{tag}</option>
                  ))}
                </select>
                <select
                  value={ticketSortBy}
                  onChange={(e) => setTicketSortBy(e.target.value)}
                  className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                >
                  <option value="newest">Senaste</option>
                  <option value="oldest">Äldsta</option>
                  <option value="alpha">A-Ö</option>
                </select>
              </div>

              {ticketTemplateRows.length === 0 ? (
                <p className="text-sm text-gray-500">Inga ticket-frågor matchar urvalet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {ticketTemplateRows.map(template => (
                    <div key={template.id} className="border border-amber-100 rounded-xl p-3 bg-amber-50/35">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{template.question}</p>
                      <p className="text-xs text-gray-600 mt-1">Facit: {template.answer}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'}
                        {Array.isArray(template.tags) && template.tags.length > 0 ? ` | ${template.tags.join(', ')}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() => handleCreateTicketDispatch(template)}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Skapa länk
                        </button>
                        <button
                          onClick={() => handleDeleteTicketTemplate(template.id)}
                          className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="text-xs text-gray-600 font-medium">Utskick</label>
              <select
                value={selectedTicketDispatchId}
                onChange={(e) => setSelectedTicketDispatchId(e.target.value)}
                className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm min-w-56 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              >
                <option value="">Välj ticket-utskick</option>
                {ticketDispatches.map(dispatch => (
                  <option key={dispatch.id} value={dispatch.id}>
                    {dispatch.title} ({dispatch.kind === 'exit' ? 'Exit' : 'Start'})
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={ticketDispatchImmediateFeedback}
                  onChange={(e) => setTicketDispatchImmediateFeedback(e.target.checked)}
                />
                Nya länkar visar rätt/fel direkt
              </label>
            </div>
            <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/50 mb-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-xs font-bold text-amber-900">Mottagare (för startsidan)</p>
                <button
                  onClick={handleTicketTargetsFromClassFilter}
                  disabled={selectedClassIds.length === 0}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Använd klassfiltret
                </button>
                <button
                  onClick={handleClearTicketTargets}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                >
                  Nollställ mottagare
                </button>
              </div>
              <p className="text-[11px] text-gray-600 mb-2">
                Inga aktiva val = använder nuvarande urval i dashboarden ({filteredStudents.length} elev(er)).
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {classFilterOptions.map(classItem => {
                  const selected = ticketTargetClassSet.has(classItem.id)
                  return (
                    <button
                      key={`ticket-target-class-${classItem.id}`}
                      onClick={() => handleToggleTicketTargetClass(classItem.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                        selected
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {selected ? 'Vald: ' : ''}{classItem.name}
                    </button>
                  )
                })}
              </div>
              <input
                value={ticketStudentSearch}
                onChange={(e) => setTicketStudentSearch(e.target.value)}
                placeholder="Sök elev (namn, id, klass)"
                className="w-full px-2.5 py-1.5 border-2 border-amber-100 rounded-lg text-xs focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              />
              <div className="mt-2 max-h-40 overflow-y-auto border border-amber-100 rounded-lg bg-white divide-y divide-gray-100">
                {ticketFilteredStudentOptions.length === 0 ? (
                  <p className="text-xs text-gray-500 p-2">Inga elever matchar sökningen.</p>
                ) : (
                  ticketFilteredStudentOptions.slice(0, 140).map(item => {
                    const selected = ticketTargetStudentSet.has(item.studentId)
                    return (
                      <button
                        key={`ticket-target-student-${item.studentId}`}
                        onClick={() => handleToggleTicketTargetStudent(item.studentId)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs ${
                          selected ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500"> ({item.className || 'Ingen klass'})</span>
                      </button>
                    )
                  })
                )}
              </div>
              {ticketFilteredStudentOptions.length > 140 && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Visar de första 140 matcherna. Förfina sökningen för att se fler.
                </p>
              )}
              <p className="text-[11px] text-gray-700 mt-2 font-medium">
                Målsättning: {ticketResolvedTargetStudentIds.size} elev(er)
                {ticketHasExplicitTargets
                  ? ` via ${ticketTargetClassIds.length} klass(er) + ${ticketTargetStudentIds.length} individval`
                  : ' via dashboardens aktuella filter'}
              </p>
            </div>

            {ticketDispatches.length === 0 ? (
              <p className="text-sm text-gray-500">Inga ticket-utskick ännu.</p>
            ) : (
              <div className="space-y-2">
                {ticketDispatches.slice(0, 12).map(dispatch => (
                  <div key={dispatch.id} className="border border-amber-100 rounded-xl p-3 bg-white flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-semibold text-gray-800">{dispatch.title}</p>
                      <p className="text-xs text-gray-500">
                        {dispatch.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'}
                        {' | '}
                        direktfeedback: {dispatch.showCorrectnessOnSubmit ? 'Ja' : 'Nej'}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">{dispatch.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopyTicketLink(dispatch.id)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-black text-white rounded-lg text-xs font-semibold"
                      >
                        {copiedTicketDispatchId === dispatch.id ? 'Kopierad' : 'Kopiera länk'}
                      </button>
                      <button
                        onClick={() => handlePublishTicketToHome(dispatch.id)}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Visa på startsida
                      </button>
                      <button
                        onClick={() => handleToggleTicketReveal(dispatch.id, !dispatch.revealCorrectness)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                          dispatch.revealCorrectness
                            ? 'bg-green-100 hover:bg-green-200 text-green-700'
                            : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                        }`}
                      >
                        {dispatch.revealCorrectness ? 'Facit visas' : 'Visa facit för alla'}
                      </button>
                      <button
                        onClick={() => handleClearTicketFromHome(dispatch.id)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                      >
                        Ta bort från startsida
                      </button>
                      <button
                        onClick={() => handleDeleteTicketDispatch(dispatch.id)}
                        className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">Svar för valt utskick</h3>
              {ticketSelectedDispatch && (
                <p className="text-xs text-gray-700 font-medium">
                  Svarat {ticketResponseMeta.answered}/{ticketResponseMeta.total}
                  {' | '}
                  Rätt {ticketResponseMeta.correct}
                  {' | '}
                  Fel {ticketResponseMeta.wrong}
                </p>
              )}
            </div>
            {!ticketSelectedDispatch ? (
              <p className="text-sm text-gray-500">Välj ett utskick ovan för att se elevsvar.</p>
            ) : ticketResponseRows.length === 0 ? (
              <p className="text-sm text-gray-500">Inga mottagare eller svar ännu för detta utskick.</p>
            ) : (
              <div className="overflow-x-auto border border-amber-100 rounded-xl">
                <table className="w-full text-sm bg-white">
                  <thead>
                    <tr className="text-left text-gray-600 border-b bg-amber-50">
                      <th className="py-2 px-2 pr-2">Elev</th>
                      <th className="py-2 pr-2">Klass</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Svar</th>
                      <th className="py-2 px-2">Tid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketResponseRows.map(row => (
                      <tr key={`ticket-response-${row.studentId}`} className="border-b last:border-b-0 hover:bg-amber-50/35">
                        <td className="py-2 px-2 pr-2 text-gray-700 font-semibold">{row.name}</td>
                        <td className="py-2 pr-2 text-gray-600">{row.className || '-'}</td>
                        <td className="py-2 pr-2">
                          {!row.answered ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-gray-50 text-gray-500 border-gray-200 font-medium">
                              Ej svarat
                            </span>
                          ) : row.isCorrect ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-green-50 text-green-700 border-green-200 font-semibold">
                              Rätt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-red-50 text-red-700 border-red-200 font-semibold">
                              Fel
                            </span>
                          )}
                        </td>
                        <td className={`py-2 pr-2 ${row.answered && !row.isCorrect ? 'text-red-700' : 'text-gray-700'}`}>
                          {row.answered ? (row.studentAnswer || '-') : '-'}
                        </td>
                        <td className="py-2 px-2 text-gray-600">{formatTimeAgo(row.answeredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 mt-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-base font-bold text-gray-800">Elevhistorik i tickets</h3>
              {ticketHistoryStudent && (
                <p className="text-xs text-gray-700 font-medium">
                  Senaste svar: {formatTimeAgo(ticketHistorySummary.latestAnsweredAt)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 mb-3">
              <select
                value={ticketHistoryStudentId}
                onChange={(e) => setTicketHistoryStudentId(e.target.value)}
                className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              >
                {ticketHistoryStudentOptions.length === 0 ? (
                  <option value="">Inga elever i urvalet</option>
                ) : (
                  ticketHistoryStudentOptions.map(item => (
                    <option key={`ticket-history-student-${item.studentId}`} value={item.studentId}>
                      {item.name} {item.className ? `(${item.className})` : ''}
                    </option>
                  ))
                )}
              </select>
              <select
                value={ticketHistoryKindFilter}
                onChange={(e) => setTicketHistoryKindFilter(e.target.value)}
                className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              >
                <option value="all">Alla typer</option>
                <option value="start">Start-ticket</option>
                <option value="exit">Exit-ticket</option>
              </select>
              <select
                value={ticketHistoryResultFilter}
                onChange={(e) => setTicketHistoryResultFilter(e.target.value)}
                className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              >
                <option value="all">Alla resultat</option>
                <option value="correct">Bara rätt</option>
                <option value="wrong">Bara fel</option>
              </select>
              <input
                value={ticketHistorySearch}
                onChange={(e) => setTicketHistorySearch(e.target.value)}
                placeholder="Sök i fråga/svar"
                className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              />
            </div>

            {!ticketHistoryStudent ? (
              <p className="text-sm text-gray-500">Välj klassfilter ovan eller lägg till elever för att se historik.</p>
            ) : ticketHistorySummary.total === 0 ? (
              <p className="text-sm text-gray-500">Den här eleven har inte svarat på någon ticket ännu.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3 text-xs">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                    <p className="text-gray-500">Totalt svar</p>
                    <p className="font-semibold text-gray-800">{ticketHistorySummary.total}</p>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-green-50 px-2.5 py-1.5">
                    <p className="text-green-700">Rätt</p>
                    <p className="font-semibold text-green-700">{ticketHistorySummary.correct}</p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5">
                    <p className="text-red-700">Fel</p>
                    <p className="font-semibold text-red-700">{ticketHistorySummary.wrong}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5">
                    <p className="text-blue-700">Träffsäkerhet</p>
                    <p className="font-semibold text-blue-700">{Math.round(ticketHistorySummary.accuracy * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                    <p className="text-amber-700">Senaste 7 dagar</p>
                    <p className="font-semibold text-amber-700">{ticketHistorySummary.last7Days}</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5">
                    <p className="text-indigo-700">Unika utskick</p>
                    <p className="font-semibold text-indigo-700">{ticketHistorySummary.uniqueDispatches}</p>
                  </div>
                </div>

                {ticketHistoryRows.length === 0 ? (
                  <p className="text-sm text-gray-500">Inga historikrader matchar filtret.</p>
                ) : (
                  <div className="overflow-x-auto border border-amber-100 rounded-xl">
                    <table className="w-full text-sm bg-white">
                      <thead>
                        <tr className="text-left text-gray-600 border-b bg-amber-50">
                          <th className="py-2 px-2 pr-2">Tid</th>
                          <th className="py-2 pr-2">Ticket</th>
                          <th className="py-2 pr-2">Status</th>
                          <th className="py-2 pr-2">Svar</th>
                          <th className="py-2 px-2">Facit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketHistoryRows.map((row, index) => (
                          <tr key={`ticket-history-row-${row.dispatchId}-${row.answeredAt || index}`} className="border-b last:border-b-0 hover:bg-amber-50/35">
                            <td className="py-2 px-2 pr-2 text-gray-600 whitespace-nowrap">{formatTimeAgo(row.answeredAt)}</td>
                            <td className="py-2 pr-2 text-gray-700">
                              <p className="font-semibold">{row.title}</p>
                              <p className="text-[11px] text-gray-500">
                                {row.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">{row.question}</p>
                            </td>
                            <td className="py-2 pr-2">
                              {row.isCorrect ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-green-50 text-green-700 border-green-200 font-semibold">
                                  Rätt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-red-50 text-red-700 border-red-200 font-semibold">
                                  Fel
                                </span>
                              )}
                            </td>
                            <td className={`py-2 pr-2 ${row.isCorrect ? 'text-gray-700' : 'text-red-700'}`}>
                              {row.studentAnswer || '-'}
                            </td>
                            <td className="py-2 px-2 text-gray-700">{row.expectedAnswer || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8" style={{ order: -40 }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Klass/gruppvy - snabbstatus</h2>
            <span className="text-xs text-gray-500">Styrs av urvalet högst upp</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {classOverviewMeta.className}: {classOverviewMeta.activeNowCount}/{classOverviewMeta.studentCount} aktiv(a) just nu
          </p>
          <p className="text-[11px] text-gray-400 mb-3">
            Status: Grön = fokus + aktivitet senaste 2 min, Orange = fokus men ingen aktivitet 2-4 min, Svart = inne idag men ej aktiv nu, Röd = ej inne idag.
          </p>
          {classOverviewRows.length === 0 ? (
            <p className="text-sm text-gray-500">Inga elever hittades i valt urval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('name')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Elev
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('name')}</span>
                      </button>
                    </th>
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('activity')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Status
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('activity')}</span>
                      </button>
                    </th>
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('operation')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Jobbar med
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('operation')}</span>
                      </button>
                    </th>
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('today_attempts')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Idag
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('today_attempts')}</span>
                      </button>
                    </th>
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('today_wrong')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Rätt/Fel idag
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('today_wrong')}</span>
                      </button>
                    </th>
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('today_success')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Träff idag
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('today_success')}</span>
                      </button>
                    </th>
                    <th className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('today_engaged')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Tid på uppgift idag
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('today_engaged')}</span>
                      </button>
                    </th>
                    <th className="py-1">
                      <button
                        type="button"
                        onClick={() => handleClassOverviewSort('last_active')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Senast aktiv
                        <span className="text-[10px] text-gray-400">{getClassOverviewSortIndicator('last_active')}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classOverviewRows.map(row => (
                    <tr key={`overview-row-${row.studentId}`} className="border-b last:border-b-0">
                      <td className="py-1 pr-2 text-gray-700 font-medium">
                        {row.name}
                        <span className="ml-1 text-xs text-gray-400">{row.studentId}</span>
                      </td>
                      <td className="py-1 pr-2"><ActivityBadge code={row.activityStatus} compact /></td>
                      <td className="py-1 pr-2 text-gray-700">{getOperationLabel(row.focusOperation)}</td>
                      <td className="py-1 pr-2 text-gray-700">{row.todayAttempts}</td>
                      <td className="py-1 pr-2 text-gray-700">
                        {row.todayCorrectCount}/{row.todayWrongCount}
                      </td>
                      <td className="py-1 pr-2 text-gray-700">{toPercent(row.todaySuccessRate)}</td>
                      <td className="py-1 pr-2 text-gray-700">{formatDuration(row.todayEngagedMinutes * 60)}</td>
                      <td className="py-1 text-gray-700">{formatTimeAgo(row.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <TableStickyStatusPanel
          rows={tableStickyStatusRows}
          onSort={handleStickySort}
          getSortIndicator={getStickySortIndicator}
          className="bg-white rounded-lg shadow p-4 mb-8"
          style={{ order: -30 }}
        />

        <div id="teacher-student-detail-section" className="bg-white rounded-lg shadow p-4 mb-8" style={{ order: -20 }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Elevvy (lärare)</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={detailStudentId}
                onChange={(e) => setDetailStudentId(e.target.value)}
                className="px-2 py-1 border rounded text-sm min-w-56"
              >
                {detailStudentOptions.length === 0 ? (
                  <option value="">Inga elever i urvalet</option>
                ) : (
                  detailStudentOptions.map(item => (
                    <option key={`detail-student-${item.studentId}`} value={item.studentId}>
                      {item.name} {item.className ? `(${item.className})` : ''}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleExportStudentDetailCsv}
                disabled={!detailStudentProfile || !detailStudentRow || !detailStudentViewData}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 disabled:bg-gray-100 disabled:text-gray-400 text-emerald-700 rounded text-xs font-medium"
              >
                Exportera elevvy CSV
              </button>
            </div>
          </div>

          {!detailStudentProfile || !detailStudentRow || !detailStudentViewData ? (
            <p className="text-sm text-gray-500">Välj en elev för att se tabeller, nivåstatus och nyckeldata.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mb-4 text-xs">
                <div className="rounded border border-gray-200 bg-gray-50 px-2.5 py-2">
                  <p className="text-gray-500">Totalt lösta</p>
                  <p className="font-semibold text-gray-800">{detailStudentProfile?.stats?.totalProblems || detailStudentRow.attempts}</p>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2">
                  <p className="text-blue-700">Träff totalt</p>
                  <p className="font-semibold text-blue-700">{toPercent(detailStudentRow.successRate)}</p>
                </div>
                <div className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-2">
                  <p className="text-indigo-700">Idag</p>
                  <p className="font-semibold text-indigo-700">{detailStudentRow.todayAttempts}</p>
                </div>
                <div className="rounded border border-cyan-200 bg-cyan-50 px-2.5 py-2">
                  <p className="text-cyan-700">Vecka</p>
                  <p className="font-semibold text-cyan-700">{detailStudentRow.weekAttempts}</p>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 px-2.5 py-2">
                  <p className="text-amber-700">Tid på uppgift idag</p>
                  <p className="font-semibold text-amber-700">{formatDuration(detailStudentRow.todayEngagedMinutes * 60)}</p>
                </div>
                <div className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                  <p className="text-emerald-700">Tid på uppgift 7d</p>
                  <p className="font-semibold text-emerald-700">{formatDuration(detailStudentRow.weekEngagedMinutes * 60)}</p>
                </div>
                <div className="rounded border border-purple-200 bg-purple-50 px-2.5 py-2">
                  <p className="text-purple-700">Nivå nu/högst</p>
                  <p className="font-semibold text-purple-700">{detailStudentRow.currentDifficulty}/{detailStudentRow.highestDifficulty}</p>
                </div>
                <div className="rounded border border-gray-200 bg-white px-2.5 py-2">
                  <p className="text-gray-500">Aktivitet</p>
                  <div className="mt-1">
                    <ActivityBadge code={detailStudentRow.activityStatus} compact />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">Gångertabell - status</h3>
                    <p className="text-[11px] text-gray-500">
                      Dag: {detailStudentViewData.tableSticky.todayDoneCount} | Vecka: {detailStudentViewData.tableSticky.weekDoneCount} | Star: {detailStudentViewData.tableSticky.starCount}
                    </p>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 mb-3">
                    {TABLES.map(table => {
                      const status = detailStudentViewData.tableSticky.statusByTable[table] || 'default'
                      return (
                        <div key={`detail-table-status-${table}`} className="h-11 rounded border flex items-center justify-center text-xs font-semibold relative bg-white">
                          <span className={`absolute inset-0 rounded border ${getTeacherTableStatusClass(status)}`} />
                          <span className="relative z-10">{table}</span>
                          {status === 'star' ? (
                            <span className="absolute top-0 right-0 text-[10px] text-yellow-300 z-10">★</span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="py-1 pr-2">Tabell</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1 pr-2">Försök 7d</th>
                          <th className="py-1 pr-2">Träff 7d</th>
                          <th className="py-1">Försök totalt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TABLES.map(table => {
                          const perf = detailStudentViewData.tablePerformanceByTable[table]
                          const status = detailStudentViewData.tableSticky.statusByTable[table] || 'default'
                          return (
                            <tr key={`detail-table-row-${table}`} className="border-b last:border-b-0">
                              <td className="py-1 pr-2 text-gray-700 font-medium">{table}:an</td>
                              <td className="py-1 pr-2 text-gray-700">{getTeacherTableStatusLabel(status)}</td>
                              <td className="py-1 pr-2 text-gray-700">{perf.attempts7d}</td>
                              <td className="py-1 pr-2 text-gray-700">{toPercent(perf.accuracy7d)}</td>
                              <td className="py-1 text-gray-700">{perf.attemptsTotal}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Framsteg (som elevvyn)</h3>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Grön = klarad, blå = pågående, grå = ej startad.
                  </p>
                  <div className="space-y-3">
                    {detailStudentViewData.operationMasteryBoards.map(item => (
                      <div key={`detail-mastery-${item.operation}`}>
                        <p className="text-xs font-medium text-gray-700 mb-1">{getOperationLabel(item.operation)}</p>
                        <TeacherMasteryLevelGrid label="Historiskt" operation={item.operation} levels={item.historical} />
                        <TeacherMasteryLevelGrid label="Denna vecka" operation={item.operation} levels={item.weekly} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h4 className="text-xs font-semibold text-gray-800">Felandel per nivå (historiskt)</h4>
                      <p className="text-[11px] text-gray-500">
                        Minst {DETAIL_LEVEL_ERROR_MIN_ATTEMPTS} försök per nivå
                      </p>
                    </div>
                    {detailLevelErrorRows.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Ingen nivå har ännu tillräckligt underlag för felandel.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              {renderDetailLevelErrorSortHeader('Räknesätt', 'operation', { helpText: DETAIL_LEVEL_ERROR_HELP.operation })}
                              {renderDetailLevelErrorSortHeader('Nivå', 'level', { helpText: DETAIL_LEVEL_ERROR_HELP.level })}
                              {renderDetailLevelErrorSortHeader('Försök', 'attempts', { helpText: DETAIL_LEVEL_ERROR_HELP.attempts })}
                              {renderDetailLevelErrorSortHeader('Rätt', 'correct', { helpText: DETAIL_LEVEL_ERROR_HELP.correct })}
                              {renderDetailLevelErrorSortHeader('Fel', 'wrong', { helpText: DETAIL_LEVEL_ERROR_HELP.wrong })}
                              {renderDetailLevelErrorSortHeader('Felandel', 'error_share', { helpText: DETAIL_LEVEL_ERROR_HELP.error_share })}
                              {renderDetailLevelErrorSortHeader('Kunskapsfel', 'knowledge_wrong', { helpText: DETAIL_LEVEL_ERROR_HELP.knowledge_wrong })}
                              {renderDetailLevelErrorSortHeader('Ouppmärksamhet', 'inattention_wrong', {
                                className: 'py-1',
                                helpText: DETAIL_LEVEL_ERROR_HELP.inattention_wrong
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {detailLevelErrorRows.map(levelRow => (
                              <tr key={`detail-level-error-${levelRow.operation}-${levelRow.level}`} className="border-b last:border-b-0">
                                <td className="py-1 pr-2 text-gray-700">{levelRow.operationLabel}</td>
                                <td className="py-1 pr-2 text-gray-700 font-medium">{levelRow.level}</td>
                                <td className="py-1 pr-2 text-gray-700">{levelRow.attempts}</td>
                                <td className="py-1 pr-2 text-gray-700">{levelRow.correct}</td>
                                <td className="py-1 pr-2 text-gray-700">{levelRow.wrong}</td>
                                <td className={`py-1 pr-2 font-semibold ${getErrorShareColorClass(levelRow.errorShare)}`}>
                                  {toPercent(levelRow.errorShare)}
                                </td>
                                <td className="py-1 pr-2 text-gray-700">{levelRow.knowledgeWrong}</td>
                                <td className="py-1 text-gray-700">{levelRow.inattentionWrong}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {detailLevelErrorUnderSampleCount > 0 ? (
                      <p className="mt-2 text-[11px] text-gray-500">
                        {detailLevelErrorUnderSampleCount} nivåer har för få försök och visas inte ännu.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                <p>Svagast typer: {formatSkillList(detailStudentProfile?.stats?.weakestTypes)}</p>
                <p>Starkast typer: {formatSkillList(detailStudentProfile?.stats?.strongestTypes)}</p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Inaktivitet</h2>
              <span className="text-xs text-gray-500">Snabb uppföljning</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded bg-gray-50 px-3 py-2">
                <span className="text-gray-600">Inte aktiv idag</span>
                <span className="font-semibold text-gray-800">{inactivityBuckets.notActiveToday}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-amber-50 px-3 py-2">
                <span className="text-amber-800">2+ dagar utan aktivitet</span>
                <span className="font-semibold text-amber-700">{inactivityBuckets.twoDaysOrMore}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-red-50 px-3 py-2">
                <span className="text-red-700">7+ dagar utan aktivitet</span>
                <span className="font-semibold text-red-700">{inactivityBuckets.sevenDaysOrMore}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-blue-50 px-3 py-2">
                <span className="text-blue-700">Ej startat alls</span>
                <span className="font-semibold text-blue-700">{inactivityBuckets.neverStarted}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Klassnivå</h2>
              <span className="text-xs text-gray-500">Veckomål {weekGoal} uppgifter/elev</span>
            </div>
            {classSummaries.length === 0 ? (
              <p className="text-sm text-gray-500">Inga klasser i aktuellt urval.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-1 pr-2">Klass</th>
                      <th className="py-1 pr-2">Elever</th>
                      <th className="py-1 pr-2">Startat</th>
                      <th className="py-1 pr-2">Ej startat</th>
                      <th className="py-1 pr-2">Aktiva v</th>
                      <th className="py-1">Nått veckomål</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSummaries.map(item => (
                      <tr key={`class-summary-${item.classId}`} className="border-b last:border-b-0">
                        <td className="py-1 pr-2 text-gray-700 font-medium">{item.className}</td>
                        <td className="py-1 pr-2 text-gray-700">{item.studentCount}</td>
                        <td className="py-1 pr-2 text-green-700 font-semibold">{item.startedCount}</td>
                        <td className="py-1 pr-2 text-amber-700 font-semibold">{item.notStartedCount}</td>
                        <td className="py-1 pr-2 text-blue-700">{item.weeklyActiveCount}</td>
                        <td className="py-1 text-gray-700">
                          {item.weeklyGoalReachedCount}/{item.studentCount}{' '}
                          <span className="text-xs text-gray-500">({toPercent(item.weeklyGoalReachedRate)})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Gångertabell - urval</h2>
              <p className="text-xs text-gray-500">
                {tableSelectedStudentIds.length === 0
                  ? `Alla elever i klassurvalet (${filteredStudents.length})`
                  : `${tableSelectedStudentIds.length} vald(a) elev(er)`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button
                onClick={() => setTableSelectedStudentIds([])}
                className={`px-2.5 py-1.5 rounded text-xs ${
                  tableSelectedStudentIds.length === 0
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alla i klassurvalet
              </button>
              <input
                value={tableStudentSearch}
                onChange={(e) => setTableStudentSearch(e.target.value)}
                placeholder="Filtrera elev"
                className="px-2.5 py-1.5 border rounded text-xs min-w-48"
              />
            </div>
            <div className="max-h-28 overflow-y-auto border rounded divide-y">
              {filteredTableStudentOptions.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-gray-500">Inga elever matchar filtret.</p>
              ) : (
                filteredTableStudentOptions.slice(0, 120).map(item => {
                  const selected = tableStudentSet.has(item.studentId)
                  return (
                    <button
                      key={`table-student-filter-${item.studentId}`}
                      onClick={() => setTableSelectedStudentIds(prev => (
                        prev.includes(item.studentId)
                          ? prev.filter(id => id !== item.studentId)
                          : [...prev, item.studentId]
                      ))}
                      className={`w-full text-left px-2.5 py-1.5 text-xs ${
                        selected
                          ? 'bg-indigo-100 text-indigo-800 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.name} <span className="text-gray-500">({item.className || 'Ingen klass'})</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Gångertabell - utveckling (7 dagar)</h2>
              <span className="text-xs text-gray-500">Jämfört med föregående 7 dagar</span>
            </div>
            {tableDevelopmentOverview.length === 0 ? (
              <p className="text-sm text-gray-500">Ingen tabellaktivitet i aktuellt urval.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-1 pr-2">Tabell</th>
                      <th className="py-1 pr-2">Försök 7d</th>
                      <th className="py-1 pr-2">Träff 7d</th>
                      <th className="py-1 pr-2">Trend träff</th>
                      <th className="py-1 pr-2">Median tid 7d</th>
                      <th className="py-1">Trend tid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableDevelopmentOverview.map(item => (
                      <tr key={`table-dev-${item.table}`} className="border-b last:border-b-0">
                        <td className="py-1 pr-2 font-medium text-gray-700">{item.table}:an</td>
                        <td className="py-1 pr-2 text-gray-700">{item.attempts7d}</td>
                        <td className="py-1 pr-2 text-gray-700">{toPercent(item.accuracy7d)}</td>
                        <td className="py-1 pr-2 text-gray-700">
                          {item.accuracyTrend === null
                            ? '-'
                            : `${item.accuracyTrend >= 0 ? '+' : ''}${Math.round(item.accuracyTrend * 100)} pp`}
                        </td>
                        <td className="py-1 pr-2 text-gray-700">
                          {Number.isFinite(item.medianTime7d) ? `${item.medianTime7d.toFixed(1)}s` : '-'}
                        </td>
                        <td className="py-1 text-gray-700">
                          {item.speedTrend === null
                            ? '-'
                            : `${item.speedTrend >= 0 ? '+' : ''}${Math.round(item.speedTrend * 100)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Behöver stöd nu</h2>
              <span className="text-xs text-gray-500">Kompakt prioritering</span>
            </div>
            {supportRows.length === 0 ? (
              <p className="text-sm text-gray-500">Inga akuta signaler i aktuellt urval.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-1 pr-2">
                        <button
                          type="button"
                          onClick={() => handleSupportSort('name')}
                          className="inline-flex items-center gap-1 hover:text-gray-700"
                        >
                          Elev
                          <span className="text-[10px] text-gray-400">{getSupportSortIndicator('name')}</span>
                        </button>
                      </th>
                      <th className="py-1 pr-2">
                        <button
                          type="button"
                          onClick={() => handleSupportSort('class')}
                          className="inline-flex items-center gap-1 hover:text-gray-700"
                        >
                          Klass
                          <span className="text-[10px] text-gray-400">{getSupportSortIndicator('class')}</span>
                        </button>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSupportSort('activity')}
                            className="inline-flex items-center gap-1 hover:text-gray-700"
                          >
                            Status
                            <span className="text-[10px] text-gray-400">{getSupportSortIndicator('activity')}</span>
                          </button>
                          <InlineHelp text={SUPPORT_HEADER_HELP.status} />
                        </div>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSupportSort('risk')}
                            className="inline-flex items-center gap-1 hover:text-gray-700"
                          >
                            Risk
                            <span className="text-[10px] text-gray-400">{getSupportSortIndicator('risk')}</span>
                          </button>
                          <InlineHelp text={SUPPORT_HEADER_HELP.risk} />
                        </div>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSupportSort('support_score')}
                            className="inline-flex items-center gap-1 hover:text-gray-700"
                          >
                            Stöd
                            <span className="text-[10px] text-gray-400">{getSupportSortIndicator('support_score')}</span>
                          </button>
                          <InlineHelp text={SUPPORT_HEADER_HELP.support_score} />
                        </div>
                      </th>
                      <th className="py-1 pr-2">
                        <button
                          type="button"
                          onClick={() => handleSupportSort('today_attempts')}
                          className="inline-flex items-center gap-1 hover:text-gray-700"
                        >
                          Idag
                          <span className="text-[10px] text-gray-400">{getSupportSortIndicator('today_attempts')}</span>
                        </button>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSupportSort('today_wrong')}
                            className="inline-flex items-center gap-1 hover:text-gray-700"
                          >
                            R/F idag
                            <span className="text-[10px] text-gray-400">{getSupportSortIndicator('today_wrong')}</span>
                          </button>
                          <InlineHelp text={SUPPORT_HEADER_HELP.today_wrong} />
                        </div>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSupportSort('week_success')}
                            className="inline-flex items-center gap-1 hover:text-gray-700"
                          >
                            Träff v
                            <span className="text-[10px] text-gray-400">{getSupportSortIndicator('week_success')}</span>
                          </button>
                          <InlineHelp text={SUPPORT_HEADER_HELP.week_success} />
                        </div>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSupportSort('struggle')}
                            className="inline-flex items-center gap-1 hover:text-gray-700"
                          >
                            Kämpar med
                            <span className="text-[10px] text-gray-400">{getSupportSortIndicator('struggle')}</span>
                          </button>
                          <InlineHelp text={SUPPORT_HEADER_HELP.struggle} />
                        </div>
                      </th>
                      <th className="py-1 pr-2">
                        <div className="inline-flex items-center gap-1">
                          <span>Flaggor</span>
                          <InlineHelp text={SUPPORT_HEADER_HELP.flags} />
                        </div>
                      </th>
                      <th className="py-1">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportRows.map(row => (
                      <tr key={`support-${row.studentId}`} className="border-b last:border-b-0">
                        <td className="py-1 pr-2 text-gray-700">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-[11px] text-gray-400">{row.studentId}</div>
                        </td>
                        <td className="py-1 pr-2 text-gray-700">{row.classNameLabel || row.className || '-'}</td>
                        <td className="py-1 pr-2"><ActivityBadge code={row.activityStatus} /></td>
                        <td className="py-1 pr-2"><RiskBadge level={row.riskLevel} score={row.riskScore} /></td>
                        <td className="py-1 pr-2 text-gray-700">{row.supportScore}</td>
                        <td className="py-1 pr-2 text-gray-700">{row.todayAttempts}</td>
                        <td className="py-1 pr-2 text-gray-700">{row.todayCorrectCount}/{row.todayWrongCount}</td>
                        <td className="py-1 pr-2 text-gray-700">{toPercent(row.weekSuccessRate)}</td>
                        <td className="py-1 pr-2 text-gray-700">{row.todayStruggle?.skillLabel || '-'}</td>
                        <td className="py-1 pr-2 text-gray-600">{row.riskCodes.slice(0, 2).join(' | ') || '-'}</td>
                        <td className="py-1">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenStudentDetail(row.studentId)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px]"
                            >
                              Elevvy
                            </button>
                            <button
                              onClick={() => handleCreateQuickAssignment(row, 'focus')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px]"
                            >
                              Fokus
                            </button>
                            <button
                              onClick={() => handleCreateQuickAssignment(row, 'warmup')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px]"
                            >
                              Värm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Lärarlösenord</h2>
          <p className="text-sm text-gray-500 mb-3">
            Hanteras server-side via `TEACHER_API_PASSWORD` i Vercel.
            Ändra lösenord i projektets Environment Variables och redeploya.
          </p>
          <p className="text-xs text-gray-400">
            Säkerhetsnotis: inget lärarlösenord lagras längre i frontend (`VITE_*`).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Klasser</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <input
              type="text"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              placeholder="Klassnamn, t.ex. 4A"
              className="px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={handleCreateClass}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Skapa klass från listan
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <select
              value={addToClassId}
              onChange={(e) => setAddToClassId(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            >
              <option value="">Välj klass att lägga till i</option>
              {classes.map(item => (
                <option key={`add-${item.id}`} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddStudentsToClass}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
            >
              Lägg till elever i vald klass
            </button>
          </div>
          <textarea
            value={rosterInput}
            onChange={(e) => setRosterInput(e.target.value)}
            placeholder={'Klistra in elevlista, en per rad\\nAnna Andersson\\nBo Berg'}
            className="w-full min-h-28 px-3 py-2 border rounded text-sm mb-3"
          />
          <p className="text-xs text-gray-500 mb-2">
            Inloggningsnamn skapas från elevens namn. Startlösenord sätts till elevens namn.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            En elev kan vara med i flera klasser/grupper samtidigt.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Tips: klass-/gruppurval för alla vyer styrs längst upp på sidan.
          </p>
          <p className="text-xs text-gray-600 mb-3">{classStatus || ' '}</p>

          {classes.length > 0 && (
            <div className="space-y-1.5">
              {classes.map(item => {
                const classStudents = students.filter(student => recordMatchesClassFilter(student, [item.id]))
                const loggedInCount = classStudents.filter(student => student.auth?.lastLoginAt).length
                return (
                  <div key={item.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {classStudents.length} elever | {loggedInCount} har loggat in
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteClass(item.id)}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                    >
                      Ta bort klass
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ order: -10 }}>
          {students.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow text-center">
              <p className="text-gray-500 text-lg">Inga elever ännu</p>
              <p className="text-gray-400 mt-2">
                Lägg till elever via klasslistan ovan så kan de logga in.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-x-auto p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-500">Resultatvy</span>
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dagsvy
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alla elever
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Veckovy
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-500">Sortera</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="name">Namn</option>
                  <option value="student_id">ID</option>
                  <option value="class">Klass</option>
                  <option value="active_today">Aktiv idag</option>
                  <option value="today_attempts">Dagens mängd</option>
                  <option value="today_wrong">Dagens felsvar</option>
                  <option value="today_success_rate">Dagens träffsäkerhet</option>
                  <option value="today_struggle">Dagens kämp-index</option>
                  <option value="today_engaged">Tid på uppgift idag</option>
                  <option value="today_answer_length">Dagens svarslängd</option>
                  <option value="active_week">Aktiv denna vecka</option>
                  <option value="week_attempts">Veckans mängd</option>
                  <option value="week_correct">Veckans rätt</option>
                  <option value="week_wrong">Veckans felsvar</option>
                  <option value="week_struggle">Veckans kämp-index</option>
                  <option value="week_active_time">Veckans aktiv tid</option>
                  <option value="week_engaged">Tid på uppgift 7d</option>
                  <option value="week_success_rate">Veckans träffsäkerhet</option>
                  <option value="week_answer_length">Veckans svarslängd</option>
                  <option value="assignment_week">Uppdragsföljsamhet v</option>
                  <option value="support_score">Stödscore</option>
                  <option value="risk_score">Riskscore</option>
                  <option value="logged_in">Har loggat in</option>
                  <option value="last_active">Senast aktiv</option>
                  <option value="attempts">Totala försök</option>
                  <option value="success_rate">Total träffsäkerhet</option>
                  <option value="reasonable_rate">Total rimlighet</option>
                  <option value="avg_relative_error">Total medelavvikelse</option>
                  <option value="trend">Trend</option>
                </select>
                <button
                  onClick={() => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
                >
                  {sortDir === 'desc' ? 'Fallande' : 'Stigande'}
                </button>
                <button
                  onClick={handleExportSnapshotCsv}
                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-sm"
                >
                  Export översikt
                </button>
                <button
                  onClick={handleExportDetailedProblemCsv}
                  className="px-2 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded text-sm"
                >
                  Export rådata
                </button>
                <button
                  onClick={handleExportSkillComparisonCsv}
                  className="px-2 py-1 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-sm"
                >
                  Export skill
                </button>
                <button
                  onClick={handleExportTableDevelopmentCsv}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-sm"
                >
                  Export tabeller
                </button>
                <button
                  onClick={handleExportActivityCsv}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm"
                >
                  Export aktivitet
                </button>
              </div>
            </div>

            {viewMode === 'daily' && visibleRows.length === 0 && (
              <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Inga elever i valt urval.
              </div>
            )}
            {viewMode === 'weekly' && visibleRows.length === 0 && (
              <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Inga elever i valt urval.
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600">
                  {renderResultSortHeader('Namn', 'name')}
                  {renderResultSortHeader('ID', 'student_id')}
                  {renderResultSortHeader('Klass', 'class')}
                  {viewMode === 'daily' ? (
                    <>
                      {renderResultSortHeader('Gjort idag', 'today_attempts', { helpText: RESULT_HEADER_HELP.today_attempts })}
                      {renderResultSortHeader('Rätt/fel idag', 'today_wrong', { helpText: RESULT_HEADER_HELP.today_wrong })}
                      {renderResultSortHeader('Tid på uppgift idag', 'today_engaged', { helpText: RESULT_HEADER_HELP.today_engaged })}
                      {renderResultSortHeader('Kämpar med idag', 'today_struggle', { helpText: RESULT_HEADER_HELP.today_struggle })}
                      {renderResultSortHeader('Svarslängd idag', 'today_answer_length', { helpText: RESULT_HEADER_HELP.today_answer_length })}
                      {renderResultSortHeader('Senast aktiv', 'last_active')}
                      <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                    </>
                  ) : viewMode === 'weekly' ? (
                    <>
                      {renderResultSortHeader('Gjort denna vecka', 'week_attempts', { helpText: RESULT_HEADER_HELP.week_attempts })}
                      {renderResultSortHeader('Aktiv tid (svar)', 'week_active_time', { helpText: RESULT_HEADER_HELP.week_active_time })}
                      {renderResultSortHeader('Tid på uppgift', 'week_engaged', { helpText: RESULT_HEADER_HELP.week_engaged })}
                      {renderResultSortHeader('Rätt/fel vecka', 'week_wrong', { helpText: RESULT_HEADER_HELP.week_wrong })}
                      {renderResultSortHeader('Kämpar med vecka', 'week_struggle', { helpText: RESULT_HEADER_HELP.week_struggle })}
                      {renderResultSortHeader('Svarslängd vecka', 'week_answer_length', { helpText: RESULT_HEADER_HELP.week_answer_length })}
                      {renderResultSortHeader('Senast aktiv', 'last_active')}
                      <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                    </>
                  ) : (
                    <>
                      {renderResultSortHeader('Försök', 'attempts')}
                      {renderResultSortHeader('Rätt', 'success_rate', { helpText: RESULT_HEADER_HELP.success_rate })}
                      {renderResultSortHeader('Rimlighet', 'reasonable_rate', { helpText: RESULT_HEADER_HELP.reasonable_rate })}
                      {renderResultSortHeader('Medelavvikelse', 'avg_relative_error', { helpText: RESULT_HEADER_HELP.avg_relative_error })}
                      {renderResultSortHeader('Trend', 'trend', { helpText: RESULT_HEADER_HELP.trend })}
                      {renderResultSortHeader('Senast aktiv', 'last_active')}
                      <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(row => (
                  <tr key={row.studentId} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className={`px-4 py-0 font-semibold ${row.hasLoggedIn ? 'text-green-700' : 'text-gray-800'}`}>
                      <div>{row.name}</div>
                      <div className="mt-1">
                        <RiskBadge level={row.riskLevel} score={row.riskScore} />
                      </div>
                    </td>
                    <td className="px-4 py-0 text-xs text-gray-400 font-mono">
                      {row.studentId}
                    </td>
                    <td className="px-4 py-0 text-gray-700">
                      {row.classNameLabel || row.className || '-'}
                    </td>
                    {viewMode === 'daily' ? (
                      <>
                        <td className="px-4 py-0 text-gray-700">
                          {row.todayAttempts}
                          <div className="text-xs text-gray-500 mt-1">{row.todayOperationSummary}</div>
                        </td>
                        <td className="px-4 py-0">
                          <span className={getSuccessColorClass(row.todaySuccessRate)}>
                            {toPercent(row.todaySuccessRate)} ({row.todayCorrectCount}/{row.todayAttempts || 0})
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Rimliga fel: {row.todayWrongCount > 0 ? `${row.todayReasonableWrongCount}/${row.todayWrongCount}` : '-'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Uppdrag: {row.todayAssignmentAdherenceRate === null ? '-' : toPercent(row.todayAssignmentAdherenceRate)}
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {formatDuration(row.todayEngagedMinutes * 60)}
                          <div className="text-xs text-gray-500 mt-1">
                            {row.todayPresenceInteractions} interaktioner
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.todayStruggle
                            ? (
                              <>
                                <div className="font-medium">{row.todayStruggle.skillLabel}</div>
                                <div className="text-xs text-gray-500">
                                  {row.todayStruggle.attempts} försök, {row.todayStruggle.wrong} fel
                                </div>
                              </>
                            )
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.todayAvgAnswerLength === null
                            ? '-'
                            : `${row.todayAvgAnswerLength.toFixed(1)} tecken`}
                        </td>
                        <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                      </>
                    ) : viewMode === 'weekly' ? (
                      <>
                        <td className="px-4 py-0 text-gray-700">
                          {row.weekAttempts}
                          <div className="text-xs text-gray-500 mt-1">{row.weekOperationSummary}</div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {formatDuration(row.weekActiveTimeSec)}
                          <div className="text-xs text-gray-500 mt-1">
                            snitt {row.weekAvgTimePerProblemSec > 0 ? `${Math.round(row.weekAvgTimePerProblemSec)}s/problem` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {formatDuration(row.weekEngagedMinutes * 60)}
                          <div className="text-xs text-gray-500 mt-1">
                            {row.weekPresenceInteractions} interaktioner
                          </div>
                        </td>
                        <td className="px-4 py-0">
                          <span className={getSuccessColorClass(row.weekSuccessRate)}>
                            {toPercent(row.weekSuccessRate)} ({row.weekCorrectCount}/{row.weekAttempts || 0})
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Rimliga fel: {row.weekWrongCount > 0 ? `${row.weekReasonableWrongCount}/${row.weekWrongCount}` : '-'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Uppdrag: {row.weekAssignmentAdherenceRate === null ? '-' : toPercent(row.weekAssignmentAdherenceRate)}
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.weekStruggle
                            ? (
                              <>
                                <div className="font-medium">{row.weekStruggle.skillLabel}</div>
                                <div className="text-xs text-gray-500">
                                  {row.weekStruggle.attempts} försök, {row.weekStruggle.wrong} fel
                                </div>
                              </>
                            )
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.weekAvgAnswerLength === null
                            ? '-'
                            : `${row.weekAvgAnswerLength.toFixed(1)} tecken`}
                        </td>
                        <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-0 text-gray-700">{row.attempts}</td>
                        <td className="px-4 py-0">
                          <span className={getSuccessColorClass(row.successRate)}>
                            {toPercent(row.successRate)}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {row.correctCount}/{row.attempts} rätt
                          </div>
                        </td>
                        <td className="px-4 py-0">
                          <span className={getReasonableColorClass(row.reasonableRate)}>
                            {toPercent(row.reasonableRate)}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {row.reasonableCount}/{row.attempts} rimliga
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.avgRelativeError === null ? '-' : `${Math.round(row.avgRelativeError * 100)}%`}
                        </td>
                        <td className="px-4 py-0">
                          {row.trend === null ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className={row.trend >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {row.trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(row.trend * 100))}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                      </>
                    )}
                    <td className="px-4 py-0 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        <button
                          onClick={() => handleOpenStudentDetail(row.studentId)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                        >
                          Elevvy
                        </button>
                        <button
                          onClick={() => handleCreateQuickAssignment(row, 'focus')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Fokus
                        </button>
                        <button
                          onClick={() => handleCreateQuickAssignment(row, 'warmup')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs"
                        >
                          Värm upp
                        </button>
                        <button
                          onClick={() => handleCreateQuickAssignment(row, 'challenge')}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
                        >
                          Mix
                        </button>
                        <button
                          onClick={() => handleResetStudentPassword(row.studentId)}
                          disabled={passwordResetBusyId === row.studentId}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 text-gray-700 rounded text-xs"
                        >
                          {passwordResetBusyId === row.studentId ? 'Nollställer...' : 'Nollställ lösen'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div id={PASSWORD_RESET_SECTION_ID} className="bg-white rounded-lg shadow p-4 mt-8 border-2 border-rose-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold text-rose-800">Nollställ elevlösenord</h2>
            <p className="text-xs text-gray-500">
              {passwordResetRows.length} elev(er) i aktuellt urval
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Använd för att återställa elevlösenord till elevens inloggnings-ID.
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input
              type="text"
              value={passwordResetSearch}
              onChange={(event) => setPasswordResetSearch(event.target.value)}
              placeholder="Sök elev (namn, ID eller klass)"
              className="px-3 py-2 border rounded text-sm min-w-[240px] flex-1"
            />
            <button
              type="button"
              onClick={() => setPasswordResetSearch('')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
            >
              Rensa
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-3 min-h-5">{passwordResetStatus || ' '}</p>

          {passwordResetRows.length === 0 ? (
            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Inga elever att visa i valt urval.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Namn</th>
                      <th className="px-3 py-2 font-semibold">ID</th>
                      <th className="px-3 py-2 font-semibold">Klass</th>
                      <th className="px-3 py-2 font-semibold">Senaste inloggning</th>
                      <th className="px-3 py-2 font-semibold text-right">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passwordResetRows.map(row => (
                      <tr key={`password-reset-${row.studentId}`} className="border-b last:border-b-0">
                        <td className="px-3 py-2 text-gray-800">{row.name}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono">{row.studentId}</td>
                        <td className="px-3 py-2 text-gray-700">{row.className || '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{formatTimeAgo(row.lastLoginAt)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleResetStudentPassword(row.studentId)}
                            disabled={passwordResetBusyId === row.studentId}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded text-xs font-semibold"
                          >
                            {passwordResetBusyId === row.studentId ? 'Nollställer...' : 'Nollställ lösenord'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}

function TableStickyStatusPanel({
  rows,
  onSort,
  getSortIndicator,
  className = 'bg-white rounded-lg shadow p-4',
  style
}) {
  return (
    <div className={className} style={style}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Gångertabell - sticky status per elev</h2>
        <span className="text-xs text-gray-500">Dag (mörkgrön) låser till 23:59, vecka (ljusgrön) till söndag</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Inga elever i aktuellt urval.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('name')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Elev
                    <span className="text-[10px] text-gray-400">{getSortIndicator('name')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('class')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Klass
                    <span className="text-[10px] text-gray-400">{getSortIndicator('class')}</span>
                  </button>
                </th>
                {TABLES.map(table => (
                  <th key={`teacher-table-sticky-head-${table}`} className="py-1 pr-1 text-center">
                    <button
                      type="button"
                      onClick={() => onSort(`table_${table}`)}
                      className="inline-flex items-center justify-center gap-1 hover:text-gray-700"
                    >
                      <span>{table}</span>
                      <span className="text-[10px] text-gray-400">{getSortIndicator(`table_${table}`)}</span>
                    </button>
                  </th>
                ))}
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('today_done')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Dagsklara
                    <span className="text-[10px] text-gray-400">{getSortIndicator('today_done')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('week_done')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Veckoklara
                    <span className="text-[10px] text-gray-400">{getSortIndicator('week_done')}</span>
                  </button>
                </th>
                <th className="py-1">
                  <button
                    type="button"
                    onClick={() => onSort('star_count')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Star idag
                    <span className="text-[10px] text-gray-400">{getSortIndicator('star_count')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`teacher-table-sticky-row-${row.studentId}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 text-gray-700 font-medium">{row.name}</td>
                  <td className="py-1 pr-2 text-gray-600">{row.className || '-'}</td>
                  {TABLES.map(table => (
                    <td key={`teacher-table-sticky-cell-${row.studentId}-${table}`} className="py-1 pr-1 text-center">
                      <span className={`inline-flex w-5 h-5 rounded border align-middle ${getTeacherTableStatusClass(row.statusByTable[table])}`} title={getTeacherTableStatusLabel(row.statusByTable[table])}>
                        {row.statusByTable[table] === 'star' ? (
                          <span className="m-auto text-[10px] text-yellow-300">★</span>
                        ) : null}
                      </span>
                    </td>
                  ))}
                  <td className="py-1 pr-2 text-gray-700">{row.todayDoneCount}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.weekDoneCount}</td>
                  <td className="py-1 text-gray-700">{row.starCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function buildClassFilterOptions(classes, students) {
  const byId = new Map()

  const upsert = (rawId, rawName, priority) => {
    const id = String(rawId || '').trim()
    if (!id) return

    const nameCandidate = String(rawName || '').trim()
    const nextName = nameCandidate || id
    const existing = byId.get(id)
    if (!existing) {
      byId.set(id, { id, name: nextName, priority })
      return
    }

    if ((!existing.name || existing.name === existing.id) && nameCandidate) {
      existing.name = nameCandidate
    }
    if (priority < existing.priority) {
      existing.priority = priority
    }
  }

  for (const classRecord of Array.isArray(classes) ? classes : []) {
    upsert(classRecord?.id, classRecord?.name, 0)
  }

  for (const student of Array.isArray(students) ? students : []) {
    const classIds = getRecordClassIds(student)
    for (const classId of classIds) {
      const isPrimary = String(student?.classId || '').trim() === classId
      const inferredName = isPrimary ? String(student?.className || '').trim() : ''
      upsert(classId, inferredName, 1)
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      const nameCompare = String(a.name || '').localeCompare(String(b.name || ''), 'sv')
      if (nameCompare !== 0) return nameCompare
      return String(a.id || '').localeCompare(String(b.id || ''), 'sv')
    })
    .map(item => ({ id: item.id, name: item.name }))
}

function getRecordClassIds(record) {
  if (!record || typeof record !== 'object') return []
  const seen = new Set()
  const ids = []
  const add = (value) => {
    const id = String(value || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    ids.push(id)
  }

  add(record.classId)
  if (Array.isArray(record.classIds)) {
    for (const value of record.classIds) {
      add(value)
    }
  }

  return ids
}

function resolveClassNames(classIds, classNameById = new Map(), fallbackClassName = '') {
  const names = []
  const seen = new Set()

  for (const classId of classIds || []) {
    const fromMap = String(classNameById.get(classId) || '').trim()
    if (fromMap && !seen.has(fromMap)) {
      seen.add(fromMap)
      names.push(fromMap)
    }
  }

  const fallback = String(fallbackClassName || '').trim()
  if (fallback && !seen.has(fallback)) {
    names.push(fallback)
  }

  return names
}

function getRecordClassLabel(record, classNameById = new Map()) {
  const classIds = getRecordClassIds(record)
  const names = resolveClassNames(classIds, classNameById, record?.className || '')
  if (names.length === 0) return ''
  return names.join(', ')
}

function recordMatchesClassFilter(record, selectedClassIds) {
  const selected = Array.isArray(selectedClassIds) ? selectedClassIds.filter(Boolean) : []
  if (selected.length === 0) return true
  const ids = getRecordClassIds(record)
  if (ids.length === 0) return false
  const selectedSet = new Set(selected)
  return ids.some(id => selectedSet.has(id))
}

function getPresetConfig(presetKey) {
  if (presetKey === 'addition') {
    return {
      title: 'Addition nivå 1-8',
      problemTypes: ['addition'],
      minLevel: 1,
      maxLevel: 8,
      targetCount: 20
    }
  }

  if (presetKey === 'multiplication') {
    return {
      title: 'Multiplikation nivå 3-10',
      problemTypes: ['multiplication'],
      minLevel: 3,
      maxLevel: 10,
      targetCount: 20
    }
  }

  if (presetKey === 'subtraction') {
    return {
      title: 'Subtraktion nivå 1-8',
      problemTypes: ['subtraction'],
      minLevel: 1,
      maxLevel: 8,
      targetCount: 20
    }
  }

  if (presetKey === 'division') {
    return {
      title: 'Division nivå 3-10',
      problemTypes: ['division'],
      minLevel: 3,
      maxLevel: 10,
      targetCount: 18
    }
  }

  return {
    title: 'Kombination nivå 2-10',
    problemTypes: ['addition', 'subtraction', 'multiplication', 'division'],
    minLevel: 2,
    maxLevel: 10,
    targetCount: 25
  }
}

function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function getInactiveDays(lastActive) {
  if (!lastActive) return Infinity
  return (Date.now() - lastActive) / DAY_MS
}

function getProblemLevel(problem) {
  const fromTarget = Number(problem?.targetLevel)
  if (Number.isFinite(fromTarget)) return fromTarget

  const fromDifficulty = Number(problem?.difficulty?.conceptual_level)
  if (Number.isFinite(fromDifficulty)) return fromDifficulty

  return null
}

function summarizeAssignmentAdherence(problems, assignment) {
  const attempts = Array.isArray(problems) ? problems.length : 0
  if (!assignment) {
    return {
      attempts,
      matchedAttempts: 0,
      rate: null,
      missedByOperation: 0,
      missedByLevel: 0
    }
  }

  let matchedAttempts = 0
  let missedByOperation = 0
  let missedByLevel = 0

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const level = getProblemLevel(problem)
    const operationMatch = assignment.problemTypes.includes(operation)
    const levelMatch = level === null
      ? true
      : level >= assignment.minLevel && level <= assignment.maxLevel

    if (operationMatch && levelMatch) matchedAttempts += 1
    else if (!operationMatch) missedByOperation += 1
    else if (!levelMatch) missedByLevel += 1
  }

  return {
    attempts,
    matchedAttempts,
    rate: attempts > 0 ? matchedAttempts / attempts : null,
    missedByOperation,
    missedByLevel
  }
}

function buildRiskSignals(input, activeAssignment) {
  const {
    lastActive,
    inactiveDays,
    weekAttempts,
    weekWrongCount,
    weekSuccessRate,
    weekReasonableWrongCount,
    weekAvgTimePerProblemSec,
    weekAssignment,
    todayAttempts,
    todaySuccessRate,
    todayStruggle
  } = input

  const riskCodes = []
  let riskScore = 0

  if (!lastActive) {
    riskScore += 45
    riskCodes.push('Aldrig aktiv')
  } else if (inactiveDays >= 7) {
    riskScore += 35
    riskCodes.push('Inaktiv 7+ dagar')
  } else if (inactiveDays >= 2) {
    riskScore += 18
    riskCodes.push('Inaktiv 2+ dagar')
  }

  if (weekAttempts >= 6 && weekSuccessRate < 0.55) {
    riskScore += 24
    riskCodes.push('Låg träff vecka')
  } else if (weekAttempts >= 6 && weekSuccessRate < 0.7) {
    riskScore += 10
    riskCodes.push('Svajig träff vecka')
  }

  const reasonableWrongRate = weekWrongCount > 0
    ? weekReasonableWrongCount / weekWrongCount
    : 1
  if (weekWrongCount >= 4 && reasonableWrongRate < 0.45) {
    riskScore += 18
    riskCodes.push('Många orimliga fel')
  }

  if (weekAttempts >= 6 && weekAvgTimePerProblemSec >= 60) {
    riskScore += 8
    riskCodes.push('Lång svarstid')
  }

  if (todayAttempts >= 4 && todaySuccessRate < 0.5) {
    riskScore += 10
    riskCodes.push('Tuff dag idag')
  }

  if (todayStruggle && todayStruggle.wrong >= 3) {
    riskScore += 8
    riskCodes.push(`Kämpar: ${todayStruggle.skillLabel}`)
  }

  if (activeAssignment && weekAssignment.attempts >= 4 && (weekAssignment.rate ?? 1) < 0.45) {
    riskScore += 14
    riskCodes.push('Låg uppdragsföljsamhet')
  }

  const successPenalty = weekAttempts >= 4
    ? Math.max(0, (0.75 - weekSuccessRate) * 30)
    : 0
  const reasonablePenalty = weekWrongCount >= 3
    ? Math.max(0, (0.65 - reasonableWrongRate) * 20)
    : 0
  const supportScore = Math.min(100, Math.round(riskScore + successPenalty + reasonablePenalty))
  const riskLevel = supportScore >= 70 ? 'high' : supportScore >= 40 ? 'medium' : 'low'

  return {
    riskLevel,
    riskScore: Math.min(100, Math.round(riskScore)),
    supportScore,
    riskCodes
  }
}

function pickFocusOperation(row) {
  if (row.weekStruggle?.operation) return row.weekStruggle.operation
  if (row.todayStruggle?.operation) return row.todayStruggle.operation
  if (row.primaryOperation && ALL_OPERATIONS.includes(row.primaryOperation)) return row.primaryOperation
  return 'addition'
}

function pickFocusLevel(row, operation) {
  const direct = Number(row.weekStruggle?.avgLevel)
  if (Number.isFinite(direct)) return clampLevel(Math.round(direct))

  const match = Array.isArray(row.weekBySkill)
    ? row.weekBySkill.find(item => item.operation === operation && Number.isFinite(item.avgLevel))
    : null
  if (match && Number.isFinite(match.avgLevel)) return clampLevel(Math.round(match.avgLevel))

  return clampLevel(Math.round(Number(row.currentDifficulty) || 1))
}

function clampLevel(value) {
  return Math.max(1, Math.min(12, Number(value) || 1))
}

function buildQuickAssignmentPreset(row, variant) {
  const operation = pickFocusOperation(row)
  const operationLabel = getOperationLabel(operation)
  const level = pickFocusLevel(row, operation)

  if (variant === 'warmup') {
    const minLevel = clampLevel(level - 2)
    const maxLevel = clampLevel(Math.max(minLevel, level - 1))
    return {
      title: `Värm upp ${row.name} | ${operationLabel} nivå ${minLevel}-${maxLevel}`,
      problemTypes: [operation],
      minLevel,
      maxLevel,
      targetCount: 10
    }
  }

  if (variant === 'challenge') {
    const minLevel = clampLevel(level)
    const maxLevel = clampLevel(level + 2)
    return {
      title: `Utmaning ${row.name} | Mix nivå ${minLevel}-${maxLevel}`,
      problemTypes: [...ALL_OPERATIONS],
      minLevel,
      maxLevel,
      targetCount: 16
    }
  }

  const minLevel = clampLevel(level - 1)
  const maxLevel = clampLevel(level + 1)
  return {
    title: `Fokus ${row.name} | ${operationLabel} nivå ${minLevel}-${maxLevel}`,
    problemTypes: [operation],
    minLevel,
    maxLevel,
    targetCount: 14
  }
}

function buildInactivityBuckets(rows) {
  const todayStart = getStartOfDayTimestamp()
  const now = Date.now()
  const counts = {
    notActiveToday: 0,
    twoDaysOrMore: 0,
    sevenDaysOrMore: 0,
    neverStarted: 0
  }

  for (const row of rows) {
    if (!row.lastActive || row.lastActive < todayStart) counts.notActiveToday += 1
    if (!row.lastActive || now - row.lastActive >= 2 * DAY_MS) counts.twoDaysOrMore += 1
    if (!row.lastActive || now - row.lastActive >= 7 * DAY_MS) counts.sevenDaysOrMore += 1
    if ((row.attempts || 0) === 0) counts.neverStarted += 1
  }

  return counts
}

function buildClassSummaries(classes, students, selectedClassIds, weekGoal) {
  const selected = new Set(selectedClassIds || [])
  const visibleClasses = selected.size > 0
    ? classes.filter(item => selected.has(item.id))
    : classes
  const weekStart = getStartOfWeekTimestamp()

  return visibleClasses.map(item => {
    const classStudents = students.filter(student => recordMatchesClassFilter(student, [item.id]))
    const studentCount = classStudents.length
    let startedCount = 0
    let weeklyActiveCount = 0
    let weeklyGoalReachedCount = 0

    for (const student of classStudents) {
      const problems = Array.isArray(student.recentProblems) ? student.recentProblems : []
      if (problems.length > 0) startedCount += 1
      const weekAttempts = problems.filter(problem => problem.timestamp >= weekStart).length
      if (weekAttempts > 0) weeklyActiveCount += 1
      if (weekAttempts >= weekGoal) weeklyGoalReachedCount += 1
    }

    return {
      classId: item.id,
      className: item.name,
      studentCount,
      startedCount,
      notStartedCount: Math.max(0, studentCount - startedCount),
      weeklyActiveCount,
      weeklyGoalReachedCount,
      weeklyGoalReachedRate: studentCount > 0 ? weeklyGoalReachedCount / studentCount : 0
    }
  }).sort((a, b) => a.className.localeCompare(b.className, 'sv'))
}

function buildTableDevelopmentOverview(students) {
  const start7d = Date.now() - (7 * DAY_MS)
  const start14d = Date.now() - (14 * DAY_MS)
  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const stats = new Map()

  for (const table of tables) {
    stats.set(table, {
      table,
      recent: [],
      previous: []
    })
  }

  for (const student of students) {
    const problems = Array.isArray(student?.recentProblems) ? student.recentProblems : []
    for (const problem of problems) {
      const table = inferTableFromProblem(problem)
      if (!table || !stats.has(table)) continue
      const ts = Number(problem.timestamp || 0)
      if (!Number.isFinite(ts) || ts <= 0) continue
      if (ts >= start7d) {
        stats.get(table).recent.push(problem)
      } else if (ts >= start14d) {
        stats.get(table).previous.push(problem)
      }
    }
  }

  const output = []
  for (const entry of stats.values()) {
    if (entry.recent.length === 0 && entry.previous.length === 0) continue
    const accuracy7d = getAccuracy(entry.recent)
    const accuracyPrev = getAccuracy(entry.previous)
    const medianTime7d = getMedianTime(entry.recent)
    const medianTimePrev = getMedianTime(entry.previous)
    output.push({
      table: entry.table,
      attempts7d: entry.recent.length,
      accuracy7d,
      accuracyTrend: (accuracy7d === null || accuracyPrev === null) ? null : accuracy7d - accuracyPrev,
      medianTime7d,
      speedTrend: (medianTime7d === null || medianTimePrev === null || medianTimePrev <= 0)
        ? null
        : (medianTimePrev - medianTime7d) / medianTimePrev
    })
  }

  return output.sort((a, b) => a.table - b.table)
}

function buildDataQualitySummary(rows) {
  const list = Array.isArray(rows) ? rows : []
  const totalStudents = list.length
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      withTelemetry: 0,
      withPresenceToday: 0,
      sessionGapStudents: 0,
      answerMismatchStudents: 0,
      needsFollowUpNames: [],
      overallQuality: 0
    }
  }

  const startToday = getStartOfDayTimestamp()
  const withTelemetry = list.filter(row => (row.telemetryEventCount || 0) > 0).length
  const withPresenceToday = list.filter(row => Number(row.presenceLastSeenAt || 0) >= startToday).length
  const sessionGapStudents = list.filter(row => (
    Number(row.todayPracticeSessionsStarted || 0) > Number(row.todayPracticeSessionsEnded || 0)
  )).length
  const answerMismatchStudents = list.filter(row => (
    Math.abs(Number(row.todayPracticeAnswersTelemetry || 0) - Number(row.todayAttempts || 0)) >= 4
  )).length

  const needsFollowUpNames = list
    .filter(row => (
      (row.hasLoggedIn && (row.telemetryEventCount || 0) === 0)
      || (Number(row.todayPracticeSessionsStarted || 0) > Number(row.todayPracticeSessionsEnded || 0))
      || (Math.abs(Number(row.todayPracticeAnswersTelemetry || 0) - Number(row.todayAttempts || 0)) >= 4)
    ))
    .map(row => row.name)
    .slice(0, 8)

  const telemetryCoverage = withTelemetry / totalStudents
  const presenceCoverage = withPresenceToday / totalStudents
  const sessionGapScore = 1 - (sessionGapStudents / totalStudents)
  const mismatchScore = 1 - (answerMismatchStudents / totalStudents)
  const overallQuality = clampUnit((telemetryCoverage + presenceCoverage + sessionGapScore + mismatchScore) / 4)

  return {
    totalStudents,
    withTelemetry,
    withPresenceToday,
    sessionGapStudents,
    answerMismatchStudents,
    needsFollowUpNames,
    overallQuality
  }
}

function buildUsageInsights(rows, students) {
  const safeRows = Array.isArray(rows) ? rows : []
  const safeStudents = Array.isArray(students) ? students : []
  const activeStudents = safeRows.filter(row => (
    Number(row.todayEngagedMinutes || 0) > 0
    || Number(row.todayPracticeAnswersTelemetry || 0) > 0
    || Number(row.todayTicketSubmitted || 0) > 0
  ))
  const totalEngagedSeconds = safeRows.reduce((sum, row) => sum + (Number(row.todayEngagedMinutes || 0) * 60), 0)
  const avgEngagedSecondsPerActiveStudent = activeStudents.length > 0
    ? totalEngagedSeconds / activeStudents.length
    : 0

  const breakPrompts = safeRows.reduce((sum, row) => sum + Number(row.todayBreakPromptsShown || 0), 0)
  const breaksTaken = safeRows.reduce((sum, row) => sum + Number(row.todayBreaksTaken || 0), 0)
  const breakTakeRate = breakPrompts > 0 ? breaksTaken / breakPrompts : null

  const ticketSubmittedToday = safeRows.reduce((sum, row) => sum + Number(row.todayTicketSubmitted || 0), 0)
  const ticketCorrectToday = safeRows.reduce((sum, row) => sum + Number(row.todayTicketCorrect || 0), 0)
  const ticketAccuracyToday = ticketSubmittedToday > 0 ? ticketCorrectToday / ticketSubmittedToday : null

  const launchCounts = new Map()
  const errorCategoryCounts = new Map()
  const sessionDurations = []
  const weekStart = Date.now() - (7 * DAY_MS)

  for (const student of safeStudents) {
    const events = Array.isArray(student?.telemetry?.events) ? student.telemetry.events : []
    for (const event of events) {
      const ts = Number(event?.ts || 0)
      if (!Number.isFinite(ts) || ts < weekStart) continue
      const type = String(event?.type || '')
      const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {}

      if (type === 'practice_launch_free') {
        increaseCount(launchCounts, 'Fri träning')
      } else if (type === 'practice_launch_table_drill') {
        increaseCount(launchCounts, 'Tabellträning')
      } else if (type === 'practice_launch_assignment_or_free') {
        increaseCount(launchCounts, payload.assignmentId ? 'Uppdrag' : 'Fri/Uppdrag')
      } else if (type === 'practice_launch_operation') {
        increaseCount(launchCounts, getOperationLabel(String(payload.operation || 'okänd')))
      }

      if (type === 'practice_answer' && payload.correct === false) {
        const label = String(payload.errorCategory || 'okänd')
        increaseCount(errorCategoryCounts, label)
      }

      if (type === 'practice_session_end') {
        const durationSec = Number(payload.durationSec)
        if (Number.isFinite(durationSec) && durationSec >= 0) {
          sessionDurations.push(durationSec)
        }
      }
    }
  }

  return {
    avgEngagedSecondsPerActiveStudent,
    medianSessionDurationSeconds: medianNumber(sessionDurations) || 0,
    breakTakeRate,
    ticketAccuracyToday,
    topLaunchModes: toTopEntries(launchCounts, 3),
    topErrorCategories: toTopEntries(errorCategoryCounts, 3)
  }
}

function buildSnapshotCsvRows(rows, viewMode, weekGoal) {
  return rows.map(row => {
    const base = {
      Namn: row.name,
      ID: row.studentId,
      Klass: row.classNameLabel || row.className || '',
      SenastAktiv: formatTimestampForCsv(row.lastActive),
      TidPaUppgiftIdagMin: toFixedOrEmpty(row.todayEngagedMinutes, 2),
      TidPaUppgift7dMin: toFixedOrEmpty(row.weekEngagedMinutes, 2),
      InteraktionerIdag: row.todayPresenceInteractions,
      Interaktioner7d: row.weekPresenceInteractions,
      RiskNiva: row.riskLevel,
      RiskScore: row.riskScore,
      StodScore: row.supportScore
    }

    if (viewMode === 'daily') {
      return {
        ...base,
        DagensMängd: row.todayAttempts,
        DagensRatt: row.todayCorrectCount,
        DagensFel: row.todayWrongCount,
        DagensKunskapsfel: row.todayKnowledgeWrongCount,
        DagensOuppmärksamhetsfel: row.todayInattentionCount,
        DagensTraff: toPercent(row.todaySuccessRate),
        DagensUppdragsföljsamhet: row.todayAssignmentAdherenceRate === null ? '-' : toPercent(row.todayAssignmentAdherenceRate),
        DagensKamparMed: row.todayStruggle?.skillLabel || ''
      }
    }

    if (viewMode === 'weekly') {
      return {
        ...base,
        VeckansMängd: row.weekAttempts,
        VeckansRatt: row.weekCorrectCount,
        VeckansFel: row.weekWrongCount,
        VeckansKunskapsfel: row.weekKnowledgeWrongCount,
        VeckansOuppmärksamhetsfel: row.weekInattentionCount,
        VeckansTraff: toPercent(row.weekSuccessRate),
        VeckansAktivTidSek: Math.round(row.weekActiveTimeSec || 0),
        VeckansMål: weekGoal,
        VeckansMålNått: row.weekAttempts >= weekGoal ? 'ja' : 'nej',
        VeckansUppdragsföljsamhet: row.weekAssignmentAdherenceRate === null ? '-' : toPercent(row.weekAssignmentAdherenceRate),
        VeckansKamparMed: row.weekStruggle?.skillLabel || ''
      }
    }

    return {
      ...base,
      FörsökTotalt: row.attempts,
      RattTotalt: row.correctCount,
      OuppmärksamhetsfelTotalt: row.inattentionErrorCount,
      TraffTotalt: toPercent(row.successRate),
      RimlighetTotalt: toPercent(row.reasonableRate),
      Uppdragsfoljsamhet: row.assignmentAdherenceRate === null ? '-' : toPercent(row.assignmentAdherenceRate),
      Trend: row.trend === null ? '' : `${row.trend >= 0 ? '+' : ''}${Math.round(row.trend * 100)}%`
    }
  })
}

function buildActivityExportRows(rows) {
  return rows.map(row => ({
    ElevNamn: row.name,
    ElevID: row.studentId,
    Klass: row.classNameLabel || row.className || '',
    AktivNuStatus: row.activityStatus,
    HarLoggatIn: row.hasLoggedIn ? 1 : 0,
    LoginCount: row.loginCount,
    SenastAktiv: formatTimestampForCsv(row.lastActive),
    FokusSida: row.presencePage || '',
    TidPaUppgiftIdagMin: toFixedOrEmpty(row.todayEngagedMinutes, 2),
    FokusTidIdagMin: toFixedOrEmpty(row.todayFocusMinutes, 2),
    InteraktionerIdag: row.todayPresenceInteractions,
    TidPaUppgift7dMin: toFixedOrEmpty(row.weekEngagedMinutes, 2),
    FokusTid7dMin: toFixedOrEmpty(row.weekFocusMinutes, 2),
    Interaktioner7d: row.weekPresenceInteractions,
    TraningStarterIdag: row.todayPracticeLaunches,
    TraningSvarIdag: row.todayPracticeAnswersTelemetry,
    TraningRattIdag: row.todayPracticeCorrectTelemetry,
    TraningFelIdag: row.todayPracticeWrongTelemetry,
    TicketSvarIdag: row.todayTicketSubmitted,
    TicketRattIdag: row.todayTicketCorrect,
    TicketFelIdag: row.todayTicketWrong,
    PausFragorIdag: row.todayBreakPromptsShown,
    PauserTagnaIdag: row.todayBreaksTaken,
    PauserSkippadeIdag: row.todayBreaksSkipped,
    SessionerStartadeIdag: row.todayPracticeSessionsStarted,
    SessionerAvslutadeIdag: row.todayPracticeSessionsEnded,
    TelemetryEventsTotal: row.telemetryEventCount
  }))
}

function rowsToCsv(rows) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(';')]
  for (const row of rows) {
    const cells = headers.map(header => toCsvField(row[header]))
    lines.push(cells.join(';'))
  }
  return `${lines.join('\r\n')}\r\n`
}

function toCsvField(value) {
  const text = String(value ?? '')
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function downloadTextFile(content, fileName, mimeType) {
  const normalizedMimeType = mimeType || 'text/plain;charset=utf-8;'
  const isCsv = String(normalizedMimeType).toLowerCase().includes('text/csv')
  const payload = isCsv
    ? ensureUtf8Bom(content)
    : String(content ?? '')
  const blob = new Blob([payload], { type: normalizedMimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ensureUtf8Bom(content) {
  const text = String(content ?? '')
  if (text.startsWith('\uFEFF')) return text
  return `\uFEFF${text}`
}

function formatTimestampForCsv(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toISOString()
}

function InlineHelp({ text = '' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const handleClose = () => setOpen(false)
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const normalizedText = String(text || '').trim()
  if (!normalizedText) return null

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Visa tolkning"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(prev => !prev)
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold text-gray-500 hover:text-gray-700 hover:border-gray-400"
      >
        i
      </button>
      {open ? (
        <span
          onClick={(event) => event.stopPropagation()}
          className="absolute left-0 top-5 z-40 w-64 rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-normal leading-relaxed text-gray-700 shadow-lg"
        >
          {normalizedText}
        </span>
      ) : null}
    </span>
  )
}

function RiskBadge({ level, score }) {
  const badgeClass = level === 'high'
    ? 'bg-red-100 text-red-700 border-red-200'
    : level === 'medium'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200'

  const label = level === 'high' ? 'Hög risk' : level === 'medium' ? 'Medel risk' : 'Låg risk'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}>
      {label} {Number.isFinite(score) ? `(${score})` : ''}
    </span>
  )
}

function ActivityBadge({ code, compact = false }) {
  const tone = resolveActivityTone(code)
  const label = resolveActivityLabel(code)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${tone.badgeClass}`}>
      <span className={`w-2 h-2 rounded-full ${tone.dotClass}`} />
      {compact ? label : `${label}`}
    </span>
  )
}

function TeacherMasteryLevelGrid({ label, operation, levels }) {
  return (
    <div className="flex flex-col gap-1 mb-1">
      <span className="text-[11px] text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-1">
        {levels.map(levelData => (
          <span
            key={`teacher-mastery-${operation}-${label}-${levelData.level}`}
            title={levelData.title}
            className={`inline-flex h-9 w-9 flex-col items-center justify-center rounded border text-[9px] leading-none ${getTeacherMasteryLevelClassName(levelData.status)}`}
          >
            <span className="font-bold text-[10px]">{levelData.level}</span>
            <span className="mt-0.5">{levelData.metricsLabel}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function buildTeacherStudentViewData(student) {
  if (!student) return null
  const tableSticky = buildStickyTableStatusForStudent(student)
  const tablePerformanceByTable = buildTablePerformanceByTable(student)
  const operationMasteryBoards = buildOperationMasteryBoardsForTeacher(student)
  const levelErrorRows = buildLevelErrorRowsForTeacher(student)

  return {
    tableSticky,
    tablePerformanceByTable,
    operationMasteryBoards,
    levelErrorRows
  }
}

function buildOperationMasteryBoardsForTeacher(student) {
  const problems = Array.isArray(student?.recentProblems) ? student.recentProblems : []
  const weekStart = getStartOfWeekTimestamp()
  const buckets = Object.fromEntries(
    ALL_OPERATIONS.map(operation => [operation, createOperationLevelBucketsForTeacher()])
  )

  for (const result of problems) {
    const operation = inferOperationFromProblemType(result.problemType)
    if (!Object.prototype.hasOwnProperty.call(buckets, operation)) continue

    const level = Math.round(Number(result?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue

    buckets[operation].historical[level].attempts += 1
    if (result.correct) buckets[operation].historical[level].correct += 1

    if (Number(result.timestamp || 0) >= weekStart) {
      buckets[operation].weekly[level].attempts += 1
      if (result.correct) buckets[operation].weekly[level].correct += 1
    }
  }

  return ALL_OPERATIONS.map(operation => ({
    operation,
    historical: LEVELS.map(level => buildTeacherLevelView(level, buckets[operation].historical[level])),
    weekly: LEVELS.map(level => buildTeacherLevelView(level, buckets[operation].weekly[level]))
  }))
}

function buildLevelErrorRowsForTeacher(student) {
  const source = getTableProblemSourceForStudent(student)
  const grouped = new Map()

  for (const problem of source) {
    const operation = inferOperationFromProblemType(problem?.problemType || '')
    if (!ALL_OPERATIONS.includes(operation)) continue

    const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue

    const key = `${operation}|${level}`
    const existing = grouped.get(key) || {
      operation,
      operationLabel: getOperationLabel(operation),
      level,
      attempts: 0,
      correct: 0,
      wrong: 0,
      knowledgeWrong: 0,
      inattentionWrong: 0
    }

    existing.attempts += 1
    if (problem?.correct) {
      existing.correct += 1
    } else {
      existing.wrong += 1
      if (isKnowledgeError(problem)) {
        existing.knowledgeWrong += 1
      } else {
        existing.inattentionWrong += 1
      }
    }

    grouped.set(key, existing)
  }

  return Array.from(grouped.values()).map(item => {
    const attempts = Number(item.attempts || 0)
    const correct = Number(item.correct || 0)
    const wrong = Number(item.wrong || 0)
    return {
      ...item,
      attempts,
      correct,
      wrong,
      successRate: attempts > 0 ? correct / attempts : 0,
      errorShare: attempts > 0 ? wrong / attempts : 0
    }
  })
}

function createOperationLevelBucketsForTeacher() {
  const makeLevelMap = () => Object.fromEntries(
    LEVELS.map(level => [level, { attempts: 0, correct: 0 }])
  )

  return {
    historical: makeLevelMap(),
    weekly: makeLevelMap()
  }
}

function buildTeacherLevelView(level, bucket = {}) {
  const attempts = Number(bucket.attempts || 0)
  const correct = Number(bucket.correct || 0)
  const successRate = attempts > 0 ? correct / attempts : 0
  const isMastered = attempts >= MASTERY_MIN_ATTEMPTS && successRate >= MASTERY_MIN_SUCCESS_RATE
  const isStarted = attempts > 0
  const status = isMastered ? 'mastered' : (isStarted ? 'started' : 'empty')
  const successPercent = Math.round(successRate * 100)

  return {
    level,
    attempts,
    correct,
    successRate,
    status,
    metricsLabel: isStarted ? `${correct}/${attempts}` : '-',
    title: isStarted
      ? `Nivå ${level}: ${correct}/${attempts} rätt (${successPercent}%)`
      : `Nivå ${level}: ingen träning ännu`
  }
}

function getTeacherMasteryLevelClassName(status) {
  if (status === 'mastered') {
    return 'bg-green-100 text-green-800 border-green-300'
  }
  if (status === 'started') {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }
  return 'bg-gray-50 text-gray-400 border-gray-200 opacity-45'
}

function buildTablePerformanceByTable(student) {
  const source = getTableProblemSourceForStudent(student)
  const start7d = Date.now() - (7 * DAY_MS)
  const output = Object.fromEntries(
    TABLES.map(table => [table, {
      attemptsTotal: 0,
      correctTotal: 0,
      accuracyTotal: null,
      attempts7d: 0,
      correct7d: 0,
      accuracy7d: null
    }])
  )

  for (const problem of source) {
    const table = inferTableFromProblem(problem)
    if (!table || !Object.prototype.hasOwnProperty.call(output, table)) continue
    const target = output[table]
    target.attemptsTotal += 1
    if (problem.correct) target.correctTotal += 1

    const ts = Number(problem?.timestamp || 0)
    if (ts >= start7d) {
      target.attempts7d += 1
      if (problem.correct) target.correct7d += 1
    }
  }

  for (const table of TABLES) {
    const item = output[table]
    item.accuracyTotal = item.attemptsTotal > 0 ? item.correctTotal / item.attemptsTotal : null
    item.accuracy7d = item.attempts7d > 0 ? item.correct7d / item.attempts7d : null
  }

  return output
}

function buildStudentDetailExportRows(student, row, detailData) {
  if (!student || !row || !detailData) return []
  const rows = []
  const add = (partial = {}) => {
    rows.push({
      Sektion: '',
      Nyckel: '',
      Del: '',
      Niva: '',
      Tabell: '',
      Status: '',
      Forsok: '',
      Ratt: '',
      TraffProcent: '',
      TidSek: '',
      Varde: '',
      Tidsstampel: '',
      ...partial
    })
  }

  const now = Date.now()
  add({ Sektion: 'Sammanfattning', Nyckel: 'Elev', Varde: String(student.name || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'ElevID', Varde: String(student.studentId || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'Klass', Varde: String(row.classNameLabel || row.className || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TotaltLosta', Forsok: Number(student?.stats?.totalProblems || row.attempts || 0) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TraffTotalt', TraffProcent: toPercent(row.successRate) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'IdagForsok', Forsok: Number(row.todayAttempts || 0) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'VeckaForsok', Forsok: Number(row.weekAttempts || 0) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TidPaUppgiftIdagSek', TidSek: Math.round((Number(row.todayEngagedMinutes || 0) * 60)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TidPaUppgift7dSek', TidSek: Math.round((Number(row.weekEngagedMinutes || 0) * 60)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaNu', Varde: String(Number(row.currentDifficulty || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaHogst', Varde: String(Number(row.highestDifficulty || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'Aktivitet', Status: String(row.activityStatus || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'SvagastTyper', Varde: formatSkillList(student?.stats?.weakestTypes) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'StarkastTyper', Varde: formatSkillList(student?.stats?.strongestTypes) })

  for (const table of TABLES) {
    const perf = detailData.tablePerformanceByTable[table]
    const status = detailData.tableSticky.statusByTable[table] || 'default'
    add({
      Sektion: 'Tabellstatus',
      Nyckel: 'Tabell',
      Tabell: `${table}`,
      Status: getTeacherTableStatusLabel(status),
      Forsok: Number(perf.attemptsTotal || 0),
      Ratt: Number(perf.correctTotal || 0),
      TraffProcent: toPercent(perf.accuracyTotal),
      Del: 'Totalt'
    })
    add({
      Sektion: 'Tabellstatus',
      Nyckel: 'Tabell7d',
      Tabell: `${table}`,
      Status: getTeacherTableStatusLabel(status),
      Forsok: Number(perf.attempts7d || 0),
      Ratt: Number(perf.correct7d || 0),
      TraffProcent: toPercent(perf.accuracy7d),
      Del: '7d'
    })
  }

  for (const operationItem of detailData.operationMasteryBoards) {
    for (const period of ['historical', 'weekly']) {
      const label = period === 'historical' ? 'Historiskt' : 'DennaVecka'
      for (const level of operationItem[period]) {
        add({
          Sektion: 'Nivastatus',
          Nyckel: 'Niva',
          Del: `${operationItem.operation}:${label}`,
          Niva: String(level.level),
          Status: String(level.status || ''),
          Forsok: Number(level.attempts || 0),
          Ratt: Number(level.correct || 0),
          TraffProcent: toPercent(level.successRate)
        })
      }
    }
  }

  const problemSource = getTableProblemSourceForStudent(student)
  const recentProblems = problemSource
    .slice()
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
    .slice(0, 80)

  for (const problem of recentProblems) {
    const ts = Number(problem?.timestamp || 0)
    add({
      Sektion: 'SenasteProblem',
      Nyckel: String(problem?.problemType || ''),
      Del: inferOperationFromProblemType(problem?.problemType || ''),
      Niva: String(Math.round(Number(problem?.difficulty?.conceptual_level || 0)) || ''),
      Tabell: String(inferTableFromProblem(problem) || ''),
      Status: problem?.correct ? 'Ratt' : 'Fel',
      TidSek: Number.isFinite(getSpeedTime(problem)) ? Number(getSpeedTime(problem).toFixed(2)) : '',
      Varde: String(problem?.errorCategory || ''),
      Tidsstampel: ts > 0 ? new Date(ts).toISOString() : ''
    })
  }

  add({
    Sektion: 'Metadata',
    Nyckel: 'Exporterad',
    Varde: 'Ja',
    Tidsstampel: new Date(now).toISOString()
  })

  return rows
}

const SKILL_TYPE_LABEL_OVERRIDES = {
  mul_table_drill: 'Tabellträning'
}

const SKILL_OPERATION_SYMBOLS = {
  add: '+',
  sub: '-',
  mul: '*',
  div: '/'
}

const SKILL_QUALIFIER_LABELS = {
  no_carry: 'utan övergång',
  carry: 'med övergång',
  with_carry: 'med övergång',
  no_borrow: 'utan lån',
  borrow: 'med lån',
  easy: 'enkel',
  basic: 'grund',
  full: 'full',
  guided: 'guidad',
  intro: 'intro',
  foundation: 'grund',
  tens_friendly: 'tiotalsvänlig',
  small: 'små tal'
}

function formatSkillList(list) {
  if (!Array.isArray(list) || list.length === 0) return '-'
  return list
    .slice(0, 6)
    .map(item => formatSkillTypeLabel(item))
    .filter(Boolean)
    .join(', ') || '-'
}

function formatSkillTypeLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (Object.prototype.hasOwnProperty.call(SKILL_TYPE_LABEL_OVERRIDES, raw)) {
    return SKILL_TYPE_LABEL_OVERRIDES[raw]
  }

  const parts = raw.split('_')
  const operationPrefix = parts[0]
  const symbol = SKILL_OPERATION_SYMBOLS[operationPrefix]
  if (!symbol) return raw

  let tokenIndex = 1
  let decimalMode = false
  if (parts[tokenIndex] === 'dec') {
    decimalMode = true
    tokenIndex += 1
  }

  const leftToken = parts[tokenIndex]
  const rightToken = parts[tokenIndex + 1]
  if (!leftToken || !rightToken) return raw

  const left = formatSkillOperandToken(leftToken, decimalMode, operationPrefix)
  const right = formatSkillOperandToken(rightToken, decimalMode, operationPrefix)
  if (!left || !right) return raw

  const qualifier = formatSkillQualifier(parts.slice(tokenIndex + 2))
  const base = `${left}${symbol}${right}`
  return qualifier ? `${base} (${qualifier})` : base
}

function formatSkillOperandToken(token, decimalMode, operationPrefix) {
  const text = String(token || '').trim()
  if (!text) return ''

  const dpMatch = text.match(/^(\d+)dp$/)
  if (dpMatch) {
    const digits = Number(dpMatch[1])
    if (!Number.isInteger(digits) || digits <= 0) return text
    return `${digits},${digits}`
  }

  const dMatch = text.match(/^(\d+)d$/)
  if (dMatch) {
    const digits = Number(dMatch[1])
    if (!Number.isInteger(digits) || digits <= 0) return text
    if (decimalMode && (operationPrefix === 'add' || operationPrefix === 'sub') && digits >= 2) {
      return `${digits},1`
    }
    return `${digits}`
  }

  return text
}

function formatSkillQualifier(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return ''
  const key = parts.join('_')
  if (Object.prototype.hasOwnProperty.call(SKILL_QUALIFIER_LABELS, key)) {
    return SKILL_QUALIFIER_LABELS[key]
  }
  return key.replace(/_/g, ' ')
}

function buildStudentRow(student, activeAssignment = null, classNameById = new Map()) {
  const recentProblems = Array.isArray(student.recentProblems) ? student.recentProblems : []
  const classIds = getRecordClassIds(student)
  const classNames = resolveClassNames(classIds, classNameById, student.className || '')
  const classNameLabel = classNames.length > 0 ? classNames.join(', ') : ''
  const primaryClassName = classNames[0] || String(student.className || '')
  const attempts = recentProblems.length
  const correctCount = recentProblems.filter(p => p.correct).length
  const inattentionErrorCount = recentProblems.filter(
    p => !p.correct && String(p.errorCategory || '') === 'inattention'
  ).length
  const successRate = attempts > 0 ? correctCount / attempts : 0

  const quality = recentProblems.map(p => evaluateAnswerQuality(p))
  const reasonableCount = quality.filter(q => q.isReasonable).length
  const reasonableRate = attempts > 0 ? reasonableCount / attempts : 0

  const wrongQuality = quality.filter((q, idx) => {
    const problem = recentProblems[idx]
    return !problem.correct && isKnowledgeError(problem)
  })
  const avgRelativeError = wrongQuality.length > 0
    ? wrongQuality.reduce((sum, q) => sum + q.relativeError, 0) / wrongQuality.length
    : null

  const trend = calculateTrend(recentProblems)
  const lastActive = recentProblems[recentProblems.length - 1]?.timestamp || null
  const inactiveDays = getInactiveDays(lastActive)

  const todayStart = getStartOfDayTimestamp()
  const todayProblems = recentProblems.filter(problem => problem.timestamp >= todayStart)
  const todayAttempts = todayProblems.length
  const todayCorrectCount = todayProblems.filter(problem => problem.correct).length
  const todayWrongCount = todayAttempts - todayCorrectCount
  const todayKnowledgeWrongCount = todayProblems.filter(problem => !problem.correct && isKnowledgeError(problem)).length
  const todayInattentionCount = todayProblems.filter(problem => problem.errorCategory === 'inattention').length
  const todaySuccessRate = todayAttempts > 0 ? todayCorrectCount / todayAttempts : 0
  const todayWrongReasonable = todayProblems
    .filter(problem => !problem.correct && isKnowledgeError(problem))
    .map(problem => evaluateAnswerQuality(problem))
    .filter(item => item.isReasonable)
    .length
  const todayAvgAnswerLength = getAverageAnswerLength(todayProblems)
  const todayByOperation = summarizeByOperation(todayProblems)
  const todayBySkill = summarizeBySkill(todayProblems)
  const todayOperationSummary = todayByOperation.length > 0
    ? todayByOperation.map(item => `${getOperationLabel(item.operation)}: ${item.attempts}`).join(' | ')
    : '-'
  const todayStruggle = getStruggleSkill(todayBySkill)
  const todayStruggleIndex = todayStruggle
    ? ((todayStruggle.wrong / Math.max(1, todayStruggle.attempts)) * 100) + todayStruggle.wrong
    : 0

  const weekStart = getStartOfWeekTimestamp()
  const weekProblems = student.recentProblems.filter(problem => problem.timestamp >= weekStart)
  const weekAttempts = weekProblems.length
  const weekCorrectCount = weekProblems.filter(problem => problem.correct).length
  const weekWrongCount = weekAttempts - weekCorrectCount
  const weekKnowledgeWrongCount = weekProblems.filter(problem => !problem.correct && isKnowledgeError(problem)).length
  const weekInattentionCount = weekProblems.filter(problem => problem.errorCategory === 'inattention').length
  const weekSuccessRate = weekAttempts > 0 ? weekCorrectCount / weekAttempts : 0
  const weekWrongReasonable = weekProblems
    .filter(problem => !problem.correct && isKnowledgeError(problem))
    .map(problem => evaluateAnswerQuality(problem))
    .filter(item => item.isReasonable)
    .length
  const weekSpeedTimes = weekProblems
    .map(problem => getSpeedTime(problem))
    .filter(value => Number.isFinite(value))
  const weekActiveTimeSec = weekSpeedTimes.reduce((sum, value) => sum + value, 0)
  const weekAvgTimePerProblemSec = weekSpeedTimes.length > 0
    ? weekActiveTimeSec / weekSpeedTimes.length
    : 0
  const weekAvgAnswerLength = getAverageAnswerLength(weekProblems)
  const weekByOperation = summarizeByOperation(weekProblems)
  const weekBySkill = summarizeBySkill(weekProblems)
  const weekOperationSummary = weekByOperation.length > 0
    ? weekByOperation.map(item => `${getOperationLabel(item.operation)}: ${item.attempts}`).join(' | ')
    : '-'
  const weekStruggle = getStruggleSkill(weekBySkill)
  const weekStruggleIndex = weekStruggle
    ? ((weekStruggle.wrong / Math.max(1, weekStruggle.attempts)) * 100) + weekStruggle.wrong
    : 0

  const todayAssignment = summarizeAssignmentAdherence(todayProblems, activeAssignment)
  const weekAssignment = summarizeAssignmentAdherence(weekProblems, activeAssignment)
  const overallAssignment = summarizeAssignmentAdherence(recentProblems, activeAssignment)
  const primaryOperation = (
    weekByOperation[0]?.operation
    || todayByOperation[0]?.operation
    || inferOperationFromProblemType(recentProblems[recentProblems.length - 1]?.problemType || '')
  )
  const focusOperation = todayByOperation[0]?.operation || primaryOperation || 'addition'
  const presenceStatus = getStudentPresenceStatus(student, {
    now: Date.now(),
    startToday: todayStart
  })
  const activeNow = presenceStatus.code === 'green'
  const telemetry = summarizeTelemetryWindow(student)
  const telemetryToday = telemetry.today || {}
  const telemetryWeek = telemetry.week || {}

  const riskSignals = buildRiskSignals({
    attempts,
    lastActive,
    inactiveDays,
    weekAttempts,
    weekWrongCount: weekKnowledgeWrongCount,
    weekSuccessRate,
    weekReasonableWrongCount: weekWrongReasonable,
    weekAvgTimePerProblemSec,
    weekAssignment,
    todayAttempts,
    todayWrongCount: todayKnowledgeWrongCount,
    todaySuccessRate,
    todayReasonableWrongCount: todayWrongReasonable,
    todayStruggle
  }, activeAssignment)

  return {
    studentId: student.studentId,
    name: student.name,
    classId: classIds[0] || '',
    classIds,
    className: primaryClassName,
    classNames,
    classNameLabel,
    currentDifficulty: Number(student.currentDifficulty) || 1,
    highestDifficulty: Number(student.highestDifficulty) || Number(student.currentDifficulty) || 1,
    hasLoggedIn: Boolean(student.auth?.lastLoginAt),
    loginCount: Number(student.auth?.loginCount) || 0,
    attempts,
    correctCount,
    inattentionErrorCount,
    successRate,
    reasonableCount,
    reasonableRate,
    avgRelativeError,
    trend,
    lastActive,
    inactiveDays,
    primaryOperation,
    focusOperation,
    activeNow,
    activityStatus: presenceStatus.code,
    activityLabel: presenceStatus.label,
    presenceLastSeenAt: presenceStatus.lastPresenceAt || null,
    presenceLastInteractionAt: presenceStatus.lastInteractionAt || null,
    presenceInFocus: Boolean(presenceStatus.inFocus),
    presencePage: presenceStatus.page || '',
    telemetryEventCount: Array.isArray(student?.telemetry?.events) ? student.telemetry.events.length : 0,
    todayFocusMinutes: toMinutes(telemetryToday.focus_ms),
    todayEngagedMinutes: toMinutes(telemetryToday.engaged_ms),
    todayPresenceInteractions: Number(telemetryToday.interactions || 0),
    weekFocusMinutes: toMinutes(telemetryWeek.focus_ms),
    weekEngagedMinutes: toMinutes(telemetryWeek.engaged_ms),
    weekPresenceInteractions: Number(telemetryWeek.interactions || 0),
    todayPracticeLaunches: Number(telemetryToday.practice_launches || 0),
    todayPracticeAnswersTelemetry: Number(telemetryToday.practice_answers || 0),
    todayPracticeCorrectTelemetry: Number(telemetryToday.practice_correct || 0),
    todayPracticeWrongTelemetry: Number(telemetryToday.practice_wrong || 0),
    todayTicketSubmitted: Number(telemetryToday.ticket_submitted || 0),
    todayTicketCorrect: Number(telemetryToday.ticket_correct || 0),
    todayTicketWrong: Number(telemetryToday.ticket_wrong || 0),
    todayBreakPromptsShown: Number(telemetryToday.break_prompts_shown || 0),
    todayBreaksTaken: Number(telemetryToday.breaks_taken || 0),
    todayBreaksSkipped: Number(telemetryToday.breaks_skipped || 0),
    todayPracticeSessionsStarted: Number(telemetryToday.practice_sessions_started || 0),
    todayPracticeSessionsEnded: Number(telemetryToday.practice_sessions_ended || 0),
    activeToday: todayAttempts > 0,
    todayAttempts,
    todayCorrectCount,
    todayWrongCount,
    todayKnowledgeWrongCount,
    todayInattentionCount,
    todaySuccessRate,
    todayReasonableWrongCount: todayWrongReasonable,
    todayAvgAnswerLength,
    todayByOperation,
    todayBySkill,
    todayOperationSummary,
    todayStruggle,
    todayStruggleIndex,
    todayAssignmentAttempts: todayAssignment.attempts,
    todayAssignmentMatched: todayAssignment.matchedAttempts,
    todayAssignmentAdherenceRate: todayAssignment.rate,
    todayAssignmentMissedByOperation: todayAssignment.missedByOperation,
    todayAssignmentMissedByLevel: todayAssignment.missedByLevel,
    activeThisWeek: weekAttempts > 0,
    weekAttempts,
    weekCorrectCount,
    weekWrongCount,
    weekKnowledgeWrongCount,
    weekInattentionCount,
    weekSuccessRate,
    weekReasonableWrongCount: weekWrongReasonable,
    weekActiveTimeSec,
    weekAvgTimePerProblemSec,
    weekAvgAnswerLength,
    weekByOperation,
    weekBySkill,
    weekOperationSummary,
    weekStruggle,
    weekStruggleIndex,
    weekAssignmentAttempts: weekAssignment.attempts,
    weekAssignmentMatched: weekAssignment.matchedAttempts,
    weekAssignmentAdherenceRate: weekAssignment.rate,
    weekAssignmentMissedByOperation: weekAssignment.missedByOperation,
    weekAssignmentMissedByLevel: weekAssignment.missedByLevel,
    assignmentAttempts: overallAssignment.attempts,
    assignmentMatched: overallAssignment.matchedAttempts,
    assignmentAdherenceRate: overallAssignment.rate,
    riskLevel: riskSignals.riskLevel,
    riskScore: riskSignals.riskScore,
    riskCodes: riskSignals.riskCodes,
    supportScore: riskSignals.supportScore
  }
}

function resolveActivityLabel(code) {
  if (code === 'green') return 'Grön'
  if (code === 'orange') return 'Orange'
  if (code === 'black') return 'Svart'
  return 'Röd'
}

function resolveActivityTone(code) {
  if (code === 'green') {
    return {
      dotClass: 'bg-green-500',
      badgeClass: 'bg-green-50 text-green-700 border-green-200'
    }
  }
  if (code === 'orange') {
    return {
      dotClass: 'bg-orange-500',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200'
    }
  }
  if (code === 'black') {
    return {
      dotClass: 'bg-gray-900',
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }
  return {
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-200'
  }
}

function summarizeByOperation(problems) {
  const stats = new Map()

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const prev = stats.get(operation) || {
      operation,
      attempts: 0,
      wrong: 0,
      answerLengthSum: 0
    }

    const answerLength = getAnswerLength(problem)
    prev.attempts += 1
    if (!problem.correct && isKnowledgeError(problem)) prev.wrong += 1
    prev.answerLengthSum += answerLength
    stats.set(operation, prev)
  }

  return Array.from(stats.values())
    .map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.attempts - item.wrong) / item.attempts : 0,
      avgAnswerLength: item.attempts > 0 ? item.answerLengthSum / item.attempts : 0
    }))
    .sort((a, b) => b.attempts - a.attempts)
}

function getStruggleSkill(skillStats) {
  if (skillStats.length === 0) return null

  const best = [...skillStats].sort((a, b) => {
    if (a.wrong !== b.wrong) return b.wrong - a.wrong
    if (a.successRate !== b.successRate) return a.successRate - b.successRate
    return b.attempts - a.attempts
  })[0]

  if (!best || best.wrong === 0) return null
  return best
}

function summarizeBySkill(problems) {
  const stats = new Map()

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const rawTag = problem.skillTag || problem.problemType || operation
    const skillKey = String(rawTag)
    const level = getProblemLevel(problem)
    const prev = stats.get(skillKey) || {
      operation,
      skillKey,
      skillLabel: formatSkillLabel(operation, skillKey),
      attempts: 0,
      wrong: 0,
      levelSum: 0,
      levelCount: 0
    }

    prev.attempts += 1
    if (!problem.correct && isKnowledgeError(problem)) prev.wrong += 1
    if (Number.isFinite(level)) {
      prev.levelSum += level
      prev.levelCount += 1
    }
    stats.set(skillKey, prev)
  }

  return Array.from(stats.values())
    .map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.attempts - item.wrong) / item.attempts : 0,
      avgLevel: item.levelCount > 0 ? item.levelSum / item.levelCount : null
    }))
}

function formatSkillLabel(operation, skillKey) {
  const normalized = String(skillKey || '').trim()
  if (!normalized) return getOperationLabel(operation)

  const compact = formatSkillTypeLabel(normalized)
  if (compact && compact !== normalized) return compact
  return compact || getOperationLabel(operation)
}

function getAnswerLength(problem) {
  if (Number.isFinite(problem.answerLength)) return problem.answerLength
  if (problem.studentAnswer === null || problem.studentAnswer === undefined) return 0

  const normalized = String(problem.studentAnswer).replace('-', '').replace('.', '').trim()
  return normalized.length
}

function getAverageAnswerLength(problems) {
  if (problems.length === 0) return null
  const total = problems.reduce((sum, problem) => sum + getAnswerLength(problem), 0)
  return total / problems.length
}

function inferOperationFromProblemType(problemType = '') {
  if (problemType.startsWith('add_')) return 'addition'
  if (problemType.startsWith('sub_')) return 'subtraction'
  if (problemType.startsWith('mul_')) return 'multiplication'
  if (problemType.startsWith('div_')) return 'division'

  const [prefix] = String(problemType || '').split('_')
  if (ALL_OPERATIONS.includes(prefix)) return prefix
  return prefix || 'unknown'
}

function loadSavedTeacherClassFilter() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TEACHER_CLASS_FILTER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return Array.from(new Set(
      parsed
        .map(item => String(item || '').trim())
        .filter(Boolean)
    ))
  } catch {
    return []
  }
}

function saveTeacherClassFilterSelection(classIds) {
  if (typeof window === 'undefined') return
  try {
    const normalized = Array.from(new Set(
      (Array.isArray(classIds) ? classIds : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    ))
    if (normalized.length === 0) {
      window.localStorage.removeItem(TEACHER_CLASS_FILTER_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(TEACHER_CLASS_FILTER_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // no-op
  }
}

function calculateTrend(problems) {
  if (problems.length < 15) return null

  const last10 = problems.slice(-10)
  const previous10 = problems.slice(-20, -10)
  if (previous10.length < 5) return null

  const lastRate = last10.filter(p => p.correct).length / last10.length
  const prevRate = previous10.filter(p => p.correct).length / previous10.length
  return lastRate - prevRate
}

function getSortedRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

function getSortedSupportRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareSupportRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

function compareSupportRows(a, b, sortBy) {
  if (sortBy === 'name') return compareClassNameAndName(a, b)
  if (sortBy === 'class') {
    return String(a.classNameLabel || a.className || '').localeCompare(
      String(b.classNameLabel || b.className || ''),
      'sv'
    )
  }
  if (sortBy === 'activity') return getClassOverviewActivityRank(a.activityStatus) - getClassOverviewActivityRank(b.activityStatus)
  if (sortBy === 'risk') return Number(a.riskScore || 0) - Number(b.riskScore || 0)
  if (sortBy === 'support_score') return Number(a.supportScore || 0) - Number(b.supportScore || 0)
  if (sortBy === 'today_attempts') return Number(a.todayAttempts || 0) - Number(b.todayAttempts || 0)
  if (sortBy === 'today_wrong') return Number(a.todayWrongCount || 0) - Number(b.todayWrongCount || 0)
  if (sortBy === 'week_success') return Number(a.weekSuccessRate || 0) - Number(b.weekSuccessRate || 0)
  if (sortBy === 'struggle') {
    return String(a.todayStruggle?.skillLabel || '').localeCompare(String(b.todayStruggle?.skillLabel || ''), 'sv')
  }
  return Number(a.supportScore || 0) - Number(b.supportScore || 0)
}

function getDefaultSupportSortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'class' || sortBy === 'struggle') return 'asc'
  return 'desc'
}

function getSortedDetailLevelErrorRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareDetailLevelErrorRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

function compareDetailLevelErrorRows(a, b, sortBy) {
  let diff = 0
  if (sortBy === 'operation') diff = String(a.operationLabel || '').localeCompare(String(b.operationLabel || ''), 'sv')
  else if (sortBy === 'level') diff = Number(a.level || 0) - Number(b.level || 0)
  else if (sortBy === 'attempts') diff = Number(a.attempts || 0) - Number(b.attempts || 0)
  else if (sortBy === 'correct') diff = Number(a.correct || 0) - Number(b.correct || 0)
  else if (sortBy === 'wrong') diff = Number(a.wrong || 0) - Number(b.wrong || 0)
  else if (sortBy === 'knowledge_wrong') diff = Number(a.knowledgeWrong || 0) - Number(b.knowledgeWrong || 0)
  else if (sortBy === 'inattention_wrong') diff = Number(a.inattentionWrong || 0) - Number(b.inattentionWrong || 0)
  else if (sortBy === 'success_rate') diff = Number(a.successRate || 0) - Number(b.successRate || 0)
  else diff = Number(a.errorShare || 0) - Number(b.errorShare || 0)

  if (diff !== 0) return diff
  const operationDiff = String(a.operationLabel || '').localeCompare(String(b.operationLabel || ''), 'sv')
  if (operationDiff !== 0) return operationDiff
  return Number(a.level || 0) - Number(b.level || 0)
}

function getDefaultDetailLevelErrorSortDir(sortBy) {
  if (sortBy === 'operation' || sortBy === 'level') return 'asc'
  return 'desc'
}

function getSortedClassOverviewRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareClassOverviewRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

function compareClassOverviewRows(a, b, sortBy) {
  if (sortBy === 'name') return compareClassNameAndName(a, b)
  if (sortBy === 'activity') return getClassOverviewActivityRank(a.activityStatus) - getClassOverviewActivityRank(b.activityStatus)
  if (sortBy === 'operation') {
    return String(getOperationLabel(a.focusOperation || ''))
      .localeCompare(String(getOperationLabel(b.focusOperation || '')), 'sv')
  }
  if (sortBy === 'today_attempts') return Number(a.todayAttempts || 0) - Number(b.todayAttempts || 0)
  if (sortBy === 'today_wrong') return Number(a.todayWrongCount || 0) - Number(b.todayWrongCount || 0)
  if (sortBy === 'today_success') return Number(a.todaySuccessRate || 0) - Number(b.todaySuccessRate || 0)
  if (sortBy === 'today_engaged') return Number(a.todayEngagedMinutes || 0) - Number(b.todayEngagedMinutes || 0)
  if (sortBy === 'last_active') return Number(a.lastActive || 0) - Number(b.lastActive || 0)
  return compareClassNameAndName(a, b)
}

function compareClassNameAndName(a, b) {
  const classCompare = String(a.classNameLabel || a.className || '').localeCompare(
    String(b.classNameLabel || b.className || ''),
    'sv'
  )
  if (classCompare !== 0) return classCompare
  return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
}

function getClassOverviewActivityRank(code) {
  if (code === 'green') return 4
  if (code === 'orange') return 3
  if (code === 'black') return 2
  if (code === 'red') return 1
  return 0
}

function getDefaultClassOverviewSortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'operation') return 'asc'
  return 'desc'
}

function getSortedTableStickyRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareTableStickyRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

function compareTableStickyRows(a, b, sortBy) {
  if (sortBy === 'name') return compareClassNameAndName(a, b)
  if (sortBy === 'class') return String(a.className || '').localeCompare(String(b.className || ''), 'sv')
  if (sortBy === 'today_done') return Number(a.todayDoneCount || 0) - Number(b.todayDoneCount || 0)
  if (sortBy === 'week_done') return Number(a.weekDoneCount || 0) - Number(b.weekDoneCount || 0)
  if (sortBy === 'star_count') return Number(a.starCount || 0) - Number(b.starCount || 0)
  if (String(sortBy).startsWith('table_')) {
    const table = Number(String(sortBy).slice(6))
    if (Number.isInteger(table) && TABLES.includes(table)) {
      return getStickyStatusRank(a.statusByTable?.[table]) - getStickyStatusRank(b.statusByTable?.[table])
    }
  }
  return compareClassNameAndName(a, b)
}

function getStickyStatusRank(status) {
  if (status === 'star') return 3
  if (status === 'today') return 2
  if (status === 'week') return 1
  return 0
}

function getDefaultStickySortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'class') return 'asc'
  return 'desc'
}

function getDefaultResultSortDir(sortBy) {
  if (sortBy === 'name' || sortBy === 'student_id' || sortBy === 'class') return 'asc'
  return 'desc'
}

function compareRows(a, b, sortBy) {
  if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
  if (sortBy === 'student_id') return String(a.studentId || '').localeCompare(String(b.studentId || ''), 'sv')
  if (sortBy === 'class') return compareClassNameAndName(a, b)
  if (sortBy === 'active_today') {
    if (a.activeToday !== b.activeToday) return Number(a.activeToday) - Number(b.activeToday)
    return (a.lastActive || 0) - (b.lastActive || 0)
  }

  if (sortBy === 'today_attempts') return a.todayAttempts - b.todayAttempts
  if (sortBy === 'today_wrong') return a.todayWrongCount - b.todayWrongCount
  if (sortBy === 'today_success_rate') return (a.todaySuccessRate || 0) - (b.todaySuccessRate || 0)
  if (sortBy === 'today_struggle') return a.todayStruggleIndex - b.todayStruggleIndex
  if (sortBy === 'today_engaged') return (a.todayEngagedMinutes || 0) - (b.todayEngagedMinutes || 0)
  if (sortBy === 'today_answer_length') return (a.todayAvgAnswerLength || 0) - (b.todayAvgAnswerLength || 0)
  if (sortBy === 'active_week') {
    if (a.activeThisWeek !== b.activeThisWeek) return Number(a.activeThisWeek) - Number(b.activeThisWeek)
    return (a.lastActive || 0) - (b.lastActive || 0)
  }
  if (sortBy === 'week_attempts') return a.weekAttempts - b.weekAttempts
  if (sortBy === 'week_correct') return a.weekCorrectCount - b.weekCorrectCount
  if (sortBy === 'week_wrong') return a.weekWrongCount - b.weekWrongCount
  if (sortBy === 'week_struggle') return (a.weekStruggleIndex || 0) - (b.weekStruggleIndex || 0)
  if (sortBy === 'week_active_time') return a.weekActiveTimeSec - b.weekActiveTimeSec
  if (sortBy === 'week_engaged') return (a.weekEngagedMinutes || 0) - (b.weekEngagedMinutes || 0)
  if (sortBy === 'week_success_rate') return a.weekSuccessRate - b.weekSuccessRate
  if (sortBy === 'week_answer_length') return (a.weekAvgAnswerLength || 0) - (b.weekAvgAnswerLength || 0)
  if (sortBy === 'assignment_week') return (a.weekAssignmentAdherenceRate ?? -1) - (b.weekAssignmentAdherenceRate ?? -1)
  if (sortBy === 'support_score') return (a.supportScore || 0) - (b.supportScore || 0)
  if (sortBy === 'risk_score') return (a.riskScore || 0) - (b.riskScore || 0)
  if (sortBy === 'logged_in') return Number(a.hasLoggedIn) - Number(b.hasLoggedIn)
  if (sortBy === 'last_active') return (a.lastActive || 0) - (b.lastActive || 0)
  if (sortBy === 'attempts') return a.attempts - b.attempts
  if (sortBy === 'success_rate') return a.successRate - b.successRate
  if (sortBy === 'reasonable_rate') return (a.reasonableRate || 0) - (b.reasonableRate || 0)
  if (sortBy === 'avg_relative_error') return (a.avgRelativeError ?? -1) - (b.avgRelativeError ?? -1)
  if (sortBy === 'trend') return (a.trend ?? -Infinity) - (b.trend ?? -Infinity)

  return (a.lastActive || 0) - (b.lastActive || 0)
}

function toPercent(rate) {
  const numeric = Number(rate)
  if (!Number.isFinite(numeric)) return '-'
  return `${Math.round(numeric * 100)}%`
}

function clampUnit(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(1, numeric))
}

function increaseCount(map, key, step = 1) {
  const label = String(key || '').trim()
  if (!label) return
  map.set(label, Number(map.get(label) || 0) + step)
}

function toTopEntries(map, limit = 3) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count: Number(count || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function medianNumber(values) {
  const list = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b)
  if (list.length === 0) return null
  const middle = Math.floor(list.length / 2)
  if (list.length % 2 === 0) {
    return (list[middle - 1] + list[middle]) / 2
  }
  return list[middle]
}

function toFixedOrEmpty(value, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return numeric.toFixed(digits)
}

function getSuccessColorClass(rate) {
  if (rate >= 0.8) return 'text-green-600 font-semibold'
  if (rate >= 0.6) return 'text-yellow-700 font-semibold'
  return 'text-red-600 font-semibold'
}

function getReasonableColorClass(rate) {
  if (rate >= 0.9) return 'text-green-600 font-semibold'
  if (rate >= 0.75) return 'text-yellow-700 font-semibold'
  return 'text-red-600 font-semibold'
}

function getErrorShareColorClass(rate) {
  if (rate >= 0.4) return 'text-red-700'
  if (rate >= 0.25) return 'text-amber-700'
  return 'text-green-700'
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Aldrig'

  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just nu'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min sedan`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} tim sedan`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dagar sedan`
  return new Date(timestamp).toLocaleDateString('sv-SE')
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function toMinutes(milliseconds) {
  const value = Number(milliseconds)
  if (!Number.isFinite(value) || value <= 0) return 0
  return value / 60000
}

function inferTableFromProblem(problem) {
  const tag = String(problem?.skillTag || '')
  const match = tag.match(/^mul_table_(\d{1,2})$/)
  if (match) {
    const n = Number(match[1])
    if (n >= 2 && n <= 12) return n
  }

  if (!String(problem?.problemType || '').startsWith('mul_')) return null
  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null
  if (a >= 2 && a <= 12 && b >= 1 && b <= 12) return a
  if (b >= 2 && b <= 12 && a >= 1 && a <= 12) return b
  return null
}

function buildStickyTableStatusForStudent(student) {
  const startToday = getStartOfDayTimestamp()
  const startWeek = getStartOfWeekTimestamp()
  const source = getTableProblemSourceForStudent(student)
  const todayDoneMap = computeStickyTableCompletionMapForTeacher(source, startToday)
  const weekDoneMap = computeStickyTableCompletionMapForTeacher(source, startWeek)
  const completionCountsToday = getTableCompletionCountsTodayForStudent(student, startToday)

  const statusByTable = {}
  let todayDoneCount = 0
  let weekDoneCount = 0
  let starCount = 0

  for (const table of TABLES) {
    const todayDone = Boolean(todayDoneMap[table])
    const weekDone = Boolean(weekDoneMap[table])
    const star = Number(completionCountsToday[table] || 0) >= 3

    if (star) {
      statusByTable[table] = 'star'
      starCount += 1
    } else if (todayDone) {
      statusByTable[table] = 'today'
    } else if (weekDone) {
      statusByTable[table] = 'week'
    } else {
      statusByTable[table] = 'default'
    }

    if (todayDone) todayDoneCount += 1
    if (weekDone) weekDoneCount += 1
  }

  return {
    statusByTable,
    todayDoneCount,
    weekDoneCount,
    starCount
  }
}

function getTableProblemSourceForStudent(student) {
  const problemLog = Array.isArray(student?.problemLog) ? student.problemLog : []
  const recentProblems = Array.isArray(student?.recentProblems) ? student.recentProblems : []

  if (problemLog.length === 0) return recentProblems
  if (recentProblems.length === 0) return problemLog

  const logLatest = getLatestProblemTimestamp(problemLog)
  const recentLatest = getLatestProblemTimestamp(recentProblems)
  if (recentLatest > logLatest) return recentProblems
  if (logLatest > recentLatest) return problemLog
  return problemLog.length >= recentProblems.length ? problemLog : recentProblems
}

function getLatestProblemTimestamp(list) {
  if (!Array.isArray(list) || list.length === 0) return 0
  let maxTs = 0
  for (const item of list) {
    const ts = Number(item?.timestamp || 0)
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts
  }
  return maxTs
}

function computeStickyTableCompletionMapForTeacher(problemSource, startTimestamp) {
  const progress = TABLES.reduce((acc, table) => {
    acc[table] = {
      attempts: 0,
      correct: 0,
      reached: false
    }
    return acc
  }, {})

  if (!Array.isArray(problemSource) || problemSource.length === 0) {
    return TABLES.reduce((acc, table) => {
      acc[table] = false
      return acc
    }, {})
  }

  const scoped = problemSource
    .filter(item => Number(item?.timestamp || 0) >= startTimestamp)
    .slice()
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0))

  for (const problem of scoped) {
    const table = inferTableFromProblem(problem)
    if (!table) continue

    const entry = progress[table]
    entry.attempts += 1
    if (problem.correct) entry.correct += 1
    if (!entry.reached && isTableCompletedForStickyStatus(entry)) {
      entry.reached = true
    }
  }

  return TABLES.reduce((acc, table) => {
    acc[table] = Boolean(progress[table]?.reached)
    return acc
  }, {})
}

function getTableCompletionCountsTodayForStudent(student, startTodayTimestamp) {
  const counts = TABLES.reduce((acc, table) => {
    acc[table] = 0
    return acc
  }, {})

  const completions = student?.tableDrill?.completions
  if (!Array.isArray(completions)) return counts

  for (const completion of completions) {
    const table = Number(completion?.table)
    const ts = Number(completion?.timestamp || 0)
    if (!TABLES.includes(table)) continue
    if (ts < startTodayTimestamp) continue
    counts[table] += 1
  }

  return counts
}

function isTableCompletedForStickyStatus(stats) {
  if (!stats) return false
  if (Number(stats.attempts || 0) < 10) return false
  const success = Number(stats.correct || 0) / Math.max(1, Number(stats.attempts || 0))
  return success >= 0.8
}

function getTeacherTableStatusClass(status) {
  if (status === 'star') return 'bg-green-500 border-green-600 text-white'
  if (status === 'today') return 'bg-green-500 border-green-600 text-white'
  if (status === 'week') return 'bg-green-100 border-green-200 text-green-800'
  return 'bg-gray-100 border-gray-200 text-gray-400'
}

function getTeacherTableStatusLabel(status) {
  if (status === 'star') return 'Star idag'
  if (status === 'today') return 'Klar idag'
  if (status === 'week') return 'Klar denna vecka'
  return 'Ej klar'
}

function getAccuracy(problems) {
  if (!Array.isArray(problems) || problems.length === 0) return null
  const correct = problems.filter(problem => problem.correct).length
  return correct / problems.length
}

function getMedianTime(problems) {
  const values = (Array.isArray(problems) ? problems : [])
    .filter(problem => problem.correct)
    .map(problem => getSpeedTime(problem))
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)

  if (values.length === 0) return null
  const middle = Math.floor(values.length / 2)
  if (values.length % 2 === 0) return (values[middle - 1] + values[middle]) / 2
  return values[middle]
}

function getSpeedTime(problem) {
  const speed = Number(problem?.speedTimeSec)
  if (Number.isFinite(speed) && speed > 0) return speed
  if (problem?.excludedFromSpeed) return null
  const raw = Number(problem?.timeSpent)
  if (Number.isFinite(raw) && raw > 0) return raw
  return null
}

function isKnowledgeError(problem) {
  if (!problem || problem.correct) return false
  return String(problem.errorCategory || '') !== 'inattention'
}

export default Dashboard
