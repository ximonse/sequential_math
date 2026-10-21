// Robot-only group fixture. Seeded robot classes have no school, which the
// teacher group API requires, so the group record is written directly.
import { kv } from '@vercel/kv'

export async function handleGroupControl(body = {}) {
  const id = String(body.id || `group_robot_${Math.random().toString(36).slice(2, 10)}`)
  const group = { id, name: String(body.name || id), schoolId: '', serverRevision: 1,
    pupilIds: (body.pupilIds || []).map(value => String(value).toUpperCase()),
    teacherIds: body.teacherIds || [], createdAt: Date.now(), updatedAt: Date.now() }
  await kv.set(`group:${id}`, group)
  await kv.sadd('groups:index', id)
  return { ok: true, group }
}
