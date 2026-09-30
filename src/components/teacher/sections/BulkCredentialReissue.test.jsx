import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BulkCredentialReissue from './BulkCredentialReissue'

const students = [
  { studentId: 'A1', name: 'Hilma', displayAlias: 'Lila Nyckel Uggla' },
  { studentId: 'B2', name: '', displayAlias: 'Blå Bro Uggla' }
]

describe('BulkCredentialReissue', () => {
  it('lists every pupil with a checkbox and starts with nothing selected', () => {
    const html = renderToStaticMarkup(<BulkCredentialReissue students={students} />)
    expect(html).toContain('Nya kort för valda elever')
    expect(html).toContain('Hilma')
    expect(html).not.toContain('Lila Nyckel Uggla')
    expect(html).toContain('Blå Bro Uggla')
    expect(html.match(/type="checkbox"/g)).toHaveLength(2)
    expect(html).not.toContain('checked=""')
    expect(html).toContain('Skapa nya kort för 0 valda elever')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Skapa nya kort/)
  })

  it('promises that names, code names and data are kept', () => {
    const html = renderToStaticMarkup(<BulkCredentialReissue students={students} />)
    expect(html).toContain('Kodnamn, namn och träningsdata behålls')
  })
})
