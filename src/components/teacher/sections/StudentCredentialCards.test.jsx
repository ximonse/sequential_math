import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentCredentialCards from './StudentCredentialCards'
import { credentialText } from '../../../lib/studentCredentialText'

describe('new pupil credential cards', () => {
  it('includes the creation name on the printable card and copied reserve list', () => {
    const credential = { studentId: 'S1', name: 'Alva', displayAlias: 'Blå Räv', pin: '1234', qrSecret: 'secret' }
    const markup = renderToStaticMarkup(<StudentCredentialCards credentials={[credential]} />)

    expect(markup).toContain('class="font-bold text-sm">Alva</p>')
    expect(markup).toContain('Kodnamn: <span class="font-semibold">Blå Räv</span>')
    expect(credentialText([credential])).toContain('Alva\nKodnamn: Blå Räv')
  })

  it('uses the code name on a printable card without a creation name', () => {
    const credential = { studentId: 'S2', name: '', displayAlias: 'Gul Sol', pin: '5678', qrSecret: 'secret' }
    const markup = renderToStaticMarkup(<StudentCredentialCards credentials={[credential]} />)

    expect(markup).toContain('class="font-bold text-sm">Gul Sol</p>')
  })
})
