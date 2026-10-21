import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { openTab, teacherLogin } from './lib/teacher.js'

async function assignThree(page, request, name) {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `back-edit-${tag}`
  const pupil = await createPupil(request, { name, classId })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `back-edit-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  const assignment = await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`Could not assign collection: ${response.status} ${await response.text()}`)
    return (await response.json()).assignment
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Screening – backa',
    taskIds: ['add-no-carry-001', 'add-carry-001', 'sub-through-zero-001'] })
  return { pupil, teacher, classId, assignment }
}

test('Ending a screening hands in every started answer, even without the pupil submitting', async ({ page, request, browser }) => {
  const { pupil, classId, assignment } = await assignThree(page, request, 'Close Collect')
  const context = await browser.newContext()
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Screening – backa', exact: true }).click()
  const answer = student.locator('#diagnostic-answer')
  await answer.click()
  await answer.pressSequentially('11')
  await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
  await student.locator('input[data-cell="0:0"]').click()
  await student.getByRole('button', { name: 'Skriv 4', exact: true }).click()
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()

  await openTab(page, 'Screening')
  const panel = page.getByRole('heading', { name: 'Screening till elev eller klass' }).locator('xpath=..')
  await panel.getByRole('combobox', { name: 'Klass', exact: true }).selectOption(classId)
  page.once('dialog', dialog => dialog.accept())
  await panel.getByRole('button', { name: 'Avsluta', exact: true }).click()
  await expect(panel.getByText('2 påbörjade svar lämnades in.')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Lämna in pågående', exact: true })).toBeVisible()

  const overview = await page.evaluate(async search => {
    const response = await fetch(`/api/teacher-diagnostic-attempts?${search}`, {
      headers: { 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') } })
    return response.json()
  }, new URLSearchParams({ classId, assignmentId: assignment.assignmentId }).toString())
  const row = overview.rows.find(item => item.studentId === pupil.studentId)
  expect(row.items.map(item => item.status)).toEqual(['submitted', 'submitted', 'not_started'])
  expect(row.items[0].screening.explicitAnswer).toBe('11')

  await student.getByRole('link', { name: 'Startsida', exact: true }).click()
  await expect(student.getByRole('button', { name: 'Screening – backa', exact: true })).toHaveCount(0)
  await context.close()
})

for (const device of ['desktop', 'tablet']) {
  test(`A pupil can change answers and notebook after going back two questions (${device})`, async ({ page, request, browser }) => {
    const { pupil } = await assignThree(page, request, device === 'tablet' ? 'Back Edit Tablet' : 'Back Edit')
    const context = device === 'tablet'
      ? await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true }) : null
    const student = context ? await context.newPage() : page
    await login(student, pupil)
    await student.getByRole('button', { name: 'Screening – backa', exact: true }).click()
    const answer = student.locator('#diagnostic-answer')
    const cell = student.locator('input[data-cell="0:0"]')
    const tap = locator => device === 'tablet' ? locator.tap() : locator.click()
    for (const digit of ['1', '2', '3']) {
      await tap(cell)
      await student.getByRole('button', { name: `Skriv ${digit}`, exact: true }).click()
      await tap(answer)
      await student.getByRole('button', { name: `Skriv ${digit}`, exact: true }).click()
      await expect(answer).toHaveValue(digit)
      if (digit !== '3') await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
    }
    const back = student.getByRole('button', { name: '← Förra frågan', exact: true })
    await back.click()
    await expect(answer).toHaveValue('2')
    await back.click()
    await expect(answer).toHaveValue('1')
    await tap(answer)
    await student.getByRole('button', { name: 'Skriv 9', exact: true }).click()
    await expect(answer).toHaveValue('19')
    await tap(cell)
    await student.getByRole('button', { name: 'Skriv 7', exact: true }).click()
    await expect(cell).toHaveAttribute('aria-label', /stor siffra 7/)
    await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
    await student.reload()
    await expect(answer).toHaveValue('19')
    await expect(cell).toHaveAttribute('aria-label', /stor siffra 7/)
    await context?.close()
  })
}
