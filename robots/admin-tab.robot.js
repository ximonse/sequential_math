// Administration lives in one place: the tab in the teacher view. Old links to
// /teacher/admin open that tab, and classes saved without a school are shown
// to the super admin so they can be moved to a school.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { teacherLogin } from './lib/teacher.js'

test('The old admin link opens the Administration tab and shows classes without a school', async ({ page, request }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `no-school-${tag}`
  await createPupil(request, { name: `Skollös ${tag}`, classId, className: `Skollös ${tag}` })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `admin-tab-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  await expect(page.getByRole('banner').getByRole('button', { name: 'Administration', exact: true })).toHaveCount(0)
  await page.goto('/teacher/admin')
  await page.waitForURL(/\/teacher$/)
  await expect(page.getByRole('button', { name: /^Administration Klasser/ })).toHaveClass(/font-semibold/)
  const withoutSchool = page.locator('[data-classes-without-school]')
  await expect(withoutSchool).toBeVisible()
  await expect(withoutSchool.getByRole('button', { name: new RegExp(`^Skollös ${tag}`) })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lärarkonton' })).toHaveCount(0)
  await page.locator('#teacher-password-reset-section').scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('4-aldre-inloggningar.png'), fullPage: true })
})
