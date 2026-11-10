import { cloneElement, useEffect, useMemo, useRef, useState } from 'react'
import AttentionModule from '../attention/AttentionModule'
import AssignmentsPanel from './AssignmentsPanel'
import RecipientPicker from './RecipientPicker'
import RecipientActiveOverview from './RecipientActiveOverview'
import ChevronIcon from './ChevronIcon'
import ClassOverviewPanel from './ClassOverviewPanel'
import ClassesAndPupilsPanel from './ClassesAndPupilsPanel'
import ClassFilterPanel from './ClassFilterPanel'
import ClassMisconceptionHeatmap from './ClassMisconceptionHeatmap'
import ClassMasteryLevelPanel from './ClassMasteryLevelPanel'
import ClassStatsCards from './ClassStatsCards'
import PauseGameHighscorePanel from './PauseGameHighscorePanel'
import DifficultyAnalysisPanel from './DifficultyAnalysisPanel'
import DataQualityUsagePanel from './DataQualityUsagePanel'
import DashboardHeaderBar from './DashboardHeaderBar'
import InactivityAndClassLevelPanel from './InactivityAndClassLevelPanel'
import PasswordResetPanel from './PasswordResetPanel'
import ResultsOverviewPanel from './ResultsOverviewPanel'
import MathPracticeResultsPanel from './MathPracticeResultsPanel'
import StudentDetailPanel from './StudentDetailPanel'
import StudentDetailTrainingPriorityPanel from './StudentDetailTrainingPriorityPanel'
import SupportPriorityPanel from './SupportPriorityPanel'
import TablePracticeProgressPanel from './TablePracticeProgressPanel'
import TablePracticeOverviewPanel from './TablePracticeOverviewPanel'
import { normalizeTablePeriod } from '../../../lib/tablePracticeLongProgress'
import LocalTestDataPanel from './LocalTestDataPanel'
import LocalTestDataExportPanel from './LocalTestDataExportPanel'
import TicketSectionContainer from './TicketSectionContainer'
import ScreeningDispatchPanel from './ScreeningDispatchPanel'
import ScreeningResultsPanel from './ScreeningResultsPanel'
import '../teacherAdmin.css'

import { ActivityBadge, RiskBadge } from './dashboardStatusBadges'
import { getOperationLabel } from '../../../lib/operations'
import { getTeacherIdentity, isTeacherAdmin } from '../../../lib/teacherAuth'
import { getTeacherRoleLabel } from '../../../lib/teacherRoles'
import { canViewAttentionResults } from '../../../lib/attentionAccess'

const PANEL_DEFS = [
  { id: 'support',     title: 'Behöver stöd nu' },
  { id: 'overview',    title: 'Klass/gruppvy – snabbstatus' },
  { id: 'detail',      title: 'Elevprofil' },
  { id: 'results',     title: 'Resultat och export' },
  { id: 'mathresults', title: 'Matematikövningar — Resultat' },
  { id: 'focus', title: 'Fokusövningar', attentionOnly: true },
  { id: 'assignments', title: 'Uppdrag' },
  { id: 'tickets',     title: 'Tickets' },
  { id: 'mastery',     title: 'Nivåöversikt – hela klassen' },
  { id: 'tableoverview', title: 'Tabellöversikt – hela klassen' },

  { id: 'heatmap',     title: 'Felmönster' },
  { id: 'difficulty-analysis', title: 'Svårighetsanalys' },
  { id: 'training-priority', title: 'Träningsprioritet' },
  { id: 'inactivity',  title: 'Inaktivitet och nivå' },
  { id: 'tabledev',    title: 'Tabellträning – utveckling' },
  { id: 'dataquality', title: 'Datakvalitet' },
  { id: 'management',  title: 'Klasshantering' },
  { id: 'password',    title: 'Lösenordsåterställning' },
  { id: 'pausegames',  title: 'Pausspel — Highscore' },
  { id: 'ncm-grid',    title: 'Digitalt räknehäfte', adminOnly: true },
]

const WORKSPACES = [
  { id: 'progress', label: 'Framsteg', description: 'Kunskapsområden och elever', panels: ['mastery', 'tableoverview', 'detail', 'overview', 'tabledev'] },
  { id: 'focus', label: 'Fokusövningar', description: 'Grupp, individ och pass', panels: ['focus'], attentionOnly: true },
  { id: 'teaching', label: 'Uppdrag & tickets', description: 'Planera och följ upp', panels: ['assignments', 'mathresults', 'tickets'] },
  { id: 'support', label: 'Statistik & stöd', description: 'Felmönster och hjälpbehov', panels: ['support', 'results', 'heatmap', 'difficulty-analysis', 'training-priority', 'inactivity', 'dataquality', 'pausegames'] },
  { id: 'ncm', label: 'Screening', description: 'Skapa, dela ut och se resultat', panels: ['ncm-grid'], adminOnly: true },
  { id: 'admin', label: 'Administration', description: 'Klasser, elevkort och konton', panels: ['management'] }
]

