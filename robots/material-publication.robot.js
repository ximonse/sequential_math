import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile, waitForTask, answerText, fillAnswer, submit } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { decodeAssignmentPayload } from '../src/lib/assignments.js'
import { stockholmDay } from '../src/lib/evidencePeriod.js'

test('All twelve reviewed material combinations reach exactly the chosen pupils without duplicates, with real pupil answers and teacher follow-up', async ({ page, request, browser }) => {
  test.skip(process.env.ROBOT_DEV !== '1', 'Run reviewed cookie publication with ROBOT_DEV=1 for the local development origin policy.')
  const tag = Math.random().toString(36).slice(2, 7), classId = `dispatch-${tag}`, otherClass = `dispatch-other-${tag}`
  const pupils = []
  for (const [index, name] of ['Dispatch One', 'Dispatch Two', 'Dispatch Three', 'Dispatch Four'].entries()) {
    pupils.push(await createPupil(request, { classId: index < 2 ? classId : otherClass, name }))
  }
  const teacher = await createTeacher(request, { classIds: [classId, otherClass], role: 'super_admin' })
  await teacherLogin(page, teacher)
  const baseUrl = new URL(page.url()).origin
  const post = async data => {
    const result = await page.request.post('/api/teacher-material', { headers: { Origin: baseUrl }, data })
    const body = await result.json()
    expect(result.status(), JSON.stringify(body)).toBe(200)
    return body
  }
  const read = async url => (await page.request.get(url)).json()
  const groupId = `group_dispatch_${tag}`
  await request.post('/__robot/group', { data: { id: groupId, name: 'Grupp över två klasser',
    pupilIds: [pupils[0].studentId, pupils[2].studentId], teacherIds: [teacher.username] } })
  const clients = []
  try {
    for (const pupil of pupils) {
      const context = await browser.newContext({ baseURL: baseUrl })
      const studentPage = await context.newPage()
      await login(studentPage, pupil)
      clients.push({ context, page: studentPage, pupil })
    }
    const targets = [['student', pupils[0].studentId, [0]], ['group', groupId, [0, 2]], ['class', classId, [0, 1]]]
    let sequence = 0
    for (const kind of ['practice', 'screening']) for (const mode of ['general', 'specific']) for (const [targetType, targetId, selected] of targets) {
      sequence++
      const audience = await read(`/api/students?${new URLSearchParams({ resource: 'audience', targetType, targetId })}`)
      let basis = []
      const period = { from: '2026-01-01', to: stockholmDay(), source: 'practice' }
      if (mode === 'specific') {
        await request.post('/__robot/seed-table-progress', { data: { students: [{ studentId: pupils[0].studentId,
          currentAttempts: 4, currentCorrect: 2, previousAttempts: 0, noiseAttempts: 0 }] } })
        const evidence = await read(`/api/teacher-students/${pupils[0].studentId}?${new URLSearchParams({ resource: 'evidence', classId, ...period })}`)
        basis = [{ studentId: pupils[0].studentId, classId, ...period, snapshotRevision: evidence.snapshotRevision,
          supportRefs: [evidence.entries[2].ref], counterRefs: [], reasonSv: '7 × 3 besvarades med 22. Undersök tabellfakta och be om förklaring; underlaget gäller bara denna elev.' }]
      }
      const title = `Material ${sequence}: ${kind} ${mode} ${targetType}`
      const content = kind === 'practice'
        ? mode === 'specific' ? { kind: 'table', tables: [7], targetCount: 10 }
          : { kind: 'standard', problemTypes: ['addition'], minLevel: 1, maxLevel: 1, targetCount: 1 }
        : mode === 'specific' ? { taskIds: [], customTasks: [{ promptSv: 'Räkna 7 × 3 och förklara hur du kontrollerar svaret.' }] }
          : { taskIds: ['sub-through-zero-001'] }
      const material = { schemaVersion: 1, kind, mode, titleSv: title, goalSv: mode === 'specific' ? 'Undersök sjuans tabell' : 'Träna eller undersök det lärarvalda innehållet',
        instructionSv: mode === 'specific' ? 'Utgå från felsvaret men tillskriv inte hela gruppen en felorsak.' : 'Använd valt innehåll och stödda frågetyper.',
        sourceMaterials: mode === 'general' ? [{ label: 'Lärarens val', excerpt: kind === 'practice' ? 'Addition på nivå 1, ett svar.' : 'Subtraktion 402 − 178 med räknehäfte.' }] : [],
        audience: { targetType, targetId, rosterRevision: audience.rosterRevision }, basis, content }
      const preview = await post({ action: 'preview', material })
      const saved = await post({ action: 'save', material, expectedRevision: 0, expectedContentRevision: preview.contentRevision,
        requestId: `dispatch-matrix-save-${sequence}` })
      // Neither saving nor a forged unapproved publication may activate anything.
      const beforeApproval = await page.request.post('/api/teacher-material', { headers: { Origin: baseUrl }, data: {
        action: 'publish', draftId: saved.draftId, version: 1, contentRevision: saved.contentRevision, expectedRevision: 1,
        requestId: `unapproved-publish-${sequence}` } })
      expect(beforeApproval.status()).toBe(403)
      const approval = await post({ action: 'approve', draftId: saved.draftId, version: 1, contentRevision: saved.contentRevision,
        expectedRevision: 1, requestId: `dispatch-matrix-approve-${sequence}` })
      const command = { action: 'publish', draftId: saved.draftId, version: 1, contentRevision: saved.contentRevision,
        expectedRevision: approval.revision, requestId: `dispatch-matrix-publish-${sequence}` }
      let published
      do { published = await post(command) } while (published.hasMore)
      expect(published.dispatch.status).toBe('complete')
      expect(published.dispatch.confirmed).toBe(selected.length)
      const retry = await post(command)
      expect(retry.dispatch.receipts.map(row => row.assignmentId)).toEqual(published.dispatch.receipts.map(row => row.assignmentId))
      for (const [index, client] of clients.entries()) {
        const endpoint = kind === 'practice' ? '/api/me/assignments' : '/api/me/diagnostic-assignments'
        const result = await (await client.context.request.get(endpoint)).json()
        const matching = kind === 'practice' ? result.assignments.map(row => decodeAssignmentPayload(row.payload)).filter(value => value.title === title)
          : result.assignments.filter(value => value.titleSv === title)
        expect(matching, `${title}: pupil ${index}`).toHaveLength(selected.includes(index) ? 1 : 0)
        if (selected.includes(index) && kind === 'practice') {
          expect(matching[0].kind).toBe(mode === 'specific' ? 'table' : 'standard')
          if (mode === 'specific') expect(matching[0].tables).toEqual([7])
        }
      }
      if (kind === 'practice' && mode === 'general' && targetType === 'student') {
        const student = clients[0].page, assignmentId = published.dispatch.receipts[0].assignmentId
        await student.reload()
        await student.getByRole('button', { name: `Starta nästa: ${title}`, exact: true }).click()
        const { state } = await waitForTask(student)
        expect(state.problem.skill).toBe('addition')
        await fillAnswer(student, answerText(state.problem)); await submit(student)
        await expect.poll(async () => (await readServerProfile(request, pupils[0].studentId)).problemLog.some(row => row.trainingContext?.assignmentId === assignmentId)).toBe(true)
        await student.reload()
        expect((await readServerProfile(request, pupils[0].studentId)).problemLog.some(row => row.trainingContext?.assignmentId === assignmentId)).toBe(true)
      }
      if (kind === 'screening' && mode === 'general' && targetType === 'student') {
        const student = clients[0].page
        const before = await readServerProfile(request, pupils[0].studentId)
        await student.goto(`/student/${pupils[0].studentId}`)
        await student.getByRole('button', { name: title, exact: true }).click()
        const attemptUrl = student.url()
        await student.getByRole('textbox', { name: 'Mitt svar', exact: true }).tap()
        for (const digit of '224') await student.getByRole('button', { name: `Skriv ${digit}`, exact: true }).tap()
        await student.getByRole('button', { name: 'Lämna in svaren', exact: true }).click()
        await expect(student).toHaveURL(new RegExp(`/student/${pupils[0].studentId}$`))
        await student.goto(attemptUrl)
        await student.reload()
        await expect(student.getByRole('textbox', { name: 'Mitt svar', exact: true })).toHaveValue('224')
        const after = await readServerProfile(request, pupils[0].studentId)
        expect(after.masteryFacts).toEqual(before.masteryFacts); expect(after.problemLog).toEqual(before.problemLog)
        const followup = await read(`/api/teacher-students/${pupils[0].studentId}?${new URLSearchParams({ resource: 'evidence', classId,
          from: stockholmDay(), to: stockholmDay(), source: 'screening' })}`)
        expect(followup.entries.some(entry => entry.answer.studentAnswer === '224' && entry.answer.status === 'correct' && entry.answer.submitted)).toBe(true)
      }
    }
  } finally { for (const client of clients) await client.context.close() }
})
