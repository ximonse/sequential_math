import BreakGameOverlay from '../BreakGameOverlay'
import BreakPrompt from '../BreakPrompt'
import MilestoneOverlay from '../MilestoneOverlay'
import NcmCompletionOverlay from '../NcmCompletionOverlay'
import ProgressionMilestoneOverlay from '../ProgressionMilestoneOverlay'
import DailyLevelStreakOverlay from '../DailyLevelStreakOverlay'
import FluencyTopLevelChoice from '../FluencyTopLevelChoice'

function SessionOverlayRouter({
  activeBreakGame,
  showBreakSuggestion,
  sessionCount,
  breakDurationMinutes,
  onOpenPong,
  onOpenSnake,
  onOpenFocus,
  breakGames,
  onTakeBreak,
  onContinueAfterBreakSuggestion,
  tableMilestone,
  onContinueAfterMilestone,
  dailyLevelStreakMilestone,
  onContinueAfterDailyLevelStreak,
  ncmCompletedSession,
  fluencyCompleted,
  fluencyTotal,
  fluencyTopChoice,
  fluencyStartLevel,
  onRestartFluencyLap,
  onQuitAfterFluencyTop,
  assignmentDone,
  assignmentTitle,
  assignmentTarget,
  nextAssignment,
  onNextAssignment,
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
        onOpenFocus={onOpenFocus}
        showGames={breakGames}
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
        onGoHome={onGoHomeAfterNcm}
      />
    )
  }

  if (dailyLevelStreakMilestone) {
    return (
      <DailyLevelStreakOverlay
        milestone={dailyLevelStreakMilestone}
        onContinue={onContinueAfterDailyLevelStreak}
        onGoHome={onGoHomeAfterNcm}
      />
    )
  }

  // After a pause game the pupil returns here, so the choice still has to be made.
  if (fluencyTopChoice) {
    return (
      <FluencyTopLevelChoice
        startLevel={fluencyStartLevel}
        showGames={breakGames}
        onRestart={onRestartFluencyLap}
        onOpenPong={onOpenPong}
        onOpenSnake={onOpenSnake}
        onQuit={onQuitAfterFluencyTop}
      />
    )
  }

  if (assignmentDone) {
    return (
      <NcmCompletionOverlay
        solved={sessionAssignmentKind === 'table' ? null : assignmentTarget}
        total={assignmentTarget}
        title={`${assignmentTitle || 'Uppdraget'} är klart!`}
        onGoHome={onGoHomeAfterNcm}
        nextAssignment={nextAssignment}
        onNextAssignment={onNextAssignment}
      />
    )
  }

  if (fluencyCompleted) {
    return (
      <NcmCompletionOverlay
        solved={fluencyTotal}
        total={fluencyTotal}
        title="Starkt jobbat! Övningen är klar"
        onGoHome={onGoHomeAfterNcm}
        onRestart={onRestartFluencyLap}
        nextAssignment={nextAssignment}
        onNextAssignment={onNextAssignment}
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
        nextAssignment={nextAssignment}
        onNextAssignment={onNextAssignment}
      />
    )
  }

  if (progressionMilestone && feedback) {
    return (
      <ProgressionMilestoneOverlay
        milestone={progressionMilestone}
        onContinue={onContinueAfterProgression}
        onGoHome={onGoHomeAfterNcm}
      />
    )
  }

  return null
}

export default SessionOverlayRouter
