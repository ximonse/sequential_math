// Robot 4: presses every button a pupil can reach and checks that it does
// exactly what it says: keys, delete, clear, keyboard, theme, log out.
import { test, expect } from '@playwright/test'
import { createPupil, goHomeFromPractice, login, openOtherTraining, readState, themeOf, waitForTask } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'

const AREAS = ['Addition', 'Bråk', 'Algebra (förenkla)', 'Algebra (räkna ut)', 'Procenträkning', 'Uttryck (prioriteringsregler)']

for (const label of AREAS) {
  test(`Knappar: varje knapp på sifferbordet i ${label}`, async ({ page, request }, testInfo) => {
    const findings = createFindings(testInfo)
    await login(page, await createPupil(request))
    await openOtherTraining(page)
    await page.getByRole('button', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) }).click()
    await waitForTask(page)
    const input = page.locator('input[placeholder="?"]')
    const value = async () => (await readState(page)).inputValue

    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await page.getByRole('button', { name: 'Rensa', exact: true }).click()
      await page.getByRole('button', { name: digit, exact: true }).click()
      if ((await value()) !== digit) findings.add('R3', `Siffran ${digit} registrerades inte`, { område: label, rutan: await value() })
    }
    await page.getByRole('button', { name: 'Rensa', exact: true }).click()
    for (const d of ['4', '2', '7']) await page.getByRole('button', { name: d, exact: true }).click()
    const eraseLabel = (await page.getByRole('button', { name: 'Radera', exact: true }).count()) > 0 ? 'Radera' : '⌫'
    await page.getByRole('button', { name: eraseLabel, exact: true }).click()
    if ((await value()) !== '42') findings.add('R3', `${eraseLabel} tog inte bort sista siffran`, { område: label, rutan: await value() })
    await page.getByRole('button', { name: 'Rensa', exact: true }).click()
    if ((await value()) !== '') findings.add('R3', 'Rensa tömde inte rutan', { område: label, rutan: await value() })
    if (await page.getByRole('button', { name: 'Svara', exact: true }).isEnabled()) findings.add('R3', 'Svara går att trycka på med tom ruta', { område: label })

    for (const d of ['1', '2']) await page.getByRole('button', { name: d, exact: true }).click()
    const typed = await value()
    const sign = page.getByRole('button', { name: '±', exact: true })
    if (await sign.count()) {
      await sign.click()
      if (!/^[-−]12$/.test(await value())) findings.add('R3', '± gjorde inte talet negativt', { område: label, rutan: await value() })
      await sign.click()
      if ((await value()) !== typed) findings.add('R3', '± två gånger gav inte tillbaka talet', { område: label, rutan: await value() })
    }
    const comma = page.getByRole('button', { name: ',', exact: true })
    if (await comma.count()) {
      await comma.click(); await page.getByRole('button', { name: '5', exact: true }).click()
      if ((await value()) !== '12,5') findings.add('R3', 'Kommatecknet fungerade inte', { område: label, rutan: await value() })
      await comma.click()
      if ((await value()).split(',').length > 2) findings.add('R3', 'Det gick att skriva två kommatecken', { område: label, rutan: await value() })
    }

    // Physical keyboard, the way a pupil with a laptop answers.
    await page.getByRole('button', { name: 'Rensa', exact: true }).click()
    await input.click()
    await page.keyboard.type('35')
    if ((await value()) !== '35') findings.add('R3', 'Skrivet på tangentbordet kom inte fram', { område: label, rutan: await value() })
    await page.keyboard.press('Backspace')
    if ((await value()) !== '3') findings.add('R3', 'Backsteg på tangentbordet fungerade inte', { område: label, rutan: await value() })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
    if ((await readState(page)).phase !== 'feedback') findings.add('R3', 'Enter skickade inte svaret', { område: label })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    const afterEnter = await readState(page)
    if (afterEnter.phase === 'feedback') findings.add('R3', 'Enter efter svar gick inte vidare till nästa uppgift', { område: label })

    // Two quick presses on Svara must count as one answer.
    await waitForTask(page)
    const beforeCount = (await page.locator('body').innerText()).match(/(\d+) denna session/)?.[1]
    await page.getByRole('button', { name: '9', exact: true }).click()
    const svara = page.getByRole('button', { name: 'Svara', exact: true })
    await svara.dblclick({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
    const afterCount = (await page.locator('body').innerText()).match(/(\d+) denna session/)?.[1]
    if (beforeCount && afterCount && Number(afterCount) - Number(beforeCount) > 1) findings.add('R3', 'Dubbeltryck på Svara räknades som två svar', { område: label, före: beforeCount, efter: afterCount })
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
  })
}

