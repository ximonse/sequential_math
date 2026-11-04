import { kv } from '@vercel/kv'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { getLiveAuthorizedClassIds } from './_studentAccess.js'
import { isStudentDeleted } from './_studentStore.js'
import { catalogKey, catalogCard, CATALOG_VERSION } from './_studentCatalogCard.js'
import { guardPupilKey } from './_pupilReferenceWrite.js'

// The teacher view no longer loads every pupil's full history at start (44 MB,
// 15 s on 2026-11-03). It loads a light catalog of all authorised pupils, and full
// profiles only for the classes, groups or pupils the teacher opens (Simon
// 2026-11-03). Class membership comes from the class index `class_students:{id}`,
// which matched the full list for every class when measured.

async function getMany(keys, store, batchSize = 50) {
  const out = []
  for (let i = 0; i < keys.length; i += batchSize) {
    const part = keys.slice(i, i + batchSize)
    if (!part.length) continue
    const values = await store.mget(...part)
    if (!Array.isArray(values) || values.length !== part.length) throw Error('Ofullständig elevkatalog från lagringen.')
    out.push(...values)
  }
  return out
}

// Active classes the teacher may see, with their pupil ids from the class index.
async function authorisedClasses(req, store) {
  const allowed = await getLiveAuthorizedClassIds(req)
  const ids = await store.smembers('classes:index') || []
  const records = await getMany(ids.map(id => `class:${id}`), store)
  const classes = records.filter(record => record && !record.archived
    && (allowed === null || allowed.includes(record.id)))
  const members = await Promise.all(classes.map(record => store.smembers(`class_students:${record.id}`)))
  return classes.map((record, i) => ({ id: String(record.id), name: record.name || '', pupilIds: (members[i] || []).map(id => String(id).toUpperCase()) }))
}

function membershipMap(classes) {
  const map = new Map()
  for (const record of classes) {
    for (const id of record.pupilIds) {
      if (!map.has(id)) map.set(id, [])
      map.get(id).push(record)
    }
  }
  return map
}

export async function teacherCatalog(req, res, store = kv) {
  const classes = await authorisedClasses(req, store)
  const members = membershipMap(classes)
  const ids = [...members.keys()]
  const cards = await getMany(ids.map(catalogKey), store)
  const deleted = await Promise.all(ids.map(id => isStudentDeleted(id, { store })))
  const missing = ids.filter((_, i) => !deleted[i] && cards[i]?.version !== CATALOG_VERSION)
  if (missing.length) {
    // Cold-cache recovery reads large profiles in smaller batches; warm reads
    // only transfer metadata cards. This is not a full history projection.
    const profiles = await getMany(missing.map(id => `student:${id}`), store, 5)
    for (const [i, profile] of profiles.entries()) {
      if (!isCurrentStudentProfile(profile)) continue
      const card = catalogCard(profile)
      const alive = await guardPupilKey(catalogKey(missing[i]), missing[i], card, { ttl: 60, live: true, store })
      cards[ids.indexOf(missing[i])] = alive ? card : null
    }
  }
  const pupils = ids.flatMap((studentId, i) => {
    const card = cards[i]
    if (deleted[i] || card?.version !== CATALOG_VERSION) return []
    const memberOf = members.get(studentId).filter(record => card.classIds?.includes(record.id))
    if (!memberOf.length) return []
    return [{ studentId, displayAlias: card.displayAlias, name: card.displayAlias || studentId, grade: card.grade,
      created_at: card.created_at, classId: memberOf[0].id, classIds: memberOf.map(item => item.id),
      className: memberOf[0].name, auth: card.auth, catalogOnly: true }]
  })
  return res.status(200).json({ pupils })
}

// Full list profiles only for the requested classes and pupils the teacher may see.
export async function scopedStudentIds(req, { classIds = [], studentIds = [] }, store = kv) {
  const classes = await authorisedClasses(req, store)
  const members = membershipMap(classes)
  const wanted = new Set()
  for (const record of classes) if (classIds.includes(record.id)) record.pupilIds.forEach(id => wanted.add(id))
  for (const id of studentIds) if (members.has(String(id).toUpperCase())) wanted.add(String(id).toUpperCase())
  const ids = [...wanted]
  const deleted = await Promise.all(ids.map(id => isStudentDeleted(id, { store })))
  return ids.filter((_, i) => !deleted[i])
}
