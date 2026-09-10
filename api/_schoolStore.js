import { kv } from '@vercel/kv'
import { studentStoreError } from './_studentStore.js'

export async function validateSchoolId(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string' || value.length > 100) throw studentStoreError(400, 'Ogiltig skola.')
  const record = await kv.get(`school:${value}`)
  if (!record || await kv.exists(`school_deleted:${value}`)) throw studentStoreError(400, 'Skolan finns inte. Hämta skolorna igen.')
  return value
}

export async function listSchools() {
  const ids = await kv.smembers('schools:index')
  const records = await Promise.all((ids || []).map(async id => {
    if (await kv.exists(`school_deleted:${id}`)) return null
    const record = await kv.get(`school:${id}`)
    return record?.id && record?.name ? { id: record.id, name: record.name } : null
  }))
  return records.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
}
