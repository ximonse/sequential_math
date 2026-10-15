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

it('shows percentages with denominators, completed-pass separation and no pooled reaction median', () => {
  const result = { id: 'full', version: 1, mode: 'choose', startedAt: 1000, finishedAt: 121000,
    activeMs: 120000, aborted: false, summary: { hits: 3, misses: 1, wrong: 1, early: 3, withheld: 1, median: 300 } }
  const html = renderToStaticMarkup(<StudentAttentionHistoryPanel history={[result]} />)
  expect(html).toContain('Översikt · färdiga tvåminuterspass')
  expect(html).toContain('75 %')
  expect(html).toContain('3 av 4')
  expect(html).toContain('50 %')
  expect(html).toContain('1,5')
  expect(html).toContain('Svarstider visas per pass nedan.')
  expect(html).toContain('Visa avbrutna pass')
})
