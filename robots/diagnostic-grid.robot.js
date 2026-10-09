import { test, expect } from '@playwright/test'

async function openAsRole(browser, role, path, viewport = { width: 820, height: 1180 }) {
  const context = await browser.newContext({ viewport, hasTouch: true })
  const page = await context.newPage()
  await page.goto('/')
  await page.evaluate(currentRole => {
    sessionStorage.setItem('mathapp_teacher_auth', '1')
    sessionStorage.setItem('mathapp_teacher_identity', JSON.stringify({
      teacherId: 'robot-admin', displayName: 'Robot', classIds: [], role: currentRole
    }))
  }, role)
  await page.goto(path)
  return { context, page }
}

async function touchGesture(page, cell, drag = false, dy = 0) {
  const box = await cell.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const browser = await page.context().newCDPSession(page)
  await browser.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await page.waitForTimeout(550)
  if (drag || dy) await browser.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (drag ? 18 : 0), y: y + dy, id: 1 }] })
  await browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await browser.detach()
}

async function dragBetweenCells(page, from, to, hold = false) {
  const start = await from.boundingBox()
  const end = await to.boundingBox()
  const point = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 })
  const browser = await page.context().newCDPSession(page)
  await browser.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(start)] })
  if (hold) await page.waitForTimeout(550)
  await browser.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(end)] })
  await browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await browser.detach()
}

test('NCM grid is admin-only and reversible with buttons, touch and right click', async ({ browser }) => {
  test.setTimeout(90 * 1000)
  const ordinary = await openAsRole(browser, 'teacher', '/teacher/ncm/diagnostic-grid')
  await expect(ordinary.page).toHaveURL(/\/teacher$/)
  await expect(ordinary.page.getByRole('button', { name: /Screening/ })).toHaveCount(0)
  await ordinary.context.close()

  for (const role of ['school_admin', 'super_admin']) {
    const { context, page } = await openAsRole(browser, role, '/teacher')
    await page.getByRole('button', { name: /Screening/ }).click()
    await expect(page.getByRole('button', { name: 'Öppna räknehäftet' })).toBeVisible()
    await page.getByRole('button', { name: 'Öppna räknehäftet' }).click()
    await expect(page).toHaveURL(/\/teacher\/ncm\/diagnostic-grid$/)
    await expect(page.locator('.notebook-debug')).toBeVisible()

    const cell = page.locator('.diagnostic-cell').first()
    const input = cell.locator('input')
    await expect(input).toHaveAttribute('inputmode', 'none')
    await input.click()
    await input.press('8')
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText('8')
    await touchGesture(page, input)
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText('8')
    await touchGesture(page, input, false, 20)
    await expect(cell.locator('.diagnostic-cell__digit--note')).toHaveText('8')
    await touchGesture(page, input, false, -20)
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText('8')
    await touchGesture(page, input, false, 20)
    await expect(input).toHaveAttribute('inputmode', 'none')
    await input.press('2')
    await expect(cell.locator('.diagnostic-cell__digit--note')).toHaveText('82')
    await touchGesture(page, input, true)
    await expect(input).toHaveAttribute('aria-label', /struken/)
    await page.getByRole('button', { name: 'Stor', exact: true }).click()
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText('82')
    await expect(input).toHaveAttribute('inputmode', 'none')
    await page.getByRole('button', { name: 'Låna', exact: true }).click()
    await expect(input).not.toHaveAttribute('aria-label', /struken/)
    await input.click({ button: 'right' })
    await expect(page.getByRole('group', { name: 'Ändra markerad siffra' })).toBeVisible()
    await page.getByRole('group', { name: 'Ändra markerad siffra' }).getByRole('button', { name: 'Minnessiffra' }).click()
    await expect(cell.locator('.diagnostic-cell__digit--note')).toHaveText('82')
    await page.getByRole('button', { name: 'Visa JSON' }).click()
    await page.getByRole('button', { name: 'Återläs JSON' }).click()
    await expect(cell.locator('.diagnostic-cell__digit--note')).toHaveText('82')
    await context.close()
  }
})

test('NCM grid lets an iPad user enter all four operation signs without changing the number keyboard', async ({ browser }) => {
  const { context, page } = await openAsRole(browser, 'school_admin', '/teacher/ncm/diagnostic-grid')
  const signs = ['+', '−', '×', '/']
  for (const [index, sign] of signs.entries()) {
    const cell = page.locator('.diagnostic-cell').nth(index)
    const input = cell.locator('input')
    await input.click()
    await expect(input).toHaveAttribute('inputmode', 'none')
    await page.getByRole('group', { name: 'Räknetecken' }).getByRole('button', { name: `Skriv ${sign}` }).click()
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText(sign)
  }
  await page.getByRole('button', { name: 'Visa JSON' }).click()
  await page.getByRole('button', { name: 'Återläs JSON' }).click()
  for (const [index, sign] of signs.entries()) {
    await expect(page.locator('.diagnostic-cell').nth(index).locator('.diagnostic-cell__digit--main')).toHaveText(sign)
  }
  await context.close()
})

