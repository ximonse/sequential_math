import BreakGameOverlay from '../BreakGameOverlay'
import BreakPrompt from '../BreakPrompt'
import MilestoneOverlay from '../MilestoneOverlay'
import NcmCompletionOverlay from '../NcmCompletionOverlay'
import ProgressionMilestoneOverlay from '../ProgressionMilestoneOverlay'
import DailyLevelStreakOverlay from '../DailyLevelStreakOverlay'

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
  dailyLevelStreakMilestone,
  onContinueAfterDailyLevelStreak,
  ncmCompletedSession,
  sessionAssignmentKind,
  ncmTotalCount,
  ncmRemainingCount,
  onGoHomeAfterNcm,
  progressionMilestone,
  feedback,
  onContinueAfterProgression,
  tableBossUrl,
  allTablesBossUrl,
  onCloseBreakGame,
  studentId,
  studentName,
  classId
}) {
  if (activeBreakGame) {
    return (
      <BreakGameOverlay
        activeBreakGame={activeBreakGame}
        onClose={onCloseBreakGame}
        studentId={studentId}
        studentName={studentName}
        classId={classId}
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
        allTablesBossUrl={allTablesBossUrl}
        onContinue={onContinueAfterMilestone}
      />
    )
  }

  if (dailyLevelStreakMilestone) {
    return (
      <DailyLevelStreakOverlay
        milestone={dailyLevelStreakMilestone}
        onContinue={onContinueAfterDailyLevelStreak}
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

  if (progressionMilestone && feedback) {
    return (
      <ProgressionMilestoneOverlay
        milestone={progressionMilestone}
        onContinue={onContinueAfterProgression}
      />
    )
  }

  return null
}

export default SessionOverlayRouter