test('Tema: valt tema ligger kvar överallt', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const pupil = await createPupil(request)
  await page.goto('/')
  const picker = page.getByLabel('Välj tema')
  const options = await picker.locator('option').evaluateAll(list => list.map(o => o.value))
  const pick = options.at(-1)
  await picker.selectOption(pick)
  await page.getByLabel('Aktivera hög kontrast').check()
  const expected = await themeOf(page)
  const checkpoint = async where => {
    const now = await themeOf(page)
    if (now.theme !== expected.theme) findings.add('R2', `Temat ändrades: ${where}`, { valt: expected.theme, nu: now.theme })
    if (now.contrast !== expected.contrast) findings.add('R2', `Kontrasten ändrades: ${where}`, { valt: expected.contrast, nu: now.contrast })
  }
  await login(page, pupil); await checkpoint('efter inloggning')
  await page.reload(); await page.waitForTimeout(800); await checkpoint('efter omladdning på startsidan')
  await openOtherTraining(page)
  await page.getByRole('button', { name: /^Addition/ }).click(); await waitForTask(page); await checkpoint('i övningen')
  await answerTasks(page, findings, { count: 3, choice: { mode: 'addition', label: 'Addition' } }); await checkpoint('efter några svar')
  await page.reload(); await waitForTask(page); await checkpoint('efter omladdning i övningen')
  await goHomeFromPractice(page); await checkpoint('tillbaka på startsidan')
  await page.goto('/teacher-login'); await page.waitForTimeout(300)
  await page.goto(`/student/${pupil.studentId}`); await page.waitForTimeout(800); await checkpoint('efter en tur till lärarinloggningen')
  // Change the theme inside the app and make sure the new choice sticks.
  await page.getByLabel('Välj tema').selectOption(options[1])
  expected.theme = (await themeOf(page)).theme
  await page.reload(); await page.waitForTimeout(800); await checkpoint('efter byte på startsidan och omladdning')
  await page.getByRole('button', { name: 'Logga ut', exact: true }).click(); await page.waitForURL(u => !/\/student\//.test(u.pathname)); await checkpoint('efter utloggning')
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Inloggning: loggar ut när jag trycker, annars inte', async ({ page, request, context }, testInfo) => {
  const findings = createFindings(testInfo)
  const pupil = await createPupil(request)
  await login(page, pupil)
  const home = page.url()
  for (const [what, act] of [
    ['omladdning', async () => { await page.reload() }],
    ['ny flik', async () => { const tab = await context.newPage(); await tab.goto(home); await tab.waitForTimeout(1200); if (tab.url() !== home) findings.add('R2', 'Utloggad i en ny flik', { url: tab.url() }); await tab.close() }],
    ['en timmes paus', async () => { await page.clock.install(); await page.reload(); await page.clock.fastForward(60 * 60 * 1000) }],
    ['övning och tillbaka', async () => { await openOtherTraining(page); await page.getByRole('button', { name: /^Addition/ }).click(); await waitForTask(page); await goHomeFromPractice(page) }]
  ]) {
    await act()
    await page.waitForTimeout(1200)
    if (page.url() !== home) findings.add('R2', `Eleven loggades ut av sig själv (${what})`, { url: page.url() })
  }
  await page.getByRole('button', { name: 'Logga ut', exact: true }).click()
  await page.waitForTimeout(800)
  if (/\/student\//.test(page.url())) findings.add('R3', 'Logga ut loggade inte ut', { url: page.url() })
  await page.goBack(); await page.waitForTimeout(1500)
  if (new RegExp(`/student/${pupil.studentId}`).test(page.url()) && await page.getByText(`Hej ${pupil.loginCode}`).isVisible().catch(() => false)) findings.add('R3', 'Bakåtknappen tog eleven in igen efter utloggning', { url: page.url() })
  await page.goto(home); await page.waitForTimeout(1500)
  if (await page.getByText(`Hej ${pupil.loginCode}`).isVisible().catch(() => false)) findings.add('R3', 'Elevsidan gick att öppna efter utloggning', { url: page.url() })
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})
