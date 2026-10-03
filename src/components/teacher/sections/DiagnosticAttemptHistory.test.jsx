import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../../../domains/arithmetic/diagnosticGridModel'
import DiagnosticAttemptHistory from './DiagnosticAttemptHistory'

it('renders a saved line across empty cells in the teacher history', () => {
  const start = createDiagnosticGrid({ attemptId: 'A', taskId: 'T', taskVersion: 1 })
  const snapshot = recordDiagnosticGridEvent(start, { type: 'line_add', axis: 'vertical',
    from: { row: 0, column: 2 }, to: { row: 3, column: 2 } }, 1001)
  const html = renderToStaticMarkup(<DiagnosticAttemptHistory snapshot={snapshot} />)
  expect(html).toContain('data-line-id="A:1"')
  expect(html).toContain('lodrätt streck')
  expect(html).toContain('x1="2.88"')
  expect(html).toContain('y2="3.92"')
})
