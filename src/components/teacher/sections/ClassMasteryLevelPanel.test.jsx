import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ClassMasteryLevelPanel from './ClassMasteryLevelPanel'

describe('class mastery level presentation', () => {
  it('labels established levels and unknown evidence without presenting zero as attainment', () => {
    const html = renderToStaticMarkup(<ClassMasteryLevelPanel
      filteredStudents={[
        {
          studentId: 'ELEV1',
          name: 'Belagd',
          teacherSummary: { effectiveLevels: { addition: 4, subtraction: 2 } }
        },
        {
          studentId: 'ELEV2',
          name: 'Okänd',
          teacherSummary: { effectiveLevels: {} }
        }
      ]}
      onOpenStudentDetail={() => {}}
    />)

    expect(html).toContain('Belagd nivå i aktiverade kunskapsområden')
    expect(html).toContain('Lägsta belagda')
    expect(html).toContain('+*/ genomsnitt')
    expect(html).toContain('2/4 grundräknesätt har belagd nivå; genomsnitt visas när alla fyra har underlag')
    expect(html).toContain('0/4 grundräknesätt har belagd nivå; genomsnitt visas när alla fyra har underlag')
    expect(html).toContain('Exempel på nivå 2: 17 − 8')
    expect(html).toContain('Exempel på nivå 4: 4,2 + 1,4')
    expect(html).not.toContain('>0<')
  })
})
