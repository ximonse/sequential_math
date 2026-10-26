import { test, expect } from '@playwright/test'
import { createPupil, login, readServerProfile } from './lib/app.js'
import { teacherLogin, sendScreening } from './lib/teacher.js'
import { collectionSelect, openDispatch, openResults, reviewOf } from './lib/screening.js'

test('Authored fraction shortcuts and frac notation agree in preview, pupil and teacher review', async ({ page, request, browser }, testInfo) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classId = `fractions-${tag}`
  const pupil = await createPupil(request, { name: 'Fraction Pupil', classId })
  const teacher = await (await request.post('/__robot/teacher', { data: {
    id: `fractions-admin-${tag}`, classIds: [classId], role: 'super_admin'
  } })).json()
  await teacherLogin(page, teacher)
  const panel = await openDispatch(page)
  await panel.getByRole('textbox', { name: 'Samlingens namn', exact: true }).fill('Bråknotation')
  await panel.getByText('Välj uppgifter en och en', { exact: true }).click()
  for (const choice of await panel.locator('fieldset').first().getByRole('checkbox').all()) await choice.uncheck()
  await panel.getByText('Lägg till egen skrivfråga', { exact: true }).click()
  const source = 'Jämför 6//2 och \\frac{3}{4}. Förklara. Vanlig division: 6/2.'
  await panel.getByRole('textbox', { name: 'Frågetext', exact: true }).fill(source)
  const preview = panel.getByRole('region', { name: 'Förhandsvisning av frågan' })
  await expect(preview.getByRole('math')).toHaveCount(2)
  await expect(preview.getByRole('math', { name: '6 genom 2', exact: true })).toBeVisible()
  await expect(preview.getByRole('math', { name: '3 genom 4', exact: true })).toBeVisible()
  await expect(preview).toContainText('Vanlig division: 6/2.')
  await expect(panel.getByRole('textbox', { name: 'Frågetext', exact: true })).toHaveValue(source)
  await page.screenshot({ path: testInfo.outputPath('fraction-preview.png'), fullPage: true })
  await sendScreening(page, { pupilName: 'Fraction Pupil' })

  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
  const student = await context.newPage()
  await login(student, pupil)
  await student.getByRole('button', { name: 'Bråknotation', exact: true }).click()
  const question = student.locator('.notebook-question')
  await expect(question.getByRole('math')).toHaveCount(2)
  const numerator = question.locator('.question-fraction__numerator').first()
  const denominator = question.locator('.question-fraction__denominator').first()
  expect((await numerator.boundingBox()).y).toBeLessThan((await denominator.boundingBox()).y)
  await expect(numerator).toHaveCSS('border-bottom-style', 'solid')
  await expect(question).toContainText('Vanlig division: 6/2.')
  for (const theme of ['light', 'dark']) {
    await student.getByRole('combobox', { name: 'Välj tema' }).selectOption(theme)
    await student.screenshot({ path: testInfo.outputPath(`fraction-pupil-${theme}.png`), fullPage: true })
  }
  await student.locator('#diagnostic-answer').fill('Det första bråket är störst.')
  await expect(student.getByText('Alla skickade ändringar är sparade på servern.')).toBeVisible()
  await student.reload()
  await expect(question.getByRole('math')).toHaveCount(2)
  await expect(student.getByRole('button', { name: 'Nästa fråga', exact: true })).toHaveCount(0)
  await student.getByRole('button', { name: 'Lämna in', exact: true }).click()
  await expect(student).toHaveURL(new RegExp(`/student/${pupil.studentId}$`))

  const results = await openResults(page, { pupilName: 'Fraction Pupil' })
  await results.getByText('Sparade försök för en elev', { exact: true }).click()
  await results.getByRole('combobox', { name: 'Elev', exact: true }).selectOption({ label: 'Fraction Pupil' })
  await results.getByRole('button', { name: 'Uppdatera försök', exact: true }).click()
  await results.getByRole('button', { name: 'Visa underlag', exact: true }).click()
  const evidence = results.getByRole('region', { name: 'Diagnostiskt elevunderlag' })
  await expect(evidence.getByRole('heading').getByRole('math')).toHaveCount(2)
  // Rendering never rewrites the stored task or creates ordinary mastery facts.
  const savedSource = await page.evaluate(async id => {
    const response = await fetch(`/api/teacher-diagnostic-assignments?classId=${encodeURIComponent(id)}`, {
      headers: { 'x-teacher-token': sessionStorage.getItem('mathapp_teacher_api_token') }
    })
    if (!response.ok) throw new Error(`Cannot read assignments: ${response.status}`)
    return JSON.stringify(await response.json())
  }, classId)
  expect(savedSource).toContain(JSON.stringify(source).slice(1, -1))
  await collectionSelect(results).selectOption({ index: 1 })
  const review = reviewOf(results)
  await expect(review.locator('thead').getByRole('math')).toHaveCount(2)
  const answer = review.getByRole('button', { name: /Jämför 6\/\/2/ })
  await answer.hover()
  await expect(page.getByRole('tooltip').getByRole('math')).toHaveCount(2)
  await answer.click()
  await expect(page.getByRole('dialog', { name: 'Elevgenomgång' }).getByRole('heading').getByRole('math')).toHaveCount(2)
  await page.screenshot({ path: testInfo.outputPath('fraction-teacher-review.png'), fullPage: true })
  const profile = await readServerProfile(request, pupil.studentId)
  expect(profile.problemLog).toEqual([])
  await context.close()
})
