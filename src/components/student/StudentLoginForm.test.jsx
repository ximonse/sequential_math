import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentLoginForm from './StudentLoginForm'

it('shows the class that the pupil link resolves to', () => {
  const html = renderToStaticMarkup(<StudentLoginForm className="6A" onLogin={vi.fn()} busy={false} error="" onClearError={vi.fn()} />)
  expect(html).toContain('Du loggar in i klass')
  expect(html).toContain('6A')
})
