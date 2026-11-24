// R3/R4: tapping an info icon shows the explanation and nothing else happens.
//
// Simon 2026-11-24 asked for an overlay on tap, because an iPad has no hover.
// A first version kept the hint open after a second tap (the emulated
// mouseenter left the hover state on) and placed the icon inside the Pausspel
// label, so tapping the overlay toggled the setting. This robot holds both.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

async function openAssignmentPanel(page, request) {
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-hint-${tag}`, name: `Hint ${tag}` }
  await createPupil(request, {
    name: `Elev ${tag}`, classId: klass.id, className: klass.name,
    operations: ['addition', 'subtraction', 'multiplication', 'division']
  })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Uppdrag & tickets')
}

test('tapping an info icon opens the explanation and tapping again closes it', async ({ page, request }) => {
  await openAssignmentPanel(page, request)

  const icon = page.getByRole('button', { name: 'Så funkar Arbetsytor' })
  const hint = page.getByRole('note')

  await icon.tap()
  await expect(hint).toBeVisible()
  await expect(hint).toContainText('Räknehäfte och rityta')

  await icon.tap()
  await expect(hint).toBeHidden()
})

test('tapping outside closes the explanation', async ({ page, request }) => {
  await openAssignmentPanel(page, request)

  await page.getByRole('button', { name: 'Så funkar Tabell' }).tap()
  await expect(page.getByRole('note')).toBeVisible()

  await page.getByRole('heading', { name: 'Uppdrag via länk' }).tap()
  await expect(page.getByRole('note')).toBeHidden()
})

test('reading the Pausspel explanation does not change the setting', async ({ page, request }) => {
  await openAssignmentPanel(page, request)

  const pauseGames = page.getByRole('checkbox', { name: /^Pausspel/ })
  await expect(pauseGames).not.toBeChecked()

  await page.getByRole('button', { name: 'Så funkar Pausspel' }).tap()
  const hint = page.getByRole('note')
  await expect(hint).toBeVisible()
  // Tapping the open overlay is how a reader dismisses or scrolls it.
  await hint.tap()
  await expect(pauseGames).not.toBeChecked()
})
