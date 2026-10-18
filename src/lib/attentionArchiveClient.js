import { getTeacherApiToken } from './teacherAuth'
import { isValidAttentionResult } from './attentionHistory'

export async function loadAttentionArchive(studentId, { isActive = () => true } = {}) {
  const records = new Map()
  let pending = null, asOf = null, manifest = null
  do {
    if (!isActive()) throw new Error('Hämtningen avbröts.')
    const batch = pending?.slice(0, 50)
    const query = new URLSearchParams({ studentId, ...(batch ? { ids: batch.join(',') } : {}), ...(asOf ? { asOf: String(asOf) } : {}) })
    const response = await fetch(`/api/teacher-attention?${query}`, { headers: { 'x-teacher-token': getTeacherApiToken() }, cache: 'no-store' })
    if (!response.ok) throw new Error('Fokusarkivet kunde inte hämtas. Ingen ofullständig export har skapats.')
    const page = await response.json()
    if (page.studentId !== studentId || !Array.isArray(page.records) || (asOf && page.asOf !== asOf)) throw new Error('Ogiltigt arkivsvar.')
    for (const entry of page.records) {
      if (!isValidAttentionResult(entry.result)) throw new Error('Fokusarkivet innehåller ett oläsbart resultat. Exporten stoppades.')
      records.set(entry.result.id, entry.result)
    }
    asOf = page.asOf
    if (pending === null) {
      if (!Array.isArray(page.manifest) || new Set(page.manifest).size !== page.manifest.length) throw new Error('Ogiltigt arkivindex.')
      manifest = page.manifest
      pending = page.next ? page.manifest.filter(id => id > page.next) : []
    } else {
      if (batch.some(id => !records.has(id))) throw new Error('Fokusarkivet är ofullständigt.')
      pending = pending.slice(batch.length)
    }
  } while (pending.length)
  if (manifest.some(id => !records.has(id)) || records.size !== manifest.length) throw new Error('Fokusarkivet är ofullständigt. Exporten stoppades.')
  return { studentId, attentionHistory: [...records.values()] }
}
