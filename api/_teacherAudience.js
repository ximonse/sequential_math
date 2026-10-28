import { createHash } from 'node:crypto'
import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { authCanManageGroup } from './_groupStore.js'
import { isStudentDeleted } from './_studentStore.js'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const ids = profile => [...new Set([profile.classId, ...(profile.classIds || [])].filter(validId))].sort()

async function liveClass(req, classId) {
  const record = await kv.get(`class:${classId}`)
  return record && !record.archived && await canAccessClass(req, classId) ? record : null
}

async function readAudience(req, type, targetId, teacherId) {
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth || auth.teacherId !== teacherId) fail(401, 'Lärarsessionen har ändrats.')
  let target, members
  if (type === 'group') {
    target = await kv.get(`group:${targetId}`)
    if (!authCanManageGroup(auth, target)) fail(403, 'Gruppen är inte tillgänglig.')
    members = [...new Set(target.pupilIds || [])]
  } else if (type === 'class') {
    target = await liveClass(req, targetId)
    if (!target) fail(403, 'Klassen är inte tillgänglig.')
    members = await kv.smembers('students:index') || []
  } else {
    target = { id: targetId, name: targetId }
    members = [targetId]
  }
  if (members.length > 10000) fail(413, 'Urvalet är för stort.')
  const pupils = []
  for (let start = 0; start < members.length; start += 20) {
    const rows = await Promise.all(members.slice(start, start + 20).map(async studentId => {
      if (!validId(studentId)) fail(409, 'Urvalets medlemslista är ogiltig.')
      const profile = await kv.get(`student:${studentId}`)
      if (!profile || profile.studentId !== studentId || await isStudentDeleted(studentId)) {
        if (type !== 'class') fail(409, 'En medlem är inte längre tillgänglig. Läs om urvalet.')
        return null
      }
      const memberships = ids(profile)
      if (type === 'class' && !memberships.includes(targetId)) return null
      const accessible = (await Promise.all(memberships.map(async id => await liveClass(req, id) ? id : null))).filter(Boolean)
      if (!accessible.length) {
        if (type !== 'class') fail(403, 'Åtkomst till en medlem saknas.')
        return null
      }
      return { studentId, codeName: String(profile.displayAlias || studentId), classIds: accessible }
    }))
    pupils.push(...rows.filter(Boolean))
  }
  if (pupils.length > 1000) fail(413, 'Välj ett mindre urval, högst 1000 elever.')
  const liveAuth = await getLiveTeacherAuthPayload(req)
  if (!liveAuth || hash(liveAuth) !== hash(auth)) fail(403, 'Lärarens åtkomst har ändrats.')
  if (type === 'class' && !await liveClass(req, targetId)) fail(403, 'Klassen är inte tillgänglig.')
  if (type === 'group') {
    const liveGroup = await kv.get(`group:${targetId}`)
    if (!authCanManageGroup(liveAuth, liveGroup)) fail(403, 'Gruppen är inte tillgänglig.')
    if (hash(target) !== hash(liveGroup)) fail(409, 'Gruppen har ändrats under läsningen.')
  }
  pupils.sort((a, b) => a.studentId.localeCompare(b.studentId))
  return { targetType: type, targetId, name: String(target.name || targetId), pupils }
}

export async function teacherAudience(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { targetType, targetId } = req.query || {}
    const limit = Number(req.query?.limit ?? 50), offset = Number(req.query?.offset ?? 0)
    if (!['class', 'group', 'student'].includes(targetType) || !validId(targetId)
      || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 10000
      || (req.query?.rosterRevision !== undefined && !/^[a-f0-9]{64}$/u.test(req.query.rosterRevision))) fail(400, 'Ogiltigt urval eller sidgräns.')
    const auth = await getLiveTeacherAuthPayload(req)
    if (!auth) fail(401, 'Lärarsessionen har upphört.')
    const initial = await readAudience(req, targetType, targetId, auth.teacherId)
    const current = await readAudience(req, targetType, targetId, auth.teacherId)
    const rosterRevision = hash(current)
    if (hash(initial) !== rosterRevision || (req.query.rosterRevision && req.query.rosterRevision !== rosterRevision)) {
      fail(409, 'Urvalet har ändrats. Börja om sidläsningen med aktuell medlemslista.')
    }
    return res.status(200).json({ ...current, rosterRevision, pupils: current.pupils.slice(offset, offset + limit),
      total: current.pupils.length, nextOffset: offset + limit < current.pupils.length ? offset + limit : null,
      membershipBasis: 'current', historicalMembership: 'unknown' })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Urvalet kunde inte läsas.' })
  }
}

export async function teacherGroupChoices(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const query = String(req.query?.query || '').trim().toLocaleLowerCase('sv-SE')
  const limit = Number(req.query?.limit ?? 50), offset = Number(req.query?.offset ?? 0)
  if (query.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100
    || !Number.isInteger(offset) || offset < 0 || offset > 10000) return res.status(400).json({ error: 'Ogiltigt gruppurval.' })
  const groupIds = await kv.smembers('groups:index') || []
  if (groupIds.length > 10000) return res.status(413).json({ error: 'Gruppurvalet är för stort.' })
  const groups = await Promise.all(groupIds.map(id => kv.get(`group:${id}`)))
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Lärarsessionen har upphört.' })
  const current = await Promise.all(groups.filter(group => group && authCanManageGroup(auth, group)).map(group => kv.get(`group:${group.id}`)))
  const liveAuth = await getLiveTeacherAuthPayload(req)
  if (!liveAuth || liveAuth.teacherId !== auth.teacherId) return res.status(401).json({ error: 'Lärarsessionen har ändrats.' })
  const matches = current.filter(group => group && authCanManageGroup(liveAuth, group))
    .map(group => ({ groupId: group.id, name: String(group.name || group.id) }))
    .filter(group => [group.groupId, group.name].some(value => value.toLocaleLowerCase('sv-SE').includes(query)))
    .sort((a, b) => a.groupId.localeCompare(b.groupId))
  return res.status(200).json({ groups: matches.slice(offset, offset + limit), total: matches.length,
    nextOffset: offset + limit < matches.length ? offset + limit : null })
}
