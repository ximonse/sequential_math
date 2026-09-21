import { ADAPTATION_ACTIONS } from '../../../lib/adaptationDecision'
import { TRAINING_MODES } from '../../../lib/trainingContext'

export function buildSessionOverlayProps({
  activeBreakGame,
  showBreakSuggestion,
  tableMilestone,
  ncmCompletedSession,
  sessionAssignmentKind,
  progressionMilestone,
  feedback,
  dailyLevelStreakMilestone,
  sessionCount,
  breakDurationMinutes,
  openBreakGame,
  handleTakeBreak,
  goToNextProblemAfterBreakSuggestion,
  continueAfterMilestone,
  ncmTotalCount,
  ncmRemainingCount,
  goHome,
  searchParams,
  setProgressionMilestone,
  setDailyLevelStreakMilestone,
  navigate,
  studentId,
  studentName,
  classId,
  goToNextProblem,
  closeBreakGameAndContinue,
  tableBossUrl,
  allTablesBossUrl
}) {
  const shouldRenderOverlay = Boolean(
    activeBreakGame
    || showBreakSuggestion
    || tableMilestone
    || dailyLevelStreakMilestone
    || (ncmCompletedSession && sessionAssignmentKind === 'ncm')
    || (progressionMilestone && feedback)
  )
  if (!shouldRenderOverlay) return null

  return {
    activeBreakGame,
    showBreakSuggestion,
    sessionCount,
    breakDurationMinutes,
    onOpenPong: () => openBreakGame('pong'),
    onOpenSnake: () => openBreakGame('snake'),
    onTakeBreak: handleTakeBreak,
    onContinueAfterBreakSuggestion: goToNextProblemAfterBreakSuggestion,
    tableMilestone,
    onContinueAfterMilestone: continueAfterMilestone,
    ncmCompletedSession,
    sessionAssignmentKind,
    ncmTotalCount,
    ncmRemainingCount,
    onGoHomeAfterNcm: goHome,
    progressionMilestone,
    feedback,
    dailyLevelStreakMilestone,
    onContinueAfterDailyLevelStreak: () => setDailyLevelStreakMilestone(null),
    onContinueAfterProgression: () => {
      const decision = progressionMilestone
      setProgressionMilestone(null)
      if (
        decision?.trainingMode === TRAINING_MODES.LEVEL_FOCUS
        && decision?.action === ADAPTATION_ACTIONS.ADVANCE
        && Number.isInteger(Number(decision.nextLevel))
      ) {
        const params = new URLSearchParams(searchParams)
        params.set('level', String(decision.nextLevel))
        navigate(`/student/${studentId}/practice?${params.toString()}`, { replace: true })
        return
      }
      if (
        decision?.trainingMode === TRAINING_MODES.LEVEL_FOCUS
        && decision?.action === ADAPTATION_ACTIONS.COMPLETE_DOMAIN
      ) {
        goHome()
        return
      }
      goToNextProblem()
    },
    tableBossUrl,
    allTablesBossUrl,
    onCloseBreakGame: closeBreakGameAndContinue,
    studentId,
    studentName,
    classId
  }
}
