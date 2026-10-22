// Classes and groups open in one place with tabs. Ordinary teachers see the
// pupil and login tabs; administrators also get settings and dangerous actions.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, openClass, teacherLogin } from './lib/teacher.js'

test('A teacher sees pupils and cards per class and builds a group from the class tabs', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const klass = { id: `ws-${tag}`, name: `Flik ${tag}` }
  const pupil = await createPupil(request, { name: `Finns ${tag}`, classId: klass.id, className: klass.name })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  await teacherLogin(page, teacher)
  const panel = await openClass(page, klass.name)
  await expect(panel.getByRole('tab')).toHaveText(['Elever', 'Inloggning och kort'])
  await panel.getByRole('textbox', { name: 'Elevlista' }).fill(`Ny ${tag}`)
  // The robot server has no pilot enrollment, so new pupils are not created here.
  await expect(panel.getByRole('button', { name: `Lägg till elever i ${klass.name}`, exact: true })).toBeEnabled()
  await expect(panel.locator('[data-class-pupil]')).toHaveCount(1)
  await panel.getByRole('tab', { name: 'Inloggning och kort', exact: true }).click()
  await expect(panel.locator('[data-login-pupil]')).toHaveCount(1)
  await expect(panel.getByRole('button', { name: 'Nytt QR-kort / PIN', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '+ Ny grupp', exact: true }).click()
  const groupPanel = page.locator('[data-open-item]')
  await expect(groupPanel.getByRole('textbox', { name: 'Gruppnamn' })).toBeVisible()
  await expect(groupPanel.getByRole('checkbox', { name: `Finns ${tag}` })).toBeVisible()
  // Saving a group needs pupils on a school; robot classes have none, so the
  // group is made through the robot API and then opened in the view.
  await request.post('/__robot/group', { data: { name: `Grupp ${tag}`, pupilIds: [pupil.studentId], teacherIds: [teacher.username] } })
  await page.reload()
  await page.getByRole('button', { name: /^Administration Klasser/ }).click()
  const groupButton = page.getByRole('button', { name: new RegExp(`^Grupp ${tag} 1 elever`) })
  await expect(groupButton).toBeVisible()
  await groupButton.click()
  await groupPanel.getByRole('tab', { name: 'Farliga åtgärder', exact: true }).click()
  page.once('dialog', dialog => dialog.accept())
  await groupPanel.getByRole('button', { name: 'Ta bort grupp', exact: true }).click()
  await expect(groupButton).toHaveCount(0)
})

test('An administrator changes class settings and archives the class from its last tab', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 7)
  const klass = { id: `wsa-${tag}`, name: `Admin ${tag}` }
  await createPupil(request, { name: `Elev ${tag}`, classId: klass.id, className: klass.name })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `ws-admin-${tag}`, classIds: [klass.id], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  const panel = await openClass(page, klass.name)
  await expect(panel.getByRole('tab')).toHaveText(['Elever', 'Inloggning och kort', 'Inställningar', 'Farliga åtgärder'])
  await panel.getByRole('tab', { name: 'Farliga åtgärder', exact: true }).click()
  page.once('dialog', dialog => dialog.accept())
  await panel.getByRole('button', { name: 'Arkivera', exact: true }).click()
  await expect(page.getByText('✓ Klass arkiverad')).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`^Admin ${tag} `) })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Visa arkiverade klasser' }).check()
  await expect(page.getByRole('button', { name: new RegExp(`^Admin ${tag} .*arkiverad`) })).toBeVisible()
})