test('Notebook touch draws from empty cells; symbols and every theme keep the geometry stable', async ({ browser }, testInfo) => {
  const { context, page } = await openAsRole(browser, 'school_admin', '/teacher/ncm/diagnostic-grid', { width: 1034, height: 930 })
  const cell = index => page.locator('.diagnostic-cell').nth(index).locator('input')
  await dragBetweenCells(page, cell(24), cell(29), true)
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(1)
  await cell(0).click()
  await page.getByRole('button', { name: 'Skriv 8', exact: true }).click()
  await page.getByRole('button', { name: 'Låna', exact: true }).click()
  await expect(cell(0)).toHaveAttribute('aria-label', /struken/)
  await expect(page.getByRole('button', { name: 'Streckläge' })).toHaveAttribute('aria-pressed', 'false')
  await cell(1).click()
  await page.getByRole('button', { name: /Fler tecken/ }).click()
  const before = await page.locator('.notebook-numbers').boundingBox()
  await page.getByRole('button', { name: 'Skriv %', exact: true }).click()
  await expect(cell(1)).toHaveAttribute('aria-label', /%/)
  await page.keyboard.press('Escape')
  expect((await page.locator('.notebook-numbers').boundingBox()).y).toBe(before.y)
  await cell(2).click()
  await cell(2).press('8')
  await page.getByRole('button', { name: 'Liten', exact: true }).click()
  await page.getByRole('button', { name: 'Låna', exact: true }).click()
  await expect(cell(2)).toHaveAttribute('aria-label', /minnessiffra 8, struken/)
  for (const theme of ['light', 'dark', 'dark-lime', 'psychedelic', 'real-psycadelic']) {
    await page.getByRole('combobox', { name: 'Välj tema' }).selectOption(theme)
    await expect(page.locator('body')).toHaveClass(new RegExp(`theme-${theme}`))
    await expect(page.locator('.diagnostic-cell__digit--main').first()).toHaveCSS('font-weight', '400')
    expect((await page.locator('.notebook-numbers').boundingBox()).y).toBe(before.y)
    await page.screenshot({ path: testInfo.outputPath(`notebook-${theme}.png`), fullPage: true })
  }
  await context.close()
})

test('NCM mobile grid stays close to the question and touch help does not shift the layout', async ({ browser }) => {
  const { context, page } = await openAsRole(browser, 'school_admin', '/teacher/ncm/diagnostic-grid',
    { width: 390, height: 844 })
  const question = await page.getByRole('heading', { name: '268 + 431' }).boundingBox()
  const grid = await page.getByRole('group', { name: 'Rutat räknehäfte' }).boundingBox()
  expect(grid.y - question.y - question.height).toBeLessThan(110)
  const before = await page.locator('.notebook-numbers').evaluate(element => element.getBoundingClientRect().top + window.scrollY)
  await page.getByRole('button', { name: 'Touchgenvägar' }).tap()
  await expect(page.getByRole('heading', { name: 'Touchgenvägar' })).toBeVisible()
  const after = await page.locator('.notebook-numbers').evaluate(element => element.getBoundingClientRect().top + window.scrollY)
  expect(after).toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Touchgenvägar' })).toHaveCount(0)
  await context.close()
})

test('NCM lines cross empty cells in both directions and keep cells writable', async ({ browser }) => {
  const { context, page } = await openAsRole(browser, 'school_admin', '/teacher/ncm/diagnostic-grid')
  const cell = (row, column) => page.locator('.diagnostic-cell').nth(row * 12 + column).locator('input')
  const lineButton = page.getByRole('button', { name: 'Streckläge' })
  await lineButton.click()
  await expect(lineButton).toHaveAttribute('aria-pressed', 'true')
  await dragBetweenCells(page, cell(0, 0), cell(0, 4))
  await dragBetweenCells(page, cell(1, 5), cell(3, 5))
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(2)
  await expect(page.locator('.diagnostic-grid__line').first()).toHaveAttribute('y1', '1')
  await expect(page.locator('.diagnostic-grid__line').first()).toHaveAttribute('y2', '1')
  await expect(page.locator('.diagnostic-grid__line').nth(1)).toHaveAttribute('x1', '6')
  await dragBetweenCells(page, cell(0, 3), cell(0, 1))
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(1)
  await dragBetweenCells(page, cell(0, 0), cell(0, 4))
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(2)
  expect(await page.evaluate(() => document.activeElement?.classList.contains('diagnostic-cell__input'))).toBe(false)
  await lineButton.click()
  await cell(1, 5).click()
  await cell(1, 5).press('8')
  await expect(page.locator('.diagnostic-cell').nth(17).locator('.diagnostic-cell__digit--main')).toHaveText('8')
  await page.getByRole('button', { name: 'Visa JSON' }).click()
  await page.getByRole('button', { name: 'Återläs JSON' }).click()
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(2)
  await page.getByRole('button', { name: 'Ta bort senaste streck' }).click()
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(1)

  await cell(4, 0).click()
  await page.getByRole('group', { name: 'Räknetecken' }).getByRole('button', { name: 'Skriv +' }).click()
  await dragBetweenCells(page, cell(4, 0), cell(4, 4), true)
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(2)
  for (const column of [0, 1, 2]) await cell(5, column).press('8')
  await page.getByRole('button', { name: 'Suddverktyg', exact: true }).click()
  await dragBetweenCells(page, cell(5, 0), cell(5, 2))
  for (const column of [0, 1, 2]) await expect(cell(5, column)).not.toHaveAttribute('aria-label', /stor siffra 8/)
  const vertical = await cell(1, 5).boundingBox()
  await cell(1, 5).tap({ position: { x: vertical.width - 1, y: vertical.height / 2 } })
  await expect(page.locator('.diagnostic-grid__line')).toHaveCount(1)
  await context.close()
})
