import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SessionPage from './SessionPage'

describe('student session page', () => {
  it('shows the practice mode as an unboxed heading and no success-rate bar', () => {
    const html = renderToStaticMarkup(
      <SessionPage
        profileName="Elev"
        sessionCount={1}
        streak={0}
        onExit={() => {}}
        tableSet={[]}
        currentProblem={null}
        answer=""
        syncStatus={{ state: 'synced' }}
      />
    )

    expect(html).toContain('<h2 class="mb-5 text-lg sm:text-xl font-semibold text-gray-700">Blandad träning</h2>')
    expect(html).not.toContain('Success rate')
    expect(html).not.toContain('bg-green-500')
  })
})
