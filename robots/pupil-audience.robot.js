import { test, expect } from '@playwright/test'
import { createPupil, readServerProfile } from './lib/app.js'
import { createTeacher } from './lib/teacher.js'

test('Current exact audience includes a pupil without answers and rejects changed group membership without changing pupil data', async ({ request }) => {
  const classId = `audience-${Math.random().toString(36).slice(2, 8)}`
  const one = await createPupil(request, { classId, name: `Roster A ${classId}` })
  const two = await createPupil(request, { classId, name: `Roster B ${classId}` })
  const base = '/api/students?resource=audience'
  expect((await request.get(`${base}&targetType=class&targetId=${classId}`)).status()).toBe(401)
  const teacher = await createTeacher(request, { classIds: [classId] })
  const { token } = await (await request.post('/api/teacher-login', { data: teacher })).json()
  const headers = { 'x-teacher-token': token }
  const before = await readServerProfile(request, one.studentId)
  const groupData = { id: `group_${classId}`, name: 'Analysera urval', pupilIds: [one.studentId], teacherIds: [teacher.username] }
  await request.post('/__robot/group', { data: groupData })
  const classroom = await (await request.get(`${base}&targetType=class&targetId=${classId}`, { headers })).json()
  expect(classroom.total).toBe(2)
  expect(classroom.pupils.map(p => p.studentId).sort()).toEqual([one.studentId, two.studentId].sort())
  expect(classroom.historicalMembership).toBe('unknown')
  const groupUrl = `${base}&targetType=group&targetId=${groupData.id}`
  const group = await (await request.get(groupUrl, { headers })).json()
  expect(group.total).toBe(1)
  const period = new URLSearchParams({ resource: 'evidence', classId, from: '2026-01-01', to: '2030-01-01' })
  const evidence = await (await request.get(`/api/teacher-students/${one.studentId}?${period}`, { headers })).json()
  expect(evidence.total).toBe(0)
  await request.post('/__robot/group', { data: { ...groupData, pupilIds: [one.studentId, two.studentId] } })
  expect((await request.get(`${groupUrl}&rosterRevision=${group.rosterRevision}`, { headers })).status()).toBe(409)
  expect(await readServerProfile(request, one.studentId)).toEqual(before)
})
