import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SessionPage from './SessionPage'

describe('student session page', () => {
  it('honors explicit workspace choices without changing legacy drawing access', () => {
    const htmlFor = assignment => renderToStaticMarkup(<SessionPage
      sessionAssignment={assignment} currentProblem={{ type: 'addition', values: { a: 2, b: 3 }, result: 5 }}
      answer="" tableSet={[]} syncStatus={{ state: 'synced' }} />)
    expect(htmlFor({ workspaces: { notebook: true, drawing: false } })).toContain('Visa räknehäfte')
    expect(htmlFor({ workspaces: { notebook: true, drawing: false } })).not.toContain('Visa rityta')
    expect(htmlFor({ workspaces: { notebook: false, drawing: false } })).not.toContain('Visa räknehäfte')
    expect(htmlFor({ workspaces: { notebook: false, drawing: false } })).not.toContain('Visa rityta')
    expect(htmlFor({})).toContain('Visa rityta')
    expect(htmlFor({})).not.toContain('Visa räknehäfte')
  })
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

  it('offers adaptive practice when a selected level was already mastered', () => {
    const html = renderToStaticMarkup(
      <SessionPage
        profileName="Elev"
        sessionCount={49}
        streak={2}
        onExit={() => {}}
        tableSet={[]}
        mode="addition"
        fixedPracticeLevel={6}
        revisitingMasteredLevel
        onContinueAdaptively={() => {}}
        currentOperationLabel="Addition"
        currentProblem={null}
        answer=""
        syncStatus={{ state: 'synced' }}
      />
    )

    expect(html).toContain('Här tränar du bara den nivån.')
    expect(html).toContain('Fortsätt med Addition')
  })
})
