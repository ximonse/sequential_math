import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import { downloadStudentCredentialPdf } from '../../../lib/studentCredentialPdf'
import StudentDetailHistoryPanel from './StudentDetailHistoryPanel'
import StudentDetailTrendPanel from './StudentDetailTrendPanel'
import StudentDetailMasteryPanel from './StudentDetailMasteryPanel'

const OPERATION_BADGES = [
  { label: '+', key: 'addition' },
  { label: '-', key: 'subtraction' },
  { label: 'x', key: 'multiplication' },
  { label: '/', key: 'division' }
]

function ReissuedCredentialCard({ credential }) {
  const [qrCode, setQrCode] = useState('')
  const [pdfStatus, setPdfStatus] = useState('')
  useEffect(() => {
    let active = true
    QRCode.toDataURL(JSON.stringify({ version: 1, studentId: credential.studentId, qrSecret: credential.qrSecret }), {
      errorCorrectionLevel: 'M', margin: 1, width: 280
    }).then(value => { if (active) setQrCode(value) }).catch(() => {})
    return () => { active = false }
  }, [credential.studentId, credential.qrSecret])
  return <div className="mt-3 rounded border-2 border-amber-400 bg-amber-50 p-4 text-sm print:border-gray-700 print:bg-white">
    <p className="font-bold text-amber-950">Nytt elevkort — skriv ut nu</p>
    <p className="mt-1 text-amber-900">Det gamla QR-kortet och den gamla PIN-koden fungerar inte längre.</p>
    <div className="mt-3 flex items-center gap-4">
      <div><p className="font-semibold text-lg">{credential.displayAlias || 'Elev'}</p><p className="text-xs">Kodnamn: {credential.displayAlias || '–'}</p><p className="font-mono text-xs break-all">Elev-ID: {credential.studentId}</p><p className="font-mono text-lg font-bold">PIN: {credential.pin}</p></div>
      {qrCode ? <img className="h-28 w-28" src={qrCode} alt="Nytt elevkorts QR-kod" /> : null}
    </div>
    <div className="mt-3 flex gap-2 print:hidden">
      <button type="button" onClick={async () => { setPdfStatus('Skapar PDF…'); try { await downloadStudentCredentialPdf([credential]); setPdfStatus('PDF klar. Spara filen säkert.') } catch (error) { setPdfStatus(error?.message || 'Kunde inte skapa PDF.') } }} className="rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white">Hämta PDF</button>
      <button type="button" onClick={() => window.print()} className="rounded border border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-950">Skriv ut kortet</button>
    </div>
    {pdfStatus ? <p role="status" className="mt-2 text-xs text-amber-900 print:hidden">{pdfStatus}</p> : null}
  </div>
}

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
  onSetTeacherPupilLabel,
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
  const [issuedCredential, setIssuedCredential] = useState(null)
  const [credentialStatus, setCredentialStatus] = useState('')

  const reissueCredential = async () => {
    if (!detailStudentProfile?.studentId) return
    if (!window.confirm('Utfärda ett nytt elevkort? Det gamla QR-kortet och den gamla PIN-koden slutar fungera direkt.')) return
    setCredentialStatus('Utfärdar nytt elevkort…')
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(detailStudentProfile.studentId)}/credentials`, {
        method: 'POST', headers: { 'x-teacher-token': getTeacherApiToken() }
      })
      const data = await response.json()
      if (!response.ok || !data?.credential) throw new Error(data?.error || 'Kunde inte utfärda nytt elevkort.')
      setIssuedCredential(data.credential); setCredentialStatus('Nytt elevkort är klart. Skriv ut det innan du lämnar sidan.')
    } catch (error) { setCredentialStatus(error.message || 'Kunde inte utfärda nytt elevkort.') }
  }

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
            {detailStudentProfile && (
              <button type="button" onClick={() => { const label = window.prompt('Ditt privata tilltalsnamn för eleven:', detailStudentProfile.teacherPupilLabel || ''); if (label !== null) onSetTeacherPupilLabel(detailStudentProfile.studentId, label) }} className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-xs font-medium">Ändra tilltalsnamn</button>
            )}
          {detailStudentProfile?.displayAlias ? <button type="button" onClick={reissueCredential} className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded text-xs font-semibold">Nytt QR-kort / ny PIN</button> : null}
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
          {credentialStatus ? <p role="status" className="mt-3 text-sm text-amber-900 print:hidden">{credentialStatus}</p> : null}
          {issuedCredential ? <ReissuedCredentialCard credential={issuedCredential} /> : null}

          <StudentDetailTrendPanel trend={detailStudentViewData.dailyTrend} />

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
        <p className="text-purple-700">Belagd nivå / tränar nu</p>
        <div className="flex gap-1.5 mt-0.5">
          {OPERATION_BADGES.map(op => {
            const attained = detailStudentRow.attainmentLevels?.[op.key]
            const need = detailStudentRow.currentNeeds?.[op.key]
            return (
              <span key={op.key} className="inline-flex items-center gap-0.5 text-sm font-semibold text-purple-700">
                <span className="text-purple-400">{op.label}</span>
                {attained ?? '–'}
                {need ? <span className="text-xs text-purple-500">/{need.targetLevel}</span> : null}
              </span>
            )
          })}
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