const WORKSPACE_SUBTABS = {
  progress: [
    { id: 'class', label: '1. Nivåer & Snabbstatus', panels: ['mastery', 'overview'] },
    { id: 'tables', label: '2. Tabellträning (2–12)', panels: ['tableoverview', 'tabledev'] },
    { id: 'student', label: '3. Elevprofil & Analys', panels: ['detail', 'difficulty-analysis', 'training-priority'] },
    { id: 'all', label: 'Visa alla (5)', panels: ['mastery', 'tableoverview', 'detail', 'overview', 'tabledev'] }
  ],
  teaching: [
    { id: 'assignments', label: '1. Skapa & hantera uppdrag', panels: ['assignments'] },
    { id: 'mathresults', label: '2. Resultat på matematikövningar', panels: ['mathresults'] },
    { id: 'tickets', label: '3. Tickets (Start / Exit)', panels: ['tickets'] },
    { id: 'all', label: 'Visa alla (3)', panels: ['assignments', 'mathresults', 'tickets'] }
  ],
  support: [
    { id: 'urgent', label: '1. Behöver stöd & Resultat', panels: ['support', 'results'] },
    { id: 'patterns', label: '2. Felmönster i klassen (Heatmap)', panels: ['heatmap'] },
    { id: 'individual', label: '3. Individanalys (Svårigheter & Prioritet)', panels: ['difficulty-analysis', 'training-priority'] },
    { id: 'ops', label: '4. Aktivitet, Datakvalitet & Pausspel', panels: ['inactivity', 'dataquality', 'pausegames'] },
    { id: 'all', label: 'Visa alla (8)', panels: ['support', 'results', 'heatmap', 'difficulty-analysis', 'training-priority', 'inactivity', 'dataquality', 'pausegames'] }
  ]
}

const DEFAULT_COLLAPSED = Object.fromEntries(
  PANEL_DEFS.map(({ id }) => [id, false])
)
const LS_COLLAPSED_KEY = 'mathapp_dashboard_panel_collapsed_v2'

