import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin, openTab } from './lib/teacher.js'

test('An admin assigns one diagnostic to the whole selected class and each pupil receives it', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `ncm-class-${tag}`
  const first = await createPupil(request, { name: 'NCM class A', classId })
  const second = await createPupil(request, { name: 'NCM class B', classId })
  const outsider = await createPupil(request, { name: `Outside ${tag}`, classId: `outside-${tag}` })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `class-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  await openTab(page, 'NCM-diagnostik')
  const panel = page.getByRole('heading', { name: 'Testuppdrag till elev eller klass' }).locator('xpath=..')
  await panel.getByRole('combobox', { name: 'Klass', exact: true }).selectOption(classId)
  const publish = panel.getByRole('button', { name: 'Ge till hela klassen (2 elever)', exact: true })
  await expect(publish).toBeEnabled()
  await expect(panel.getByRole('combobox', { name: 'Elev', exact: true })).toHaveValue('')
  await publish.click()
  await expect(panel.getByText('Uppdraget är tilldelat hela klassen (2 elever).', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('whole-class-assignment.png'), fullPage: true })
  for (const pupil of [first, second, outsider]) {
    const context = await browser.newContext()
    const student = await context.newPage()
    await login(student, pupil)
    const task = student.getByRole('button', { name: 'Räkna ut 268 + 431.', exact: true })
    if (pupil === outsider) await expect(task).toHaveCount(0)
    else {
      await expect(task).toBeVisible()
      await task.click()
      await expect(student.getByRole('heading', { name: 'Räkna ut 268 + 431.', exact: true })).toBeVisible()
    }
    await context.close()
  }
})
