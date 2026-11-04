import { kv } from '@vercel/kv'

export const catalogKey = studentId => `student_catalog:${String(studentId).trim().toUpperCase()}`
export const CATALOG_VERSION = 2
// Only metadata. Never put answer history, private names or credentials here.
export function catalogCard(profile) {
  if (!profile) return null
  return { version: CATALOG_VERSION, displayAlias: String(profile.displayAlias || ''),
    grade: profile.grade ?? null, created_at: profile.created_at || null,
    classIds: [...new Set([profile.classId, ...(profile.classIds || [])].filter(Boolean).map(String))],
    auth: { scheme: profile.auth?.scheme || null, lastLoginAt: profile.auth?.lastLoginAt || null } }
}
export async function invalidateStudentCatalog(studentId, store = kv) {
  try { await store.del(catalogKey(studentId)) } catch { /* Cache expires even if invalidation is unavailable. */ }
}
