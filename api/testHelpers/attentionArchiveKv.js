import { ATTENTION_ARCHIVE_SCRIPT } from '../_attentionArchive.js'

export function emulateAttentionArchive(records, script, keys, args) {
  if (script !== ATTENTION_ARCHIVE_SCRIPT) return null
  if (!records.has(keys[0]) || records.has(keys[1]) || records.has(keys[2])) return { result: -1 }
  const ids = new Set(records.get(keys[3]) || [])
  JSON.parse(args[0]).forEach((item, i) => {
    const old = records.get(keys[i + 5])
    if (!old || (!old.final && (item.final || item.revision > old.revision))) records.set(keys[i + 5], JSON.parse(item.json))
    ids.add(item.id)
  })
  records.set(keys[3], [...ids]); if (args[1] === '1') records.set(keys[4], '1')
  return { result: 1 }
}
