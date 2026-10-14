import { it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentAttentionHistoryPanel from './StudentAttentionHistoryPanel'

it('renders saved aborted control results separately with explicit missing times', () => {
  const history = [{ id: 'saved', version: 1, mode: 'choose', startedAt: 1000, finishedAt: 10000,
    activeMs: 9000, aborted: true, summary: { hits: 0, misses: 1, wrong: 0, early: 2, withheld: 1, median: null } }]
  const html = renderToStaticMarkup(<StudentAttentionHistoryPanel history={history} />)
  expect(html).toContain('2 - KONTROLL')
  expect(html).toContain('Avbrutet')
  expect(html).toContain('9 s aktiv tid')
  expect(html).toContain('Rätt avstådda')
  expect(html).toContain('påverkar inte matematiknivåer')
  expect(html).toContain('Medianreaktionstid')
})
it('renders an older profile without activity history as empty', () => {
  expect(renderToStaticMarkup(<StudentAttentionHistoryPanel />)).toContain('Inga sparade pass i urvalet.')
})
