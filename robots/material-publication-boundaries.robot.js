import { test, expect } from '@playwright/test'
import { createPupil, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { encodeAssignmentPayload } from '../src/lib/assignments.js'
import { activeAssignmentIds } from '../src/lib/activeAssignments.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

test('Publication preserves full active lists, reports partial failure, resumes only remaining recipients and follows up a lost successful response', async ({ page, request }, info) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Use ROBOT_DEV=1 for local reviewed cookie publication.')
  const tag = Math.random().toString(36).slice(2, 7), classId = `boundary-${tag}`
  const pupils = []
  for (const name of ['Boundary One', 'Boundary Two', 'Boundary Three', 'Boundary Page4', 'Boundary Page5', 'Boundary Page6', 'Boundary Page7']) pupils.push(await createPupil(request, { classId, name }))
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  const headers = { Origin: new URL(page.url()).origin }
  const raw = data => page.request.post('/api/teacher-material', { headers, data })
  const post = async data => {
    const response = await raw(data), body = await response.json()
    expect(response.status(), JSON.stringify(body)).toBe(200)
    return body
  }
  const group = { id: `group_boundary_${tag}`, name: 'Valt urval', pupilIds: pupils.slice(0, 2).map(p => p.studentId), teacherIds: [teacher.username] }
  await request.post('/__robot/group', { data: group })
  async function prepare(targetType, targetId, suffix, specific = false) {
    const audience = await (await page.request.get(`/api/students?${new URLSearchParams({ resource: 'audience', targetType, targetId })}`)).json()
    let basis = []
    if (specific) {
      const evidence = await (await page.request.get(`/api/teacher-students/${targetId}?${new URLSearchParams({ resource: 'evidence', classId,
        source: 'practice', from: '2026-01-01', to: stockholmDay() })}`)).json()
      basis = [{ studentId: targetId, classId, source: 'practice', from: '2026-01-01', to: stockholmDay(), snapshotRevision: evidence.snapshotRevision,
        supportRefs: [evidence.entries[2].ref], counterRefs: [], reasonSv: 'Undersök det konkreta felsvaret i sjuans tabell.' }]
    }
    const material = { schemaVersion: 1, kind: 'practice', mode: specific ? 'specific' : 'general', titleSv: `Gränsprov ${suffix}`,
      goalSv: specific ? 'Undersök tabellfakta' : 'Öva addition', instructionSv: 'Använd valt innehåll.',
      audience: { targetType, targetId, rosterRevision: audience.rosterRevision }, basis,
      content: specific ? { kind: 'table', tables: [7], targetCount: 10 } : { kind: 'standard', problemTypes: ['addition'], minLevel: 1, maxLevel: 1, targetCount: 1 } }
    const preview = await post({ action: 'preview', material })
    const saved = await post({ action: 'save', material, expectedRevision: 0, expectedContentRevision: preview.contentRevision, requestId: `boundary-save-${suffix}` })
    const approved = await post({ action: 'approve', draftId: saved.draftId, expectedRevision: 1, version: 1, contentRevision: saved.contentRevision,
      requestId: `boundary-approve-${suffix}` })
    return { material, saved, command: { action: 'publish', draftId: saved.draftId, expectedRevision: approved.revision,
      version: 1, contentRevision: saved.contentRevision, requestId: `boundary-publish-${suffix}` } }
  }
  for (let index = 0; index < 20; index++) {
    const response = await page.request.put('/api/teacher-class-assignment', { headers, data: { targetType: 'student', targetId: pupils[0].studentId,
      action: 'activate', assignmentPayload: encodeAssignmentPayload({ id: `old-${index}`, title: `Gammalt ${index}`, createdAt: 1,
        kind: 'standard', problemTypes: ['addition'], minLevel: 1, maxLevel: 1, targetCount: 5 }) } })
    expect(response.status()).toBe(200)
  }
  const oldIds = activeAssignmentIds(await readServerProfile(request, pupils[0].studentId))
  const partial = await prepare('group', group.id, 'partial')
  const first = await post(partial.command)
  expect(first).toMatchObject({ hasMore: false, assigned: false })
  expect(first.dispatch).toMatchObject({ status: 'partial', confirmed: 1, failed: 1 })
  expect(activeAssignmentIds(await readServerProfile(request, pupils[0].studentId))).toEqual(oldIds)
  expect((await post(partial.command)).dispatch.confirmed).toBe(1)
  const secondBefore = activeAssignmentIds(await readServerProfile(request, pupils[1].studentId))
  await page.request.put('/api/teacher-class-assignment', { headers, data: { targetType: 'student', targetId: pupils[0].studentId,
    action: 'deactivate', assignmentId: 'old-0' } })
  const completed = await post({ ...partial.command, requestId: 'boundary-publish-partial-retry' })
  expect(completed.dispatch).toMatchObject({ status: 'complete', confirmed: 2, failed: 0 })
  expect(activeAssignmentIds(await readServerProfile(request, pupils[1].studentId))).toEqual(secondBefore)
  expect(activeAssignmentIds(await readServerProfile(request, pupils[0].studentId))).toHaveLength(20)

  const changedGroup = await prepare('group', group.id, 'membership')
  await request.post('/__robot/group', { data: { ...group, pupilIds: pupils.map(p => p.studentId) } })
  expect((await raw(changedGroup.command)).status()).toBe(409)
  expect(activeAssignmentIds(await readServerProfile(request, pupils[2].studentId))).toEqual([])

  const seed = currentCorrect => request.post('/__robot/seed-table-progress', { data: { students: [{ studentId: pupils[1].studentId,
    currentAttempts: 4, currentCorrect, previousAttempts: 0, noiseAttempts: 0 }] } })
  await seed(2)
  const changedSource = await prepare('student', pupils[1].studentId, 'source', true)
  const sourceBefore = activeAssignmentIds(await readServerProfile(request, pupils[1].studentId))
  await seed(4)
  expect((await raw(changedSource.command)).status()).toBe(409)
  expect(activeAssignmentIds(await readServerProfile(request, pupils[1].studentId))).toEqual(sourceBefore)

  const lost = await prepare('student', pupils[2].studentId, 'lost-response')
  await page.goto(lost.saved.reviewPath)
  let dropped = false
  await page.route('**/api/teacher-material', async route => {
    if (route.request().method() === 'POST' && route.request().postDataJSON()?.action === 'publish' && !dropped) {
      dropped = true
      const response = await route.fetch()
      expect(response.status()).toBe(200)
      return route.abort('failed')
    }
    return route.continue()
  })
  await page.getByRole('button', { name: 'Dela ut till 1 elev', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Utdelningsstatus' })).toContainText('Bekräftat utdelat till 1 av 1 elev')
  expect(dropped).toBe(true)
  const delivered = activeAssignmentIds(await readServerProfile(request, pupils[2].studentId))
  expect(delivered).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Utdelningsstatus' })).toContainText('Bekräftat utdelat till 1 av 1 elev')
  expect((await post(lost.command)).dispatch.status).toBe('complete')
  expect(activeAssignmentIds(await readServerProfile(request, pupils[2].studentId))).toEqual(delivered)
  await page.screenshot({ path: info.outputPath('publication-receipt.png'), fullPage: true })
  await page.request.put('/api/teacher-class-assignment', { headers, data: { targetType: 'student', targetId: pupils[0].studentId,
    action: 'deactivate', assignmentId: 'old-1' } })
  const paging = await prepare('class', classId, 'paging')
  await page.goto(paging.saved.reviewPath)
  let calls = 0
  page.on('request', value => { if (value.url().endsWith('/api/teacher-material') && value.method() === 'POST' && value.postDataJSON()?.action === 'publish') calls++ })
  await page.getByRole('button', { name: 'Dela ut till 7 elever', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Utdelningsstatus' })).toContainText('Bekräftat utdelat till 7 av 7 elever')
  expect(calls).toBe(2)
  const pagingState = await (await page.request.get(`/api/teacher-material?draftId=${paging.saved.draftId}`)).json()
  expect(pagingState.dispatches[0]).toMatchObject({ status: 'complete', confirmed: 7, pending: 0, failed: 0 })
  await page.screenshot({ path: info.outputPath('publication-class-receipt.png'), fullPage: true })
})
