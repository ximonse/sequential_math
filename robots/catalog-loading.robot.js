import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
const isHistory = url => url.pathname === '/api/students' && !url.searchParams.has('resource')
for (const fails of [false, true]) test(`Catalog starts without history; selected group history ${fails ? 'fails and retries' : 'waits without invented results'}`, async ({ page, request }, info) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `catalog-${tag}`, className = `Katalog ${tag}`, groupName = `Grupp ${tag}`
  const pupil = await createPupil(request, { classId, className, name: `Elev ${tag}` })
  const teacher = await createTeacher(request, { classIds: [classId] })
  await request.post('/__robot/group', { data: { name: groupName, pupilIds: [pupil.studentId], teacherIds: [teacher.username] } })
  let release, historyRequests = 0, workspaceRequests = 0, failNext = fails
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/api/students*', async route => {
    if (isHistory(new URL(route.request().url()))) {
      historyRequests++; await held
      if (failNext) { failNext = false; return route.fulfill({ status: 503, json: { error: 'Synthetic unavailable history' } }) }
    }
    await route.continue()
  })
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/teacher-workspace' && request.method() === 'GET') workspaceRequests++ })
  try {
    await teacherLogin(page, teacher)
    const panel = page.locator('.dashboard-class-filter')
    await expect(panel.getByRole('button', { name: className, exact: true })).toBeVisible()
    await expect(page.locator('[data-history-state="idle"]')).toBeVisible()
    expect(historyRequests).toBe(0)
    const group = panel.getByRole('button', { name: `Grupp: ${groupName}`, exact: true })
    await group.click()
    await expect(page.locator('[data-history-state="loading"]')).toBeVisible()
    await expect(page.locator('.dashboard-class-stats')).toContainText('–')
    await expect(page.locator('[data-admin-panel="overview"] table')).toHaveCount(0)
    await expect(group).toHaveClass(/bg-blue-600/)
    await page.screenshot({ path: info.outputPath('catalog-waiting-landscape.png') })
    release()
    if (fails) {
      await expect(page.locator('[data-history-state="error"]')).toBeVisible()
      await expect(page.locator('.dashboard-class-stats')).toContainText('–')
      await page.getByRole('button', { name: 'Försök hämta resultaten igen', exact: true }).click()
    }
    await expect(page.locator('[data-history-state="ready"]')).toBeAttached()
    await expect(panel).toContainText('(1 elever)')
    await expect(page.locator('[data-admin-panel="overview"] table')).toBeVisible()
    expect(historyRequests).toBe(fails ? 2 : 1)
    expect(workspaceRequests).toBe(1)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.screenshot({ path: info.outputPath('catalog-ready-portrait.png') })
    await page.reload()
    await expect(group).toHaveClass(/bg-blue-600/)
    await expect(page.locator('[data-history-state="ready"]')).toBeAttached()
  } finally { release() }
})
test('A delayed old class response cannot replace the current class; refresh loads only the current choice', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const a = { id: `scope-a-${tag}`, name: `Klass A ${tag}` }, b = { id: `scope-b-${tag}`, name: `Klass B ${tag}` }
  await createPupil(request, { classId: a.id, className: a.name, name: 'Elev A' })
  const pupilB = await createPupil(request, { classId: b.id, className: b.name, name: 'Elev B' })
  const teacher = await createTeacher(request, { classIds: [a.id, b.id] })
  let release, holdA = true
  const held = new Promise(resolve => { release = resolve }), scopes = []
  await page.route('**/api/students*', async route => {
    const url = new URL(route.request().url())
    if (isHistory(url)) {
      scopes.push(url.searchParams.get('classIds'))
      if (holdA && url.searchParams.get('classIds')?.split(',').includes(a.id)) await held
    }
    await route.continue()
  })
  try {
    await teacherLogin(page, teacher)
    const panel = page.locator('.dashboard-class-filter')
    await panel.getByRole('button', { name: a.name, exact: true }).click()
    await expect(page.locator('[data-history-state="loading"]')).toBeVisible()
    await panel.getByRole('button', { name: a.name, exact: true }).click()
    await panel.getByRole('button', { name: b.name, exact: true }).click()
    await expect(page.locator('[data-history-state="ready"]')).toBeAttached()
    release(); holdA = false
    await expect(page.locator('[data-admin-panel="overview"]')).toContainText(pupilB.loginCode)
    const before = scopes.length
    await page.getByRole('button', { name: /Klicka för att hämta igen\./ }).click()
    await expect.poll(() => scopes.length).toBeGreaterThan(before)
    expect(scopes.slice(before)).toEqual([b.id])
    await expect(page.locator('[data-history-state="ready"]')).toBeAttached()
  } finally { release() }
})

test('Private-name and code-name search open the right pupil; the catalog preserves login metadata', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `search-${tag}`, className = `Sökklass ${tag}`
  const seeded = await request.post('/__robot/seed', { data: { classId, className, pupils: [`${tag} Kod Sök`], creationNames: [`Alva ${tag}`], lastLoginAt: Date.now() } })
  const pupil = (await seeded.json()).pupils[0]
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  const search = page.getByRole('searchbox', { name: 'Sök elev', exact: true })
  await search.fill(`Alva ${tag}`)
  await expect(page.getByRole('list', { name: 'Sökträffar' })).toContainText(`Alva ${tag}`)
  await search.press('Escape')
  await expect(search).toHaveValue('')
  // Refresh reads the warm metadata cache, including the recorded login.
  await page.getByRole('button', { name: /Klicka för att hämta igen\./ }).click()
  await page.getByRole('button', { name: /^Administration/ }).click()
  await search.fill(pupil.loginCode)
  await page.getByRole('list', { name: 'Sökträffar' }).getByRole('button').click()
  const row = page.locator(`[data-class-pupil="${pupil.studentId}"]`)
  await expect(row).toContainText(`Alva ${tag}`)
  await expect(row).toContainText('Har loggat in')
  await row.getByRole('button', { name: 'Öppna elevprofil', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/teacher/student/${pupil.studentId}$`))
  await expect(page.locator('[data-history-state="ready"]')).toBeAttached()
  await expect(page.getByRole('heading', { name: 'Elevprofil', exact: true }).first()).toBeVisible()
})

test('Choosing an assignment recipient does not select pupils for progress statistics', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 8), classId = `recipient-filter-${tag}`
  const pupil = await createPupil(request, { classId, name: `${tag} Recipient` })
  await teacherLogin(page, await createTeacher(request, { classIds: [classId] }))
  await page.getByRole('button', { name: /^Uppdrag & tickets/ }).click()
  const picker = page.getByRole('region', { name: 'Mottagare', exact: true })
  await picker.getByRole('searchbox').fill(pupil.loginCode)
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/students?classIds=') && response.url().includes(pupil.studentId)),
    picker.getByRole('button', { name: `Lägg till ${pupil.loginCode}`, exact: true }).click()
  ])
  await page.getByRole('button', { name: 'Framsteg', exact: true }).click()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.locator('[data-history-state="idle"]')).toBeVisible()
  await expect(page.locator('.dashboard-class-stats')).toContainText('–')
  await expect(page.locator('[data-admin-panel="overview"] table')).toHaveCount(0)
})
