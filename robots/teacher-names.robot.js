import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, openClass, rowFor, selectOnlyClass, tableUnder, teacherLogin } from './lib/teacher.js'

test('A teacher reveals private pupil names throughout their menus', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const classId = `name-class-${tag}`
  const className = `Robotklass ${tag}`
  const creationName = `Alva ${tag}`
  const pupil = await createPupil(request, {
    name: `Blå Bok Räv ${tag}`,
    creationName,
    classId,
    className,
    operations: ['addition']
  })
  const teacher = await createTeacher(request, { classIds: [classId] })

  await teacherLogin(page, teacher)
  await selectOnlyClass(page, className)
  // Names show on their own: no button has to be pressed first.
  await expect(page.getByRole('button', { name: 'Byt till kodnamn' })).toBeVisible()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName)))
    .toBe(true)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportera nivåöversikt' }).click()
  ])
  const csv = Buffer.concat(await (await download.createReadStream()).toArray()).toString('utf8')
  expect(csv).toContain(pupil.loginCode)
  expect(csv).not.toContain(creationName)

  const classPanel = await openClass(page, className)
  await expect(classPanel.getByText(creationName, { exact: true }).first()).toBeVisible()
  await expect(page.getByText(pupil.loginCode, { exact: true })).toHaveCount(0)

  await page.reload()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName)))
    .toBe(true)

  // Switching back shows code names again, and the choice survives a reload.
  await page.getByRole('button', { name: 'Byt till kodnamn' }).click()
  await page.getByRole('button', { name: /^Framsteg/ }).click()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), pupil.loginCode)))
    .toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Visa tilltalsnamn' })).toBeVisible()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), pupil.loginCode)))
    .toBe(true)
})
