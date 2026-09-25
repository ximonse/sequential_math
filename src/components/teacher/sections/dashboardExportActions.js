import {
  buildActivityExportRows,
  buildSnapshotCsvRows,
  downloadTextFile,
  rowsToCsv
} from './dashboardExportHelpers'
import { buildStudentDetailExportRows } from './dashboardStudentDetailExportHelpers'
import {
  buildAnalyticsSnapshot,
  buildDetailedProblemExportRows,
  buildSkillComparisonExportRows,
  buildTableDevelopmentExportRows
} from '../../../lib/teacherAnalytics'

export function buildDashboardExportActions({
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
}) {
  // An empty field means "no bound", so a teacher can ask for one day, one
  // week, or everything without switching tools.
  const rangeBounds = () => {
    const from = Date.parse(`${String(exportRange?.from || '')}T00:00:00`)
    const to = Date.parse(`${String(exportRange?.to || '')}T23:59:59.999`)
    return {
      from: Number.isFinite(from) ? from : null,
      to: Number.isFinite(to) ? to : null
    }
  }

  const withinRange = rows => {
    const { from, to } = rangeBounds()
    if (from === null && to === null) return rows
    return rows.filter(row => {
      const timestamp = Number(row?.timestamp || 0)
      if (from !== null && timestamp < from) return false
      if (to !== null && timestamp > to) return false
      return true
    })
  }

  const rangeLabel = () => {
    const from = String(exportRange?.from || '')
    const to = String(exportRange?.to || '')
    if (!from && !to) return ''
    return `_${from || 'start'}_${to || 'nu'}`
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
    const ranged = { ...snapshot, rows: withinRange(snapshot.rows || []) }
    const csvRows = buildDetailedProblemExportRows(ranged)
    if (csvRows.length === 0) {
      setDashboardStatus('Ingen rå problemdata att exportera för vald period.')
      return
    }

    const csv = rowsToCsv(csvRows)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(csv, `problemdata_detalj${rangeLabel()}_${stamp}.csv`, 'text/csv;charset=utf-8;')
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

  return {
    handleExportSnapshotCsv,
    handleExportDetailedProblemCsv,
    handleExportSkillComparisonCsv,
    handleExportTableDevelopmentCsv,
    handleExportActivityCsv,
    handleExportStudentDetailCsv
  }
}
