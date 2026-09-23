import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentSyncStatus from './StudentSyncStatus'

describe('student sync status', () => {
  it('keeps normal save transitions out of the pupil layout', () => {
    for (const state of ['idle', 'synced', 'syncing']) {
      expect(renderToStaticMarkup(<StudentSyncStatus status={{ state }} />)).toBe('')
    }
    expect(renderToStaticMarkup(<StudentSyncStatus status={{ state: 'pending' }} />)).toBe('')
  })

  it('states that failed server sync is locally saved and safe to continue', () => {
    const html = renderToStaticMarkup(<StudentSyncStatus status={{ state: 'pending', lastError: 'Servern svarar inte.' }} />)
    expect(html).toContain('Sparat på enheten')
    expect(html).toContain('Servern svarar inte.')
    expect(html).toContain('role="status"')
  })

  it('uses an alert only when local persistence itself failed', () => {
    const html = renderToStaticMarkup(<StudentSyncStatus status={{ state: 'error' }} />)
    expect(html).toContain('Kontrollera sparningen')
    expect(html).toContain('role="alert"')
  })
})
