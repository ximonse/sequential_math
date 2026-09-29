import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BreakPrompt from './BreakPrompt'
import { decodeAssignmentPayload, encodeAssignmentPayload } from '../../lib/assignments'

const props = { sessionCount: 20, breakDurationMinutes: 2, onOpenPong() {}, onOpenSnake() {}, onTakeBreak() {}, onContinue() {} }

describe('BreakPrompt games', () => {
  it('offers Pong and Snake by default', () => {
    const html = renderToStaticMarkup(<BreakPrompt {...props} />)
    expect(html).toContain('Spela Pong')
    expect(html).toContain('Spela Snake')
  })

  it('is a plain rest break without games', () => {
    const html = renderToStaticMarkup(<BreakPrompt {...props} showGames={false} />)
    expect(html).not.toContain('Spela Pong')
    expect(html).not.toContain('Spela Snake')
    expect(html).toContain('Fortsätt räkna')
    expect(html).toContain('Till startsidan')
  })
})

describe('assignment breakGames flag', () => {
  const base = { id: 'asg_1', kind: 'standard', title: 'T', problemTypes: ['addition'] }
  it('is off unless the teacher turned it on, and survives the link', () => {
    expect(decodeAssignmentPayload(encodeAssignmentPayload(base)).breakGames).toBe(false)
    expect(decodeAssignmentPayload(encodeAssignmentPayload({ ...base, breakGames: true })).breakGames).toBe(true)
  })
})
