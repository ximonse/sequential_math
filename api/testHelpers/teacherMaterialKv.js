import { MATERIAL_DRAFT_CAS } from '../_teacherMaterialStore.js'

export function emulateTeacherMaterial(values, sets, script, keys, args) {
  if (script !== MATERIAL_DRAFT_CAS) return null
  if (keys.slice(2).some(key => values.has(key) || sets.has(key))) return { result: -1 }
  const current = values.get(keys[0])
  if ((current?.revision || 0) !== Number(args[0])) return { result: 0 }
  const index = sets.get(keys[1]) || new Set()
  if (!current && index.size >= 100) return { result: -2 }
  values.set(keys[0], JSON.parse(args[1]))
  index.add(args[2]); sets.set(keys[1], index)
  return { result: 1 }
}
