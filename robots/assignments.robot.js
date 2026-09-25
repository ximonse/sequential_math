// Robot 7: the teacher creates assignments the way teachers do and pupils
// reach them by link or by "Aktivera för alla". Every task must stay inside
// the teacher's frame (D3), whether the pupil answers right or wrong.
import { test, expect } from '@playwright/test'
import { createPupil, login, waitForTask } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'
import { taskLabel, taskLevel, taskOperation } from './lib/checks.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

function toBase64Url(text) {
  return Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function setupClass(request, operations = ['addition', 'subtraction', 'multiplication', 'division']) {
  const tag = Math.random().toString(36).slice(2, 6)
  const klass = { id: `klass-u-${tag}`, name: `Uppdrag ${tag}` }
  // Pupils first: the teacher's class picker lists classes that have pupils.
  const pupils = {}
  for (const name of ['Stark', 'Kämpar', 'Elev']) pupils[name] = await createPupil(request, { name: `${name} ${tag}`, classId: klass.id, className: klass.name, operations })
  const teacher = await createTeacher(request, { classIds: [klass.id] })
  return { klass, pupil: async name => pupils[name], teacher }
}

// Creates a preset in the teacher view and returns the link the teacher copies.
async function createPresetLink(browser, teacher, klass, presetLabel) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, klass.name)
  await openTab(page, 'Uppdrag & tickets')
  await page.getByRole('button', { name: presetLabel, exact: true }).click()
  await page.waitForTimeout(500)
  const row = page.locator('div.rounded.border', { hasText: 'asg_' }).first()
  const title = (await row.locator('p.font-medium').innerText()).trim()
  await row.getByRole('button', { name: 'Kopiera länk', exact: true }).click()
  await page.waitForTimeout(300)
  const link = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '')
  return { context, page, link, title, row }
}

// Opens a link as a pupil on their own device and logs in.
async function openAsPupil(browser, link, pupil) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const url = new URL(link)
  await page.goto(`${url.pathname}${url.search}`)
  await page.getByPlaceholder(/Gul Fyr Katt/).fill(pupil.loginCode)
  await page.locator('input').nth(2).fill(pupil.pin)
  await page.getByRole('button', { name: 'Logga in', exact: true }).click()
  await page.waitForURL(/\/student\//)
  return { context, page }
}

function checkFrame(findings, log, frame) {
  for (const entry of log) {
    if (!frame.types.includes(entry.op) && !frame.types.includes(entry.type)) findings.add('R1', `Uppdraget "${frame.title}" gav ett räknesätt utanför uppdraget`, { uppgift: entry.key, fick: entry.op, uppdrag: frame.types.join(',') })
    if (Number.isFinite(entry.level) && (entry.level < frame.min || entry.level > frame.max)) findings.add('R1', `Uppdraget "${frame.title}" gav en nivå utanför lärarens ram`, { uppgift: entry.key, nivå: entry.level, ram: `${frame.min}–${frame.max}`, svaratRätt: entry.correct, syfte: entry.purpose })
  }
}

const PRESETS = [
  { label: 'Nytt: Bara subtraktion', types: ['subtraction'], min: 1, max: 8 },
  { label: 'Nytt: Bara multiplikation', types: ['multiplication'], min: 3, max: 10 },
  { label: 'Nytt: Bråk', types: ['fractions'], min: 1, max: 12 }
]

for (const preset of PRESETS) {
  test(`Uppdrag via länk: ${preset.label.replace('Nytt: ', '')}, rätt och fel`, async ({ browser, request }, testInfo) => {
    test.setTimeout(5 * 60 * 1000)
    const findings = createFindings(testInfo)
    const { klass, pupil, teacher } = await setupClass(request, ['addition', 'subtraction', 'multiplication', 'division', 'fractions'])
    const teacherSide = await createPresetLink(browser, teacher, klass, preset.label)
    if (!teacherSide.link) {
      findings.add('R3', 'Kopiera länk gav ingen länk', { uppdrag: preset.label })
    } else {
      const title = teacherSide.title
      const range = title.match(/nivå (\d+)-(\d+)/)
      const frame = { title, types: preset.types, min: range ? Number(range[1]) : preset.min, max: range ? Number(range[2]) : preset.max }
      for (const [who, strategy] of [['Stark', 'correct'], ['Kämpar', 'wrong']]) {
        const kid = await pupil(who)
        const { context, page } = await openAsPupil(browser, teacherSide.link, kid)
        if (!/\/practice/.test(page.url())) findings.add('R1', 'Uppdragslänken ledde inte in i uppdraget efter inloggning', { uppdrag: title, url: page.url() })
        else {
          const log = await answerTasks(page, findings, { count: 25, choice: {}, strategy, onLeave: async () => false })
          checkFrame(findings, log, frame)
          findings.stat(`${who}`, `${log.length} svar, nivåer ${[...new Set(log.map(e => e.level))].join(',')}`)
        }
        await context.close()
      }
    }
    await teacherSide.context.close()
    await findings.attach()
    expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
  })
}

