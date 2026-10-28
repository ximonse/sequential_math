import { MATERIAL_DISPATCH_CAS } from '../_teacherMaterialDispatchStore.js'

export function emulateMaterialDispatch(values, script, keys, args) {
  if (script !== MATERIAL_DISPATCH_CAS) return null
  const parent = values.get(keys[1]), latest = parent?.versions?.at(-1)
  if (!latest || latest.version !== Number(args[2]) || latest.contentRevision !== args[3]
    || !parent.approvals?.some(approval => approval.version === latest.version && approval.contentRevision === latest.contentRevision)) return { result: -1 }
  if (keys.slice(2).some(key => values.has(key))) return { result: -2 }
  if ((values.get(keys[0])?.revision || 0) !== Number(args[0])) return { result: 0 }
  values.set(keys[0], JSON.parse(args[1]))
  return { result: 1 }
}
