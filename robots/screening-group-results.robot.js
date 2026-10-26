// A group with pupils from two classes gets one dispatch and its results are read
// in one table. Picking recipients for results never changes the next dispatch.
import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { collectionSelect, openDispatch, openResults, reviewOf } from './lib/screening.js'

test('A group across two classes is read as one table, and result picks stay out of the dispatch', async ({ page, request, browser }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const firstClass = `grp-a-${tag}`, secondClass = `grp-b-${tag}`
  const alma = await createPupil(request, { name: 'Group Alma', classId: firstClass, className: `Gruppklass A ${tag}` })
  const bo = await createPupil(request, { name: 'Group Bo', classId: secondClass, className: `Gruppklass B ${tag}` })
  const cleo = await createPupil(request, { name: 'Group Cleo', classId: firstClass, className: `Gruppklass A ${tag}` })
  const teacher = await createTeacher(request, { classIds: [firstClass, secondClass], role: 'super_admin' })
  const group = (await (await request.post('/__robot/group', { data: {
    name: `Tvåklassgrupp ${tag}`, pupilIds: [alma.studentId, bo.studentId], teacherIds: [teacher.username]
  } })).json()).group
  await teacherLogin(page, teacher)

  const panel = await openDispatch(page)
  await panel.getByRole('textbox', { name: 'Samlingens namn' }).fill('Gruppsamling')
  await page.locator('[data-recipient-picker]').getByRole('button', { name: `Grupp: ${group.name}`, exact: true }).click()
  await expect(page.locator('[data-screening-recipients]')).toContainText('2 screeningar, en per klass')
  await page.locator('[data-screening-recipients]').getByRole('button', { name: 'Ge till valda mottagare (2 screeningar)', exact: true }).click()
  await expect(panel.getByText(/^Screening skapad för /)).toBeVisible()
  await page.locator('[data-recipient-picker]').getByRole('button', { name: `Grupp: ${group.name}`, exact: true }).click()

  const contexts = []
  for (const pupil of [alma, bo]) {
    const context = await browser.newContext()
    contexts.push(context)
    const student = await context.newPage()
    await login(student, pupil)
    await student.getByRole('button', { name: 'Gruppsamling', exact: true }).click()
    await student.locator('input[data-cell="0:0"]').press('8')
    await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  }

  const results = await openResults(page, { groupName: group.name })
  await expect(collectionSelect(results).locator('option')).toHaveCount(2)
  await expect(collectionSelect(results).locator('option').nth(1)).toContainText(`Gruppklass A ${tag}, Gruppklass B ${tag}`)
  await collectionSelect(results).selectOption({ index: 1 })
  const review = reviewOf(results)
  const rows = review.getByRole('row')
  await expect(rows.filter({ hasText: 'Group Alma' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Group Bo' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Group Cleo' })).toHaveCount(0)
  await expect(rows.filter({ hasText: 'Group Bo' })).toContainText('Påbörjat')

  // A cell from the second class opens that pupil's own attempt.
  await review.getByRole('button', { name: /Group Bo,/ }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Elevgenomgång' })
  await expect(dialog.getByText('Group Bo').first()).toBeVisible()
  await expect(dialog.getByRole('gridcell', { name: /rad 1, kolumn 1, 8/ })).toBeVisible()
  await dialog.getByRole('button', { name: 'Stäng genomgång', exact: true }).click()

  // Results picks are separate: the dispatch still has no recipients, although the group was picked for results.
  await openDispatch(page)
  await expect(page.locator('[data-screening-recipients]')).toContainText('Välj klasser, grupper eller elever i rutan Mottagare överst.')
  await expect(page.locator('[data-recipient-picker]').getByRole('button', { name: `Grupp: ${group.name}`, exact: true })).toHaveAttribute('aria-pressed', 'false')
  for (const context of contexts) await context.close()
  void cleo
})
