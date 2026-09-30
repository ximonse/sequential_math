import { test, expect } from '@playwright/test'

async function openAsRole(browser, role, path) {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true })
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

async function touchGesture(page, cell, drag = false) {
  const box = await cell.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const browser = await page.context().newCDPSession(page)
  await browser.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await page.waitForTimeout(550)
  if (drag) await browser.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 18, y, id: 1 }] })
  await browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await browser.detach()
}

test('NCM grid is admin-only and reversible with buttons, touch and right click', async ({ browser }) => {
  test.setTimeout(90 * 1000)
  const ordinary = await openAsRole(browser, 'teacher', '/teacher/ncm/diagnostic-grid')
  await expect(ordinary.page).toHaveURL(/\/teacher$/)
  await expect(ordinary.page.getByRole('button', { name: /NCM-diagnostik/ })).toHaveCount(0)
  await ordinary.context.close()

  for (const role of ['school_admin', 'super_admin']) {
    const { context, page } = await openAsRole(browser, role, '/teacher')
    await page.getByRole('button', { name: /NCM-diagnostik/ }).click()
    await expect(page.getByRole('button', { name: 'Öppna räknehäftet' })).toBeVisible()
    await page.getByRole('button', { name: 'Öppna räknehäftet' }).click()
    await expect(page).toHaveURL(/\/teacher\/ncm\/diagnostic-grid$/)
    const sectionColor = await page.locator('.diagnostic-prototype > section').first().evaluate(element => getComputedStyle(element).backgroundColor)
    expect(sectionColor).not.toBe('rgb(255, 255, 255)')

    const cell = page.locator('.diagnostic-cell').first()
    const input = cell.locator('input')
    await input.click()
    await input.press('8')
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText('8')
    await touchGesture(page, input)
    await expect(cell.locator('.diagnostic-cell__digit--note')).toHaveText('8')
    await input.press('2')
    await expect(cell.locator('.diagnostic-cell__digit--note')).toHaveText('82')
    await touchGesture(page, input, true)
    await expect(input).toHaveAttribute('aria-label', /struken/)
    await page.getByRole('button', { name: 'Stor (Esc)' }).click()
    await expect(cell.locator('.diagnostic-cell__digit--main')).toHaveText('82')
    await page.getByRole('button', { name: 'Ta bort lånestreck (X)' }).click()
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
