import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'
import { decodeAssignmentPayload } from '../src/lib/assignments.js'

test('an administrator can deactivate a pupil assignment outside their library without affecting the class', async ({ page, browser, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = 'recipient-scope-' + tag
  const className = 'Utdelning ' + tag
  const pupilName = 'Testelev ' + tag
  const title = 'Begrepp · Räknesättens språk'
  const pupil = await createPupil(request, { classId, className, name: pupilName, operations: ['addition'] })
  const teacher = await createTeacher(request, { classIds: [classId] })
  const admin = await createTeacher(request, { classIds: [classId], role: 'super_admin' })

  async function openRecipient(targetPage, account) {
    await teacherLogin(targetPage, account)
    await selectOnlyClass(targetPage, className)
    await openTab(targetPage, 'Uppdrag & tickets')
    const recipients = targetPage.getByRole('region', { name: 'Mottagare', exact: true })
    await recipients.getByRole('searchbox', { name: 'Sök elev' }).fill(pupilName)
    await recipients.getByRole('button', { name: 'Lägg till ' + pupilName }).click()
  }

  const adminContext = await browser.newContext()
  try {
    await openRecipient(page, teacher)
    await page.getByRole('button', { name: 'Skapa uppdrag: Räknesättens språk' }).click()
    const row = page.locator('[data-assignment-row]').filter({ hasText: title })
    await row.getByRole('button', { name: 'Aktivera', exact: true }).click()
    await expect(row.getByRole('button', { name: 'Avaktivera', exact: true })).toBeVisible()
    const directFromServer = async () => (await readServerProfile(request, pupil.studentId))?.activeAssignments
      ?.map(item => decodeAssignmentPayload(item.payload)?.title) || []
    await expect.poll(directFromServer).toContain(title)

    const adminPage = await adminContext.newPage()
    await openRecipient(adminPage, admin)
    await expect(adminPage.locator('[data-foreign-assignment-row]').filter({ hasText: className })).toContainText(title)
    const overview = adminPage.getByRole('region', { name: 'Aktivt för valda mottagare' })
    const deactivateFor = name => overview.getByRole('button', { name: 'Avaktivera ' + title + ' för ' + name, exact: true })
    const deactivateClass = deactivateFor(className)
    const deactivatePupil = deactivateFor(pupilName)
    await expect(deactivateClass).toBeVisible()
    await expect(deactivatePupil).toBeVisible()
    await overview.screenshot({ path: testInfo.outputPath('recipient-assignment-removal.png') })
    await deactivatePupil.click()
    await expect(deactivatePupil).toHaveCount(0)
    await expect(deactivateClass).toBeVisible()
    await expect.poll(directFromServer).toEqual([])

    const studentPage = await adminContext.newPage()
    await login(studentPage, pupil)
    await expect(studentPage.getByRole('region', { name: 'Mina uppdrag' })).toContainText(title)
  } finally {
    await adminContext.close()
  }
})
