// Regression: teacher table progress must retain table-drill history older
// than the pupil's rolling recentProblems window.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createFindings } from './lib/findings.js'
import { createTeacher, openTab, selectOnlyClass, teacherLogin } from './lib/teacher.js'

test('Tabellutveckling: behåller historik utanför recent250', async ({ page, request }, testInfo) => {
  const findings = createFindings(testInfo)
  const tag = Math.random().toString(36).slice(2, 7)
  const classA = { id: `table-a-${tag}`, name: `Tabellklass A ${tag}` }
  const classB = { id: `table-b-${tag}`, name: `Tabellklass B ${tag}` }
  const create = (name, klass) => createPupil(request, {
    name: `${name} ${tag}`,
    classId: klass.id,
    className: klass.name,
    operations: ['multiplication']
  })
  const [pupilA, pupilB, peer, empty] = await Promise.all([
    create('Tabell Elev A', classA),
    create('Tabell Elev B', classB),
    create('Tabell Peer', classA),
    create('Tabell Empty', classA)
  ])
  const fixtureResponse = await request.post('/__robot/seed-table-progress', {
    data: {
      students: [
        { studentId: peer.studentId, currentAttempts: 30, currentCorrect: 16, previousAttempts: 10, previousCorrect: 4, noiseAttempts: 0 },
        { studentId: pupilA.studentId, currentAttempts: 20, currentCorrect: 16, previousAttempts: 20, previousCorrect: 10, noiseAttempts: 251, noiseTable: 8 },
        { studentId: pupilB.studentId, currentAttempts: 10, currentCorrect: 5, previousAttempts: 0, previousCorrect: 0, noiseAttempts: 0 }
      ]
    }
  })
  const fixture = await fixtureResponse.json()
  if (!fixture.ok) throw new Error(`Table history fixture failed: ${fixture.error || 'unknown error'}`)

  // Confirm the synthetic edge case: A's last 250 rows no longer include any
  // of the 20 current-period table-7 responses; B is a different class.
  const storedA = await (await request.post('/__robot/student', { data: { studentId: pupilA.studentId } })).json()
  const recentA = storedA.profile?.recentProblems || []
  if (recentA.length !== 250) findings.add('L1', 'Fixture saknar exakt 250 recent-rader', { antal: recentA.length })
  if (recentA.some(item => item.skillTag === 'mul_table_7')) findings.add('L1', 'Fixture tryckte inte undan tabell 7 ur recent250')

  const teacher = await createTeacher(request, { classIds: [classA.id, classB.id] })
  await teacherLogin(page, teacher)
  await selectOnlyClass(page, classA.name)
  await openTab(page, 'Framsteg')


  const panel = page.getByRole('region', { name: 'Tabellträning – utveckling', exact: true })
  await expect(panel).toBeVisible()
  const rows = panel.getByRole('table', { name: 'Tabellresultat per elev' })
  const pupilRow = rows.getByRole('row').filter({ hasText: pupilA.loginCode })
  await expect(pupilRow).toHaveCount(1)
  await expect(pupilRow.locator('td').nth(0)).toHaveText('20')
  await expect(pupilRow.locator('td').nth(1)).toHaveText('16')
  await expect(pupilRow.locator('td').nth(2)).toHaveText('80%')
  await expect(pupilRow.locator('td').nth(3)).toHaveText('50% (20)')
  await expect(rows).not.toContainText(pupilB.loginCode)
  await panel.getByLabel('Elev att jämföra', { exact: true }).selectOption(pupilA.studentId)
  await expect(panel.getByRole('table', { name: 'Jämförelse', exact: true })).toContainText('16/20')
  const comparison = panel.getByRole('table', { name: 'Jämförelse', exact: true })
  const peers = comparison.getByRole('row').filter({ hasText: 'Övriga i urvalet' })
  await expect(peers).toContainText('16/30')
  await expect(peers).toContainText('53%')
  const emptyRow = rows.getByRole('row').filter({ hasText: empty.loginCode })
  await expect(emptyRow.locator('td').nth(0)).toHaveText('0')
  await expect(emptyRow.locator('td').nth(2)).toHaveText('–')
  await panel.getByText('Visa siffror dag för dag', { exact: true }).click()
  const dayRows = await panel.getByRole('table', { name: 'Utveckling dag för dag' }).locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('td')].map(td => td.textContent)))
  expect(dayRows.reduce((sum, cells) => sum + Number(cells[0]), 0)).toBe(20)
  expect(dayRows.reduce((sum, cells) => sum + Number(cells[3]), 0)).toBe(30)
  await page.screenshot({ path: testInfo.outputPath('table-peer-comparison.png'), fullPage: true })
  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Exportera tabellunderlag' }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('80%')
  expect(csv).toContain('50%')
  expect(csv).not.toContain(pupilB.studentId)
  await panel.getByLabel('Period', { exact: true }).selectOption('14')
  await expect(pupilRow.locator('td').nth(0)).toHaveText('40')
  await expect(pupilRow.locator('td').nth(1)).toHaveText('26')
  await page.reload()
  await expect(panel.getByLabel('Period', { exact: true })).toHaveValue('14')
  await expect(panel.getByLabel('Elev att jämföra', { exact: true })).toHaveValue(pupilA.studentId)
  await selectOnlyClass(page, classB.name)
  await expect(panel.getByLabel('Elev att jämföra', { exact: true })).toHaveValue('')
  await expect(rows).not.toContainText(pupilA.loginCode)
  await expect(rows).toContainText(pupilB.loginCode)
  await page.screenshot({ path: testInfo.outputPath('table-progress.png'), fullPage: true })
  findings.stat('table7CurrentAttempts', 20)
  await findings.attach()
  expect(findings.items).toEqual([])
})
