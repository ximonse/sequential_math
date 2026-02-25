import { useEffect, useMemo } from 'react'
import {
  buildClassSummaries,
  buildInactivityBuckets,
  buildNcmOverview,
  buildTableDevelopmentOverview
} from './dashboardAnalyticsHelpers'
import {
  buildDataQualitySummary,
  buildUsageInsights
} from './dashboardInsightsHelpers'
import { buildTeacherStudentViewData } from './dashboardStudentDetailViewHelpers'
import { buildStudentRow } from './dashboardStudentRowHelpers'
import {
  buildClassOperationBenchmarks,
  buildClassTableBenchmarks,
  buildDailyActivityBreakdown,
  buildStudentOperationStats7d,
  buildTrainingPriorityList
} from './dashboardStudentTrainingHelpers'
import { getRecordClassLabel, recordMatchesClassFilter } from './dashboardCoreHelpers'
import { InlineHelp } from './dashboardStatusBadges'
import {
  compareClassNameAndName,
  getDefaultDetailLevelErrorSortDir,
  getDefaultResultSortDir,
  getDefaultStickySortDir,
  getDefaultSupportSortDir,
  getSortedDetailLevelErrorRows,
  getSortedRows,
  getSortedSupportRows,
  getSortedTableStickyRows
} from './dashboardSortUtils'
import { buildStickyTableStatusForStudent } from './dashboardTableStatusUtils'

export function useDashboardViewData({
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
  detailLevelErrorMinAttempts,
  supportThreshold,
  defaultWeeklyGoal
}) {
  const classStats = {
    totalStudents: filteredStudents.length,
    activeToday: filteredStudents.filter(student => {
      const last = student.recentProblems[student.recentProblems.length - 1]?.timestamp
      if (!last) return false
      const today = new Date().setHours(0, 0, 0, 0)
      return last > today
    }).length,
    avgSuccessRate: filteredStudents.length > 0
      ? filteredStudents.reduce((sum, student) => sum + (student.stats.overallSuccessRate || 0), 0) / filteredStudents.length
      : 0,
    totalProblems: filteredStudents.reduce((sum, student) => sum + (student.stats.totalProblems || 0), 0)
  }

  const weekGoal = activeAssignment?.targetCount || defaultWeeklyGoal

  const allRows = useMemo(
    () => students.map(student => buildStudentRow(student, activeAssignment, classNameById)),
    [students, activeAssignment, classNameById]
  )

  const filteredRows = useMemo(() => (
    isDirectStudentView
      ? (detailStudentId
        ? allRows.filter(row => row.studentId === detailStudentId)
        : [])
      : selectedClassIds.length > 0
        ? allRows.filter(row => recordMatchesClassFilter(row, selectedClassIds))
        : allRows
  ), [isDirectStudentView, detailStudentId, allRows, selectedClassIds])

  const tableRows = getSortedRows(filteredRows, sortBy, sortDir)
  const visibleRows = tableRows

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
    const qualifiedRows = source.filter(item => Number(item?.attempts || 0) >= detailLevelErrorMinAttempts)
    return getSortedDetailLevelErrorRows(qualifiedRows, detailLevelErrorSortBy, detailLevelErrorSortDir)
  }, [detailStudentViewData, detailLevelErrorSortBy, detailLevelErrorSortDir, detailLevelErrorMinAttempts])

  const detailLevelErrorUnderSampleCount = useMemo(() => {
    const source = Array.isArray(detailStudentViewData?.levelErrorRows)
      ? detailStudentViewData.levelErrorRows
      : []
    return source.filter(
      item => Number(item?.attempts || 0) > 0 && Number(item?.attempts || 0) < detailLevelErrorMinAttempts
    ).length
  }, [detailStudentViewData, detailLevelErrorMinAttempts])

  const classBenchmarks = useMemo(
    () => buildClassOperationBenchmarks(
      detailStudentId ? detailStudentSource.filter(student => student.studentId !== detailStudentId) : detailStudentSource
    ),
    [detailStudentSource, detailStudentId]
  )

  const studentOperationStats7d = useMemo(
    () => buildStudentOperationStats7d(detailStudentProfile),
    [detailStudentProfile]
  )

  const classTableBenchmarks = useMemo(
    () => buildClassTableBenchmarks(
      detailStudentId ? detailStudentSource.filter(student => student.studentId !== detailStudentId) : detailStudentSource
    ),
    [detailStudentSource, detailStudentId]
  )

  const trainingPriorityList = useMemo(() => {
    if (!detailStudentProfile) return []
    return buildTrainingPriorityList(detailStudentProfile, classBenchmarks)
  }, [detailStudentProfile, classBenchmarks])

  const dailyActivityBreakdown = useMemo(() => {
    if (!detailStudentProfile) return []
    return buildDailyActivityBreakdown(detailStudentProfile)
  }, [detailStudentProfile])

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

  const supportCandidateRows = useMemo(
    () => tableRows.filter(row => row.supportScore >= supportThreshold || row.riskLevel === 'high'),
    [tableRows, supportThreshold]
  )

  const supportRows = useMemo(
    () => getSortedSupportRows(supportCandidateRows, supportSortBy, supportSortDir),
    [supportCandidateRows, supportSortBy, supportSortDir]
  )

  const inactivityBuckets = buildInactivityBuckets(tableRows)
  const classSummaries = buildClassSummaries(classes, students, selectedClassIds, weekGoal)

  const classOverviewMeta = useMemo(() => {
    const selectedClassNames = selectedClassIds
      .map(classId => String(classNameById.get(classId) || '').trim())
      .filter(Boolean)
    const activeNowCount = filteredRows.filter(row => row.activeNow).length
    return {
      className: selectedClassNames.length > 0 ? selectedClassNames.join(', ') : 'Alla klasser',
      studentCount: filteredRows.length,
      activeNowCount
    }
  }, [selectedClassIds, classNameById, filteredRows])

  const ncmOverview = useMemo(
    () => buildNcmOverview(filteredStudents, classNameById),
    [filteredStudents, classNameById]
  )

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
  }, [tableStudentOptions, setTableSelectedStudentIds])

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

  return {
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
    ncmOverview,
    handleStickySort,
    getStickySortIndicator,
    getSupportSortIndicator,
    handleSupportSort,
    renderDetailLevelErrorSortHeader,
    tableStudentSet,
    filteredTableStudentOptions,
    tableDevelopmentOverview,
    tableStickyStatusRows,
    dataQualitySummary,
    usageInsights,
    renderResultSortHeader
  }
}
