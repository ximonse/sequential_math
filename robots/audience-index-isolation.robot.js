import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher } from './lib/teacher.js'

test('A legacy record outside the selected class cannot block its exact audience or private material preview', async ({ request }) => {
  const classId = `audience-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, name: 'Audience isolation pupil' })
  const teacher = await createTeacher(request, { classIds: [classId] })
  const login = await (await request.post('/api/teacher-login', { data: teacher })).json()
  const headers = { 'x-teacher-token': login.token }
  await request.post('/__robot/seed-audience-legacy', { data: { classId: 'unrelated-legacy-class' } })
  const response = await request.get(`/api/students?resource=audience&targetType=class&targetId=${classId}`, { headers })
  expect(response.status()).toBe(200)
  const audience = await response.json()
  expect(audience.pupils.map(item => item.studentId)).toEqual([pupil.studentId])
  const material = { schemaVersion: 1, kind: 'practice', mode: 'general', titleSv: 'Neutralt material', goalSv: 'Tabell 7',
    instructionSv: 'Privat kontroll utan utdelning.', audience: { targetType: 'class', targetId: classId, rosterRevision: audience.rosterRevision },
    content: { kind: 'table', tables: [7], targetCount: 8 } }
  expect((await request.post('/api/teacher-material', { headers, data: { action: 'preview', material } })).status()).toBe(200)
  // A malformed record that actually belongs to the selected class must still
  // reject the selection instead of silently changing the intended audience.
  await request.post('/__robot/seed-audience-legacy', { data: { classId } })
  expect((await request.get(`/api/students?resource=audience&targetType=class&targetId=${classId}`, { headers })).status()).toBe(409)
})
