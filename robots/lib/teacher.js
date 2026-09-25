// Teacher helpers: log in, pick class and tab, read a table by its heading.
import { expect } from '@playwright/test'

export async function createTeacher(request, { classIds }) {
  const id = `larare-${Math.random().toString(36).slice(2, 8)}`
  const response = await request.post('/__robot/teacher', { data: { id, classIds } })
  return response.json()
}

export async function teacherLogin(page, teacher) {
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
