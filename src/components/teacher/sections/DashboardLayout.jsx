import { useState } from 'react'
import AssignmentsPanel from './AssignmentsPanel'
import ClassOverviewPanel from './ClassOverviewPanel'
import ClassManagementPanel from './ClassManagementPanel'
import ClassFilterPanel from './ClassFilterPanel'
import ClassMisconceptionHeatmap from './ClassMisconceptionHeatmap'
import ClassStatsCards from './ClassStatsCards'
import CloudSyncStatusPanel from './CloudSyncStatusPanel'
import CollapsibleSection from './CollapsibleSection'
import DataQualityUsagePanel from './DataQualityUsagePanel'
import DashboardHeaderBar from './DashboardHeaderBar'
import InactivityAndClassLevelPanel from './InactivityAndClassLevelPanel'
import PasswordResetPanel from './PasswordResetPanel'
import ResultsOverviewPanel from './ResultsOverviewPanel'
import StudentDetailPanel from './StudentDetailPanel'
import SupportPriorityPanel from './SupportPriorityPanel'
import TableSelectionAndDevelopmentPanel from './TableSelectionAndDevelopmentPanel'
import TeacherPasswordNoticePanel from './TeacherPasswordNoticePanel'
import TicketSectionContainer from './TicketSectionContainer'
import TableStickyStatusPanel from './TableStickyStatusPanel'
import { ActivityBadge, InlineHelp, RiskBadge } from './dashboardStatusBadges'
import { getOperationLabel } from '../../../lib/operations'

const PANEL_DEFS = [
  { id: 'overview',    title: 'Klassöversikt' },
  { id: 'heatmap',     title: 'Missuppfattningar' },
  { id: 'sticky',      title: 'Tabellstatus' },
  { id: 'detail',      title: 'Elevdetalj' },
  { id: 'inactivity',  title: 'Inaktivitet & nivå' },
  { id: 'tabledev',    title: 'Tabellutveckling' },
  { id: 'support',     title: 'Stödbehov' },
  { id: 'dataquality', title: 'Datakvalitet' },
  { id: 'assignments', title: 'Uppdrag' },
  { id: 'tickets',     title: 'Tickets' },
  { id: 'management',  title: 'Klasshantering' },
  { id: 'results',     title: 'Resultat' },
  { id: 'password',    title: 'Lösenordsåterställning' },
]

const DEFAULT_ORDER = PANEL_DEFS.map(p => p.id)
const LS_ORDER_KEY = 'mathapp_dashboard_panel_order'
const LS_COLLAPSED_KEY = 'mathapp_dashboard_panel_collapsed'

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
  getErrorShareColorClass,
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
  SUPPORT_HEADER_HELP,
  getSupportSortIndicator,
  handleSupportSort,
  handleCreateQuickAssignment,
  classNameInput,
  setClassNameInput,
  handleCreateClass,
  addToClassId,
  setAddToClassId,
  classes,
  handleAddStudentsToClass,
  rosterInput,
  setRosterInput,
  classStatus,
  handleDeleteClass,
  resultsPanelProps,
  PASSWORD_RESET_SECTION_ID,
  passwordResetRows,
  passwordResetSearch,
  setPasswordResetSearch,
  passwordResetStatus,
  handleResetStudentPassword,
  passwordResetBusyId
}) {
  const [panelOrder, setPanelOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_ORDER_KEY)) || DEFAULT_ORDER } catch { return DEFAULT_ORDER }
  })
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_COLLAPSED_KEY)) || {} } catch { return {} }
  })

  const toggleCollapsed = id => setCollapsed(prev => {
    const next = { ...prev, [id]: !prev[id] }
    localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(next))
    return next
  })

  const movePanel = (id, dir) => setPanelOrder(prev => {
    const idx = prev.indexOf(id)
    if (idx < 0) return prev
    const next = [...prev]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return prev
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    localStorage.setItem(LS_ORDER_KEY, JSON.stringify(next))
    return next
  })

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
          getOperationLabel,
          detailLevelErrorMinAttempts: DETAIL_LEVEL_ERROR_MIN_ATTEMPTS,
          operationKeys: ALL_OPERATIONS,
          classBenchmarks,
          studentOperationStats7d,
          detailLevelErrorRows,
          detailLevelErrorUnderSampleCount,
          renderDetailLevelErrorSortHeader,
          detailLevelErrorHelp: DETAIL_LEVEL_ERROR_HELP,
          getErrorShareColorClass
        }}
        historyPanelProps={{
          dailyActivityBreakdown,
          getOperationLabel,
          detailLevelErrorMinAttempts: DETAIL_LEVEL_ERROR_MIN_ATTEMPTS
        }}
      />
    )
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
          supportHeaderHelp={SUPPORT_HEADER_HELP}
          getSupportSortIndicator={getSupportSortIndicator}
          onSupportSort={handleSupportSort}
          InlineHelpComponent={InlineHelp}
          ActivityBadgeComponent={ActivityBadge}
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
          onAddStudentsToClass={handleAddStudentsToClass}
          rosterInput={rosterInput}
          onSetRosterInput={setRosterInput}
          classStatus={classStatus}
          students={students}
          recordMatchesClassFilter={recordMatchesClassFilter}
          onDeleteClass={handleDeleteClass}
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
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <DashboardHeaderBar
          isDirectStudentView={isDirectStudentView}
          detailStudentName={detailStudentProfile?.name || ''}
          syncSubtitle={cloudSyncStatus.lastSuccessAt > 0
            ? `Senast: ${formatTimeAgo(cloudSyncStatus.lastSuccessAt)}`
            : cloudSyncStatus.lastError || ''}
          onJumpToPasswordReset={handleJumpToPasswordReset}
          onRefresh={handleRefresh}
          onGoStudentPage={() => navigate('/teacher/student')}
          onGoDashboard={() => navigate('/teacher')}
          onBack={() => navigate('/')}
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

          <ClassStatsCards classStats={classStats} />

          {panelOrder.map((id, idx) => (
            <CollapsibleSection
              key={id}
              title={PANEL_DEFS.find(p => p.id === id).title}
              collapsed={!!collapsed[id]}
              onToggle={() => toggleCollapsed(id)}
              canMoveUp={idx > 0}
              canMoveDown={idx < panelOrder.length - 1}
              onMoveUp={() => movePanel(id, -1)}
              onMoveDown={() => movePanel(id, 1)}
            >
              {renderPanelContent(id)}
            </CollapsibleSection>
          ))}
        </div>
      </div>
    </div>
  )
}
