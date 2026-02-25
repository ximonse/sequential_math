import BreakGameOverlay from '../BreakGameOverlay'
import BreakPrompt from '../BreakPrompt'
import MilestoneOverlay from '../MilestoneOverlay'
import NcmCompletionOverlay from '../NcmCompletionOverlay'
import AdvancePromptOverlay from '../AdvancePromptOverlay'
import LevelFocusMilestoneOverlay from '../LevelFocusMilestoneOverlay'

function SessionOverlayRouter({
  activeBreakGame,
  showBreakSuggestion,
  sessionCount,
  breakDurationMinutes,
  onOpenPong,
  onOpenSnake,
  onTakeBreak,
  onContinueAfterBreakSuggestion,
  tableMilestone,
  onContinueAfterMilestone,
  ncmCompletedSession,
  sessionAssignmentKind,
  ncmTotalCount,
  ncmRemainingCount,
  onGoHomeAfterNcm,
  advancePrompt,
  feedback,
  onAdvanceAccept,
  onAdvanceDecline,
  levelFocusMilestone,
  onPracticeNextLevel,
  onStayCurrentLevel,
  onGoHomeFromLevelFocus,
  tableBossUrl,
  onCloseBreakGame
}) {
  if (activeBreakGame) {
    return (
      <BreakGameOverlay
        activeBreakGame={activeBreakGame}
        onClose={onCloseBreakGame}
      />
    )
  }

  if (showBreakSuggestion) {
    return (
      <BreakPrompt
        sessionCount={sessionCount}
        breakDurationMinutes={breakDurationMinutes}
        onOpenPong={onOpenPong}
        onOpenSnake={onOpenSnake}
        onTakeBreak={onTakeBreak}
        onContinue={onContinueAfterBreakSuggestion}
      />
    )
  }

  if (tableMilestone) {
    return (
      <MilestoneOverlay
        milestone={tableMilestone}
        tableBossUrl={tableBossUrl}
        onContinue={onContinueAfterMilestone}
      />
    )
  }

  if (ncmCompletedSession && sessionAssignmentKind === 'ncm') {
    const solved = Math.max(0, ncmTotalCount - ncmRemainingCount)
    return (
      <NcmCompletionOverlay
        solved={solved}
        total={ncmTotalCount}
        onGoHome={onGoHomeAfterNcm}
      />
    )
  }

  if (advancePrompt && feedback) {
    return (
      <AdvancePromptOverlay
        advancePrompt={advancePrompt}
        onAccept={onAdvanceAccept}
        onDecline={onAdvanceDecline}
      />
    )
  }

  if (levelFocusMilestone && feedback) {
    return (
      <LevelFocusMilestoneOverlay
        milestone={levelFocusMilestone}
        onPracticeNextLevel={onPracticeNextLevel}
        onStayCurrentLevel={onStayCurrentLevel}
        onGoHome={onGoHomeFromLevelFocus}
      />
    )
  }

  return null
}

export default SessionOverlayRouter
