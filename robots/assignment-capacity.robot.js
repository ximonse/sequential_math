import { test, expect } from '@playwright/test'
import { createPupil, readServerProfile } from './lib/app.js'
import { createTeacher } from './lib/teacher.js'
import { encodeAssignmentPayload } from '../src/lib/assignments.js'
import { activeAssignmentIds } from '../src/lib/activeAssignments.js'

test('R2: a twenty-first active assignment is rejected without silently replacing the oldest pupil assignment', async ({ request }) => {
  const pupil = await createPupil(request, { name: 'Capacity Pupil', classId: `capacity-${Math.random().toString(36).slice(2, 7)}` })
  const teacher = await createTeacher(request, { classIds: [pupil.classId] })
  const { token } = await (await request.post('/api/teacher-login', { data: teacher })).json()
  const activate = id => request.put('/api/teacher-class-assignment', { headers: { 'x-teacher-token': token }, data: {
    targetType: 'student', targetId: pupil.studentId, action: 'activate', assignmentPayload: encodeAssignmentPayload({
      id, title: id, problemTypes: ['addition'], minLevel: 1, maxLevel: 1, targetCount: 10, createdAt: 1 }) } })
  for (let i = 1; i <= 20; i++) expect((await activate(`capacity-${i}`)).status()).toBe(200)
  const before = await readServerProfile(request, pupil.studentId)
  expect((await activate('capacity-21')).status()).toBe(409)
  expect(activeAssignmentIds(await readServerProfile(request, pupil.studentId))).toEqual(activeAssignmentIds(before))
  expect(activeAssignmentIds(before)).toContain('capacity-1')
})
