// Assignments activated for a class or a group reach every pupil in it, several
// can be active at once, and the teacher sees and ends them per class or group.
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

async function setup(request) {
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-t-${tag}`, name: `Mål ${tag}` }
  const inGroup = await createPupil(request, { name: `Grupp ${tag}`, classId: klass.id, className: klass.name })
  const outside = await createPupil(request, { name: `Utanför ${tag}`, classId: klass.id, className: klass.name })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  const group = (await (await request.post('/__robot/group', { data: {
    name: `Stöd ${tag}`, pupilIds: [inGroup.studentId], teacherIds: [teacher.username] } })).json()).group
  return { klass, inGroup, outside, teacher, group }
}

async function createPreset(page, label) {
  await page.getByRole('button', { name: label, exact: true }).click()
  const row = page.locator('[data-assignment-row]', { hasText: label.replace('Bara ', '') }).first()
  await expect(row).toBeVisible()
  return { row, title: (await row.locator('p.font-medium').innerText()).trim() }
}

async function pupilCards(browser, pupil) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, pupil)
  await page.waitForTimeout(800)
  const list = page.getByRole('button', { name: /^Visa mina uppdrag/ })
  if (await list.isVisible().catch(() => false)) await list.click()
  const text = await page.locator('[data-assignment-launch]').allInnerTexts()
  await context.close()
  return text.join(' | ')
}

test('Several assignments activated for a group reach its pupils only, and can be ended per group', async ({ browser, page, request }) => {
  const { inGroup, outside, teacher, group } = await setup(request)
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, `Grupp: ${group.name}`)
  await openTab(page, 'Uppdrag & tickets')
  const subtraction = await createPreset(page, 'Bara subtraktion')
  const addition = await createPreset(page, 'Bara addition')
  await subtraction.row.getByRole('button', { name: /^Aktivera/ }).click()
  await expect(subtraction.row.getByRole('button', { name: /^Avaktivera/ })).toBeVisible()
  await addition.row.getByRole('button', { name: /^Aktivera/ }).click()
  await expect(addition.row.getByRole('button', { name: /^Avaktivera/ })).toBeVisible()
  await expect(subtraction.row.getByRole('button', { name: /^Avaktivera/ })).toBeVisible()

  const groupCards = await pupilCards(browser, inGroup)
  expect(groupCards).toContain(subtraction.title)
  expect(groupCards).toContain(addition.title)
  const outsideCards = await pupilCards(browser, outside)
  expect(outsideCards).not.toContain(subtraction.title)

  await subtraction.row.getByRole('button', { name: /^Avaktivera/ }).click()
  await expect(subtraction.row.getByRole('button', { name: /^Aktivera/ })).toBeVisible()
  const after = await pupilCards(browser, inGroup)
  expect(after).not.toContain(subtraction.title)
  expect(after).toContain(addition.title)

  await page.reload()
  await openTab(page, 'Uppdrag & tickets')
  await expect(page.locator('[data-assignment-row]', { hasText: addition.title })
    .getByRole('button', { name: /^Avaktivera/ })).toBeVisible()
})

test('An assignment can be given to one pupil through the recipient picker', async ({ browser, page, request }) => {
  const { inGroup, outside, teacher } = await setup(request)
  await teacherLogin(page, teacher)
  await openTab(page, 'Uppdrag & tickets')
  const picker = page.locator('[data-recipient-picker]')
  // Pupils are named "Grupp <tag>" and "Utanför <tag>" in setup().
  await picker.getByRole('searchbox', { name: 'Sök elev' }).fill('Grupp')
  await picker.getByRole('button', { name: /^Lägg till Grupp/ }).first().click()
  await expect(picker.locator('[data-recipient-summary]')).toHaveText('1 elev totalt')
  const subtraction = await createPreset(page, 'Bara subtraktion')
  await subtraction.row.getByRole('button', { name: 'Aktivera', exact: true }).click()
  await expect(subtraction.row).toContainText('Aktiv i')
  expect(await pupilCards(browser, inGroup)).toContain(subtraction.title)
  expect(await pupilCards(browser, outside)).not.toContain(subtraction.title)
  await subtraction.row.getByRole('button', { name: 'Avaktivera', exact: true }).click()
  await expect(subtraction.row).toContainText('Inte aktiv')
  expect(await pupilCards(browser, inGroup)).not.toContain(subtraction.title)
})

test('An assignment activated for a class shows per class and starts for its pupils', async ({ browser, page, request }) => {
  const { klass, outside, teacher } = await setup(request)
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Uppdrag & tickets')
  const subtraction = await createPreset(page, 'Bara subtraktion')
  await subtraction.row.getByRole('button', { name: /^Aktivera/ }).click()
  await expect(subtraction.row).toContainText(`Aktiv i ${klass.name}`)
  const context = await browser.newContext()
  const pupilPage = await context.newPage()
  await login(pupilPage, outside)
  await pupilPage.getByRole('button', { name: `Starta nästa: ${subtraction.title}`, exact: true }).click()
  await pupilPage.waitForURL(/\/practice/)
  await context.close()
})
