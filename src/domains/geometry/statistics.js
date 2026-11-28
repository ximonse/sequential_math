import { EVIDENCE_CLASSES } from '../../lib/evidenceContract.js'
import { geometryGroups } from './groups.js'
import { geometryLabels, geometryQuestionById, geometryQuestions } from './questions.js'

const conceptsBySkill = Object.fromEntries(Object.entries(geometryQuestions)
  .map(([skill, questions]) => [skill, new Set(questions.map(question => question.concept))]))
const skillByConcept = new Map(Object.entries(conceptsBySkill)
  .flatMap(([skill, concepts]) => [...concepts].map(concept => [concept, skill])))
const RECENT_PROGRESS_ANSWERS = 10

export function summarizeGeometry(students, classIds = []) {
  const totals = new Map()
  for (const student of students) {
    const seen = new Set()
    for (const answer of student.recentProblems || []) {
      if (answer.domain !== 'geometry' || typeof answer.correct !== 'boolean'
        || !answer.observationId || seen.has(answer.observationId)
        || (classIds.length && !classIds.includes(answer.classIdAtAttempt))) continue
      const concept = answer.values?.geometryConcept
      if (!Object.hasOwn(geometryLabels, concept)) continue
      seen.add(answer.observationId)
      const row = totals.get(concept) || { concept, label: geometryLabels[concept], answers: 0, wrong: 0 }
      row.answers += 1
      if (!answer.correct) row.wrong += 1
      totals.set(concept, row)
    }
  }
  return [...totals.values()].sort((a, b) => b.wrong - a.wrong || a.label.localeCompare(b.label, 'sv'))
}

export function summarizeGeometryProgress(profile) {
  const bySkill = Object.fromEntries(Object.keys(geometryGroups).map(skill => [skill, { tried: new Set(), answers: [] }]))
  const seen = new Set()
  // The long history provides coverage, and recent answers may be newer on this device.
  for (const history of [profile?.problemLog, profile?.recentProblems]) {
    for (const answer of history || []) {
      if (answer?.domain !== 'geometry' || typeof answer.correct !== 'boolean'
        || [EVIDENCE_CLASSES.DIAGNOSTIC_ONLY, EVIDENCE_CLASSES.INVALID].includes(answer.evidenceClass)) continue
      const timestamp = Number(answer.timestamp)
      if (!Number.isFinite(timestamp) || timestamp <= 0) continue
      const concept = answer.values?.geometryConcept || geometryQuestionById[answer.values?.geometryTaskId]?.concept
      const skill = skillByConcept.get(concept)
      if (!skill || (answer.skill && answer.skill !== skill)) continue
      const id = answer.observationId || (answer.problemId && answer.problemId + ':' + timestamp)
      if (!id || seen.has(id)) continue
      seen.add(id)

      bySkill[skill].tried.add(concept)
      bySkill[skill].answers.push({ timestamp, correct: answer.correct })
    }
  }
  return Object.entries(geometryGroups).map(([id, label]) => {
    const { tried, answers } = bySkill[id]
    const recent = answers.sort((a, b) => b.timestamp - a.timestamp).slice(0, RECENT_PROGRESS_ANSWERS)
    return { id, label, tried: tried.size, total: conceptsBySkill[id].size,
      recentCount: recent.length, recentCorrect: recent.filter(answer => answer.correct).length }
  })
}
