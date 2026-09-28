import { cloneElement, useEffect, useState } from 'react'
import AssignmentsPanel from './AssignmentsPanel'
import ClassOverviewPanel from './ClassOverviewPanel'
import ClassManagementPanel from './ClassManagementPanel'
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
import StudentDetailPanel from './StudentDetailPanel'
import StudentDetailTrainingPriorityPanel from './StudentDetailTrainingPriorityPanel'
import SupportPriorityPanel from './SupportPriorityPanel'
import TablePracticeProgressPanel from './TablePracticeProgressPanel'
import TablePracticeOverviewPanel from './TablePracticeOverviewPanel'
import LocalTestDataPanel from './LocalTestDataPanel'
import TeacherAdminPanel from './TeacherAdminPanel'
import TeacherPasswordNoticePanel from './TeacherPasswordNoticePanel'
import TicketSectionContainer from './TicketSectionContainer'

import { ActivityBadge, RiskBadge } from './dashboardStatusBadges'
import { getOperationLabel } from '../../../lib/operations'
import { getTeacherIdentity, isTeacherAdmin } from '../../../lib/teacherAuth'
import { getTeacherRoleLabel } from '../../../lib/teacherRoles'

const PANEL_DEFS = [
  { id: 'support',     title: 'Behöver stöd nu' },
  { id: 'overview',    title: 'Klass/gruppvy – snabbstatus' },
  { id: 'detail',      title: 'Elevprofil' },
  { id: 'results',     title: 'Resultat och export' },
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
  { id: 'admin',       title: 'Administration', adminOnly: true },
]

const WORKSPACES = [
  { id: 'progress', label: 'Framsteg', description: 'Kunskapsområden och elever', panels: ['mastery', 'tableoverview', 'overview', 'detail', 'tabledev'] },
  { id: 'teaching', label: 'Uppdrag & tickets', description: 'Planera och följ upp', panels: ['assignments', 'tickets'] },
  { id: 'support', label: 'Statistik & stöd', description: 'Felmönster och hjälpbehov', panels: ['support', 'results', 'heatmap', 'difficulty-analysis', 'training-priority', 'inactivity', 'dataquality'] },
  { id: 'admin', label: 'Administration', description: 'Klasser, elevkort och konton', panels: ['management', 'password', 'pausegames', 'admin'] }
]

const DEFAULT_COLLAPSED = Object.fromEntries(
  PANEL_DEFS.map(({ id }) => [id, false])
)
const LS_COLLAPSED_KEY = 'mathapp_dashboard_panel_collapsed_v2'

