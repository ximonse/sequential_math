// Screening has two workspaces: handing questions out and reading the results.
// These helpers open each one and return its panel.
import { expect } from '@playwright/test'
import { openTab } from './teacher.js'

export async function openDispatch(page, { startNew = true } = {}) {
  await openTab(page, 'Screening: dela ut')
  const panel = page.getByRole('region', { name: 'Dela ut screening', exact: true })
  await expect(panel).toBeVisible()
  if (startNew && !await panel.getByRole('button', { name: 'Välj mottagare', exact: true }).isVisible()) {
    const close = panel.getByRole('button', { name: 'Till utdelade screeningar', exact: true })
    if (await close.isVisible()) await close.click()
    const start = panel.getByRole('button', { name: 'Dela ut screening', exact: true })
    if (await start.isVisible()) await start.click()
    await panel.getByRole('button', { name: 'Skapa ny', exact: false }).click()
  }
  return panel
}

// Picks who to read results for in the results picker: a class, a pupil, or both.
export async function openResults(page, { className, pupilName, groupName } = {}) {
  await openTab(page, 'Screening: resultat')
  const picker = page.locator('[data-recipient-picker]')
  if (className) await picker.getByRole('button', { name: className, exact: true }).click()
  if (groupName) await picker.getByRole('button', { name: `Grupp: ${groupName}`, exact: true }).click()
  if (pupilName) {
    await picker.getByRole('searchbox', { name: 'Sök elev' }).fill(pupilName)
    await picker.getByRole('button', { name: `Lägg till ${pupilName}`, exact: true }).click()
  }
  const panel = page.getByRole('region', { name: 'Resultat av screening', exact: true })
  await expect(panel).toBeVisible()
  return panel
}

export const collectionSelect = panel => panel.getByRole('combobox', { name: 'Samling att gå igenom', exact: true })
export const reviewOf = panel => panel.getByRole('region', { name: 'Genomgång av samling', exact: true })
