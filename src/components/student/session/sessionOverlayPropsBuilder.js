export function buildSessionOverlayProps({
  activeBreakGame,
  showBreakSuggestion,
  tableMilestone,
  ncmCompletedSession,
  sessionAssignmentKind,
  advancePrompt,
  feedback,
  levelFocusMilestone,
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
  handleAdvanceDecision,
  searchParams,
  setLevelFocusMilestone,
  setDailyLevelStreakMilestone,
  navigate,
  studentId,
  goToNextProblem,
  closeBreakGameAndContinue,
  tableBossUrl
}) {
  const shouldRenderOverlay = Boolean(
    activeBreakGame
    || showBreakSuggestion
    || tableMilestone
    || dailyLevelStreakMilestone
    || (ncmCompletedSession && sessionAssignmentKind === 'ncm')
    || (advancePrompt && feedback)
    || (levelFocusMilestone && feedback)
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
    advancePrompt,
    feedback,
    onAdvanceAccept: () => handleAdvanceDecision(true),
    onAdvanceDecline: () => handleAdvanceDecision(false),
    dailyLevelStreakMilestone,
    onContinueAfterDailyLevelStreak: () => setDailyLevelStreakMilestone(null),
    levelFocusMilestone,
    onPracticeNextLevel: (nextLevel) => {
      const params = new URLSearchParams(searchParams)
      params.set('level', String(nextLevel))
      setLevelFocusMilestone(null)
      navigate(`/student/${studentId}/practice?${params.toString()}`, { replace: true })
    },
    onStayCurrentLevel: () => {
      setLevelFocusMilestone(null)
      goToNextProblem()
    },
    onGoHomeFromLevelFocus: goHome,
    tableBossUrl,
    onCloseBreakGame: closeBreakGameAndContinue
  }
}
