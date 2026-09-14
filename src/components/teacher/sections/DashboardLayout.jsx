import { useEffect, useState } from 'react'
import AssignmentsPanel from './AssignmentsPanel'
import ClassOverviewPanel from './ClassOverviewPanel'
import ClassManagementPanel from './ClassManagementPanel'
import ClassFilterPanel from './ClassFilterPanel'
import ClassMisconceptionHeatmap from './ClassMisconceptionHeatmap'
import ClassMasteryLevelPanel from './ClassMasteryLevelPanel'
import CollapsibleSection from './CollapsibleSection'
import PauseGameHighscorePanel from './PauseGameHighscorePanel'
import DifficultyAnalysisPanel from './DifficultyAnalysisPanel'
import DataQualityUsagePanel from './DataQualityUsagePanel'
import DashboardHeaderBar from './DashboardHeaderBar'
import InactivityAndClassLevelPanel from './InactivityAndClassLevelPanel'
import PasswordResetPanel from './PasswordResetPanel'
import ResultsOverviewPanel from './ResultsOverviewPanel'
import StudentDetailPanel from './StudentDetailPanel'
import StudentDetailTrainingPriorityPanel from './StudentDetailTrainingPriorityPanel'
import SupportPriorityPanel from './SupportPriorityPanel'
import TableSelectionAndDevelopmentPanel from './TableSelectionAndDevelopmentPanel'
import TeacherAdminPanel from './TeacherAdminPanel'
import TeacherPasswordNoticePanel from './TeacherPasswordNoticePanel'
import TicketSectionContainer from './TicketSectionContainer'
import TableStickyStatusPanel from './TableStickyStatusPanel'
import { ActivityBadge, RiskBadge } from './dashboardStatusBadges'
import { getOperationLabel } from '../../../lib/operations'
import { getTeacherAccountKind, getTeacherAccountLabel, getTeacherIdentity, isTeacherPrimaryAdmin } from '../../../lib/teacherAuth'

const PANEL_DEFS = [
  { id: 'support',     title: 'Behöver stöd nu' },
  { id: 'overview',    title: 'Klassöversikt' },
  { id: 'detail',      title: 'Elevdetalj' },
  { id: 'results',     title: 'Resultat och export' },
  { id: 'assignments', title: 'Uppdrag' },
  { id: 'tickets',     title: 'Tickets' },
  { id: 'mastery',     title: 'Nivåöversikt' },
  { id: 'sticky',      title: 'Tabellstatus' },
  { id: 'heatmap',     title: 'Felmönster' },
  { id: 'difficulty-analysis', title: 'Svårighetsanalys' },
  { id: 'training-priority', title: 'Träningsprioritet' },
  { id: 'inactivity',  title: 'Inaktivitet och nivå' },
  { id: 'tabledev',    title: 'Tabellutveckling' },
  { id: 'dataquality', title: 'Datakvalitet' },
  { id: 'management',  title: 'Klasshantering' },
  { id: 'password',    title: 'Lösenordsåterställning' },
  { id: 'pausegames',  title: 'Pausspel — Highscore' },
  { id: 'admin',       title: 'Administration', adminOnly: true },
]

const DEFAULT_COLLAPSED = Object.fromEntries(
  PANEL_DEFS.map(({ id }) => [id, !['support', 'overview'].includes(id)])
)
const LS_COLLAPSED_KEY = 'mathapp_dashboard_panel_collapsed_v2'
const WORKSPACES = [
  { id: 'progress', label: 'Framsteg', description: 'Kunskapsområden och elever', panels: ['mastery', 'sticky', 'overview', 'detail', 'tabledev'] },
  { id: 'teaching', label: 'Uppdrag & tickets', description: 'Planera och följ upp', panels: ['assignments', 'tickets'] },
  { id: 'support', label: 'Statistik & stöd', description: 'Felmönster och hjälpbehov', panels: ['support', 'results', 'heatmap', 'difficulty-analysis', 'training-priority', 'inactivity', 'dataquality'] },
  { id: 'admin', label: 'Administration', description: 'Klasser, elevkort och konton', panels: ['management', 'password', 'pausegames', 'admin'] }
]

