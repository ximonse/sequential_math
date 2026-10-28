// Teacher helpers: log in, pick class and tab, read a table by its heading.
import { expect } from '@playwright/test'

export async function createTeacher(request, { classIds, role = 'teacher' }) {
  const id = `larare-${Math.random().toString(36).slice(2, 8)}`
  const response = await request.post('/__robot/teacher', { data: { id, classIds, role } })
  return response.json()
}

export async function createAttentionAdmin(request, { classIds }) {
  return { ...await createTeacher(request, { classIds, role: 'super_admin' }), attentionFixtureClassIds: classIds }
}

export async function teacherLogin(page, teacher) {
  if (teacher.attentionFixtureClassIds) {
    // Keep synthetic comparison cohorts independent of other parallel robot fixtures.
    // Production authorization and the real security robot still use unfiltered APIs.
    await page.route('**/api/students*', async route => {
      const response = await route.fetch()
      const data = await response.json()
      if (Array.isArray(data.profiles)) data.profiles = data.profiles.filter(profile =>
        [profile.classId, ...(profile.classIds || [])].some(id => teacher.attentionFixtureClassIds.includes(id)))
      await route.fulfill({ response, json: data })
    })
  }
  await page.goto('/teacher-login')
  await page.getByPlaceholder('t.ex. anna.larare').fill(teacher.username)
  await page.locator('input[type=password]').fill(teacher.password)
  await page.locator('button[type=submit]').click()
  await page.waitForURL(/\/teacher$/)
  await expect(page.getByText('Välj din klass eller grupp')).toBeVisible()
}

export async function openTab(page, label) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).first().click()
  await page.waitForTimeout(400)
}

// Opens a class under Administration and, optionally, one of its tabs.
export async function openClass(page, className, tab) {
  await page.getByRole('button', { name: /^Administration Klasser/ }).click()
  await page.getByRole('button', { name: new RegExp(`^${className} `) }).first().click()
  const panel = page.locator('[data-open-item]')
  if (tab) await panel.getByRole('tab', { name: tab, exact: true }).click()
  return panel
}

// Picks screening recipients in the shared picker and sends the screening.
export async function sendScreening(page, { className, pupilName, groupName }) {
  const panel = page.getByRole('region', { name: 'Dela ut screening', exact: true })
  await panel.getByRole('button', { name: 'Välj mottagare', exact: true }).click()
  const picker = panel.getByRole('region', { name: 'Mottagare', exact: true })
  const search = picker.getByRole('searchbox', { name: 'Sök klass, grupp eller elev' })
  const clear = picker.getByRole('button', { name: 'Rensa urval', exact: true })
  if (await clear.isEnabled()) await clear.click()
  if (className) {
    await search.fill(className)
    await picker.getByRole('checkbox', { name: `Klass: ${className}`, exact: true }).check()
  }
  if (groupName) {
    await search.fill(groupName)
    await picker.getByRole('checkbox', { name: `Grupp: ${groupName}`, exact: true }).check()
  }
  if (pupilName) {
    await search.fill(pupilName)
    await picker.getByRole('checkbox', { name: `Elev: ${pupilName}`, exact: true }).check()
  }
  await panel.getByRole('button', { name: 'Kontrollera utdelningen', exact: true }).click()
  const send = panel.getByRole('button', { name: /^Dela ut till \d+ elev(?:er)?$/u })
  await expect(send).toBeEnabled()
  await send.click()
  await expect(panel.getByText(/^(Alla \d+ elever|Eleven) har fått screeningen\.$/u)).toBeVisible()
}

export async function selectOnlyClass(page, className) {
  const panel = page.locator('section.dashboard-class-filter')
  await panel.getByRole('button', { name: 'Alla klasser', exact: true }).click()
  await panel.getByRole('button', { name: className, exact: true }).click()
  await page.waitForTimeout(500)
}

// Rows of the first table after a heading, as arrays of cell texts.
export async function tableUnder(page, heading) {
  return page.evaluate(title => {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(h => h.textContent.trim().startsWith(title))
    for (const h of headings) {
      let box = h.parentElement
      for (let depth = 0; box && depth < 5; depth++, box = box.parentElement) {
        const table = box.querySelector('table')
        if (table) {
          return [...table.querySelectorAll('tbody tr, tr')]
            .filter(tr => tr.querySelectorAll('td').length > 0)
            .map(tr => [...tr.querySelectorAll('td,th')].map(td => td.innerText.replace(/\s+/g, ' ').trim()))
        }
      }
    }
    return null
  }, heading)
}

export function rowFor(rows, name) {
  return (rows || []).find(cells => cells[0]?.startsWith(name)) || null
}

export async function sectionText(page, heading) {
  return page.evaluate(title => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(x => x.textContent.trim().startsWith(title))
    if (!h) return null
    const box = h.closest('section') || h.parentElement?.parentElement
    return box ? box.innerText : null
  }, heading)
}
