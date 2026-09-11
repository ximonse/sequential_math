import { useEffect, useState } from 'react'
import AssignmentsPanel from './AssignmentsPanel'
import ClassOverviewPanel from './ClassOverviewPanel'
import ClassManagementPanel from './ClassManagementPanel'
import ClassFilterPanel from './ClassFilterPanel'
import ClassMisconceptionHeatmap from './ClassMisconceptionHeatmap'
import ClassMasteryLevelPanel from './ClassMasteryLevelPanel'
import ClassStatsCards from './ClassStatsCards'
import CloudSyncStatusPanel from './CloudSyncStatusPanel'
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
import DashboardWorkspaceNavigation from './DashboardWorkspaceNavigation'
import TeacherPasswordNoticePanel from './TeacherPasswordNoticePanel'
import TicketSectionContainer from './TicketSectionContainer'
import TableStickyStatusPanel from './TableStickyStatusPanel'
import { ActivityBadge, RiskBadge } from './dashboardStatusBadges'
import { getOperationLabel } from '../../../lib/operations'
import { getTeacherIdentity, isTeacherAdmin } from '../../../lib/teacherAuth'
import { getTeacherRoleLabel } from '../../../lib/teacherRoles'

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
]

const WORKSPACE_PANEL_IDS = {
  classes: ['support', 'overview', 'detail', 'management', 'password'],
  work: ['assignments', 'tickets'],
  knowledge: ['mastery', 'sticky', 'heatmap', 'difficulty-analysis', 'training-priority', 'tabledev'],
  statistics: ['results', 'inactivity', 'dataquality']
}

const DEFAULT_COLLAPSED = Object.fromEntries(
  PANEL_DEFS.map(({ id }) => [id, !['support', 'overview'].includes(id)])
)
const LS_COLLAPSED_KEY = 'mathapp_dashboard_panel_collapsed_v2'

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
  const teacherIsAdmin = isTeacherAdmin()
  const teacherIdentity = getTeacherIdentity()
  const teacherName = String(teacherIdentity.displayName || 'Lärare').trim() || 'Lärare'
  const teacherRole = getTeacherRoleLabel(teacherIdentity.role)
  const dashboardTabKey = `mathapp_dashboard_tab_${teacherIdentity.teacherId || 'unknown'}`
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem(dashboardTabKey)
    return WORKSPACE_PANEL_IDS[stored] ? stored : 'classes'
  })
  const activePanelIds = WORKSPACE_PANEL_IDS[activeTab] || WORKSPACE_PANEL_IDS.classes
  const visiblePanelDefs = PANEL_DEFS.filter(panel => activePanelIds.includes(panel.id))
  const surfaceClass = teacherIdentity.role === 'super_admin'
    ? 'teacher-dashboard-surface--super-admin'
    : teacherIsAdmin
      ? 'teacher-dashboard-surface--admin'
      : 'teacher-dashboard-surface--teacher'

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
    localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(next))
    return next
  })


  useEffect(() => {
    if (isDirectStudentView) {
      setActiveTab('classes')
      setCollapsed(prev => ({ ...prev, detail: false }))
    }
  }, [isDirectStudentView, detailStudentId])

  useEffect(() => {
    localStorage.setItem(dashboardTabKey, activeTab)
  }, [activeTab, dashboardTabKey])

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
        rows={tableStickyStatusRows}
        tables={TABLES}
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
        tableSelectedStudentIds={tableSelectedStudentIds}
        filteredStudentsCount={filteredStudents.length}
        onClearTableSelection={() => setTableSelectedStudentIds([])}
        tableStudentSearch={tableStudentSearch}
        onSetTableStudentSearch={setTableStudentSearch}
        filteredTableStudentOptions={filteredTableStudentOptions}
        tableStudentSet={tableStudentSet}
        onToggleTableStudent={handleToggleTableStudent}
        tableDevelopmentOverview={tableDevelopmentOverview}
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
        <TeacherPasswordNoticePanel />
        <ClassManagementPanel
          classNameInput={classNameInput}
          onSetClassNameInput={setClassNameInput}
          onCreateClass={handleCreateClass}
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
    return null
  }

  return (
    <div className={`teacher-dashboard-surface min-h-screen py-8 ${surfaceClass}`}>
      <div className="max-w-6xl mx-auto px-4">
        <DashboardHeaderBar
          isDirectStudentView={isDirectStudentView}
          detailStudentName={detailStudentProfile?.name || ''}
          teacherName={teacherName}
          teacherRole={teacherRole}
          isAdmin={teacherIsAdmin}
          onJumpToPasswordReset={() => {
            setActiveTab('classes')
            window.setTimeout(handleJumpToPasswordReset, 0)
          }}
          onRefresh={handleRefresh}
          onGoDashboard={() => navigate('/teacher')}
          onGoAdmin={() => navigate('/teacher/admin')}
          onLogout={handleLogout}
        />

        <div className="mb-4 min-h-6 text-sm text-gray-600">{dashboardStatus || ' '}</div>

        <div className="flex flex-col">
          <CloudSyncStatusPanel
            cloudSyncStatus={cloudSyncStatus}
            isCloudRefreshBusy={isCloudRefreshBusy}
            onRefreshNow={() => { void handleCloudRefreshNow() }}
            formatSyncTimestamp={formatSyncTimestamp}
            getCloudSyncSourceLabel={getCloudSyncSourceLabel}
          />

          <ClassFilterPanel
            selectedClassIds={selectedClassIds}
            studentsCount={students.length}
            filteredStudentsCount={filteredStudents.length}
            classFilterOptions={classFilterOptions}
            onClearClassFilter={clearClassFilter}
            onToggleClassFilter={handleToggleClassFilter}
          />

          <ClassStatsCards classStats={classStats} supportCount={supportRows.length} />

          {!isDirectStudentView && (
            <DashboardWorkspaceNavigation activeTab={activeTab} onChange={setActiveTab} />
          )}

          {visiblePanelDefs.map(({ id, title }) => (
            <CollapsibleSection
              key={id}
              title={title}
              collapsed={!!collapsed[id]}
              onToggle={() => toggleCollapsed(id)}
            >
              {renderPanelContent(id)}
            </CollapsibleSection>
          ))}

          <CollapsibleSection
            title="Pausspel — Highscore"
            collapsed={!!collapsed.pausegames}
            onToggle={() => toggleCollapsed('pausegames')}
          >
            {renderPanelContent('pausegames')}
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}
