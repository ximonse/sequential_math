import { test, expect } from '@playwright/test'
import { createPupil, readServerProfile } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'

test('Class detail shows current candidates separately from original error labels and keeps the source untouched', async ({ page, request }, testInfo) => {
  const classId = `shared-evidence-${Math.random().toString(36).slice(2, 8)}`
  const pupil = await createPupil(request, { classId })
  const seeded = await request.post('/__robot/seed-evidence-history', { data: { studentId: pupil.studentId } })
  expect((await seeded.json()).ok).toBe(true)
  const before = await readServerProfile(request, pupil.studentId)
  const teacher = await createTeacher(request, { classIds: [classId] })
  await teacherLogin(page, teacher)
  await page.getByRole('button', { name: /^Statistik & stöd/ }).click()
  await page.getByRole('button', { name: classId, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Felunderlag – klassöversikt', exact: true })).toBeVisible()
  const cell = page.getByRole('button', { name: /nivå 4, visa felunderlag/ })
  await expect(cell).toBeEnabled()
  await cell.click()
  const candidates = page.getByRole('region', { name: 'Aktuella modellkandidater', exact: true })
  await expect(candidates).toContainText('Större minus mindre i varje kolumn: 1 svar')
  await expect(candidates).not.toContainText('historic_first_match')
  await candidates.getByText('Källsvar och regelversion', { exact: true }).click()
  await expect(candidates).toContainText(`evidence-${pupil.studentId}`)
  await candidates.screenshot({ path: testInfo.outputPath('class-current-candidates.png') })
  await page.setViewportSize({ width: 768, height: 1024 })
  await candidates.screenshot({ path: testInfo.outputPath('class-current-candidates-portrait.png') })
  const after = await readServerProfile(request, pupil.studentId)
  expect(after.problemLog).toEqual(before.problemLog)
  expect(after.masteryFacts).toEqual(before.masteryFacts)
})
