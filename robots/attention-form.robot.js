import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createAttentionAdmin, teacherLogin } from './lib/teacher.js'
import { attentionFixture, saveAttentionFixtures } from './lib/attention.js'

test('Dagsform, klass/egen referens, timschema och komplett filtrerad export med orörda matematikdata', async ({ page, request }, testInfo) => {
  const classId = `form-${Math.random().toString(36).slice(2, 8)}`
  const pupils = [], now = Date.now() - 180000
  for (let i = 0; i < 9; i++) {
    const pupil = await createPupil(request, { classId, className: 'Dagsform', operations: ['addition'] }); pupils.push(pupil)
    await login(page, pupil)
    const passes = [0, 1, 2, 3, 4, 5].flatMap(day => ['discover', 'choose', 'multi'].map(mode =>
      attentionFixture(`form-${i}-${day}-${mode}`, now - day * 86400000, mode, i === 0 ? 1600 : 400, mode === 'discover' && i === 0 ? 1.5 : 1)))
    expect(await saveAttentionFixtures(page, passes)).toMatchObject({ status: 200 })
  }
  const before = await Promise.all(pupils.map(pupil => readServerProfile(request, pupil.studentId)))
  await teacherLogin(page, await createAttentionAdmin(request, { classIds: [classId] }))
  await page.getByRole('button', { name: /^Fokusövningar/ }).click()
  const panel = page.getByRole('region', { name: 'Fokusövningar', exact: true })
  await expect(panel.getByRole('status')).toHaveText('9 av 9 elever hämtade')
  await panel.getByRole('button', { name: 'Dagsform', exact: true }).tap()
  await expect(panel.getByRole('region', { name: 'Dagsform för klassen' })).toContainText('Återkommande stor skillnad')
  await panel.getByRole('region', { name: 'Dagsform för klassen' }).screenshot({ path: testInfo.outputPath('attention-form-matrix.png') })
  await panel.getByRole('combobox', { name: 'Referens för dagsform' }).selectOption('own')
  await expect(panel.getByRole('region', { name: 'Dagsform för klassen' })).not.toContainText('Återkommande stor skillnad')
  await panel.getByRole('combobox', { name: 'Övning för fokusdiagram' }).selectOption('discover')
  await panel.getByRole('button', { name: 'Fyrfältare', exact: true }).press('Enter')
  await expect(panel.getByRole('img', { name: /Dagsform: svarshastighet/ })).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  await panel.screenshot({ path: testInfo.outputPath('attention-form-desktop.png') })
  await panel.getByRole('combobox', { name: 'Elev i fokusmodulen' }).selectOption(pupils[0].studentId)
  await panel.getByRole('button', { name: 'Veckomönster', exact: true }).tap()
  const week = panel.getByRole('region', { name: 'Elevens veckomönster' })
  await expect(week.getByRole('img')).toBeVisible()
  await expect(week.locator('text').filter({ hasText: /^23$/ })).toBeVisible()
  await week.getByRole('button').first().tap()
  await expect(week.getByRole('status')).toContainText('Klart')
  await page.setViewportSize({ width: 768, height: 1024 })
  await week.screenshot({ path: testInfo.outputPath('attention-week-tablet.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await panel.getByText('Exportera fokusdata', { exact: true }).click()
  await panel.getByRole('combobox', { name: 'Elev för fokusexport' }).selectOption(pupils[0].studentId)
  await panel.getByRole('combobox', { name: 'Aktivitet för fokusexport' }).selectOption('discover')
  const download = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Ladda ner fokusdata' }).click()
  const result = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'))
  expect(result.records).toHaveLength(6)
  expect(result.protocols['focus-targets-1'].stages).toHaveLength(3)
  expect(result.records[0].result.trials.length).toBeGreaterThan(0)
  for (let i = 0; i < pupils.length; i++) expect(await readServerProfile(request, pupils[i].studentId)).toEqual(before[i])
})

test('Påbörjat försök överlever omladdning och är exportbart utan att bli ett färdigt matematik- eller fokusresultat', async ({ page, request }) => {
  const classId = `partial-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId, operations: ['addition'] })
  const admin = await createAttentionAdmin(request, { classIds: [classId] })
  const { token } = await (await request.post('/api/teacher-login', { data: { username: admin.username, password: admin.password } })).json()
  const read = async () => (await request.get(`/api/teacher-attention?studentId=${pupil.studentId}`, { headers: { 'x-teacher-token': token } })).json()
  await page.clock.install(); await login(page, pupil)
  const before = await readServerProfile(request, pupil.studentId)
  await page.getByRole('button', { name: /^Fokuspunkten – 2 min/ }).tap()
  await page.getByRole('button', { name: /^1 - FOKUS/ }).tap()
  await page.clock.runFor(23400)
  await page.getByRole('button', { name: 'Starta passet', exact: true }).tap()
  for (let i = 0; i < 34; i++) {
    await page.clock.runFor(250)
    if (await page.getByTestId('focus-point').getAttribute('data-signal') === 'go') break
  }
  await page.touchscreen.tap(25, 400)
  await expect.poll(async () => (await read()).records[0]?.result.trials.length).toBe(1)
  await page.reload()
  await expect(page.getByText(`Hej ${pupil.loginCode}`)).toBeVisible()
  const archived = (await read()).records[0]
  expect(archived).toMatchObject({ final: false, result: { version: 3, completionReason: 'unfinished', aborted: true } })
  const after = await readServerProfile(request, pupil.studentId)
  expect(after.attentionHistory || []).toEqual([])
  expect(after.problemLog).toEqual(before.problemLog); expect(after.masteryFacts).toEqual(before.masteryFacts)
})