export default function DashboardLayout({
  isDirectStudentView,
  detailStudentProfile,
  cloudSyncStatus,
  formatTimeAgo,
  handleJumpToPasswordReset,
  handleRefresh,
  navigate,
  handleLogout,
  dashboardStatus,
  isCloudRefreshBusy,
  handleCloudRefreshNow,
  formatSyncTimestamp,
  getCloudSyncSourceLabel,
  selectedClassIds,
  students,
  filteredStudents,
  classFilterOptions,
  clearClassFilter,
  handleToggleClassFilter,
  classStats,
  dataQualitySummary,
  usageInsights,
  formatDuration,
  toPercent,
  assignments,
  activeAssignmentId,
  copiedId,
  formatAssignmentSummaryLine,
  handleCreatePreset,
  handleClearActiveForAll,
  handleClearAllAssignments,
  handleActivateForAll,
  handleDeleteAssignment,
  handleCopyAssignmentLink,
  classNameById,
  recordMatchesClassFilter,
  setStudents,
  setDashboardStatus,
  handleOpenStudentDetail,
  classOverviewMeta,
  filteredRows,
  tableStickyStatusRows,
  TABLES,
  handleStickySort,
  getStickySortIndicator,
  getTeacherTableStatusClass,
  getTeacherTableStatusLabel,
  detailStudentId,
  detailStudentOptions,
  hasMissingDirectStudent,
  setDetailStudentId,
  handleExportStudentDetailCsv,
  detailStudentRow,
  detailStudentViewData,
  trainingPriorityList,
  getTableSpeedColorClass,
  classTableBenchmarks,
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
  tableSelectedStudentIds,
  setTableSelectedStudentIds,
  tableStudentSearch,
  setTableStudentSearch,
  filteredTableStudentOptions,
  tableStudentSet,
  handleToggleTableStudent,
  tableDevelopmentOverview,
  supportRows,
  handleCreateQuickAssignment,
  classNameInput,
  setClassNameInput,
  handleCreateClass,
  handleCreatePilotRoster,
  addToClassId,
  setAddToClassId,
  classes,
  handleAddExistingStudentsToClass,
  handleMoveStudent,
  handleAddStudentsToClass,
  rosterInput,
  setRosterInput,
  classStatus,
  handleDeleteClass,
  handleRenameClass,
  handleDeleteStudent,
  handleRenameStudent,
  handleSaveClassExtras,
  resultsPanelProps,
  PASSWORD_RESET_SECTION_ID,
  passwordResetRows,
  passwordResetSearch,
  setPasswordResetSearch,
  passwordResetStatus,
  handleResetStudentPassword,
  passwordResetBusyId
}) {
  const teacherIsPrimaryAdmin = isTeacherPrimaryAdmin()
  const teacherIdentity = getTeacherIdentity()
  const teacherAccountKind = getTeacherAccountKind(teacherIdentity)
  const teacherSurfaceClass = teacherAccountKind === 'primary-admin'
    ? 'teacher-role-surface teacher-role-surface--primary-admin'
    : teacherAccountKind === 'admin'
      ? 'teacher-role-surface teacher-role-surface--admin'
      : 'teacher-role-surface teacher-role-surface--teacher'
  const visiblePanelDefs = PANEL_DEFS.filter(p => !p.adminOnly || teacherIsPrimaryAdmin)
  const [activeWorkspace, setActiveWorkspace] = useState('progress')

  const [collapsed, setCollapsed] = useState(() => {
    const defaults = {
      ...DEFAULT_COLLAPSED,
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

  const toggleCollapsed = id => setCollapsed(prev => {
    const next = { ...prev, [id]: !prev[id] }
    try {
      localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(next))
    } catch (error) {
      // This is only a convenience preference; do not crash the dashboard
      // when browser storage is full.
      if (error?.name !== 'QuotaExceededError') throw error
    }
    return next
  })


  useEffect(() => {
    if (!isDirectStudentView) return
    setActiveWorkspace('progress')
    setCollapsed(prev => ({ ...prev, detail: false }))
  }, [isDirectStudentView, detailStudentId])

  function renderPanelContent(id) {
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
    if (id === 'heatmap') return (
      <ClassMisconceptionHeatmap
        filteredStudents={filteredStudents}
        onOpenStudentDetail={handleOpenStudentDetail}
      />
    )
            if (id === 'sticky') return (
      <TableStickyStatusPanel
        rows={tableStickyStatusRows || []}
        tables={TABLES || []}
        onSort={handleStickySort}
        onOpenStudentDetail={handleOpenStudentDetail}
        getSortIndicator={getStickySortIndicator}
        getStatusClass={getTeacherTableStatusClass}
        getStatusLabel={getTeacherTableStatusLabel}
        className="bg-white rounded-lg shadow p-4 mb-8"
      />
    )
    if (id === 'detail') return (
      <StudentDetailPanel
        sectionId="teacher-student-detail-section"
        detailStudentId={detailStudentId}
        detailStudentOptions={detailStudentOptions}
        hasMissingDirectStudent={hasMissingDirectStudent}
        isDirectStudentView={isDirectStudentView}
        onChangeDetailStudentId={setDetailStudentId}
        onNavigateDirectStudent={(studentId) => navigate(`/teacher/student/${encodeURIComponent(studentId)}`)}
        onExportCsv={handleExportStudentDetailCsv}
        canExportCsv={Boolean(detailStudentProfile && detailStudentRow && detailStudentViewData)}
        onDeleteStudent={handleDeleteStudent}
        onRenameStudent={handleRenameStudent}
        detailStudentProfile={detailStudentProfile}
        detailStudentRow={detailStudentRow}
        detailStudentViewData={detailStudentViewData}
        toPercent={toPercent}
        formatDuration={formatDuration}
        ActivityBadgeComponent={ActivityBadge}
        trainingPriorityList={trainingPriorityList}
        tableMasteryPanelProps={{
          tables: TABLES,
          getTableSpeedColorClass,
          classTableBenchmarks,
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
      if (!detailStudentProfile) {
        return <p className="text-sm text-gray-500">Välj en elev i Elevdetalj för att se svårighetsanalys.</p>
      }
      return (
        <DifficultyAnalysisPanel
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
      if (!detailStudentProfile) {
        return <p className="text-sm text-gray-500">Välj en elev i Elevdetalj för att se träningsprioritet.</p>
      }
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
      <TableSelectionAndDevelopmentPanel
        tableSelectedStudentIds={tableSelectedStudentIds || []}
        filteredStudentsCount={filteredStudents.length}
        onClearTableSelection={() => setTableSelectedStudentIds([])}
        tableStudentSearch={tableStudentSearch}
        onSetTableStudentSearch={setTableStudentSearch}
        filteredTableStudentOptions={filteredTableStudentOptions || []}
        tableStudentSet={tableStudentSet || new Set()}
        onToggleTableStudent={handleToggleTableStudent}
        tableDevelopmentOverview={tableDevelopmentOverview || []}
        toPercent={toPercent}
      />
    )
    if (id === 'support') return (
      <div className="mb-8">
        <SupportPriorityPanel
          supportRows={supportRows}
          RiskBadgeComponent={RiskBadge}
          toPercent={toPercent}
          onOpenStudentDetail={handleOpenStudentDetail}
          onCreateQuickAssignment={handleCreateQuickAssignment}
        />
      </div>
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
        activeAssignmentId={activeAssignmentId}
        copiedId={copiedId}
        formatAssignmentSummaryLine={formatAssignmentSummaryLine}
        onCreatePreset={handleCreatePreset}
        onClearActiveForAll={handleClearActiveForAll}
        onClearAllAssignments={handleClearAllAssignments}
        onActivateForAll={handleActivateForAll}
        onDeleteAssignment={handleDeleteAssignment}
        onCopyAssignmentLink={handleCopyAssignmentLink}
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
        onSetStudents={setStudents}
        onStatusChange={setDashboardStatus}
        onOpenStudentDetail={handleOpenStudentDetail}
        formatTimeAgo={formatTimeAgo}
      />
    )
    if (id === 'management') return (
      <>
        {teacherIsPrimaryAdmin ? <TeacherPasswordNoticePanel /> : null}
        <ClassManagementPanel
          classNameInput={classNameInput}
          onSetClassNameInput={setClassNameInput}
          onCreateClass={handleCreateClass}
          onCreatePilotRoster={handleCreatePilotRoster}
          addToClassId={addToClassId}
          onSetAddToClassId={setAddToClassId}
          classes={classes}
          onAddExistingStudentsToClass={handleAddExistingStudentsToClass}
          onMoveStudent={handleMoveStudent}
          onAddStudentsToClass={handleAddStudentsToClass}
          rosterInput={rosterInput}
          onSetRosterInput={setRosterInput}
          classStatus={classStatus}
          students={students}
          recordMatchesClassFilter={recordMatchesClassFilter}
          onDeleteClass={handleDeleteClass}
          onRenameClass={handleRenameClass}
          onSaveClassExtras={handleSaveClassExtras}
          onOpenStudentDetail={handleOpenStudentDetail}
          teacherClassIds={teacherIdentity.classIds || []}
          canManageSchools={teacherIdentity.isAdmin}
          canDeleteClasses={teacherIdentity.isAdmin}
          canResetStudentAccounts={teacherIsPrimaryAdmin}
        />
      </>
    )
    if (id === 'results') return (
      <ResultsOverviewPanel {...resultsPanelProps} RiskBadgeComponent={RiskBadge} />
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
    if (id === 'admin') return <TeacherAdminPanel />
    return null
  }

  return (
    <div className={`min-h-screen ${teacherSurfaceClass} py-4`}>
      <div className="max-w-7xl mx-auto px-3">
        <DashboardHeaderBar
          isDirectStudentView={isDirectStudentView}
          detailStudentName={detailStudentProfile?.name || ''}
          onJumpToPasswordReset={handleJumpToPasswordReset}
          onRefresh={handleRefresh}
          onGoDashboard={() => navigate('/teacher')}
          onLogout={handleLogout}
          accountName={teacherIdentity.displayName}
          accountLabel={getTeacherAccountLabel(teacherIdentity)}
          cloudSyncStatus={cloudSyncStatus}
          isCloudRefreshBusy={isCloudRefreshBusy}
          onRefreshCloud={() => { void handleCloudRefreshNow() }}
        />

        <div className="mb-4 min-h-6 text-sm text-gray-600">{dashboardStatus || ' '}</div>

        <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="rounded-lg bg-slate-800 p-2 text-slate-100 lg:sticky lg:top-3 lg:h-fit">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">Arbetsläge</p>
            <nav className="grid gap-1" aria-label="Lärarvy">
              {WORKSPACES.map(workspace => (
                <button key={workspace.id} type="button" onClick={() => setActiveWorkspace(workspace.id)}
                  className={`rounded px-3 py-2 text-left text-sm transition-colors ${activeWorkspace === workspace.id ? 'bg-amber-300 font-semibold text-slate-900' : 'text-slate-100 hover:bg-slate-700'}`}>
                  {workspace.label}<span className="mt-0.5 block text-[11px] font-normal opacity-75">{workspace.description}</span>
                </button>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
          <ClassFilterPanel
            selectedClassIds={selectedClassIds}
            studentsCount={students.length}
            filteredStudentsCount={filteredStudents.length}
            classFilterOptions={classFilterOptions}
            onClearClassFilter={clearClassFilter}
            onToggleClassFilter={handleToggleClassFilter}
          />

          {WORKSPACES.find(workspace => workspace.id === activeWorkspace)?.panels
            .filter(id => visiblePanelDefs.some(panel => panel.id === id))
            .filter(id => id !== 'detail' || isDirectStudentView || !collapsed.detail)
            .map(id => <div key={id}>{renderPanelContent(id)}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}
