import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentCredentialCards from './StudentCredentialCards'
import { credentialText } from '../../../lib/studentCredentialText'
import { HEADER_TEXT } from '../../../lib/studentCardLayout'

describe('new pupil credential cards', () => {
  it('includes the creation name on the printable card and copied reserve list', () => {
    const credential = { studentId: 'S1', name: 'Alva', displayAlias: 'Blå Räv', pin: '1234', qrSecret: 'secret' }
    const markup = renderToStaticMarkup(<StudentCredentialCards credentials={[credential]} />)

    expect(markup).toContain('Alva')
    expect(markup).toContain('Blå Räv')
    expect(credentialText([credential])).toContain('Alva\nKodnamn: Blå Räv')
  })

  it('uses the code name on a printable card without a creation name', () => {
    const credential = { studentId: 'S2', name: '', displayAlias: 'Gul Sol', pin: '5678', qrSecret: 'secret' }
    const markup = renderToStaticMarkup(<StudentCredentialCards credentials={[credential]} />)

    expect(markup).toContain('Gul Sol')
  })

  // Simon 2026-11-24: the card on screen is the printed card. The login screen
  // asks for code name and PIN, so a QR code and a pupil id do not belong here.
  it('shows the printed card and leaves out the QR code and the pupil id', () => {
    const credential = { studentId: 'ABC123', name: 'Alva', displayAlias: 'Blå Räv', pin: '1234', qrSecret: 'secret' }
    const markup = renderToStaticMarkup(<StudentCredentialCards credentials={[credential]} />)

    expect(markup).toContain(HEADER_TEXT)
    expect(markup).toContain('matematik.ximon.se')
    expect(markup).toContain('Skriv ditt kodnamn:')
    expect(markup).toContain('Skriv din PIN:')
    expect(markup).toContain('Tryck på Logga in')
    expect(markup).not.toContain('ABC123')
    expect(markup).not.toContain('Elev-ID')
    expect(markup).not.toContain('<img')
    expect(markup).not.toMatch(/[Ss]kanna/)
  })
})
