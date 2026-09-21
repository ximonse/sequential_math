import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentSyncStatus from './StudentSyncStatus'

describe('student sync status', () => {
  it('states that pending work is locally saved and safe to continue', () => {
    const html = renderToStaticMarkup(<StudentSyncStatus status={{ state: 'pending' }} />)
    expect(html).toContain('Sparat på enheten')
    expect(html).toContain('Du kan fortsätta arbeta')
    expect(html).toContain('role="status"')
  })

  it('uses an alert only when local persistence itself failed', () => {
    const html = renderToStaticMarkup(<StudentSyncStatus status={{ state: 'error' }} />)
    expect(html).toContain('Kontrollera sparningen')
    expect(html).toContain('role="alert"')
  })
})
