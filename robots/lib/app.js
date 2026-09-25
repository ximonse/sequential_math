// Page helpers: log in, read the current task straight from the app, press
// the on-screen keys like a pupil and get past celebration/break screens.
import { expect } from '@playwright/test'

export async function createPupil(request, { operations, name, classId: sharedClassId, className } = {}) {
  const pupilName = name || `Robot ${Math.random().toString(36).slice(2, 8)}`
  const classId = sharedClassId || (operations ? `klass-${pupilName.replace(/\W+/g, '-').toLowerCase()}` : undefined)
  const response = await request.post('/__robot/seed', { data: { operations, classId, className, pupils: [pupilName] } })
  const data = await response.json()
  if (!data.ok) throw new Error(`Seed failed: ${JSON.stringify(data)}`)
  return data.pupils[0]
}

export async function readServerProfile(request, studentId) {
  const response = await request.post('/__robot/student', { data: { studentId } })
  return (await response.json()).profile
}

export async function login(page, pupil) {
  await page.goto('/')
  await page.getByPlaceholder(/Gul Fyr Katt/).fill(pupil.loginCode)
  await page.locator('input').nth(2).fill(pupil.pin)
  await page.getByRole('button', { name: 'Logga in', exact: true }).click()
  await page.waitForURL(/\/student\/[^/]+$/)
  await expect(page.getByText(`Hej ${pupil.loginCode}`)).toBeVisible()
}

export async function openOtherTraining(page) {
  const list = page.getByRole('button', { name: 'Fri träning', exact: true })
  const toggle = page.getByText('Välj annan träning')
  await expect(list.or(toggle).first()).toBeVisible()
  if (!(await list.isVisible())) await toggle.click()
  await expect(list).toBeVisible()
}

// Reads the props of the component that renders the task, walking React's
// *current* tree from the root (DOM nodes can point at a stale copy).
export async function readState(page) {
  return page.evaluate(() => {
    const container = document.getElementById('root')
    const key = container && Object.keys(container).find(k => k.startsWith('__reactContainer'))
    if (!key) return { phase: 'none' }
    let found = null
    const stack = [container[key].stateNode.current]
    while (stack.length) {
      const fiber = stack.pop()
      if (!fiber) continue
      const props = fiber.memoizedProps
      if (props && typeof props === 'object' && 'problem' in props && 'feedback' in props && 'inputValue' in props) found = props
      if (fiber.sibling) stack.push(fiber.sibling)
      if (fiber.child) stack.push(fiber.child)
    }
    if (!found) return { phase: 'none' }
    const { problem, feedback, inputValue } = found
    return {
      phase: !problem ? 'none' : feedback ? 'feedback' : 'answering',
      problem: problem ? JSON.parse(JSON.stringify(problem)) : null,
      feedback: feedback ? JSON.parse(JSON.stringify(feedback)) : null,
      inputValue: inputValue ?? ''
    }
  })
}

export async function visibleKeys(page) {
  return page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(b => b.offsetParent !== null && !b.disabled)
    .map(b => b.textContent.trim())
    .filter(t => t.length > 0 && t.length <= 2))
}

// The answer a pupil should write, in the app's own notation.
export function answerText(problem) {
  const answer = problem?.answer || {}
  if (answer.type === 'fraction') return String(answer.value ?? answer.correct ?? '')
  if (answer.type === 'expression') return String(answer.correct ?? '')
  const value = Number(answer.correct ?? problem?.result)
  if (!Number.isFinite(value)) return String(answer.correct ?? problem?.result ?? '')
  return Number(value.toFixed(6)).toString().replace('.', ',')
}

const KEY_ALIASES = { '-': ['±', '−', '-'], '.': [','], ',': [','], '−': ['−', '±', '-'] }

// Press keys one by one. Returns the characters that had no key.
export async function pressKeys(page, text) {
  const keys = await visibleKeys(page)
  const missing = []
  const chars = [...String(text).replace(/\s+/g, '')]
  const sign = chars[0] === '-' || chars[0] === '−'
  const body = sign ? chars.slice(1) : chars
  const plan = []
  for (const ch of body) {
    const candidates = KEY_ALIASES[ch] || [ch]
    const hit = candidates.find(c => keys.includes(c))
    if (hit) plan.push(hit)
    else missing.push(ch)
  }
  if (sign) {
    const hit = ['±', '−', '-'].find(c => keys.includes(c))
    if (hit === '±') plan.push('±')
    else if (hit) plan.unshift(hit)
    else missing.push('-')
  }
  if (missing.length > 0) return { missing, typed: false }
  for (const key of plan) {
    await page.locator('button', { hasText: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click()
  }
  return { missing, typed: true }
}

export async function fillAnswer(page, text) {
  await page.locator('input[placeholder="?"]').fill(String(text))
}

export async function submit(page) {
  await page.getByRole('button', { name: 'Svara', exact: true }).click()
}

export async function next(page) {
  const button = page.getByRole('button', { name: 'Nästa', exact: true })
  if (await button.isVisible().catch(() => false)) await button.click()
}

// Anything that is not the answer screen: celebrations, break prompts etc.
// Returns a short label for what was dismissed, or null.
export async function dismissInterruptions(page, { breakChoice = 'Fortsätt räkna' } = {}) {
  for (const label of [breakChoice, 'Avsluta spelet', 'Tillbaka till matten', 'Fortsätt']) {
    const button = page.getByRole('button', { name: label, exact: typeof label === 'string' })
    if (await button.first().isVisible().catch(() => false)) { await button.first().click(); return String(label) }
  }
  const tapAnywhere = page.getByText('Tryck var som helst för att fortsätta')
  if (await tapAnywhere.isVisible().catch(() => false)) { await page.mouse.click(5, 5); return 'tryck-var-som-helst' }
  return null
}

export async function themeOf(page) {
  return page.evaluate(() => ({
    theme: [...document.body.classList].find(c => c.startsWith('theme-')) || null,
    contrast: document.body.classList.contains('contrast-high')
  }))
}

export async function goHomeFromPractice(page) {
  await page.getByRole('button', { name: 'Startsida', exact: true }).click()
  await page.waitForURL(/\/student\/[^/]+$/)
}

// Waits until the pupil sees a fresh task to answer.
export async function waitForTask(page, { timeout = 8000, breakChoice } = {}) {
  const start = Date.now()
  const interruptions = []
  while (Date.now() - start < timeout) {
    if (!/\/practice/.test(page.url())) return { state: { phase: 'left' }, interruptions, left: true }
    const state = await readState(page)
    if (state.phase === 'answering' && state.problem) return { state, interruptions }
    if (state.phase === 'feedback') { await next(page); continue }
    const dismissed = await dismissInterruptions(page, { breakChoice })
    if (dismissed) { interruptions.push(dismissed); continue }
    await page.waitForTimeout(100)
  }
  return { state: await readState(page), interruptions, timedOut: true, text: (await page.locator('body').innerText()).slice(0, 400) }
}
