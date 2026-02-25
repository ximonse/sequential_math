import {
  toFixedOrEmpty,
  toPercent
} from './dashboardSortUtils'

export function buildSnapshotCsvRows(rows, viewMode, weekGoal) {
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

export function buildActivityExportRows(rows) {
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

export function rowsToCsv(rows) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(';')]
  for (const row of rows) {
    const cells = headers.map(header => toCsvField(row[header]))
    lines.push(cells.join(';'))
  }
  return `${lines.join('\r\n')}\r\n`
}

export function downloadTextFile(content, fileName, mimeType) {
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

export function formatTimestampForCsv(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toISOString()
}

function toCsvField(value) {
  const text = String(value ?? '')
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function ensureUtf8Bom(content) {
  const text = String(content ?? '')
  if (text.startsWith('\uFEFF')) return text
  return `\uFEFF${text}`
}
