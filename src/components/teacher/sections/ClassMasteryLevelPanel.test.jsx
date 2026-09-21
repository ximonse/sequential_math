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
          teacherSummary: { effectiveLevels: { addition: 4 } }
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
    expect(html).toContain('Snitt belagt')
    expect(html).toContain('1/9 områden har belagd nivå')
    expect(html).toContain('0/9 områden har belagd nivå')
    expect(html).not.toContain('>0<')
  })
})
