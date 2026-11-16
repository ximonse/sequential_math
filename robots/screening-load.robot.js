// docs/STYRNING_BELASTNING.md, step 2: Screening reads screening lists only for
// the classes a tab needs, not for every class the teacher has.
import { test, expect } from '@playwright/test'
import { createPupil } from './lib/app.js'
import { createTeacher, teacherLogin } from './lib/teacher.js'
import { openResults } from './lib/screening.js'

test('Results for one class read that class only; the issued list reads every class', async ({ page, request }) => {
  const tag = Math.random().toString(36).slice(2, 8)
  const classes = ['A', 'B', 'C'].map(letter => ({ id: `load-${tag}-${letter}`, name: `Last ${letter} ${tag}` }))
  for (const record of classes) await createPupil(request, { classId: record.id, className: record.name })
  const teacher = await createTeacher(request, { classIds: classes.map(record => record.id), role: 'super_admin' })
  const reads = []
  page.on('request', req => {
    const url = new URL(req.url())
    if (url.pathname === '/api/teacher-diagnostic-assignments' && url.searchParams.get('classId')) reads.push(url.searchParams.get('classId'))
  })
  await teacherLogin(page, teacher)
  await openResults(page, { className: classes[1].name })
  await expect(page.getByRole('region', { name: 'Resultat av screening', exact: true })).toContainText(/inga utdelade samlingar|Screeningar för valda mottagare/i)
  await page.waitForLoadState('networkidle')
  expect([...new Set(reads)]).toEqual([classes[1].id])
  const panel = page.getByRole('region', { name: 'Screening', exact: true })
  await panel.getByRole('tab', { name: 'Utdelade', exact: true }).click()
  await page.waitForLoadState('networkidle')
  expect([...new Set(reads)].sort()).toEqual(classes.map(record => record.id).sort())
})
