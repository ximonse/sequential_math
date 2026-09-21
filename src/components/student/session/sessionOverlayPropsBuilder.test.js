import { describe, expect, it, vi } from 'vitest'
import { buildSessionOverlayProps } from './sessionOverlayPropsBuilder'

function build(overrides = {}) {
  const navigate = vi.fn()
  const goToNextProblem = vi.fn()
  const goHome = vi.fn()
  const setProgressionMilestone = vi.fn()
  const props = buildSessionOverlayProps({
    activeBreakGame: null,
    showBreakSuggestion: false,
    tableMilestone: null,
    ncmCompletedSession: false,
    sessionAssignmentKind: '',
    progressionMilestone: {
      action: 'advance',
      trainingMode: 'level_focus',
      nextLevel: 4
    },
    feedback: { correct: true },
    dailyLevelStreakMilestone: null,
    sessionCount: 5,
    breakDurationMinutes: 1,
    openBreakGame: vi.fn(),
    handleTakeBreak: vi.fn(),
    goToNextProblemAfterBreakSuggestion: vi.fn(),
    continueAfterMilestone: vi.fn(),
    ncmTotalCount: 0,
    ncmRemainingCount: 0,
    goHome,
    searchParams: new URLSearchParams('mode=addition&level=3'),
    setProgressionMilestone,
    setDailyLevelStreakMilestone: vi.fn(),
    navigate,
    studentId: 'ELEV1',
    studentName: 'Ada',
    classId: 'CLASS1',
    goToNextProblem,
    closeBreakGameAndContinue: vi.fn(),
    tableBossUrl: '',
    allTablesBossUrl: '',
    ...overrides
  })
  return { props, navigate, goToNextProblem, goHome, setProgressionMilestone }
}

describe('automatic progression overlay', () => {
  it('continues level focus at the already-decided next level', () => {
    const { props, navigate, setProgressionMilestone } = build()

    props.onContinueAfterProgression()

    expect(setProgressionMilestone).toHaveBeenCalledWith(null)
    expect(navigate).toHaveBeenCalledWith(
      '/student/ELEV1/practice?mode=addition&level=4',
      { replace: true }
    )
  })

  it('continues inside a teacher frame without changing level', () => {
    const { props, navigate, goToNextProblem } = build({
      progressionMilestone: {
        action: 'hold_frame',
        trainingMode: 'teacher_locked',
        nextLevel: null
      }
    })

    props.onContinueAfterProgression()

    expect(navigate).not.toHaveBeenCalled()
    expect(goToNextProblem).toHaveBeenCalledOnce()
  })
})
