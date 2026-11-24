// R1: what the teacher ticks is what the assignment carries.
//
// The shared settings in "Uppdrag & tickets" (Arbetsytor, Pausspel) sit above
// every creator in the panel, so a teacher reads them as applying to all of
// them. Before 2026-11-24 a table assignment silently dropped Arbetsytor and
// "Skapa egna" silently dropped Pausspel. This robot keeps that from coming
// back: it ticks a setting, creates each kind, and reads what the row claims.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

async function setupClass(request) {
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-sc-${tag}`, name: `Täckning ${tag}` }
  await createPupil(request, {
    name: `Elev ${tag}`, classId: klass.id, className: klass.name,
    operations: ['addition', 'subtraction', 'multiplication', 'division']
  })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  return { klass, teacher }
}

async function openAssignmentPanel(page, teacher, klass) {
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Uppdrag & tickets')
}

// The newest assignment row, with the summary line the teacher reads.
function newestRow(page) {
  return page.locator('[data-assignment-row]').first()
}

test('a table assignment carries the workspaces the teacher ticked', async ({ page, request }) => {
  const { klass, teacher } = await setupClass(request)
  await openAssignmentPanel(page, teacher, klass)

  await page.getByRole('checkbox', { name: 'Räknehäfte', exact: true }).setChecked(true)
  await page.getByRole('checkbox', { name: 'Rityta', exact: true }).setChecked(false)
  await page.getByRole('button', { name: '7', exact: true }).click()
  await page.getByRole('button', { name: 'Skapa tabelluppdrag', exact: true }).click()
  await page.waitForTimeout(400)

  await expect(newestRow(page)).toContainText('Arbetsytor: räknehäfte')
})

test('a pause-game choice reaches an assignment made in Skapa egna', async ({ page, request }) => {
  const { klass, teacher } = await setupClass(request)
  await openAssignmentPanel(page, teacher, klass)

  await page.getByRole('checkbox', { name: /^Pausspel/ }).setChecked(true)
  await page.getByRole('button', { name: 'Skapa egna', exact: true }).click()
  const dialog = page.getByRole('dialog').or(page.locator('[data-math-practice-creator]')).first()
  await expect(dialog.getByRole('checkbox', { name: /Pausspel/ })).toBeChecked()
})
