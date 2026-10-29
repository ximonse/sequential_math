import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

for (const historyFails of [false, true]) test(`Class and group choices remain usable while pupil history ${historyFails ? 'fails' : 'is held'}, without duplicate startup or lost group selection`, async ({ page, request }, info) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `catalog-${tag}`, className = `Katalog ${tag}`, groupName = `Snabb grupp ${tag}`
  const pupil = await createPupil(request, { classId, className, name: `Catalog pupil ${tag}` })
  const teacher = await createTeacher(request, { classIds: [classId] })
  await request.post('/__robot/group', { data: { name: groupName, pupilIds: [pupil.studentId], teacherIds: [teacher.username] } })
  let release, historyRequests = 0, workspaceRequests = 0
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/api/students*', async route => {
    if (!new URL(route.request().url()).search) {
      historyRequests++; await held
      if (historyFails) return route.fulfill({ status: 503, json: { error: 'Synthetic unavailable history' } })
    }
    await route.continue()
  })
  page.on('request', request => { if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/teacher-workspace') workspaceRequests++ })
  try {
    await teacherLogin(page, teacher)
    const panel = page.locator('.dashboard-class-filter')
    await expect(panel.getByRole('button', { name: className, exact: true })).toBeVisible({ timeout: 3000 })
    const group = panel.getByRole('button', { name: `Grupp: ${groupName}`, exact: true })
    await expect(group).toBeVisible()
    await group.click()
    await expect(group).toHaveClass(/bg-blue-600/)
    expect(historyRequests).toBe(1)
    // An explicit group change during slow history must still trigger a fresh
    // catalog read; deduplicating it into the older load would lose the change.
    const addedGroup = `Tillagd grupp ${tag}`
    await request.post('/__robot/group', { data: { name: addedGroup, pupilIds: [pupil.studentId], teacherIds: [teacher.username] } })
    await page.evaluate(() => window.dispatchEvent(new Event('teacher-groups-updated')))
    await expect(panel.getByRole('button', { name: `Grupp: ${addedGroup}`, exact: true })).toBeVisible()
    release()
    await expect(panel).toContainText(`${historyFails ? 0 : 1} elever`, { timeout: 10000 })
    await expect(group).toHaveClass(/bg-blue-600/)
    await expect.poll(() => historyRequests).toBe(2)
    expect(workspaceRequests).toBe(1)
    await page.screenshot({ path: info.outputPath('catalog-landscape.png'), fullPage: true })
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.screenshot({ path: info.outputPath('catalog-portrait.png'), fullPage: true })
  } finally { release() }
})
