import { geometryLabels } from './questions.js'

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
