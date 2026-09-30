import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, openTab, rowFor, selectOnlyClass, tableUnder, teacherLogin } from './lib/teacher.js'

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
  await expect(page.getByRole('button', { name: 'Visa tilltalsnamn' })).toBeVisible()
  expect(rowFor(await tableUnder(page, 'Klass/gruppvy'), pupil.loginCode)).not.toBeNull()

  await page.getByRole('button', { name: 'Visa tilltalsnamn' }).click()
  await expect(page.getByText('1 tilltalsnamn visas nu i dina lärarvyer.')).toBeVisible()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName)))
    .toBe(true)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportera nivåöversikt' }).click()
  ])
  const csv = Buffer.concat(await (await download.createReadStream()).toArray()).toString('utf8')
  expect(csv).toContain(pupil.loginCode)
  expect(csv).not.toContain(creationName)

  await openTab(page, 'Administration')
  await page.getByText('Elever och elevkort (1)').click()
  await expect(page.getByText(creationName, { exact: true }).first()).toBeVisible()
  await expect(page.getByText(pupil.loginCode, { exact: true })).toHaveCount(0)

  await page.reload()
  await expect.poll(async () => Boolean(rowFor(await tableUnder(page, 'Klass/gruppvy'), creationName)))
    .toBe(true)
})
