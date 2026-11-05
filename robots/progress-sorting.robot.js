import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin, openTab, selectOnlyClass } from './lib/teacher.js'

test('Klassurval: valda klasser är tydligt gröna och behålls när Framsteg öppnas', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const classes = ['A', 'B'].map(letter => ({ id: `sort-${tag}-${letter}`, name: `Sortklass ${letter} ${tag}` }))
  for (const klass of classes) await createPupil(request, { classId: klass.id, className: klass.name })
  const teacher = await createTeacher(request, { classIds: classes.map(klass => klass.id) })
  await teacherLogin(page, teacher)
  const panel = page.locator('.dashboard-class-filter')
  const first = panel.getByRole('button', { name: classes[0].name, exact: true })
  const second = panel.getByRole('button', { name: classes[1].name, exact: true })
  await first.click()
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(first).toHaveCSS('background-color', 'rgb(220, 252, 231)')
  await expect(second).not.toHaveCSS('background-color', 'rgb(220, 252, 231)')
  await second.click()
  await expect(second).toHaveCSS('background-color', 'rgb(220, 252, 231)')
  await openTab(page, 'Framsteg')
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await expect(second).toHaveAttribute('aria-pressed', 'true')
  for (const theme of ['light', 'dark', 'dark-lime', 'psychedelic', 'real-psycadelic']) {
    await page.getByLabel('Välj tema', { exact: true }).selectOption(theme)
    await expect(first).toHaveCSS('background-color', 'rgb(220, 252, 231)')
    await expect(first).toHaveCSS('color', 'rgb(20, 83, 45)')
    await panel.screenshot({ path: testInfo.outputPath(`selected-classes-${theme}.png`) })
  }
  await page.getByLabel('Aktivera hög kontrast', { exact: true }).check()
  await expect(first).toHaveCSS('background-color', 'rgb(220, 252, 231)')
  await page.getByLabel('Aktivera hög kontrast', { exact: true }).uncheck()
  await page.getByLabel('Välj tema', { exact: true }).selectOption('light')
  await first.click()
  await expect(first).toHaveAttribute('aria-pressed', 'false')
  await expect(first).not.toHaveCSS('background-color', 'rgb(220, 252, 231)')
  await expect(second).toHaveAttribute('aria-pressed', 'true')
  await panel.screenshot({ path: testInfo.outputPath('one-selected-class.png') })
})


test('Framsteg: Elev togglar namn, testade tabeller och starka resultat över många tabeller', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const klass = { id: `overview-sort-${tag}`, name: `Tabellsortering ${tag}` }
  const pupils = []
  for (const name of ['Anna', 'Bertil', 'Cecilia', 'Dani']) pupils.push(await createPupil(request, {
    name: `${name} ${tag}`, classId: klass.id, className: klass.name, operations: ['multiplication']
  }))
  const make = (table, factors, seconds) => ({ table, factors, seconds })
  const fixture = await request.post('/__robot/seed-table-overview', { data: { students: [
    { studentId: pupils[0].studentId, tables: [make(4,1,0.2)] },
    { studentId: pupils[1].studentId, tables: [make(4,10,2), make(5,10,4)] },
    { studentId: pupils[2].studentId, tables: [4,5,6].map(table => make(table,10,2.8)) },
    { studentId: pupils[3].studentId, tables: [4,5,6,7].map(table => make(table,1,0.3)) }
  ] } })
  expect((await fixture.json()).ok).toBe(true)
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Framsteg')
  const panel = page.getByRole('region', { name: 'Tabellöversikt – hela klassen', exact: true })
  await expect(panel).toBeVisible()
  const table = panel.getByRole('table', { name: 'Tabellträning per elev och tabell', exact: true })
  const names = () => table.locator('tbody tr th button').allTextContents()
  await expect.poll(names).toEqual(pupils.map(pupil => pupil.loginCode))
  await table.getByRole('button', { name: /^Elev:/ }).click()
  await expect.poll(names).toEqual([3,2,1,0].map(i => pupils[i].loginCode))
  await expect(table.locator('tbody tr').first()).toContainText('4 testade')
  await table.getByRole('button', { name: /^Elev:/ }).click()
  await expect.poll(names).toEqual([2,1,3,0].map(i => pupils[i].loginCode))
  await expect(table.locator('tbody tr').first()).toContainText('3 snabba · 3 hela')
  await panel.getByLabel('Period för tabellöversikt', { exact: true }).selectOption('14')
  await expect(table.getByRole('button', { name: /^Elev: resultat/ })).toBeVisible()
  await expect.poll(names).toEqual([2,1,3,0].map(i => pupils[i].loginCode))
  await panel.screenshot({ path: testInfo.outputPath('overview-performance-sort.png') })
  await table.getByRole('button', { name: /^Elev:/ }).click()
  await expect.poll(names).toEqual(pupils.map(pupil => pupil.loginCode))
  await table.getByRole('button', { name: '4:an', exact: false }).first().click()
  await expect.poll(async () => (await names())[0]).toBe(pupils[0].loginCode)
  await table.getByRole('button', { name: /^Elev:/ }).click()
  await expect.poll(names).toEqual(pupils.map(pupil => pupil.loginCode))
})