export default function DashboardLayout({
  isFocusView = false,
  initialWorkspace,
  initialSubTab,
  isDirectStudentView,
  detailStudentProfile,
  cloudSyncStatus,
  formatSyncTimestamp,
  getCloudSyncSourceLabel,
  formatTimeAgo,
  navigate,
  handleLogout,
  dashboardStatus,
  isCloudRefreshBusy,
  handleCloudRefreshNow,
  selectedClassIds,
  students,
  filteredStudents,
  classFilterOptions,
  clearClassFilter,
  selectAllClasses,
  historyState,
  onRetryHistory,
  handleToggleClassFilter,
  classStats,
  dataQualitySummary,
  usageInsights,
  formatDuration,
  toPercent,
  assignments,
  copiedId,
  formatAssignmentSummaryLine,
  handleCreatePreset,
  handleCreateMathPractice,
  handleDeactivateAssignment,
  handleClearAllAssignments,
  handleActivateAssignment,
  assignmentTargets,
  recipients,
  setDeliveryPicks,
  teacherGroups = [],
  recipientsFollowFilter = false,
  handleDeleteAssignment,
  handleCopyAssignmentLink,
  classNameById,
  recordMatchesClassFilter,
  setStudents,
  setDashboardStatus,
  handleOpenStudentDetail,
  classOverviewMeta,
  filteredRows,
  detailStudentId,
  detailStudentOptions,
  hasMissingDirectStudent,
  setDetailStudentId,
  handleExportStudentDetailCsv,
  detailStudentRow,
  detailStudentViewData,
  trainingPriorityList,
  getCompactMasteryColorClass,
  LEVELS,
  DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
  ALL_OPERATIONS,
  classBenchmarks,
  studentOperationStats7d,
  detailLevelErrorRows,
  detailLevelErrorUnderSampleCount,
  renderDetailLevelErrorSortHeader,
  DETAIL_LEVEL_ERROR_HELP,
  detailLevelErrorSortBy,
  detailLevelErrorSortDir,
  handleDetailLevelErrorSortByChange,
  handleDetailLevelErrorSortDirChange,
  dailyActivityBreakdown,
  inactivityBuckets,
  classSummaries,
  weekGoal,
  supportRows,
  handleCreateQuickAssignment,
  setAddToClassId,
  classes,
  onLocalTestDataImported,
  handleAddExistingStudentsToClass,
  handleMoveStudent,
  handleAddStudentsToClass,
  rosterInput,
  setRosterInput,
  classStatus,
  handleSetTeacherPupilLabel,
  showPupilNames,
  fillingPupilNames,
  showCodeNames,
  pupilLabelsShown,
  resultsPanelProps,
  PASSWORD_RESET_SECTION_ID,
  passwordResetRows,
  passwordResetSearch,
  setPasswordResetSearch,
  passwordResetStatus,
  handleResetStudentPassword,
  passwordResetBusyId
}) {
  const teacherIsAdmin = isTeacherAdmin()
  const teacherIdentity = getTeacherIdentity()
  const canViewAttention = canViewAttentionResults(teacherIdentity)
  const teacherName = String(teacherIdentity.displayName || 'Lärare').trim() || 'Lärare'
  const teacherRole = getTeacherRoleLabel(teacherIdentity.role)
  const [activeWorkspace, setActiveWorkspace] = useState(() => isFocusView ? 'focus'
    : isDirectStudentView ? 'support'
    : WORKSPACES.some(workspace => workspace.id === initialWorkspace) ? initialWorkspace : 'progress')
  useEffect(() => {
    if (isFocusView) setActiveWorkspace('focus')
    else setActiveWorkspace(current => current === 'focus' ? 'progress' : current)
  }, [isFocusView])
  const [tableSelection, setTableSelection] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathapp_table_progress_selection') || '{}')
      return { table: Number.isInteger(Number(saved.table)) && Number(saved.table) >= 2 && Number(saved.table) <= 12 ? Number(saved.table) : 7,
        period: normalizeTablePeriod(saved.period ?? saved.days), studentId: String(saved.studentId || '') }
    } catch { return { table: 7, period: '7d', studentId: '' } }
  })
  const tableProgressStudents = useMemo(() => activeWorkspace === 'focus'
    ? selectedClassIds.length > 0 ? students.filter(student => recordMatchesClassFilter(student, selectedClassIds)) : students
    : filteredStudents.filter(student => !student.catalogOnly),
  [activeWorkspace, students, filteredStudents, selectedClassIds, recordMatchesClassFilter])
  useEffect(() => {
    try { localStorage.setItem('mathapp_table_progress_selection', JSON.stringify(tableSelection)) } catch { /* Preferences are optional. */ }
  }, [tableSelection])
  useEffect(() => {
    if (historyState && historyState.status !== 'ready') return
    if (students.length > 0 && tableSelection.studentId && !tableProgressStudents.some(student => student.studentId === tableSelection.studentId)) {
      setTableSelection(previous => ({ ...previous, studentId: '' }))
    }
  }, [students, tableProgressStudents, tableSelection.studentId, historyState])
  const openTableProgress = (table, studentId) => {
    setTableSelection(previous => ({ ...previous,
      table: Number.isInteger(table) ? table : previous.table,
      studentId: studentId === undefined ? detailStudentId : studentId
    }))
    setCollapsed(previous => ({ ...previous, tabledev: false }))
    setSubTabByWorkspace(previous => ({ ...previous, progress: 'tables' }))
    setActiveWorkspace('progress')
    window.setTimeout(() => document.getElementById('table-practice-progress')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }
  const visiblePanelDefs = PANEL_DEFS.filter(panel => (!panel.adminOnly || teacherIsAdmin) && (!panel.attentionOnly || canViewAttention))
  const surfaceClass = teacherIdentity.role === 'super_admin'
    ? 'teacher-dashboard-surface--super-admin'
    : teacherIsAdmin
       ? 'teacher-dashboard-surface--admin'
       : 'teacher-dashboard-surface--teacher'

  const [subTabByWorkspace, setSubTabByWorkspace] = useState(() => ({
    progress: initialSubTab || 'class',
    teaching: initialSubTab || 'assignments',
    support: initialSubTab || 'urgent'
  }))

  const [collapsed, setCollapsed] = useState(() => {
    const defaults = {
      ...DEFAULT_COLLAPSED,
      filter: false,
      stats: false,
      testdata: true,
      ...(isDirectStudentView ? { detail: false, support: true, overview: true } : {})
    }
    try {
      return {
        ...defaults,
        ...(JSON.parse(localStorage.getItem(LS_COLLAPSED_KEY)) || {}),
        ...(isDirectStudentView ? { detail: false } : {})
      }
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    try { localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(collapsed)) } catch { /* Preferences are optional. */ }
  }, [collapsed])

  useEffect(() => {
    if (isDirectStudentView) {
      // The pupil profile, with its analysis first, belongs to Statistik & stöd.
      setActiveWorkspace('support')
      setCollapsed(prev => ({ ...prev, detail: false }))
    }
  }, [isDirectStudentView, detailStudentId])

  function renderProgressModule(id, title, content) {
    if (!content) return null
    const toggle = <button type="button" aria-label={`${collapsed[id] ? 'Visa' : 'Minimera'} ${title}`}
      aria-expanded={!collapsed[id]} aria-controls={`progress-panel-${id}`}
      onClick={() => setCollapsed(previous => ({ ...previous, [id]: !previous[id] }))}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      title={`${collapsed[id] ? 'Visa' : 'Minimera'} ${title}`}>
      <ChevronIcon expanded={!collapsed[id]} />
    </button>
    return <div key={id} data-admin-panel={id} id={`progress-panel-${id}`}>
      {collapsed[id]
        ? <section className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <h2 className="font-semibold text-slate-800">{title}</h2>{toggle}
        </section>
        : cloneElement(content, { collapseControl: toggle })}
    </div>
  }

  // Results have their own picks so a group chosen to read results is never also
  // the target of the next dispatch.
  const [resultPicks, setResultPicks] = useState([])
  const reviewDirtyRef = useRef(false)
  const dispatchDirtyRef = useRef(false)
  const [requestedScreening, setRequestedScreening] = useState('')
  const isScreening = activeWorkspace === 'ncm'

  function renderPanelContent(id) {
    if (historyState && historyState.status !== 'ready' && !historyState.hasData
      && ['overview', 'mastery', 'tableoverview', 'heatmap', 'detail', 'results', 'difficulty-analysis', 'training-priority', 'inactivity', 'tabledev', 'support', 'dataquality'].includes(id)) {
      return null
    }
    if (id === 'focus') return canViewAttention ? <AttentionModule students={tableProgressStudents} allStudents={students} /> : null
    if (id === 'overview') return (
      <ClassOverviewPanel
        classOverviewMeta={classOverviewMeta}
        rows={filteredRows}
        onOpenStudentDetail={handleOpenStudentDetail}
        ActivityBadgeComponent={ActivityBadge}
        getOperationLabel={getOperationLabel}
        toPercent={toPercent}
        formatDuration={formatDuration}
        formatTimeAgo={formatTimeAgo}
      />
    )
    if (id === 'mastery') return (
      <ClassMasteryLevelPanel
        filteredStudents={filteredStudents}
        onOpenStudentDetail={handleOpenStudentDetail}
      />
    )
    if (id === 'tableoverview') return (
      <TablePracticeOverviewPanel
        students={tableProgressStudents}
        period={tableSelection.period}
        onPeriodChange={period => setTableSelection(previous => ({ ...previous, period }))}
        onOpenStudentDetail={handleOpenStudentDetail}
        onOpenTableProgress={openTableProgress}
      />
    )
    if (id === 'heatmap') return (
      <ClassMisconceptionHeatmap
        filteredStudents={filteredStudents}
        onOpenStudentDetail={handleOpenStudentDetail}
      />
    )
    if (id === 'detail') return (
      <StudentDetailPanel
        canViewAttentionResults={canViewAttention}
        sectionId="teacher-student-detail-section"
        detailStudentId={detailStudentId}
        detailStudentOptions={detailStudentOptions}
        hasMissingDirectStudent={hasMissingDirectStudent}
        isDirectStudentView={isDirectStudentView}
        onChangeDetailStudentId={setDetailStudentId}
        onNavigateDirectStudent={(studentId) => navigate(`/teacher/student/${encodeURIComponent(studentId)}`)}
        onExportCsv={handleExportStudentDetailCsv}
        onOpenTableProgress={() => openTableProgress()}
        canExportCsv={Boolean(detailStudentProfile && detailStudentRow && detailStudentViewData)}
        onSetTeacherPupilLabel={handleSetTeacherPupilLabel}
        detailStudentProfile={detailStudentProfile}
        detailStudentRow={detailStudentRow}
        detailStudentViewData={detailStudentViewData}
        toPercent={toPercent}
        formatDuration={formatDuration}
        ActivityBadgeComponent={ActivityBadge}
        trainingPriorityList={trainingPriorityList}
        tableMasteryPanelProps={{
                          getCompactMasteryColorClass,
          levels: LEVELS,
          getOperationLabel
        }}
        historyPanelProps={{
          dailyActivityBreakdown,
          getOperationLabel,
          detailLevelErrorMinAttempts: DETAIL_LEVEL_ERROR_MIN_ATTEMPTS
        }}
      />
    )
    if (id === 'difficulty-analysis') {
      const studentSelectorBar = !isDirectStudentView && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Individanalys för elev:
              </span>
              <select
                aria-label="Välj elev för svårighetsanalys och träningsprioritet"
                value={detailStudentId}
                onChange={event => setDetailStudentId(String(event.target.value || '').trim())}
                className="rounded border border-indigo-300 bg-white px-2 py-1 text-sm font-medium text-slate-900 min-w-56"
              >
                {detailStudentOptions.length === 0 ? (
                  <option value="">Inga elever i urvalet</option>
                ) : (
                  detailStudentOptions.map(item => (
                    <option key={`support-student-${item.studentId}`} value={item.studentId}>
                      {item.name} {item.className ? `(${item.className})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            {detailStudentProfile && (
              <button
                type="button"
                onClick={() => handleOpenStudentDetail(detailStudentProfile.studentId)}
                className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                Öppna full Elevprofil →
              </button>
            )}
          </div>
        </div>
      )
      return (
        <DifficultyAnalysisPanel
          headerPrefix={studentSelectorBar}
          detailStudentProfile={detailStudentProfile}
          detailLevelErrorMinAttempts={DETAIL_LEVEL_ERROR_MIN_ATTEMPTS}
          studentOperationStats7d={studentOperationStats7d}
          operationKeys={ALL_OPERATIONS}
          classBenchmarks={classBenchmarks}
          detailLevelErrorRows={detailLevelErrorRows}
          detailLevelErrorUnderSampleCount={detailLevelErrorUnderSampleCount}
          renderDetailLevelErrorSortHeader={renderDetailLevelErrorSortHeader}
          detailLevelErrorHelp={DETAIL_LEVEL_ERROR_HELP}
          detailLevelErrorSortBy={detailLevelErrorSortBy}
          detailLevelErrorSortDir={detailLevelErrorSortDir}
          onDetailLevelErrorSortByChange={handleDetailLevelErrorSortByChange}
          onDetailLevelErrorSortDirChange={handleDetailLevelErrorSortDirChange}
          toPercent={toPercent}
        />
      )
    }
    if (id === 'training-priority') {
      return (
        <StudentDetailTrainingPriorityPanel
          trainingPriorityList={trainingPriorityList}
          toPercent={toPercent}
        />
      )
    }
    if (id === 'inactivity') return (
      <InactivityAndClassLevelPanel
        inactivityBuckets={inactivityBuckets}
        classSummaries={classSummaries}
        weekGoal={weekGoal}
        toPercent={toPercent}
      />
    )
    if (id === 'tabledev') return (
      <TablePracticeProgressPanel
        students={tableProgressStudents}
        selection={tableSelection}
        onSelectionChange={setTableSelection}
        groupLabel={selectedClassIds.map(id => classNameById?.get(id)).filter(Boolean).join(', ') || 'Alla klasser och grupper'}
        onOpenStudentDetail={handleOpenStudentDetail}
      />
    )
    if (id === 'support') return (
      <SupportPriorityPanel
        supportRows={supportRows}
        RiskBadgeComponent={RiskBadge}
        toPercent={toPercent}
        onOpenStudentDetail={handleOpenStudentDetail}
        onCreateQuickAssignment={handleCreateQuickAssignment}
      />
    )
    if (id === 'dataquality') return (
      <DataQualityUsagePanel
        dataQualitySummary={dataQualitySummary}
        usageInsights={usageInsights}
        formatDuration={formatDuration}
        toPercent={toPercent}
      />
    )
    if (id === 'assignments') return (
      <AssignmentsPanel
        assignments={assignments}
        assignmentTargets={assignmentTargets}
        recipients={recipients}
        copiedId={copiedId}
        formatAssignmentSummaryLine={formatAssignmentSummaryLine}
        onCreatePreset={handleCreatePreset}
        onCreateMathPractice={handleCreateMathPractice}
        onDeactivateAssignment={handleDeactivateAssignment}
        onClearAllAssignments={handleClearAllAssignments}
        onActivateAssignment={handleActivateAssignment}
        onDeleteAssignment={handleDeleteAssignment}
        onCopyAssignmentLink={handleCopyAssignmentLink}
        classes={classes}
        selectedClassIds={selectedClassIds}
      />
    )
    if (id === 'tickets') return (
      <TicketSectionContainer
        students={students}
        filteredStudents={filteredStudents}
        classFilterOptions={classFilterOptions}
        selectedClassIds={selectedClassIds}
        classNameById={classNameById}
        recordMatchesClassFilter={recordMatchesClassFilter}
        recipients={recipients}
        teacherGroups={teacherGroups}
        onSetStudents={setStudents}
        onStatusChange={setDashboardStatus}
        onOpenStudentDetail={handleOpenStudentDetail}
        formatTimeAgo={formatTimeAgo}
      />
    )
    if (id === 'management') return (
      <>
        <ClassesAndPupilsPanel
          classes={classes}
          students={students}
          recordMatchesClassFilter={recordMatchesClassFilter}
          onSetAddToClassId={setAddToClassId}
          rosterInput={rosterInput}
          onSetRosterInput={setRosterInput}
          classStatus={classStatus}
          onAddStudentsToClass={handleAddStudentsToClass}
          onAddExistingStudentsToClass={handleAddExistingStudentsToClass}
          onMoveStudent={handleMoveStudent}
          onOpenStudentDetail={handleOpenStudentDetail}
          onStatusChange={setDashboardStatus}
          onClassesChanged={onLocalTestDataImported}
          legacyLoginPanel={renderPanelContent('password')}
          testDataPanel={teacherIdentity.role === 'super_admin' ? <LocalTestDataExportPanel /> : null}
        />
      </>
    )
    if (id === 'results') return (
      <ResultsOverviewPanel {...resultsPanelProps} RiskBadgeComponent={RiskBadge} />
    )
    if (id === 'mathresults') return (
      <MathPracticeResultsPanel students={students} filteredStudents={filteredStudents} />
    )
    if (id === 'password') return (
      <PasswordResetPanel
        sectionId={PASSWORD_RESET_SECTION_ID}
        passwordResetRows={passwordResetRows}
        passwordResetSearch={passwordResetSearch}
        onSetPasswordResetSearch={setPasswordResetSearch}
        onClearPasswordResetSearch={() => setPasswordResetSearch('')}
        passwordResetStatus={passwordResetStatus}
        onOpenStudentDetail={handleOpenStudentDetail}
        onResetStudentPassword={handleResetStudentPassword}
        passwordResetBusyId={passwordResetBusyId}
        formatTimeAgo={formatTimeAgo}
      />
    )
    if (id === 'pausegames') return (
      <PauseGameHighscorePanel selectedClassIds={selectedClassIds} />
    )
    if (id === 'ncm-grid') return (
      <div>
      <details className="mb-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm">
        <summary className="cursor-pointer">Prova det digitala räknehäftet</summary>
        <h2 className="text-sm font-semibold text-slate-800">Digitalt räknehäfte</h2>
        <p className="mr-auto text-xs text-slate-600">Osparad prototyp för att prova räknehäftet.</p>
        <button type="button" onClick={() => navigate('/teacher/ncm/diagnostic-grid')}
          className="rounded-md border border-slate-300 px-1.5 py-0.5 text-sm text-slate-800 hover:bg-slate-50">
          Öppna räknehäftet
        </button>
      </details>
      <ScreeningDispatchPanel classes={classes} students={students} teacherGroups={teacherGroups} active={activeWorkspace === 'ncm'}
          onDirtyChange={value => { dispatchDirtyRef.current = value }} onResults={(collection, picks = []) => {
            setResultPicks(picks.length ? [...picks] : collection.members.map(member => ({ type: 'class', id: member.classId })))
          setRequestedScreening(collection.id)
        }}
          isResultsDirty={() => reviewDirtyRef.current} onLeaveResults={() => { reviewDirtyRef.current = false }}
          renderResults={resultsActive => <div data-admin-panel="ncm-results">
            <RecipientPicker classes={classes} groups={teacherGroups} students={students}
              recipients={resultPicks} onChange={setResultPicks} heading="Visa resultat för" />
            <ScreeningResultsPanel classes={classes} students={students} recipients={resultPicks} teacherGroups={teacherGroups}
              active={resultsActive}
              requestedCollectionId={requestedScreening} onDirtyChange={value => { reviewDirtyRef.current = value }} />
          </div>} />
      </div>
    )
    return null
  }

  const classFilterPanel = <ClassFilterPanel
    selectedClassIds={selectedClassIds}
    studentsCount={students.length}
    filteredStudentsCount={filteredStudents.length}
    classFilterOptions={classFilterOptions}
    onClearClassFilter={clearClassFilter}
    onSelectAllClasses={() => selectAllClasses?.(classFilterOptions.filter(item => item.kind !== 'group').map(item => item.id))}
    onToggleClassFilter={handleToggleClassFilter}
    students={students}
    classNameById={classNameById}
    onPickPupil={pupil => handleOpenStudentDetail(pupil.studentId)}
  />
  const classStatsPanel = <ClassStatsCards classStats={historyState && historyState.status !== 'ready' && !historyState.hasData
    ? { totalStudents: '–', activeToday: '–', activeThisWeek: '–' } : classStats}
    supportCount={historyState && historyState.status !== 'ready' && !historyState.hasData ? '–' : supportRows.length} />

  return (
    <div data-teacher-workspace={activeWorkspace} data-teacher-admin="" className={`teacher-dashboard-surface min-h-screen pb-5 pt-14 sm:pb-6 sm:pt-16 ${surfaceClass}`}>
      {/* Below 1400 px (iPad) the content uses the full window and the menu is a bar on top. */}
      <div className="mx-auto px-3 sm:px-4 min-[1400px]:max-w-6xl">
        <DashboardHeaderBar
          workspaceTitle={!isDirectStudentView ? 'Matematik · Lärarvy' : undefined}
          workspaceDescription={activeWorkspace === 'ncm' ? undefined : WORKSPACES.find(workspace => workspace.id === activeWorkspace)?.label}
          isDirectStudentView={isDirectStudentView}
          detailStudentName={detailStudentProfile?.name || ''}
          teacherName={teacherName}
          teacherRole={teacherRole}
          isAdmin={teacherIsAdmin}
          cloudSyncStatus={cloudSyncStatus}
          formatSyncTimestamp={formatSyncTimestamp}
          getCloudSyncSourceLabel={getCloudSyncSourceLabel}
          isCloudRefreshBusy={isCloudRefreshBusy}
          onRefreshNow={() => { void handleCloudRefreshNow() }}
          onShowPupilNames={showPupilNames}
          fillingPupilNames={fillingPupilNames}
          onShowCodeNames={showCodeNames}
          pupilLabelsShown={pupilLabelsShown}
          onGoDashboard={() => navigate('/teacher')}
          onLogout={handleLogout}
        />

        <div hidden={!dashboardStatus} className="mb-3 text-sm text-gray-600">{dashboardStatus}</div>

        <div className="grid gap-3 min-[1400px]:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="sticky top-10 z-40 rounded-lg bg-slate-800 p-1.5 text-slate-100 shadow-lg min-[1400px]:top-3 min-[1400px]:h-fit min-[1400px]:p-2 min-[1400px]:shadow-none">
              <p className="hidden px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-300 min-[1400px]:block">Arbetsläge</p>
              <nav className="flex flex-wrap gap-1 min-[1400px]:grid" aria-label="Lärarvy">
                {WORKSPACES.filter(workspace => (!workspace.adminOnly || teacherIsAdmin) && (!workspace.attentionOnly || canViewAttention)).map(workspace => (
                  <button key={workspace.id} aria-current={activeWorkspace === workspace.id ? 'page' : undefined} type="button" onClick={() => {
                    if (workspace.id !== activeWorkspace && (reviewDirtyRef.current || dispatchDirtyRef.current)
                      && !window.confirm('Du har osparade ändringar. Vill du lämna dem?')) return
                    if (workspace.id !== activeWorkspace) reviewDirtyRef.current = false
                    if (workspace.id !== 'ncm') dispatchDirtyRef.current = false
                    setActiveWorkspace(workspace.id)
                    if (workspace.id === 'focus') navigate('/teacher/focus')
                    else if (isFocusView || isDirectStudentView) navigate('/teacher', { state: { workspace: workspace.id } })
                  }}
                    className={`rounded px-1.5 py-0.5 text-left text-sm transition-colors ${activeWorkspace === workspace.id ? 'bg-amber-300 font-semibold text-slate-900' : 'text-slate-100 hover:bg-slate-700'}`}>
                    {workspace.label}<span className="mt-0.5 hidden text-[11px] font-normal opacity-75 min-[1400px]:block">{workspace.description}</span>
                  </button>
                ))}
              </nav>
          </aside>
          <div data-admin-content className="min-w-0 flex flex-col gap-3">
            {!isScreening && !['admin', 'focus'].includes(activeWorkspace) && <div data-history-state={historyState?.status || 'ready'}
              hidden={!historyState || historyState.status === 'ready'} role="status" className="text-sm text-gray-700">
              {historyState?.status === 'idle' ? 'Välj klass, grupp eller sök en elev för att se resultat.'
                : historyState?.status === 'error' ? `${historyState.error}${historyState.hasData ? ' Tidigare hämtade resultat visas.' : ''}`
                  : historyState?.hasData ? 'Uppdaterar elevresultat… Tidigare hämtade resultat visas.' : 'Hämtar elevresultat…'}
              {historyState?.status === 'error' && <button type="button" onClick={onRetryHistory}
                className="ml-2 rounded border border-gray-300 px-1.5 py-0.5 text-sm">Försök hämta resultaten igen</button>}
            </div>}
            {!isScreening && activeWorkspace !== 'admin' && <div className="dashboard-context-grid">
            {activeWorkspace === 'progress' ? renderProgressModule('filter', 'Klassurval', classFilterPanel) : classFilterPanel}
            {activeWorkspace === 'progress'
              ? renderProgressModule('stats', 'Klassstatistik', classStatsPanel)
              : activeWorkspace === 'focus' ? null : classStatsPanel}
            </div>}

            {activeWorkspace === 'focus' && !canViewAttention && <p role="status">Fokusresultat är endast tillgängliga för huvudadmin.</p>}
            {!isScreening && !(activeWorkspace === 'support' && isDirectStudentView) && WORKSPACE_SUBTABS[activeWorkspace] && (
              <div className="workspace-subtabs">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Delvyer">
                  {WORKSPACE_SUBTABS[activeWorkspace].map(tab => {
                    const currentSubTab = subTabByWorkspace[activeWorkspace] || WORKSPACE_SUBTABS[activeWorkspace][0].id
                    const isActive = currentSubTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          setSubTabByWorkspace(prev => ({ ...prev, [activeWorkspace]: tab.id }))
                          setCollapsed(prev => ({
                            ...prev,
                            ...Object.fromEntries(tab.panels.map(panelId => [panelId, false]))
                          }))
                        }}
                        className="workspace-subtab-btn"
                      >
                        {tab.label}
                        {tab.id === 'urgent' && supportRows.length > 0 ? (
                          <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {supportRows.length}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const panels = WORKSPACE_SUBTABS[activeWorkspace].flatMap(tab => tab.panels)
                      setCollapsed(prev => ({ ...prev, ...Object.fromEntries(panels.map(id => [id, false])) }))
                    }}
                    className="workspace-subtab-action"
                  >
                    Fäll ut alla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const panels = WORKSPACE_SUBTABS[activeWorkspace].flatMap(tab => tab.panels)
                      setCollapsed(prev => ({ ...prev, ...Object.fromEntries(panels.map(id => [id, true])) }))
                    }}
                    className="workspace-subtab-action"
                  >
                    Fäll ihop alla
                  </button>
                </div>
              </div>
            )}
            {activeWorkspace === 'support' && isDirectStudentView && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm shadow-sm">
                <span className="font-semibold text-indigo-950">
                  Direkt elevvy: {detailStudentProfile?.name || detailStudentId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace('progress')
                    navigate('/teacher')
                  }}
                  className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                >
                  ← Tillbaka till klassöversikten
                </button>
              </div>
            )}
            {activeWorkspace === 'teaching' && (
              <RecipientPicker classes={classes} groups={teacherGroups} students={students}
                recipients={recipients} onChange={setDeliveryPicks}
                followsFilter={recipientsFollowFilter && activeWorkspace === 'teaching'} />
            )}
            {activeWorkspace === 'teaching' && (
              <RecipientActiveOverview recipients={recipients} assignmentTargets={assignmentTargets}
                assignments={assignments} groups={teacherGroups} students={students} />
            )}
            {isScreening && <div>{renderPanelContent('ncm-grid')}</div>}
            {!isScreening && (activeWorkspace === 'support' && isDirectStudentView
              ? ['detail', 'difficulty-analysis', 'training-priority']
              : (WORKSPACE_SUBTABS[activeWorkspace]?.find(t => t.id === (subTabByWorkspace[activeWorkspace] || WORKSPACE_SUBTABS[activeWorkspace][0].id))?.panels
                ?? WORKSPACES.find(workspace => workspace.id === activeWorkspace)?.panels ?? []))
              .filter(id => visiblePanelDefs.some(panel => panel.id === id))
              .map(id => (['progress', 'support', 'teaching'].includes(activeWorkspace) && id !== 'tickets')
                ? renderProgressModule(id, PANEL_DEFS.find(panel => panel.id === id)?.title, renderPanelContent(id))
                : <div key={id} data-admin-panel={id}>{renderPanelContent(id)}</div>)}
            {activeWorkspace === 'progress' && import.meta.env.DEV && (
              <details className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-xs">
                <summary className="cursor-pointer font-medium text-slate-500">Utvecklarverktyg: Importera lokal testdata</summary>
                <div className="mt-2">
                  <LocalTestDataPanel mode="import" onImported={onLocalTestDataImported} />
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
