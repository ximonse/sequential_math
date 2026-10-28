import { test, expect } from '@playwright/test'
import { createPupil, readServerProfile } from './lib/app.js'
import { createTeacher } from './lib/teacher.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

test('Generic and analysis-specific practice/screening previews for pupil, cross-class group and class never activate assignments', async ({ request }) => {
  const tag = Math.random().toString(36).slice(2, 7), classId = `material-${tag}`
  const pupil = await createPupil(request, { classId, name: 'Material One' })
  const empty = await createPupil(request, { classId: `other-${tag}`, name: 'Material Two' })
  const teacher = await createTeacher(request, { classIds: [classId, empty.classId], role: 'super_admin' })
  await request.post('/__robot/group', { data: { id: `group_${tag}`, name: 'Två klasser',
    pupilIds: [pupil.studentId, empty.studentId], teacherIds: [teacher.username] } })
  await request.post('/__robot/seed-table-progress', { data: { students: [{ studentId: pupil.studentId,
    currentAttempts: 4, currentCorrect: 2, previousAttempts: 0, noiseAttempts: 0 }] } })
  const { token } = await (await request.post('/api/teacher-login', { data: teacher })).json()
  const headers = { 'x-teacher-token': token }
  const before = await readServerProfile(request, pupil.studentId)
  const period = { from: '2026-01-01', to: stockholmDay(), source: 'practice' }
  const evidenceQuery = new URLSearchParams({ resource: 'evidence', classId, ...period })
  const evidence = await (await request.get(`/api/teacher-students/${pupil.studentId}?${evidenceQuery}`, { headers })).json()
  expect(evidence.total).toBe(4)
  for (const [targetType, targetId] of [['student', pupil.studentId], ['group', `group_${tag}`], ['class', classId]]) {
    const query = new URLSearchParams({ resource: 'audience', targetType, targetId })
    const audience = await (await request.get(`/api/students?${query}`, { headers })).json()
    for (const kind of ['practice', 'screening']) for (const mode of ['general', 'specific']) {
      const material = { schemaVersion: 1, kind, mode, titleSv: 'Granska nästa steg', goalSv: 'Undersöka valt innehåll',
        instructionSv: 'Visa hur du räknar.', sourceMaterials: [{ label: 'Lärarens material', excerpt: 'Subtraktion och tabell 7.' }],
        audience: { targetType, targetId, rosterRevision: audience.rosterRevision },
        basis: mode === 'general' ? [] : [{ studentId: pupil.studentId, classId, ...period,
          snapshotRevision: evidence.snapshotRevision, supportRefs: [evidence.entries[2].ref], counterRefs: [],
          reasonSv: 'Ett felsvar motiverar fortsatt undersökning; övriga elever saknar analys här.' }],
        content: kind === 'practice' ? { kind: 'table', tables: [7], targetCount: 10 }
          : mode === 'specific'
            ? { taskIds: [], customTasks: [{ promptSv: 'Räkna 7 × 3 och förklara hur du kontrollerar svaret.', gridEnabled: true }] }
            : { taskIds: ['sub-through-zero-001'], customTasks: [{ promptSv: 'Förklara hur du växlar.', gridEnabled: true }] } }
      const response = await request.post('/api/teacher-material', { headers, data: { action: 'preview', material } })
      expect(response.status(), await response.text()).toBe(200)
      const preview = await response.json()
      expect(preview).toMatchObject({ saved: false, assigned: false, approval: 'not_requested' })
      expect(preview.material.audience.total).toBe(targetType === 'group' ? 2 : 1)
      if (mode === 'specific' && targetType === 'group') expect(preview.material.pupilsWithoutAnalysis).toEqual([empty.studentId])
      if (kind === 'screening' && mode === 'general') {
        expect(preview.material.content.items[0].marking.expectedAnswer).toBe(224)
        expect(preview.material.content.items[1].task.answerRule).toBe('teacher_review')
      }
      if (kind === 'screening' && mode === 'specific') expect(preview.material.content.items[0].task.answerRule).toBe('teacher_review')
      const invented = await request.post('/api/teacher-material', { headers, data: { action: 'publish', material } })
      expect(invented.status()).toBe(400)
    }
  }
  const assignments = await (await request.get(`/api/teacher-diagnostic-assignments?classId=${classId}`, { headers })).json()
  expect(assignments.assignments).toEqual([])
  expect(await readServerProfile(request, pupil.studentId)).toEqual(before)
})
