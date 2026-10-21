/**
 * PUT /api/teacher-class-assignment
 * Body: { targetType: 'class'|'group', targetId, action: 'activate'|'deactivate'|'clear',
 *   assignmentPayload, assignmentId } — changes the class's or group's list of active
 * assignments. Older clients send { classId, assignmentPayload }: a payload activates
 * it and an empty payload clears the list. Pupils read it through GET /api/me/assignments
 * (and the newest one through GET /api/class-config). Requires teacher auth.
 */
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { mutateClassRecord } from './_classStore.js'
import { authCanManageGroup, listGroupRecords, mutateGroupRecord } from './_groupStore.js'
import { studentStoreError } from './_studentStore.js'
import { decodeAssignmentPayload, encodeAssignmentPayload } from '../src/lib/assignments.js'
import { activeAssignmentFields, withActiveAssignment, withoutActiveAssignment } from '../src/lib/activeAssignments.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'PUT,OPTIONS',
    headers: 'Content-Type, x-teacher-token'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const targetType = req.body?.targetType === 'group' ? 'group' : 'class'
  const targetId = String(req.body?.targetId || req.body?.classId || '').trim()
  if (!targetId) return res.status(400).json({ error: 'targetId required' })

  const rawPayload = String(req.body?.assignmentPayload || '').trim()
  const action = ['activate', 'deactivate', 'clear'].includes(req.body?.action)
    ? req.body.action : rawPayload ? 'activate' : 'clear'
  // Re-encode through the shared normaliser so only known fields are stored.
  const assignment = action === 'activate' ? decodeAssignmentPayload(rawPayload) : null
  if (action === 'activate' && !assignment) return res.status(400).json({ error: 'Ogiltigt uppdrag.' })
  const assignmentId = String(req.body?.assignmentId || '').trim()
  if (action === 'deactivate' && !assignmentId) return res.status(400).json({ error: 'assignmentId required' })

  const change = current => action === 'activate'
    ? withActiveAssignment(current, encodeAssignmentPayload(assignment), { activatedBy: auth.teacherId })
    : action === 'deactivate' ? withoutActiveAssignment(current, assignmentId) : activeAssignmentFields([])

  try {
    let saved
    if (targetType === 'group') {
      const group = (await listGroupRecords()).find(item => item.id === targetId)
      if (!group) return res.status(404).json({ error: 'Gruppen finns inte.' })
      if (!authCanManageGroup(auth, group)) return res.status(403).json({ error: 'Not authorized for this group' })
      saved = await mutateGroupRecord(targetId, current => {
        if (!current) throw studentStoreError(404, 'Gruppen finns inte.')
        return { ...current, ...change(current), updatedAt: Date.now() }
      })
    } else {
      if (!await canAccessClass(req, targetId)) return res.status(403).json({ error: 'Not authorized for this class' })
      saved = await mutateClassRecord(targetId, current => {
        if (!current) throw studentStoreError(404, 'Class not found')
        return { ...current, ...change(current) }
      }, { skipClassNameCheck: true })
    }
    return res.status(200).json({ ok: true, targetType, targetId,
      activeAssignments: saved.activeAssignments, activeAssignmentPayload: saved.activeAssignmentPayload || '' })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to save' })
  }
}
