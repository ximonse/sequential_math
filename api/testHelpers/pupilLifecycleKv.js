import { BEGIN_PUPIL_LIFECYCLE_SCRIPT, FINISH_PUPIL_LIFECYCLE_SCRIPT } from '../_pupilLifecycle.js'
import { PUPIL_REFERENCE_WRITE_SCRIPT, GUARDED_PUPIL_KEY_SCRIPT, removePupilReferences } from '../_pupilReferenceWrite.js'

export function emulatePupilLifecycle(records, script, keys, args) {
  if (script === GUARDED_PUPIL_KEY_SCRIPT) {
    if (records.has(keys[1]) || records.has(keys[2]) || (args[3] === 'live' && !records.has(keys[3]))) return { result: 0 }
    if (args[0] === 'member') records.set(keys[0], [...new Set([...(records.get(keys[0]) || []), args[1]])])
    else if (args[0] === 'score-member') records.set(keys[0], [...new Set([...(records.get(keys[0]) || []), JSON.parse(args[1])])])
    else if (args[0] !== 'reserve' || !records.has(keys[0])) records.set(keys[0], JSON.parse(args[1]))
    return { result: 1 }
  }
  if (script === PUPIL_REFERENCE_WRITE_SCRIPT) {
    const ids = JSON.parse(args[1])
    records.set(keys[0], removePupilReferences(JSON.parse(args[0]), new Set(ids.filter((_id, index) => records.has(keys[index + 1])))))
    return { result: 1 }
  }
  const members = (key, member, remove) => {
    const set = new Set(records.get(key) || [])
    if (remove) set.delete(member); else set.add(member)
    records.set(key, [...set])
  }
  if (script === BEGIN_PUPIL_LIFECYCLE_SCRIPT) {
    const [profileKey, deletedKey, jobKey, indexKey, pendingKey] = keys
    const [revision, json, timestamp, id] = args
    if (records.has(jobKey)) return { result: 2 }
    if (records.has(deletedKey)) return { result: -2 }
    const profile = records.get(profileKey)
    if (!profile) return { result: -1 }
    if ((profile.serverRevision || 0) !== Number(revision)) return { result: 0 }
    records.set(jobKey, { ...JSON.parse(json), profile: structuredClone(profile) })
    records.set(deletedKey, timestamp); records.delete(profileKey)
    members(indexKey, id, true); members(pendingKey, id, false)
    return { result: 1 }
  }
  if (script === FINISH_PUPIL_LIFECYCLE_SCRIPT) {
    const [jobKey, pendingKey, archiveKey, archiveIndex] = keys
    const [json, archiveJson, id, archiveId] = args
    if (!records.has(jobKey)) return { result: 2 }
    const plan = JSON.parse(json)
    for (const patch of plan.patches) {
      if (JSON.stringify(records.get(patch.key) ?? null) !== JSON.stringify(patch.before)) return { result: 0 }
    }
    for (const patch of plan.patches) {
      if (patch.after === null) records.delete(patch.key)
      else records.set(patch.key, structuredClone(patch.after))
    }
    for (const key of plan.deletes) records.delete(key)
    for (const { key, member } of plan.removals) members(key, member, true)
    if (archiveJson) { records.set(archiveKey, JSON.parse(archiveJson)); members(archiveIndex, archiveId, false) }
    records.delete(jobKey); members(pendingKey, id, true)
    return { result: 1 }
  }
  return null
}
