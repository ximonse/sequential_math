import { PUPIL_ANALYSIS_CAS_SCRIPT } from '../_pupilAnalysisStore.js'

export function emulatePupilAnalysis(values, script, keys, args) {
  if (script !== PUPIL_ANALYSIS_CAS_SCRIPT) return null
  const [key, deleted, legacyDeleted, classDeleted, pupilKey, classKey] = keys
  if ([deleted, legacyDeleted, classDeleted].some(id => values.has(id))) return { result: -1 }
  const pupil = values.get(pupilKey), classroom = values.get(classKey)
  if (!pupil || !classroom || classroom.archived || (pupil.classId !== args[2] && !pupil.classIds?.includes(args[2]))) return { result: -1 }
  if ((values.get(key)?.revision || 0) !== Number(args[0])) return { result: 0 }
  values.set(key, JSON.parse(args[1]))
  return { result: 1 }
}
