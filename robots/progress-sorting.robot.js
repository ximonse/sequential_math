import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin, openTab, selectOnlyClass } from './lib/teacher.js'

test('Framsteg behåller elever och sortering under långsam bakgrundsuppdatering', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const klass = { id: `refresh-${tag}`, name: `Uppdatering ${tag}` }
  const pupil = await createPupil(request, { name: `Anna ${tag}`, classId: klass.id, className: klass.name })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  await page.clock.install({ time: new Date('2026-11-05T10:00:00+01:00') })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Framsteg')
  const panel = page.locator('#progress-panel-mastery')
  await expect(panel.getByRole('button', { name: pupil.loginCode, exact: true })).toBeVisible()
  await panel.getByRole('button', { name: /^Elev:/ }).click()
  let release
  const blocked = new Promise(resolve => { release = resolve })
  let started
  const requested = new Promise(resolve => { started = resolve })
  await page.route('**/api/students?*', async route => {
    if (new URL(route.request().url()).searchParams.has('classIds')) {
      started()
      await blocked
    }
    await route.continue()
  })
  try {
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await requested
    await expect(panel.getByRole('button', { name: pupil.loginCode, exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: /^Elev: övat mest/ })).toBeVisible()
    await expect(page.locator('[data-history-state]')).toContainText('Uppdaterar')
  } finally { release() }
  await expect(page.locator('[data-history-state]')).toHaveAttribute('data-history-state', 'ready')
  await expect(panel.getByRole('button', { name: pupil.loginCode, exact: true })).toBeVisible()
})

test('Nivåöversikt växlar Elev mellan namn, övning, snitt och total och behåller områdessortering', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const klass = { id: `level-sort-${tag}`, name: `Nivåsortering ${tag}` }
  const pupils = []
  for (const name of ['Anna', 'Bertil', 'Cecilia', 'Dani']) pupils.push(await createPupil(request, { name: `${name} ${tag}`, classId: klass.id, className: klass.name }))
  const levels = value => Object.fromEntries(['addition', 'subtraction', 'multiplication', 'division'].map(op => [op, value]))
  const evidence = [levels(2), levels(8), { ...levels(6), number_bonds: 12, doubles: 12 }, {}]
  await page.route('**/api/students?*', async route => {
    const response = await route.fetch()
    const data = await response.json()
    if (Array.isArray(data.profiles)) data.profiles = data.profiles.map(profile => {
      const index = pupils.findIndex(pupil => pupil.studentId === profile.studentId)
      return index < 0 ? profile : { ...profile, stats: { ...profile.stats, lifetimeProblems: [1000,30,40,0][index] },
        teacherSummary: { ...profile.teacherSummary, effectiveLevels: evidence[index] } }
    })
    await route.fulfill({ response, json: data })
  })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Framsteg')
  const panel = page.locator('#progress-panel-mastery')
  const names = () => panel.locator('tbody tr td:first-child button').allTextContents()
  const expected = indices => indices.map(index => pupils[index].loginCode)
  await expect.poll(names).toEqual(expected([0,1,2,3]))
  for (const [label, order] of [['övat mest',[0,2,1,3]], ['bäst snitt',[1,2,0,3]], ['mest totalt',[2,1,0,3]], ['namn',[0,1,2,3]]]) {
    await panel.getByRole('button', { name: /^Elev:/ }).click()
    await expect(panel.getByRole('button', { name: new RegExp(`^Elev: ${label}`) })).toBeVisible()
    await expect.poll(names).toEqual(expected(order))
    if (label === 'mest totalt') await panel.screenshot({ path: testInfo.outputPath('mastery-total-sort.png') })
  }
  await panel.getByRole('button', { name: '+', exact: true }).click()
  await expect.poll(names).toEqual(expected([1,2,0,3]))
  await panel.getByRole('button', { name: /^Elev:/ }).click()
  await expect.poll(names).toEqual(expected([0,1,2,3]))
})

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
