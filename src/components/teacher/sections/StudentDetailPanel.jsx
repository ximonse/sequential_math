import { useState } from 'react'
import StudentDetailHistoryPanel from './StudentDetailHistoryPanel'
import StudentDetailMasteryPanel from './StudentDetailMasteryPanel'
import StudentDetailTrainingPriorityPanel from './StudentDetailTrainingPriorityPanel'

const OPERATION_BADGES = [
  { label: '+', key: 'addition' },
  { label: '-', key: 'subtraction' },
  { label: 'x', key: 'multiplication' },
  { label: '/', key: 'division' }
]

export default function StudentDetailPanel({
  sectionId = 'teacher-student-detail-section',
  detailStudentId,
  detailStudentOptions,
  hasMissingDirectStudent,
  isDirectStudentView,
  onChangeDetailStudentId,
  onNavigateDirectStudent,
  onExportCsv,
  canExportCsv,
  detailStudentProfile,
  detailStudentRow,
  detailStudentViewData,
  toPercent,
  formatDuration,
  ActivityBadgeComponent,
  trainingPriorityList,
  tableMasteryPanelProps,
  historyPanelProps
}) {
  const [detailCollapsed, setDetailCollapsed] = useState(new Set())

  const toggleDetailCollapse = (section) => {
    setDetailCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const isCollapsed = (section) => detailCollapsed.has(section)

  const renderCollapseHeader = (section, title, { className = '', rightContent = null } = {}) => (
    <button
      type="button"
      onClick={() => toggleDetailCollapse(section)}
      className={`w-full flex items-center justify-between text-left ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <span className={`text-[10px] transition-transform ${isCollapsed(section) ? '' : 'rotate-90'}`}>&#9654;</span>
        {title}
      </span>
      {rightContent}
    </button>
  )

  return (
    <div id={sectionId} className="bg-white rounded-lg shadow p-4 mb-8" style={{ order: -20 }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Elevprofil (allt om en elev)</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={detailStudentId}
            onChange={(event) => {
              const nextStudentId = String(event.target.value || '').trim()
              onChangeDetailStudentId(nextStudentId)
              if (isDirectStudentView && nextStudentId) {
                onNavigateDirectStudent(nextStudentId)
              }
            }}
            className="px-2 py-1 border rounded text-sm min-w-56"
          >
            {detailStudentOptions.length === 0 ? (
              <option value="">Inga elever i urvalet</option>
            ) : (
              <>
                {hasMissingDirectStudent ? (
                  <option value="">Okant elev-ID - valj elev</option>
                ) : null}
                {detailStudentOptions.map(item => (
                  <option key={`detail-student-${item.studentId}`} value={item.studentId}>
                    {item.name} {item.className ? `(${item.className})` : ''}
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            onClick={onExportCsv}
            disabled={!canExportCsv}
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
          <SummaryCards
            detailStudentProfile={detailStudentProfile}
            detailStudentRow={detailStudentRow}
            toPercent={toPercent}
            formatDuration={formatDuration}
            ActivityBadgeComponent={ActivityBadgeComponent}
            trainingPriorityList={trainingPriorityList}
          />

          <StudentDetailTrainingPriorityPanel
            trainingPriorityList={trainingPriorityList}
            toPercent={toPercent}
          />

          <StudentDetailMasteryPanel
            renderCollapseHeader={renderCollapseHeader}
            isCollapsed={isCollapsed}
            detailStudentViewData={detailStudentViewData}
            toPercent={toPercent}
            {...tableMasteryPanelProps}
          />

          <StudentDetailHistoryPanel
            renderCollapseHeader={renderCollapseHeader}
            isCollapsed={isCollapsed}
            dailyActivityBreakdown={historyPanelProps.dailyActivityBreakdown}
            getOperationLabel={historyPanelProps.getOperationLabel}
            detailStudentViewData={detailStudentViewData}
            detailLevelErrorMinAttempts={historyPanelProps.detailLevelErrorMinAttempts}
            toPercent={toPercent}
          />
        </>
      )}
    </div>
  )
}

function SummaryCards({
  detailStudentProfile,
  detailStudentRow,
  toPercent,
  formatDuration,
  ActivityBadgeComponent,
  trainingPriorityList
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mb-4 text-xs">
      <MetricCard
        label="Totalt lösta"
        value={detailStudentProfile?.stats?.totalProblems || detailStudentRow.attempts}
      />
      <MetricCard
        label="Träff totalt"
        value={toPercent(detailStudentRow.successRate)}
        className="border-blue-200 bg-blue-50"
        textClassName="text-blue-700"
      />
      <MetricCard
        label="Idag"
        value={detailStudentRow.todayAttempts}
        className="border-indigo-200 bg-indigo-50"
        textClassName="text-indigo-700"
      />
      <MetricCard
        label="Vecka"
        value={detailStudentRow.weekAttempts}
        className="border-cyan-200 bg-cyan-50"
        textClassName="text-cyan-700"
      />
      <MetricCard
        label="Tid på uppgift idag"
        value={formatDuration(detailStudentRow.todayEngagedMinutes * 60)}
        className="border-amber-200 bg-amber-50"
        textClassName="text-amber-700"
      />
      <MetricCard
        label="Tid på uppgift 7d"
        value={formatDuration(detailStudentRow.weekEngagedMinutes * 60)}
        className="border-emerald-200 bg-emerald-50"
        textClassName="text-emerald-700"
      />
      <div className="rounded border border-purple-200 bg-purple-50 px-2.5 py-2">
        <p className="text-purple-700">Nivå per räknesätt</p>
        <div className="flex gap-1.5 mt-0.5">
          {OPERATION_BADGES.map(op => (
            <span key={op.key} className="inline-flex items-center gap-0.5 text-sm font-semibold text-purple-700">
              <span className="text-purple-400">{op.label}</span>
              {Math.round(Number(detailStudentRow.operationAbilities?.[op.key]) || 1)}
            </span>
          ))}
          <span className="text-purple-400 text-xs ml-1 self-center">
            (högst {detailStudentRow.highestDifficulty})
          </span>
        </div>
      </div>
      <div className="rounded border border-gray-200 bg-white px-2.5 py-2">
        <p className="text-gray-500">Aktivitet</p>
        <div className="mt-1">
          <ActivityBadgeComponent code={detailStudentRow.activityStatus} compact />
        </div>
      </div>
      <MetricCard
        label="Träningsprioritet"
        className="border-red-200 bg-red-50"
        textClassName="text-red-700"
        value={(
          <div className="flex gap-1 mt-0.5 text-xs font-semibold">
            <span className="text-red-600">Hög: {trainingPriorityList.filter(item => item.priority === 'high').length}</span>
            <span className="text-orange-600">Medel: {trainingPriorityList.filter(item => item.priority === 'medium').length}</span>
            <span className="text-yellow-700">Låg: {trainingPriorityList.filter(item => item.priority === 'low').length}</span>
          </div>
        )}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  className = 'border-gray-200 bg-gray-50',
  textClassName = 'text-gray-500'
}) {
  const isPrimitiveValue = typeof value === 'string' || typeof value === 'number'
  return (
    <div className={`rounded border px-2.5 py-2 ${className}`}>
      <p className={textClassName}>{label}</p>
      {isPrimitiveValue ? (
        <p className={`font-semibold ${textClassName}`}>{value}</p>
      ) : (
        <div className={`font-semibold ${textClassName}`}>{value}</div>
      )}
    </div>
  )
}
