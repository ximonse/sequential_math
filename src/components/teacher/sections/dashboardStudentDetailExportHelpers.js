import { getSpeedTime, inferOperationFromProblemType, inferTableFromProblem } from '../../../lib/mathUtils'
import { getNcmAbilityLabelSv } from '../../../lib/ncmProblemBank'
import { formatSkillList } from './dashboardSkillLabelHelpers'
import { toPercent } from './dashboardSortUtils'
import {
  getTableProblemSourceForStudent,
  getTeacherTableStatusLabel
} from './dashboardTableStatusUtils'

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function buildStudentDetailExportRows(student, row, detailData) {
  if (!student || !row || !detailData) return []
  const rows = []
  const add = (partial = {}) => {
    rows.push({
      Sektion: '',
      Nyckel: '',
      Del: '',
      Niva: '',
      Tabell: '',
      Status: '',
      Forsok: '',
      Ratt: '',
      TraffProcent: '',
      TidSek: '',
      Varde: '',
      NCMKod: '',
      NCMDoman: '',
      NCMOperation: '',
      NCMFormagor: '',
      Tidsstampel: '',
      ...partial
    })
  }

  const now = Date.now()
  add({ Sektion: 'Sammanfattning', Nyckel: 'Elev', Varde: String(student.name || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'ElevID', Varde: String(student.studentId || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'Klass', Varde: String(row.classNameLabel || row.className || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TotaltLosta', Forsok: Number(student?.stats?.totalProblems || row.attempts || 0) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TraffTotalt', TraffProcent: toPercent(row.successRate) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'IdagForsok', Forsok: Number(row.todayAttempts || 0) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'VeckaForsok', Forsok: Number(row.weekAttempts || 0) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TidPaUppgiftIdagSek', TidSek: Math.round((Number(row.todayEngagedMinutes || 0) * 60)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'TidPaUppgift7dSek', TidSek: Math.round((Number(row.weekEngagedMinutes || 0) * 60)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaNu', Varde: String(Number(row.currentDifficulty || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaHogst', Varde: String(Number(row.highestDifficulty || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaAddition', Varde: String(Math.round(Number(row.operationAbilities?.addition) || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaSubtraktion', Varde: String(Math.round(Number(row.operationAbilities?.subtraction) || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaMultiplikation', Varde: String(Math.round(Number(row.operationAbilities?.multiplication) || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'NivaDivision', Varde: String(Math.round(Number(row.operationAbilities?.division) || 1)) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'Aktivitet', Status: String(row.activityStatus || '') })
  add({ Sektion: 'Sammanfattning', Nyckel: 'SvagastTyper', Varde: formatSkillList(student?.stats?.weakestTypes) })
  add({ Sektion: 'Sammanfattning', Nyckel: 'StarkastTyper', Varde: formatSkillList(student?.stats?.strongestTypes) })

  for (const table of TABLES) {
    const perf = detailData.tablePerformanceByTable[table]
    const status = detailData.tableSticky.statusByTable[table] || 'default'
    add({
      Sektion: 'Tabellstatus',
      Nyckel: 'Tabell',
      Tabell: `${table}`,
      Status: getTeacherTableStatusLabel(status),
      Forsok: Number(perf.attemptsTotal || 0),
      Ratt: Number(perf.correctTotal || 0),
      TraffProcent: toPercent(perf.accuracyTotal),
      Del: 'Totalt'
    })
    add({
      Sektion: 'Tabellstatus',
      Nyckel: 'Tabell7d',
      Tabell: `${table}`,
      Status: getTeacherTableStatusLabel(status),
      Forsok: Number(perf.attempts7d || 0),
      Ratt: Number(perf.correct7d || 0),
      TraffProcent: toPercent(perf.accuracy7d),
      Del: '7d'
    })
  }

  for (const operationItem of detailData.operationMasteryBoards) {
    for (const period of ['historical', 'weekly']) {
      const label = period === 'historical' ? 'Historiskt' : 'DennaVecka'
      for (const level of operationItem[period]) {
        add({
          Sektion: 'Nivastatus',
          Nyckel: 'Niva',
          Del: `${operationItem.operation}:${label}`,
          Niva: String(level.level),
          Status: String(level.status || ''),
          Forsok: Number(level.attempts || 0),
          Ratt: Number(level.correct || 0),
          TraffProcent: toPercent(level.successRate)
        })
      }
    }
  }

  const ncmDetail = detailData.ncmDetail
  if (ncmDetail && Number(ncmDetail.attemptsTotal || 0) > 0) {
    add({ Sektion: 'NCM', Nyckel: 'ForsokTotalt', Forsok: Number(ncmDetail.attemptsTotal || 0) })
    add({ Sektion: 'NCM', Nyckel: 'TraffTotalt', TraffProcent: toPercent(ncmDetail.successRateTotal) })
    add({ Sektion: 'NCM', Nyckel: 'KunskapsfelTotalt', Varde: String(Number(ncmDetail.knowledgeWrongTotal || 0)) })
    add({ Sektion: 'NCM', Nyckel: 'OuppmarksamhetTotalt', Varde: String(Number(ncmDetail.inattentionWrongTotal || 0)) })
    add({ Sektion: 'NCM', Nyckel: 'ForsokVecka', Forsok: Number(ncmDetail.attemptsWeek || 0) })
    add({ Sektion: 'NCM', Nyckel: 'TraffVecka', TraffProcent: toPercent(ncmDetail.successRateWeek) })
    add({ Sektion: 'NCM', Nyckel: 'StarkastDoman', NCMDoman: String(ncmDetail.strongestDomainLabel || '-') })
    add({ Sektion: 'NCM', Nyckel: 'SvagastDoman', NCMDoman: String(ncmDetail.weakestDomainLabel || '-') })
    add({ Sektion: 'NCM', Nyckel: 'SenasteKod', NCMKod: String(ncmDetail.lastNcmCode || '-') })

    for (const assignment of Array.isArray(ncmDetail.assignmentRows) ? ncmDetail.assignmentRows : []) {
      add({
        Sektion: 'NCMUppdrag',
        Nyckel: 'Progress',
        Del: String(assignment.assignmentTitle || 'NCM-uppdrag'),
        Forsok: Number(assignment.completedCount || 0),
        Ratt: Number(assignment.totalSkillTags || 0),
        TraffProcent: toPercent(assignment.completionRate),
        Tidsstampel: assignment.updatedAt ? new Date(assignment.updatedAt).toISOString() : ''
      })
    }

    for (const code of Array.isArray(ncmDetail.codeRows) ? ncmDetail.codeRows : []) {
      add({
        Sektion: 'NCMKod',
        Nyckel: 'Kod',
        Del: 'Totalt',
        NCMKod: String(code.ncmCode || ''),
        NCMDoman: String(code.domainLabel || ''),
        NCMOperation: String(code.operationLabel || ''),
        NCMFormagor: String(code.abilityLabelText || ''),
        Forsok: Number(code.attemptsTotal || 0),
        Ratt: Number(code.correctTotal || 0),
        TraffProcent: toPercent(code.successRateTotal),
        Tidsstampel: code.lastTimestamp ? new Date(code.lastTimestamp).toISOString() : ''
      })
      add({
        Sektion: 'NCMKod',
        Nyckel: 'Kod',
        Del: 'Vecka',
        NCMKod: String(code.ncmCode || ''),
        NCMDoman: String(code.domainLabel || ''),
        NCMOperation: String(code.operationLabel || ''),
        NCMFormagor: String(code.abilityLabelText || ''),
        Forsok: Number(code.attemptsWeek || 0),
        Ratt: Number(code.correctWeek || 0),
        TraffProcent: toPercent(code.successRateWeek),
        Tidsstampel: code.lastTimestamp ? new Date(code.lastTimestamp).toISOString() : ''
      })
    }

    for (const domain of Array.isArray(ncmDetail.domainRows) ? ncmDetail.domainRows : []) {
      add({
        Sektion: 'NCMDoman',
        Nyckel: 'Doman',
        Del: 'Totalt',
        NCMDoman: String(domain.domainLabel || ''),
        Forsok: Number(domain.attemptsTotal || 0),
        Ratt: Number(domain.correctTotal || 0),
        TraffProcent: toPercent(domain.successRateTotal),
        Varde: `Kunskapsfel=${Number(domain.knowledgeWrongTotal || 0)}; Ouppm=${Number(domain.inattentionWrongTotal || 0)}`
      })
      add({
        Sektion: 'NCMDoman',
        Nyckel: 'Doman',
        Del: 'Vecka',
        NCMDoman: String(domain.domainLabel || ''),
        Forsok: Number(domain.attemptsWeek || 0),
        Ratt: Number(domain.correctWeek || 0),
        TraffProcent: toPercent(domain.successRateWeek),
        Varde: `Kunskapsfel=${Number(domain.knowledgeWrongWeek || 0)}; Ouppm=${Number(domain.inattentionWrongWeek || 0)}`
      })
    }

    for (const problem of Array.isArray(ncmDetail.recentRows) ? ncmDetail.recentRows : []) {
      const abilityLabelText = (Array.isArray(problem.abilityTags) ? problem.abilityTags : [])
        .map(tag => getNcmAbilityLabelSv(tag))
        .filter(Boolean)
        .join(', ')

      add({
        Sektion: 'NCMSenaste',
        Nyckel: 'Forsok',
        NCMKod: String(problem.ncmCode || ''),
        NCMDoman: String(problem.domainLabel || ''),
        NCMOperation: String(problem.operationLabel || ''),
        NCMFormagor: abilityLabelText,
        Status: problem.correct ? 'Ratt' : 'Fel',
        TidSek: Number.isFinite(problem.speedTimeSec) ? Number(problem.speedTimeSec.toFixed(2)) : '',
        Varde: problem.correct
          ? 'korrekt'
          : (String(problem.errorCategory || '') === 'inattention' ? 'ouppmarksamhet' : 'kunskapsfel'),
        Tidsstampel: problem.timestamp ? new Date(problem.timestamp).toISOString() : ''
      })
    }
  }

  const problemSource = getTableProblemSourceForStudent(student)
  const recentProblems = problemSource
    .slice()
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
    .slice(0, 80)

  for (const problem of recentProblems) {
    const ts = Number(problem?.timestamp || 0)
    add({
      Sektion: 'SenasteProblem',
      Nyckel: String(problem?.problemType || ''),
      Del: inferOperationFromProblemType(problem?.problemType || ''),
      Niva: String(Math.round(Number(problem?.difficulty?.conceptual_level || 0)) || ''),
      Tabell: String(inferTableFromProblem(problem) || ''),
      Status: problem?.correct ? 'Ratt' : 'Fel',
      TidSek: Number.isFinite(getSpeedTime(problem)) ? Number(getSpeedTime(problem).toFixed(2)) : '',
      Varde: String(problem?.errorCategory || ''),
      Tidsstampel: ts > 0 ? new Date(ts).toISOString() : ''
    })
  }

  add({
    Sektion: 'Metadata',
    Nyckel: 'Exporterad',
    Varde: 'Ja',
    Tidsstampel: new Date(now).toISOString()
  })

  return rows
}
