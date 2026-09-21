import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SupportPriorityPanel from './SupportPriorityPanel'

describe('teacher support priority signal', () => {
  it('renders the actual incorrect answer and expected answer', () => {
    const onOpenStudentDetail = vi.fn()
    const onCreateQuickAssignment = vi.fn()
    const html = renderToStaticMarkup(<SupportPriorityPanel
      supportRows={[{
        studentId: 'SUP01',
        name: 'Support',
        classNameLabel: '6A',
        riskLevel: 'medium',
        riskCodes: ['Fortsatta fel i Addition nivå 2'],
        evidenceLabel: '1 visat felsvar från återhämtningen',
        nextAction: 'Granska felsvaret.',
        supportErrors: Array.from({ length: 6 }, (_, index) => ({
          observationId: `answer-${index + 1}`,
          promptText: `${index + 4} + 8`,
          studentAnswer: index + 10,
          correctAnswer: index + 12,
          level: 2
        }))
      }]}
      RiskBadgeComponent={({ level }) => <span>{level}</span>}
      onOpenStudentDetail={onOpenStudentDetail}
      onCreateQuickAssignment={onCreateQuickAssignment}
    />)

    expect(html).toContain('Fortsatta fel i Addition nivå 2')
    expect(html).toContain('4 + 8')
    expect(html).toContain('svar 10 (rätt: 12)')
    expect(html).toContain('9 + 8')
    expect(html).toContain('svar 15 (rätt: 17)')
    expect(onOpenStudentDetail).not.toHaveBeenCalled()
    expect(onCreateQuickAssignment).not.toHaveBeenCalled()
  })
})
