import { it, expect } from 'vitest'
import { chromium } from '@playwright/test'
import { mkdtemp, copyFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMapServer } from './project-map-server.mjs'
import { loadPlan } from './project-map-store.mjs'

it('creates an idea only on Save, preserves drafts and reloads saved text/tasks/area', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'project-map-ui-'))
  const path = join(directory, 'plan.json')
  await copyFile('docs/screening-map/plan.json', path)
  const first = await loadPlan(path)
  const server = createMapServer(path)
  let browser
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } })
    page.setDefaultTimeout(5000)
    await page.goto(`http://127.0.0.1:${server.address().port}/screening-map.html`)
    await page.getByRole('button', { name: 'Nytt kort / idé', exact: true }).click()
    await page.getByLabel('Rubrik', { exact: true }).fill('Ny idé – åäö')
    await page.getByLabel('Område', { exact: true }).fill('Testområde')
    const text = 'Tydlig fritext med <taggar>.\nAndra raden.'
    await page.getByLabel('Idé / beskrivning', { exact: true }).fill(text)
    await page.getByLabel('Ny deluppgift', { exact: true }).fill('En första uppgift')
    await page.getByRole('button', { name: 'Lägg till', exact: true }).click()
    expect((await loadPlan(path)).revision).toBe(first.revision)
    let warning = ''
    page.once('dialog', async dialog => { warning = dialog.message(); await dialog.dismiss() })
    await page.getByRole('button', { name: 'Stäng detaljer', exact: true }).click()
    expect(warning).toContain('osparade ändringar')
    expect(await page.getByLabel('Rubrik', { exact: true }).inputValue()).toBe('Ny idé – åäö')
    await page.getByRole('button', { name: 'Spara kort till planfil', exact: true }).click()
    await page.locator('#edit-state').filter({ hasText: 'Sparat i planfilen' }).waitFor()
    const saved = await loadPlan(path)
    expect(saved.plan.cards.slice(0, -1)).toEqual(first.plan.cards)
    expect(saved.plan.cards.at(-1)).toMatchObject({ title: 'Ny idé – åäö', area: 'Testområde', purpose: text,
      status: 'Föreslaget', tasks: [{ text: 'En första uppgift', done: false }] })
    await page.getByRole('button', { name: 'Spara kort till planfil', exact: true }).click()
    await page.locator('#edit-state').filter({ hasText: 'Sparat i planfilen' }).waitFor()
    expect((await loadPlan(path)).plan.cards).toHaveLength(first.plan.cards.length + 1)
    await page.getByRole('button', { name: 'Stäng detaljer', exact: true }).click()
    await page.getByLabel('Filtrera område', { exact: true }).selectOption('Testområde')
    expect(await page.locator('#count').textContent()).toBe(`1 av ${first.plan.cards.length + 1} kort`)
    await page.reload()
    await page.getByRole('button').filter({ hasText: 'Ny idé – åäö' }).click()
    expect(await page.getByLabel('Rubrik', { exact: true }).inputValue()).toBe('Ny idé – åäö')
    await page.getByText('Redigera text och anteckningar', { exact: true }).click()
    expect(await page.locator('textarea[name="purpose"]').inputValue()).toBe(text)
    expect(await page.getByRole('checkbox', { name: 'En första uppgift', exact: true }).isChecked()).toBe(false)
    await mkdir('test-results', { recursive: true })
    await page.screenshot({ path: 'test-results/project-map-new-card.png' })
  } finally {
    await browser?.close()
    await new Promise(resolve => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
}, 30000)
