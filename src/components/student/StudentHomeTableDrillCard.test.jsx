import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import StudentHomeTableDrillCard from './StudentHomeTableDrillCard'

describe('student home table drill card', () => {
  const props = {
    tables: [2, 3],
    tableStatus: {},
    onToggleTable: () => {},
    getTableStatusClass: () => '',
    onStartTableDrill: () => {}
  }

  it('renders a standalone module and keeps start disabled until a table is selected', () => {
    const html = renderToStaticMarkup(<StudentHomeTableDrillCard {...props} selectedTables={[]} />)

    expect(html).toContain('<section aria-labelledby="table-drill-title"')
    expect(html).toContain('>Tabellträning</h2>')
    expect(html).toContain('disabled=""')
  })

  it('enables the existing start action when a table is selected', () => {
    const html = renderToStaticMarkup(<StudentHomeTableDrillCard {...props} selectedTables={[2]} />)

    expect(html).toContain('border-orange-500')
    expect(html).not.toContain('disabled=""')
  })
})
