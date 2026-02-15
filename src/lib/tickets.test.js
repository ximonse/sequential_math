import { describe, expect, it } from 'vitest'
import { evaluateTicketAnswer } from './tickets'

describe('ticket answer evaluation', () => {
  it('accepts equivalent numeric formats', () => {
    const result = evaluateTicketAnswer('12,5', '12.50')
    expect(result.correct).toBe(true)
  })

  it('rejects incorrect values', () => {
    const result = evaluateTicketAnswer('42', '41')
    expect(result.correct).toBe(false)
  })
})
