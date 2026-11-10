import { afterEach, describe, expect, it, vi } from 'vitest'
import { logUnexpectedDiagnosticError } from './_diagnosticErrorLog.js'

describe('unexpected diagnostic errors', () => {
  afterEach(() => vi.restoreAllMocks())
  it('logs the error itself without the request body', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    logUnexpectedDiagnosticError('teacher-diagnostic-assignments', { method: 'POST', body: { studentIds: ['SECRET'] } },
      Object.assign(new Error('ERR Error running script: user_script:30'), { name: 'UpstashError' }), { pupils: 25 })
    expect(log).toHaveBeenCalledTimes(1)
    const line = log.mock.calls[0].join(' ')
    expect(line).toContain('user_script:30')
    expect(line).toContain('"pupils":25')
    expect(line).not.toContain('SECRET')
  })
  it('stays quiet for expected errors with a status', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    logUnexpectedDiagnosticError('x', { method: 'POST' }, Object.assign(new Error('Ogiltig'), { status: 400 }))
    expect(log).not.toHaveBeenCalled()
  })
})
