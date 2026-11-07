// Screening is one workspace; reading the results is its fourth tab (2026-11-07).
// These helpers open the creating flow or the results tab and return its panel.
import { expect } from '@playwright/test'
import { openTab } from './teacher.js'

// The question bank is folded under the teacher's own questions (2026-11-02).
export async function openQuestionBank(panel, group = '') {
  const bank = panel.locator('details[data-question-bank]')
  if (!await bank.evaluate(element => element.open)) await bank.locator('> summary').click()
  if (!group) return
  const pick = bank.getByText('Välj uppgifter en och en', { exact: true })
  if (!await pick.locator('xpath=..').evaluate(element => element.open)) await pick.click()
  const area = bank.locator('summary', { hasText: new RegExp(`^${group} · `) })
  if (!await area.locator('xpath=..').evaluate(element => element.open)) await area.click()
}

// Nothing is chosen in advance any more; most robots used to rely on the first
// bank task, so they still get it unless they ask for an empty screening.
export async function openDispatch(page, { startNew = true, withDefaultTask = true } = {}) {
  await openTab(page, 'Screening')
  const panel = page.getByRole('region', { name: 'Screening', exact: true })
  await expect(panel).toBeVisible()
  if (startNew) {
    const tab = panel.getByRole('tab', { name: 'Skapa ny', exact: true })
    await tab.click()
    if (!await panel.getByRole('button', { name: 'Välj mottagare', exact: true }).isVisible()) {
      // A handed-out screening shows its receipt; leaving it starts a new one.
      const close = panel.getByRole('button', { name: 'Till utdelade screeningar', exact: true })
      if (await close.isVisible()) { await close.click(); await tab.click() }
    }
    if (withDefaultTask) {
      await openQuestionBank(panel, 'Addition')
      await panel.getByRole('checkbox', { name: 'Räkna ut 268 + 431.', exact: true }).check()
    }
  }
  return panel
}

// Picks who to read results for in the results picker: a class, a pupil, or both.
export async function openResults(page, { className, pupilName, groupName } = {}) {
  await openTab(page, 'Screening')
  await page.getByRole('region', { name: 'Screening', exact: true }).getByRole('tab', { name: 'Resultat', exact: true }).click()
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
