import { kv } from '@vercel/kv'
import { evidenceError } from './_pupilEvidence.js'
import { slipExclusionKey } from '../src/lib/slipExclusionKey.js'

export { slipExclusionKey }

// Answers a teacher has set aside as plain slips. Kept apart from the pupil
// record so pupil saves cannot overwrite them; nothing in the source answer,
// mastery or training log changes. Hidden answers leave the analysis evidence.
const MAX_EXCLUSIONS = 1000
const storeKey = studentId => `slip_exclusions:${studentId}`
const KEY = /^(practice|screening):[A-Za-z0-9_.:-]{1,160}$/u


export async function readSlipExclusions(studentId, { store = kv } = {}) {
  const value = await store.get(storeKey(studentId))
  return new Map((Array.isArray(value?.items) ? value.items : []).map(item => [item.key, item]))
}

export async function setSlipExclusion(studentId, key, excluded, teacherId, { store = kv, now = Date.now() } = {}) {
  if (typeof key !== 'string' || !KEY.test(key)) throw evidenceError(400, 'invalid_exclusion', 'Ogiltig svarsreferens.')
  const current = await readSlipExclusions(studentId, { store })
  if (excluded) current.set(key, { key, at: now, by: teacherId })
  else current.delete(key)
  if (current.size > MAX_EXCLUSIONS) throw evidenceError(409, 'too_many_exclusions', 'För många dolda svar för eleven.')
  await store.set(storeKey(studentId), { items: [...current.values()] })
  return current.size
}

// Splits evidence entries into those that count and those the teacher hid.
export function applySlipExclusions(entries, exclusions) {
  const kept = [], hidden = []
  for (const entry of entries) {
    const key = slipExclusionKey(entry)
    if (key && exclusions.has(key)) hidden.push({ ...entry, exclusionKey: key, excludedAt: exclusions.get(key).at })
    // Counted answers stay byte-identical so existing snapshot revisions still hold.
    else kept.push(entry)
  }
  return { kept, hidden }
}