test('Låst uppdrag: exakt en nivå håller även när eleven fastnar', async ({ browser, request }, testInfo) => {
  test.setTimeout(5 * 60 * 1000)
  const findings = createFindings(testInfo)
  const { klass, pupil, teacher } = await setupClass(request)
  const teacherSide = await createPresetLink(browser, teacher, klass, 'Nytt: Bara addition')
  const classToken = new URL(teacherSide.link || 'http://x/').searchParams.get('class')
  await teacherSide.context.close()
  const locked = { v: 1, id: `asg_robot_${Date.now()}`, kind: 'standard', title: 'Addition nivå 4 (låst)', problemTypes: ['addition'], minLevel: 4, maxLevel: 4, targetCount: 15, ncmCodes: [], ncmAbilityTags: [], createdAt: Date.now() }
  const link = `http://localhost/?class=${classToken}&assignment=${locked.id}&assignment_payload=${toBase64Url(JSON.stringify(locked))}`
  for (const [who, strategy] of [['Stark', 'correct'], ['Kämpar', 'wrong']]) {
    const { context, page } = await openAsPupil(browser, link, await pupil(who))
    const log = await answerTasks(page, findings, { count: 25, choice: {}, strategy, onLeave: async () => false })
    checkFrame(findings, log, { title: locked.title, types: ['addition'], min: 4, max: 4 })
    findings.stat(who, `${log.length} svar, nivåer ${[...new Set(log.map(e => e.level))].join(',')}`)
    await context.close()
  }
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Aktivera för alla: uppdraget når elevernas egna enheter', async ({ browser, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const { klass, pupil, teacher } = await setupClass(request)
  const teacherSide = await createPresetLink(browser, teacher, klass, 'Nytt: Bara subtraktion')
  await teacherSide.row.getByRole('button', { name: 'Aktivera för alla', exact: true }).click()
  await teacherSide.page.waitForTimeout(1500)
  const shownActive = await teacherSide.page.getByText(/Aktivt för alla:/).innerText()
  const kid = await pupil('Elev')
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, kid)
  const card = await page.locator('div', { hasText: 'Ditt nästa steg' }).last().innerText()
  if (!card.includes(teacherSide.title)) {
    findings.add('R1', 'Ett uppdrag som läraren aktiverat för alla syns inte hos eleven', { lärarvyn: shownActive, elevensKort: card.replace(/\s+/g, ' ').slice(0, 120) })
  } else {
    await page.getByRole('button', { name: 'Starta uppdraget', exact: true }).click()
    await page.waitForURL(/\/practice/)
    const { state } = await waitForTask(page)
    if (taskOperation(state.problem) !== 'subtraction') findings.add('R1', 'Det aktiverade uppdraget startade något annat än uppdraget', { uppgift: taskLabel(state.problem), nivå: taskLevel(state.problem) })
    // And back: clearing it must remove it from the pupil's device.
    await teacherSide.page.getByRole('button', { name: 'Rensa aktivt', exact: true }).click()
    await teacherSide.page.waitForTimeout(1500)
    await page.goto(`/student/${kid.studentId}`)
    await page.waitForTimeout(1500)
    const after = await page.locator('div', { hasText: 'Ditt nästa steg' }).last().innerText()
    if (after.includes(teacherSide.title)) findings.add('R1', 'Ett uppdrag som läraren rensat finns kvar hos eleven', { elevensKort: after.replace(/\s+/g, ' ').slice(0, 120) })
  }
  if (/asg_\d/.test(shownActive)) findings.add('T1', 'Lärarvyn visar uppdragets interna id i stället för namnet', { text: shownActive })
  await context.close()
  await teacherSide.context.close()
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})
