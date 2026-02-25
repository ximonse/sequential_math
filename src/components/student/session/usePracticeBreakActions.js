import { useCallback } from 'react'
import { saveProfile } from '../../../lib/storage'
import {
  getOperationAbility,
  recordSteadyAdvanceDecision,
  setOperationAbility
} from '../../../lib/difficultyAdapter'
import {
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../../lib/telemetry'
import {
  createTableProblem,
  DEFAULT_BREAK_MINUTES,
  markDailyBossShown
} from './sessionUtils'

export function usePracticeBreakActions({
  profile,
  advancePrompt,
  tableMilestone,
  tableQueue,
  sessionCount,
  studentId,
  navigate,
  openTableBossVideo,
  sessionTelemetryRef,
  sessionRecentCorrectnessRef,
  goToNextProblem,
  resetAttentionTracker,
  setAdvancePrompt,
  setActiveBreakGame,
  setShowBreakSuggestion,
  setPendingBreakSuggestion,
  setBreakDurationMinutes,
  setSessionCount,
  setTableMilestone,
  setCurrentProblem,
  setAnswer,
  setFeedback,
  setStartTime
}) {
  const handleAdvanceDecision = useCallback((accepted) => {
    if (!profile || !advancePrompt) return
    const now = Date.now()
    recordSteadyAdvanceDecision(profile, advancePrompt, accepted)
    if (accepted) {
      profile.currentDifficulty = Math.max(profile.currentDifficulty, advancePrompt.nextLevel)
      profile.highestDifficulty = Math.max(profile.highestDifficulty || 1, profile.currentDifficulty)
      if (advancePrompt.operation) {
        const current = getOperationAbility(profile, advancePrompt.operation)
        setOperationAbility(profile, advancePrompt.operation, Math.max(current, advancePrompt.nextLevel))
      }
    }
    recordTelemetryEvent(profile, 'steady_advance_decision', {
      sessionId: sessionTelemetryRef.current?.sessionId || '',
      accepted,
      operation: advancePrompt.operation,
      fromLevel: advancePrompt.fromLevel,
      nextLevel: advancePrompt.nextLevel
    }, now)
    incrementTelemetryDailyMetric(profile, accepted ? 'steady_advances_accepted' : 'steady_advances_declined', 1, now)
    saveProfile(profile)
    setAdvancePrompt(null)
    goToNextProblem()
  }, [profile, advancePrompt, sessionTelemetryRef, setAdvancePrompt, goToNextProblem])

  const handleTakeBreak = useCallback(() => {
    if (profile) {
      const now = Date.now()
      recordTelemetryEvent(profile, 'break_taken_to_home', {
        sessionId: sessionTelemetryRef.current?.sessionId || '',
        answered: sessionTelemetryRef.current?.answered || sessionCount
      }, now)
      incrementTelemetryDailyMetric(profile, 'breaks_taken', 1, now)
      saveProfile(profile)
    }
    setActiveBreakGame(null)
    setShowBreakSuggestion(false)
    setPendingBreakSuggestion(false)
    setBreakDurationMinutes(DEFAULT_BREAK_MINUTES)
    sessionRecentCorrectnessRef.current = []
    navigate(`/student/${studentId}`)
  }, [
    profile,
    sessionTelemetryRef,
    sessionCount,
    sessionRecentCorrectnessRef,
    navigate,
    studentId,
    setActiveBreakGame,
    setShowBreakSuggestion,
    setPendingBreakSuggestion,
    setBreakDurationMinutes
  ])

  const goToNextProblemAfterBreakSuggestion = useCallback(() => {
    if (profile) {
      const now = Date.now()
      recordTelemetryEvent(profile, 'break_skipped_continue', {
        sessionId: sessionTelemetryRef.current?.sessionId || '',
        answered: sessionTelemetryRef.current?.answered || sessionCount
      }, now)
      incrementTelemetryDailyMetric(profile, 'breaks_skipped', 1, now)
      saveProfile(profile)
    }
    setActiveBreakGame(null)
    setShowBreakSuggestion(false)
    setSessionCount(0)
    setBreakDurationMinutes(DEFAULT_BREAK_MINUTES)
    sessionRecentCorrectnessRef.current = []
    goToNextProblem()
  }, [
    profile,
    sessionTelemetryRef,
    sessionCount,
    sessionRecentCorrectnessRef,
    goToNextProblem,
    setActiveBreakGame,
    setShowBreakSuggestion,
    setSessionCount,
    setBreakDurationMinutes
  ])

  const closeBreakGameAndContinue = useCallback((gameType) => {
    if (profile) {
      const now = Date.now()
      recordTelemetryEvent(profile, `break_${gameType}_closed`, {
        sessionId: sessionTelemetryRef.current?.sessionId || ''
      }, now)
      incrementTelemetryDailyMetric(profile, `break_${gameType}_closed`, 1, now)
      saveProfile(profile)
    }
    setActiveBreakGame(null)
    setShowBreakSuggestion(false)
    setSessionCount(0)
    setBreakDurationMinutes(DEFAULT_BREAK_MINUTES)
    sessionRecentCorrectnessRef.current = []
    goToNextProblem()
  }, [
    profile,
    sessionTelemetryRef,
    sessionRecentCorrectnessRef,
    goToNextProblem,
    setActiveBreakGame,
    setShowBreakSuggestion,
    setSessionCount,
    setBreakDurationMinutes
  ])

  const openBreakGame = useCallback((gameType) => {
    if (profile) {
      const now = Date.now()
      recordTelemetryEvent(profile, `break_${gameType}_opened`, {
        sessionId: sessionTelemetryRef.current?.sessionId || ''
      }, now)
      incrementTelemetryDailyMetric(profile, `break_${gameType}_opened`, 1, now)
      saveProfile(profile)
    }
    setActiveBreakGame(gameType)
  }, [profile, sessionTelemetryRef, setActiveBreakGame])

  const continueAfterMilestone = useCallback(() => {
    if (!tableMilestone || !profile) return

    if (tableMilestone.masteredTwoToNineToday) {
      openTableBossVideo()
      markDailyBossShown(profile)
      saveProfile(profile)
      const finalizeAfter = tableMilestone.finalizeAfter
      setTableMilestone(null)
      if (finalizeAfter) {
        navigate(`/student/${studentId}`)
      } else if (tableQueue.length > 0) {
        const nextProblem = createTableProblem(tableQueue[0])
        setCurrentProblem(nextProblem)
        setAnswer('')
        setFeedback(null)
        resetAttentionTracker()
        setStartTime(Date.now())
      }
      return
    }

    const finalizeAfter = tableMilestone.finalizeAfter
    setTableMilestone(null)
    if (finalizeAfter) {
      navigate(`/student/${studentId}`)
      return
    }
    if (tableQueue.length > 0) {
      const nextProblem = createTableProblem(tableQueue[0])
      setCurrentProblem(nextProblem)
      setAnswer('')
      setFeedback(null)
      resetAttentionTracker()
      setStartTime(Date.now())
    }
  }, [
    tableMilestone,
    profile,
    openTableBossVideo,
    tableQueue,
    navigate,
    studentId,
    resetAttentionTracker,
    setTableMilestone,
    setCurrentProblem,
    setAnswer,
    setFeedback,
    setStartTime
  ])

  return {
    handleAdvanceDecision,
    handleTakeBreak,
    goToNextProblemAfterBreakSuggestion,
    closeBreakGameAndContinue,
    openBreakGame,
    continueAfterMilestone
  }
}
