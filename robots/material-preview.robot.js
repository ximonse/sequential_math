import { test, expect } from '@playwright/test'
import { createPupil, readServerProfile } from './lib/app.js'
import { createTeacher } from './lib/teacher.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

test('Generic and analysis-specific practice/screening previews and saved versions never activate assignments', async ({ request }) => {
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
  let lastInput, lastPreview
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
      lastInput = material; lastPreview = preview
      expect(preview).toMatchObject({ saved: false, assigned: false, approval: 'not_requested' })
      expect(preview.material.audience.total).toBe(targetType === 'group' ? 2 : 1)
      if (mode === 'specific' && targetType === 'group') expect(preview.material.pupilsWithoutAnalysis).toEqual([empty.studentId])
      if (kind === 'screening' && mode === 'general') {
        expect(preview.material.content.items[0].marking.expectedAnswer).toBe(224)
        expect(preview.material.content.items[1].task.answerRule).toBe('teacher_review')
      }
      if (kind === 'screening' && mode === 'specific') expect(preview.material.content.items[0].task.answerRule).toBe('teacher_review')
      const invented = await request.post('/api/teacher-material', { headers, data: { action: 'publish', material } })
      expect(invented.status()).toBe(403)
    }
  }
  const emptyFilter = await request.post('/api/teacher-material', { headers, data: { action: 'preview', material: {
    ...lastInput, kind: 'practice', mode: 'general', basis: [], content: { kind: 'math_practice', operations: ['addition'],
      numberRange: { first: { min: 1, max: 1, filter: 'even' }, second: { min: 2, max: 2, filter: 'all' } }, targetCount: 5 }
  } } })
  expect(emptyFilter.status(), 'R1: an impossible number filter must not fall back to unfiltered numbers').toBe(400)
  const save = { action: 'save', material: lastInput, expectedRevision: 0, requestId: 'robot-material-save-0001', expectedContentRevision: lastPreview.contentRevision }
  const savedResponse = await request.post('/api/teacher-material', { headers, data: save })
  expect(savedResponse.status(), await savedResponse.text()).toBe(200)
  const saved = await savedResponse.json()
  const retry = await (await request.post('/api/teacher-material', { headers, data: save })).json()
  expect(retry.draftId).toBe(saved.draftId)
  expect(retry.revision).toBe(1)
  const read = await (await request.get(`/api/teacher-material?draftId=${saved.draftId}`, { headers })).json()
  expect(read.draft.versions).toHaveLength(1)
  expect(read.draft.versions[0].input).toEqual(lastInput)
  expect(read.assigned).toBe(false)
  const other = await createTeacher(request, { classIds: [] })
  const otherLogin = await (await request.post('/api/teacher-login', { data: other })).json()
  expect((await request.get(`/api/teacher-material?draftId=${saved.draftId}`, { headers: { 'x-teacher-token': otherLogin.token } })).status()).toBe(404)
  const assignments = await (await request.get(`/api/teacher-diagnostic-assignments?classId=${classId}`, { headers })).json()
  expect(assignments.assignments).toEqual([])
  expect(await readServerProfile(request, pupil.studentId)).toEqual(before)
})
