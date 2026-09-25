// Robot 6: pupils train in a known way, then a teacher logs in. Everything
// the teacher sees must match what the pupils actually did.
import { test, expect } from '@playwright/test'
import { createPupil, login, openOtherTraining } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { answerTasks } from './lib/session.js'
import { checkScreenText } from './lib/text.js'
import { createTeacher, openTab, rowFor, sectionText, selectOnlyClass, tableUnder, teacherLogin } from './lib/teacher.js'

const THINK_MS = 900

async function pupilSession(browser, pupil, run) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, pupil)
  const result = await run(page)
  // Leave the way pupils do: the iPad is locked or the app switched away
  // (the page becomes hidden), then the tab goes away. Nobody presses Startsida.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pagehide'))
  })
  await page.waitForTimeout(2500) // let the last answers reach the server
  await context.close()
  return result
}

async function startArea(page, label) {
  await openOtherTraining(page)
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
  await page.waitForURL(/\/practice/)
}

test('Lärare: lärarvyn visar det eleverna gjorde', async ({ page, request, browser }, testInfo) => {
  test.setTimeout(8 * 60 * 1000)
  const findings = createFindings(testInfo)
  const tag = Math.random().toString(36).slice(2, 6)
  const classA = { id: `klass-a-${tag}`, name: `Robot 5A ${tag}` }
  const classB = { id: `klass-b-${tag}`, name: `Robot 5B ${tag}` }
  const make = (name, klass) => createPupil(request, { name: `${name} ${tag}`, classId: klass.id, className: klass.name, operations: ['addition', 'subtraction', 'multiplication', 'division'] })
  const anna = await make('Anna', classA)
  const bert = await make('Bert', classA)
  const cilla = await make('Cilla', classA)
  const dina = await make('Dina', classA)
  const erik = await make('Erik', classB)
  const teacher = await createTeacher(request, { classIds: [classA.id, classB.id] })

  // What the pupils do: known amounts, known right and wrong.
  const annaLog = await pupilSession(browser, anna, async p => { await startArea(p, 'Addition'); return answerTasks(p, findings, { count: 12, choice: { mode: 'addition', label: 'Addition' }, thinkMs: THINK_MS }) })
  const bertLog = await pupilSession(browser, bert, async p => { await startArea(p, 'Subtraktion'); return answerTasks(p, findings, { count: 8, choice: { mode: 'subtraction', label: 'Subtraktion' }, strategy: 'wrong', thinkMs: THINK_MS }) })
  const dinaLog = await pupilSession(browser, dina, async p => {
    const section = p.locator('section', { hasText: 'Tabellträning' })
    await section.getByRole('button', { name: '7', exact: true }).click()
    await section.getByRole('button', { name: 'Kör', exact: true }).click()
    await p.waitForURL(/\/practice/)
    return answerTasks(p, findings, { count: 10, choice: { tables: [7], label: 'tabell 7' }, thinkMs: THINK_MS, onLeave: async () => false })
  })
  const erikLog = await pupilSession(browser, erik, async p => { await startArea(p, 'Multiplikation'); return answerTasks(p, findings, { count: 5, choice: { mode: 'multiplication', label: 'Multiplikation' }, thinkMs: THINK_MS }) })
  const expected = [
    { pupil: anna, answers: annaLog.length, right: annaLog.filter(e => e.correct).length, area: 'Addition' },
    { pupil: bert, answers: bertLog.length, right: 0, area: 'Subtraktion' },
    { pupil: cilla, answers: 0, right: 0, area: null },
    { pupil: dina, answers: dinaLog.length, right: dinaLog.length, area: 'Multiplikation' }
  ]

  await teacherLogin(page, teacher)
  await checkScreenText(page, findings, 'lärarens startvy')

  // R1 for the teacher: choosing a class shows exactly that class.
  await selectOnlyClass(page, classA.name)
  const overview = await tableUnder(page, 'Klass/gruppvy')
  if (!overview) findings.add('L1', 'Snabbstatus-tabellen hittades inte')
  const listed = (overview || []).map(cells => cells[0])
  for (const { pupil } of expected) {
    const hits = listed.filter(name => name.startsWith(pupil.loginCode))
    if (hits.length !== 1) findings.add('L1', 'En elev i klassen visas inte exakt en gång', { elev: pupil.loginCode, gånger: hits.length })
  }
  if (listed.some(name => name.startsWith(erik.loginCode))) findings.add('R1', 'En elev från en annan klass visas när läraren valt en klass', { elev: erik.loginCode, valdKlass: classA.name })

  // Today's numbers per pupil.
  for (const { pupil, answers, right, area } of expected) {
    const row = rowFor(overview, pupil.loginCode)
    if (!row) continue
    const [, presence, workingOn, today, rightWrong, hitRate] = row
    if (Number(today) !== answers) findings.add('L1', 'Antal svar idag stämmer inte', { elev: pupil.loginCode, visar: today, gjorde: answers })
    if (answers > 0 && rightWrong !== `${right}/${answers - right}`) findings.add('L1', 'Rätt/fel idag stämmer inte', { elev: pupil.loginCode, visar: rightWrong, gjorde: `${right}/${answers - right}` })
    if (area && workingOn !== area) findings.add('L1', 'Jobbar med visar fel område', { elev: pupil.loginCode, visar: workingOn, tränade: area })
    if (answers === 0 && /\d+%/.test(hitRate)) findings.add('L1', 'En elev utan svar visas med en procentsats i stället för att underlag saknas', { elev: pupil.loginCode, visar: hitRate })
    if (answers === 0 && /Aktiv nu/.test(presence)) findings.add('L1', 'En elev som inte loggat in visas som aktiv', { elev: pupil.loginCode, visar: presence })
  }
  const trainedToday = await page.locator('text=Tränat idag').locator('xpath=following-sibling::*[1]').first().innerText().catch(() => '')
  if (trainedToday && Number(trainedToday) !== 3) findings.add('L1', 'Nyckeltalet Tränat idag stämmer inte', { visar: trainedToday, gjorde: 3 })

  // Unknown is not zero (F6): a pupil without answers has no level.
  const levels = await tableUnder(page, 'Nivåöversikt')
  const cillaLevels = rowFor(levels, cilla.loginCode)
  if (cillaLevels && cillaLevels.slice(1).some(cell => /^0(\.0)?$/.test(cell))) findings.add('L1', 'En elev som inte tränat visas med nivå 0 i stället för okänt', { elev: cilla.loginCode, rad: cillaLevels.join(' | ') })
  const bertLevels = rowFor(levels, bert.loginCode)
  if (bertLevels && bertLevels.slice(1).some(cell => /^[1-9]/.test(cell))) findings.add('L1', 'En elev med bara fel visas med en belagd nivå', { elev: bert.loginCode, rad: bertLevels.join(' | ') })

  // Table status: Dina did table 7 and nobody else did.
  const tables = await tableUnder(page, 'Gångertabell - sticky')
  const header = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h1,h2,h3,h4')].find(x => x.textContent.trim().startsWith('Gångertabell - sticky'))
    let box = h?.parentElement
    for (let d = 0; box && d < 5 && !box.querySelector('table'); d++) box = box.parentElement
    return box ? [...box.querySelectorAll('table thead th')].map(th => th.innerText.replace(/[↕▲▼]/g, '').trim()) : []
  })
  const col7 = header.indexOf('7')
  if (col7 > 0) {
    const dinaRow = rowFor(tables, dina.loginCode)
    if (dinaRow && /^[–-]$/.test(dinaRow[col7])) findings.add('L1', 'Tabellstatus visar inget för en elev som just gjort 7:ans tabell', { elev: dina.loginCode, cell: dinaRow[col7] })
    for (const { pupil } of expected.filter(e => e.pupil !== dina)) {
      const row = rowFor(tables, pupil.loginCode)
      if (row && !/^[–-]$/.test(row[col7])) findings.add('L1', 'Tabellstatus visar 7:an för en elev som inte tränat tabeller', { elev: pupil.loginCode, cell: row[col7] })
    }
  }
  await checkScreenText(page, findings, 'Framsteg')

  // Support signal: Bert (only wrong) and nobody else, with his real answers.
  await openTab(page, 'Statistik & stöd')
  await checkScreenText(page, findings, 'Statistik & stöd')
  const support = await sectionText(page, 'Behöver stöd nu') || ''
  if (!support.includes(bert.loginCode)) findings.add('L1', 'Eleven som svarat fel på allt syns inte under Behöver stöd nu', { elev: bert.loginCode })
  for (const { pupil } of expected.filter(e => e.pupil !== bert && e.pupil !== cilla)) {
    if (support.includes(pupil.loginCode)) findings.add('L1', 'En elev som svarat rätt syns under Behöver stöd nu', { elev: pupil.loginCode })
  }
  const shownWrong = [...support.matchAll(/(\d+) − (\d+) · svar (-?\d+) \(rätt: (-?\d+)\)/g)]
  for (const [, a, b, given, right] of shownWrong) {
    const actual = bertLog.find(e => e.key === `${a} − ${b}`)
    if (Number(a) - Number(b) !== Number(right)) findings.add('L1', 'Lärarvyn visar fel facit för ett felsvar', { uppgift: `${a} − ${b}`, visar: right })
    if (actual && actual.answer !== given) findings.add('L1', 'Lärarvyn visar ett annat elevsvar än eleven gav', { uppgift: `${a} − ${b}`, visar: given, gav: actual.answer })
    if (!actual) findings.add('L1', 'Lärarvyn visar ett felsvar på en uppgift eleven aldrig fick', { uppgift: `${a} − ${b}` })
  }
  const quality = await sectionText(page, 'Datakvalitet') || ''
  const flagged = quality.match(/Behöver extra koll: (.*)/)?.[1] || ''
  for (const { pupil } of expected) if (flagged.includes(pupil.loginCode)) findings.add('L1', 'Datakvalitet flaggar en elev som tränat helt vanligt', { elev: pupil.loginCode, text: flagged.slice(0, 160) })

  // Export: the raw data has exactly the answers the pupils gave.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    page.getByRole('button', { name: 'Export rådata', exact: true }).click().catch(() => null)
  ])
  if (!download) findings.add('R3', 'Export rådata gav ingen fil')
  else {
    const csv = String(await (await download.createReadStream()).toArray().then(parts => Buffer.concat(parts)))
    const lines = csv.split(/\r?\n/).filter(Boolean)
    for (const { pupil, answers } of expected) {
      const rows = lines.filter(line => line.includes(pupil.studentId) || line.includes(pupil.loginCode)).length
      if (rows !== answers) findings.add('L1', 'Exporten har ett annat antal svar än eleven gav', { elev: pupil.loginCode, iExporten: rows, gjorde: answers })
    }
    if (lines.some(line => line.includes(erik.studentId))) findings.add('R1', 'Exporten tar med en elev från en klass som inte är vald', { elev: erik.loginCode })
  }

  // Pupil detail agrees with the list.
  await openTab(page, 'Framsteg')
  await page.getByRole('button', { name: anna.loginCode, exact: true }).first().click().catch(() => null)
  await page.waitForTimeout(1500)
  await checkScreenText(page, findings, 'Elevdetalj')
  const detailText = await page.locator('body').innerText()
  if (!detailText.includes(anna.loginCode)) findings.add('R3', 'Klick på elevens namn öppnade inte elevdetaljen', { elev: anna.loginCode })

  // R2/R3: the teacher stays logged in until logging out.
  await page.goto('/teacher'); await page.waitForTimeout(1500)
  if (!/\/teacher$/.test(page.url())) findings.add('R2', 'Läraren loggades ut av en omladdning', { url: page.url() })
  const stillSelected = await page.locator('section.dashboard-class-filter').getByRole('button', { name: classA.name, exact: true }).getAttribute('class')
  if (!/bg-blue-600/.test(stillSelected || '')) findings.add('R2', 'Vald klass var inte kvar efter omladdning (texten lovar att den sparas som förval)', { klass: classA.name })
  await page.getByRole('button', { name: 'Logga ut', exact: true }).first().click()
  await page.waitForTimeout(1000)
  await page.goto('/teacher'); await page.waitForTimeout(1500)
  if (await page.getByText('Välj din klass eller grupp').isVisible().catch(() => false)) findings.add('R3', 'Lärarvyn gick att öppna efter utloggning')

  findings.stat('elever', expected.length + 1)
  findings.stat('svar', annaLog.length + bertLog.length + dinaLog.length + erikLog.length)
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})

test('Text: elevens sidor har hela svenska ord och inga tekniska värden', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const pupil = await createPupil(request)
  await page.goto('/'); await page.waitForTimeout(500)
  await checkScreenText(page, findings, 'inloggning')
  await login(page, pupil)
  await checkScreenText(page, findings, 'elevens startsida')
  await openOtherTraining(page)
  await checkScreenText(page, findings, 'Välj träning')
  for (const label of ['Addition', 'Bråk', 'Algebra (förenkla)', 'Procenträkning']) {
    await page.goto(`/student/${pupil.studentId}`)
    await startArea(page, label.replace(/[()]/g, '\\$&'))
    await answerTasks(page, findings, { count: 6, choice: {}, strategy: i => i % 2 === 0 })
    await checkScreenText(page, findings, `övning ${label}`)
  }
  await findings.attach()
  expect.soft(findings.items.map(f => `${f.rule}: ${f.message}`)).toEqual([])
})