export default function DashboardLayout({
  isDirectStudentView,
  detailStudentProfile,
  cloudSyncStatus,
  formatTimeAgo,
  handleJumpToPasswordReset,
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
  classNameInput,
  setClassNameInput,
  handleCreateClass,
  handleCreatePilotRoster,
  addToClassId,
  setAddToClassId,
  classes,
  onLocalTestDataImported,
  handleAddExistingStudentsToClass,
  handleMoveStudent,
  handleAddStudentsToClass,
  rosterInput,
  setRosterInput,
  classStatus,
  handleDeleteClass,
  handleRenameClass,
  handleSetTeacherPupilLabel,
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
  const teacherIsAdmin = isTeacherAdmin()
  const teacherIdentity = getTeacherIdentity()
  const teacherName = String(teacherIdentity.displayName || 'Lärare').trim() || 'Lärare'
  const teacherRole = getTeacherRoleLabel(teacherIdentity.role)
  const [activeWorkspace, setActiveWorkspace] = useState('progress')
  const [tableSelection, setTableSelection] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mathapp_table_progress_selection') || '{}')
      return { table: Number.isInteger(Number(saved.table)) && Number(saved.table) >= 2 && Number(saved.table) <= 12 ? Number(saved.table) : 7,
        days: Number(saved.days) === 14 ? 14 : 7, studentId: String(saved.studentId || '') }
    } catch { return { table: 7, days: 7, studentId: '' } }
  })
  const tableProgressStudents = selectedClassIds.length > 0
    ? students.filter(student => recordMatchesClassFilter(student, selectedClassIds)) : students
  useEffect(() => {
    try { localStorage.setItem('mathapp_table_progress_selection', JSON.stringify(tableSelection)) } catch { /* Preferences are optional. */ }
  }, [tableSelection])
  useEffect(() => {
    if (students.length > 0 && tableSelection.studentId && !tableProgressStudents.some(student => student.studentId === tableSelection.studentId)) {
      setTableSelection(previous => ({ ...previous, studentId: '' }))
    }
  }, [students, tableProgressStudents, tableSelection.studentId])
  const openTableProgress = (table, studentId) => {
    setTableSelection(previous => ({ ...previous,
      table: Number.isInteger(table) ? table : previous.table,
      studentId: studentId === undefined ? detailStudentId : studentId
    }))
    setCollapsed(previous => ({ ...previous, tabledev: false }))
    setActiveWorkspace('progress')
    window.setTimeout(() => document.getElementById('table-practice-progress')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }
  const visiblePanelDefs = PANEL_DEFS.filter(panel => !panel.adminOnly || teacherIsAdmin)
  const surfaceClass = teacherIdentity.role === 'super_admin'
    ? 'teacher-dashboard-surface--super-admin'
    : teacherIsAdmin
       ? 'teacher-dashboard-surface--admin'
       : 'teacher-dashboard-surface--teacher'

  const [collapsed, setCollapsed] = useState(() => {
    const defaults = {
      ...DEFAULT_COLLAPSED,
      filter: false,
      stats: false,
      testdata: false,
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
      setActiveWorkspace('progress')
      setCollapsed(prev => ({ ...prev, detail: false }))
    }
  }, [isDirectStudentView, detailStudentId])

  function renderProgressModule(id, title, content) {
    const toggle = <button type="button" aria-label={`${collapsed[id] ? 'Visa' : 'Minimera'} ${title}`}
      aria-expanded={!collapsed[id]} aria-controls={`progress-panel-${id}`}
      onClick={() => setCollapsed(previous => ({ ...previous, [id]: !previous[id] }))}
      className="rounded p-1 text-lg leading-none text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      title={`${collapsed[id] ? 'Visa' : 'Minimera'} ${title}`}>
      <span aria-hidden="true">{collapsed[id] ? '⌄' : '⌃'}</span>
    </button>
    return <div key={id} id={`progress-panel-${id}`}>
      {collapsed[id]
        ? <section className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <h2 className="font-semibold text-slate-800">{title}</h2>{toggle}
        </section>
        : cloneElement(content, { collapseControl: toggle })}
    </div>
  }

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
    if (id === 'tableoverview') return (
      <TablePracticeOverviewPanel
        students={tableProgressStudents}
        days={tableSelection.days}
        onDaysChange={days => setTableSelection(previous => ({ ...previous, days }))}
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
      <TablePracticeProgressPanel
        students={tableProgressStudents}
        selection={tableSelection}
        onSelectionChange={setTableSelection}
        groupLabel={selectedClassIds.map(id => classNameById?.get(id)).filter(Boolean).join(', ') || 'Alla klasser och grupper'}
        onOpenStudentDetail={handleOpenStudentDetail}
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
        onSetStudents={setStudents}
        onStatusChange={setDashboardStatus}
        onOpenStudentDetail={handleOpenStudentDetail}
        formatTimeAgo={formatTimeAgo}
      />
    )
    if (id === 'management') return (
      <>
        {teacherIdentity.role === 'super_admin' ? <TeacherPasswordNoticePanel /> : null}
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
          onStatusChange={setDashboardStatus}
          onOpenStudentDetail={handleOpenStudentDetail}
          canResetStudentAccounts={teacherIdentity.role === 'super_admin'}
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

  const classFilterPanel = <ClassFilterPanel
    selectedClassIds={selectedClassIds}
    studentsCount={students.length}
    filteredStudentsCount={filteredStudents.length}
    classFilterOptions={classFilterOptions}
    onClearClassFilter={clearClassFilter}
    onToggleClassFilter={handleToggleClassFilter}
  />
  const classStatsPanel = <ClassStatsCards classStats={classStats} supportCount={supportRows.length} />

  return (
    <div className={`teacher-dashboard-surface min-h-screen pb-5 pt-14 sm:pb-6 sm:pt-16 ${surfaceClass}`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <DashboardHeaderBar
          isDirectStudentView={isDirectStudentView}
          detailStudentName={detailStudentProfile?.name || ''}
          teacherName={teacherName}
          teacherRole={teacherRole}
          isAdmin={teacherIsAdmin}
          cloudSyncStatus={cloudSyncStatus}
          isCloudRefreshBusy={isCloudRefreshBusy}
          onRefreshNow={() => { void handleCloudRefreshNow() }}
          onJumpToPasswordReset={() => {
            setActiveWorkspace('admin')
            window.setTimeout(handleJumpToPasswordReset, 0)
          }}
          onGoDashboard={() => navigate('/teacher')}
          onGoAdmin={() => navigate('/teacher/admin')}
          onLogout={handleLogout}
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
          <div className="min-w-0 flex flex-col gap-3">
            <div className="dashboard-context-grid">
            {activeWorkspace === 'progress' ? renderProgressModule('filter', 'Klassurval', classFilterPanel) : classFilterPanel}
            {activeWorkspace === 'progress'
              ? renderProgressModule('stats', 'Klassstatistik', classStatsPanel)
              : classStatsPanel}
            </div>

            {activeWorkspace === 'progress' && import.meta.env.DEV && renderProgressModule('testdata', 'Lokal testdata', <LocalTestDataPanel mode="import" onImported={onLocalTestDataImported} />)}

            {WORKSPACES.find(workspace => workspace.id === activeWorkspace)?.panels
              .filter(id => visiblePanelDefs.some(panel => panel.id === id))
              .map(id => activeWorkspace === 'progress'
                ? renderProgressModule(id, PANEL_DEFS.find(panel => panel.id === id)?.title, renderPanelContent(id))
                : <div key={id}>{renderPanelContent(id)}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}
