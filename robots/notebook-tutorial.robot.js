import { test, expect } from '@playwright/test'
import { createPupil, login } from './lib/app.js'
import { teacherLogin } from './lib/teacher.js'

test('The notebook guide shows on the first notebook, can be reopened with ?, and does not block work', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `guide-${tag}`
  const pupil = await createPupil(request, { name: 'Guide Pupil', classId })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `guide-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  await page.evaluate(async data => {
    const response = await fetch('/api/teacher-diagnostic-assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }, body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`Could not assign collection: ${response.status} ${await response.text()}`)
  }, { classId, studentIds: [pupil.studentId], titleSv: 'Screening – guide', taskIds: ['add-carry-001'] })

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  // A real pupil browser is not automated; let the first-time guide appear.
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Screening – guide', exact: true }).click()
  const guide = student.getByRole('dialog', { name: 'Skriv en siffra' })
  await expect(guide).toBeVisible()
  await student.waitForTimeout(2300)
  await student.screenshot({ path: testInfo.outputPath('guide-1-write.png') })
  const titles = ['Dra ett långt streck', 'Gör en minnessiffra', 'Stryk över när du lånar']
  for (const [index, title] of titles.entries()) {
    await student.getByRole('button', { name: 'Nästa', exact: true }).click()
    await expect(student.getByRole('dialog', { name: title })).toBeVisible()
    await student.waitForTimeout(1700)
    await student.screenshot({ path: testInfo.outputPath(`guide-${index + 2}.png`) })
  }
  await student.getByRole('button', { name: 'Börja räkna', exact: true }).click()
  await expect(student.getByRole('dialog')).toHaveCount(0)

  await student.locator('input[data-cell="0:0"]').tap()
  await student.getByRole('button', { name: 'Skriv 6', exact: true }).click()
  await expect(student.locator('input[data-cell="0:0"]')).toHaveAttribute('aria-label', /stor siffra 6/)
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await student.reload()
  await expect(student.locator('input[data-cell="0:0"]')).toHaveAttribute('aria-label', /stor siffra 6/)
  await expect(student.getByRole('dialog')).toHaveCount(0)

  await student.getByRole('button', { name: 'Visa hur räknehäftet fungerar', exact: true }).tap()
  await expect(student.getByRole('dialog', { name: 'Skriv en siffra' })).toBeVisible()
  await student.getByRole('button', { name: 'Steg 3: Gör en minnessiffra', exact: true }).tap()
  await expect(student.getByRole('dialog', { name: 'Gör en minnessiffra' })).toBeVisible()
  await student.keyboard.press('Escape')
  await expect(student.getByRole('dialog')).toHaveCount(0)
  await student.screenshot({ path: testInfo.outputPath('guide-button.png') })

  // Without motion each step shows what the gesture results in.
  await student.emulateMedia({ reducedMotion: 'reduce' })
  await student.getByRole('button', { name: 'Visa hur räknehäftet fungerar', exact: true }).tap()
  const demo = student.locator('.notebook-tutorial__card')
  for (const position of [1, 2, 3, 4]) {
    await student.getByRole('button', { name: new RegExp(`^Steg ${position}:`) }).tap()
    await demo.screenshot({ path: testInfo.outputPath(`guide-end-${position}.png`) })
  }
  await context.close()
})
