import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin, sendScreening } from './lib/teacher.js'
import { openDispatch } from './lib/screening.js'

test('An admin assigns one diagnostic to the whole selected class and each pupil receives it', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `ncm-class-${tag}`
  const className = `Hela ${tag}`
  const first = await createPupil(request, { name: 'NCM class A', classId, className })
  const second = await createPupil(request, { name: 'NCM class B', classId, className })
  const outsider = await createPupil(request, { name: `Outside ${tag}`, classId: `outside-${tag}` })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `class-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  const panel = await openDispatch(page)
  await panel.getByRole('combobox', { name: 'Diagnospaket', exact: true }).selectOption('written-addition')
  await panel.getByText('Välj uppgifter en och en', { exact: true }).click()
  await expect(panel.locator('fieldset').first().getByRole('checkbox', { checked: true })).toHaveCount(6)
  await expect(panel.getByText(/Valda uppgifter: 6/)).toBeVisible()
  await sendScreening(page, { className })
  await expect(panel.getByText('Alla 2 elever har fått screeningen.', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('whole-class-assignment.png'), fullPage: true })
  for (const pupil of [first, second, outsider]) {
    const context = await browser.newContext()
    const student = await context.newPage()
    await login(student, pupil)
    const task = student.getByRole('button', { name: 'Screening', exact: true })
    if (pupil === outsider) await expect(task).toHaveCount(0)
    else {
      await expect(task).toBeVisible()
      await task.click()
      for (const [index, label] of ['Räkna ut 268 + 431.', 'Räkna ut 352 + 426.', 'Räkna ut 248 + 327.',
        'Räkna ut 283 + 462.', 'Räkna ut 357 + 268.', 'Räkna ut 587 + 246.'].entries()) {
        await expect(student.getByRole('heading', { name: label.replace(/^Räkna ut /u, '').replace(/\.$/u, ''), exact: true })).toBeVisible()
        if (index < 5) await student.getByRole('button', { name: 'Nästa fråga', exact: true }).click()
      }
      await expect(student.getByRole('button', { name: 'Nästa fråga', exact: true })).toHaveCount(0)
      await expect(student.getByRole('button', { name: 'Lämna in', exact: true })).toBeEnabled()
    }
    await context.close()
  }
})

test('An admin gives a screening to one pupil picked in the shared recipient picker', async ({ page, request, browser }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `ncm-pick-${tag}`
  const picked = await createPupil(request, { name: 'Recipient A', classId })
  const other = await createPupil(request, { name: 'Recipient B', classId })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `pick-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  await openDispatch(page)
  await sendScreening(page, { pupilName: 'Recipient A' })
  for (const [pupil, sees] of [[picked, true], [other, false]]) {
    const context = await browser.newContext()
    const student = await context.newPage()
    await login(student, pupil)
    await expect(student.getByRole('button', { name: 'Screening', exact: true })).toHaveCount(sees ? 1 : 0)
    await context.close()
  }
})
