// Every kind of practice question uses one layout (Simon 2026-11-07): the answer
// is right of the question on iPad and below it on a phone, the pupil never has to
// scroll to answer, and answering never moves the keypad (R3).
import { test, expect } from '@playwright/test'
import { createPupil, fillAnswer, login, readState, submit } from './lib/app.js'

const MODES = ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'percentage', 'algebra_evaluate', 'algebra_simplify', 'arithmetic_expressions']
const DEVICES = [
  { name: 'mobil', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, answerBeside: false },
  { name: 'liten mobil', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, answerBeside: false },
  { name: 'iPad', viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, answerBeside: true }
]

const measure = page => page.evaluate(() => {
  const input = document.querySelector('input[placeholder="?"]')
  const card = document.querySelector('.practice-layout__question .rounded-2xl')
  const key = [...document.querySelectorAll('.practice-layout__keypad button')].find(button => button.textContent.trim() === '1')
  const primary = [...document.querySelectorAll('.practice-layout__keypad button')].find(button => /^(Svara|Nästa)$/u.test(button.textContent.trim()))
  const status = document.querySelector('.practice-layout__status')
  const rect = element => element?.getBoundingClientRect()
  return { inputMode: input?.getAttribute('inputmode'), input: rect(input)?.toJSON(), card: rect(card)?.toJSON(), keyTop: Math.round(rect(key).top + scrollY),
    primaryBottom: Math.round(rect(primary).bottom + scrollY), statusBottom: Math.round(rect(status).bottom + scrollY), viewport: innerHeight }
})

for (const device of DEVICES) {
  test(`${device.name}: every question type keeps one layout without scrolling`, async ({ browser, request }, info) => {
    test.setTimeout(180000)
    const { name, answerBeside, ...options } = device
    const page = await (await browser.newContext(options)).newPage()
    const pupil = await createPupil(request, { operations: MODES })
    await login(page, pupil)
    const problems = []
    for (const mode of MODES) {
      await page.goto(`/student/${pupil.studentId}/practice?mode=${mode}`)
      await expect.poll(async () => (await readState(page)).phase).toBe('answering')
      const state = await readState(page)
      const before = await measure(page)
      if (before.primaryBottom > before.viewport) problems.push(`${mode}: Svara ligger ${before.primaryBottom - before.viewport} px under skärmen`)
      // Touch screens use the app's own keys; the device keyboard must not cover them.
      if (before.inputMode !== 'none') problems.push(`${mode}: skärmtangentbordet kan komma fram (inputmode ${before.inputMode})`)
      const beside = before.input.left >= before.card.right - 1
      if (beside !== answerBeside) problems.push(`${mode}: svaret ligger ${beside ? 'bredvid' : 'under'} frågan`)
      await page.screenshot({ path: info.outputPath(`${name}-${mode}.png`) })
      await fillAnswer(page, state.problem?.type === 'fraction' ? '1/9' : '7')
      await submit(page)
      await expect.poll(async () => (await readState(page)).phase).toBe('feedback')
      const after = await measure(page)
      if (after.keyTop !== before.keyTop) problems.push(`${mode}: knappsatsen flyttade sig ${after.keyTop - before.keyTop} px efter svaret`)
      if (after.statusBottom > after.viewport) problems.push(`${mode}: återkopplingen syns inte utan att skrolla`)
    }
    expect(problems).toEqual([])
  })
}
