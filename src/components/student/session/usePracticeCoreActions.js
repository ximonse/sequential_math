import { useCallback } from 'react'
import { saveProfile } from '../../../lib/storage'
import { addProblemResult } from '../../../lib/studentProfile'
import {
  adjustDifficulty,
  shouldOfferSteadyAdvance,
  shouldSuggestBreak
} from '../../../lib/difficultyAdapter'
import {
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../../lib/telemetry'
import {
  createTableProblem,
  finalizeAttentionSnapshot,
  getBreakPolicy,
  getOperationLevelMasteryStatus,
  getSessionRules,
  isKnownMode,
  isMixedTrainingSession,
  markNcmSkillCompleted,
  recordTableCompletion,
  shouldTriggerDailyBoss
} from './sessionUtils'

const BREAK_PROMPT_COOLDOWN_MS = 8 * 60 * 1000

export function usePracticeCoreActions({
  profile,
  currentProblem,
  answer,
  startTime,
  mode,
  fixedPracticeLevel,
  progressionMode,
  isLevelFocusMode,
  isTableDrill,
  tableQueue,
  sessionAssignment,
  sessionWarmup,
  completedThisSession,
  tableSet,
  pendingBreakSuggestion,
  sessionCount,
  lastBreakPromptAt,
  resetAttentionTracker,
  safeSelectProblem,
  sessionTelemetryRef,
  sessionRecentCorrectnessRef,
  attentionRef,
  ncmQueueRef,
  ncmTotalRef,
  setCurrentProblem,
  setAnswer,
  setFeedback,
  setStartTime,
  setSessionCount,
  setShowBreakSuggestion,
  setPendingBreakSuggestion,
  setBreakDurationMinutes,
  setNcmCompletedSession,
  setNcmRemainingCount,
  setLevelFocusMilestone,
  setTableQueue,
  setTableMilestone,
  setAdvancePrompt,
  setLastBreakPromptAt,
  setDailyLevelStreakMilestone
}) {
  const goToNextProblem = useCallback(() => {
    if (!profile) return

    if (pendingBreakSuggestion) {
      const now = Date.now()
      recordTelemetryEvent(profile, 'break_prompt_shown', {
        sessionId: sessionTelemetryRef.current?.sessionId || '',
        afterAnswers: sessionTelemetryRef.current?.answered || sessionCount
      }, now)
      incrementTelemetryDailyMetric(profile, 'break_prompts_shown', 1, now)
      saveProfile(profile)
      setPendingBreakSuggestion(false)
      setShowBreakSuggestion(true)
      return
    }

    if (
      sessionAssignment?.kind === 'ncm'
      && ncmTotalRef.current > 0
      && ncmQueueRef.current.length === 0
    ) {
      setNcmCompletedSession(true)
      setCurrentProblem(null)
      setFeedback(null)
      setAnswer('')
      return
    }

    if (isTableDrill) {
      if (tableQueue.length === 0) return
      const nextProblem = createTableProblem(tableQueue[0])
      setCurrentProblem(nextProblem)
      setAnswer('')
      setFeedback(null)
      resetAttentionTracker()
      setStartTime(Date.now())
      return
    }

    const rules = getSessionRules(
      sessionAssignment,
      mode,
      sessionWarmup,
      completedThisSession,
      tableSet,
      progressionMode,
      fixedPracticeLevel
    )
    const nextProblem = safeSelectProblem(profile, rules)
    if (!nextProblem) return
    setCurrentProblem(nextProblem)
    setAnswer('')
    setFeedback(null)
    resetAttentionTracker()
    setStartTime(Date.now())
  }, [
    profile,
    pendingBreakSuggestion,
    sessionAssignment,
    mode,
    sessionWarmup,
    completedThisSession,
    tableSet,
    progressionMode,
    fixedPracticeLevel,
    isTableDrill,
    tableQueue,
    resetAttentionTracker,
    sessionCount,
    safeSelectProblem,
    sessionTelemetryRef,
    ncmQueueRef,
    ncmTotalRef,
    setPendingBreakSuggestion,
    setShowBreakSuggestion,
    setNcmCompletedSession,
    setCurrentProblem,
    setFeedback,
    setAnswer,
    setStartTime
  ])

  const handleSubmit = useCallback(() => {
    if (!profile || !currentProblem || answer.trim() === '') return

    const timeSpent = (Date.now() - startTime) / 1000
    const isExpressionAnswer = currentProblem?.answer?.type === 'expression'
    const isFractionAnswer = currentProblem?.answer?.type === 'fraction'
    const normalizedAnswer = answer.trim().replace(/,/g, '.')
    let studentAnswer
    if (isExpressionAnswer || isFractionAnswer) {
      studentAnswer = answer.trim()
    } else {
      if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalizedAnswer)) return
      studentAnswer = Number(normalizedAnswer)
      if (!Number.isFinite(studentAnswer)) return
    }

    const masteryBeforeLevelFocus = isLevelFocusMode
      ? getOperationLevelMasteryStatus(profile, mode, fixedPracticeLevel)
      : null

    const interruption = finalizeAttentionSnapshot(attentionRef.current)
    const mixedMode = isMixedTrainingSession(mode, sessionAssignment, isTableDrill)
    const { correct, result } = addProblemResult(
      profile,
      currentProblem,
      studentAnswer,
      timeSpent,
      {
        rawAnswer: normalizedAnswer,
        interruption,
        isMixedMode: mixedMode
      }
    )

    if (!isTableDrill && !isLevelFocusMode) {
      adjustDifficulty(profile, correct, {
        progressionMode,
        timeSpent: result.speedTimeSec,
        problem: currentProblem,
        errorCategory: result.errorCategory
      })
    }

    let levelMasteredNow = null
    if (isLevelFocusMode) {
      const masteryAfterLevelFocus = getOperationLevelMasteryStatus(profile, mode, fixedPracticeLevel)
      if (!masteryBeforeLevelFocus?.isMastered && masteryAfterLevelFocus.isMastered) {
        levelMasteredNow = masteryAfterLevelFocus
        setLevelFocusMilestone({
          operation: mode,
          level: fixedPracticeLevel,
          attempts: masteryAfterLevelFocus.attempts,
          correct: masteryAfterLevelFocus.correct
        })
      }
    }

    const newCount = sessionCount + 1
    const updatedSessionCorrectness = [...sessionRecentCorrectnessRef.current, correct].slice(-10)
    sessionRecentCorrectnessRef.current = updatedSessionCorrectness
    setSessionCount(newCount)

    setFeedback({
      correct,
      correctAnswer: result.correctAnswer,
      studentAnswer
    })

    const answerTs = Number(result?.timestamp || Date.now())
    if (sessionAssignment?.kind === 'ncm') {
      const solvedSkillTag = String(result?.skillTag || currentProblem?.metadata?.skillTag || '').trim()
      if (solvedSkillTag) {
        markNcmSkillCompleted(profile, sessionAssignment, solvedSkillTag, ncmTotalRef.current)
        if (Array.isArray(ncmQueueRef.current) && ncmQueueRef.current.length > 0) {
          ncmQueueRef.current = ncmQueueRef.current.filter(tag => tag !== solvedSkillTag)
          setNcmRemainingCount(ncmQueueRef.current.length)
        }
      }
    }

    const sessionMeta = sessionTelemetryRef.current
    if (sessionMeta) {
      sessionMeta.answered += 1
      if (correct) {
        sessionMeta.correct += 1
      } else {
        sessionMeta.wrong += 1
      }
    }

    incrementTelemetryDailyMetric(profile, 'practice_answers', 1, answerTs)
    incrementTelemetryDailyMetric(profile, correct ? 'practice_correct' : 'practice_wrong', 1, answerTs)
    recordTelemetryEvent(profile, 'practice_answer', {
      sessionId: sessionMeta?.sessionId || '',
      correct,
      problemType: currentProblem.template || currentProblem.problemType || '',
      operation: currentProblem.type || '',
      skillTag: result?.skillTag || '',
      errorCategory: result?.errorCategory || '',
      speedTimeSec: Number.isFinite(Number(result?.speedTimeSec))
        ? Number(Number(result.speedTimeSec).toFixed(2))
        : null,
      excludedFromSpeed: Boolean(result?.excludedFromSpeed),
      progressionMode
    }, answerTs)

    if (levelMasteredNow) {
      recordTelemetryEvent(profile, 'level_focus_mastered', {
        sessionId: sessionMeta?.sessionId || '',
        operation: mode || currentProblem.type || '',
        level: fixedPracticeLevel,
        attempts: levelMasteredNow.attempts,
        correct: levelMasteredNow.correct,
        successRate: Number(levelMasteredNow.successRate.toFixed(3))
      }, answerTs)
      const levelsToday = incrementTelemetryDailyMetric(profile, 'level_focus_mastered', 1, answerTs)
      if (levelsToday === 5) {
        setDailyLevelStreakMilestone({ count: levelsToday })
      }
    }

    let breakSuggested = false

    if (isTableDrill) {
      const currentItem = tableQueue[0]
      const nextQueue = tableQueue.slice(1)
      if (!correct && currentItem) {
        nextQueue.push(currentItem)
      }
      setTableQueue(nextQueue)
      if (correct && currentItem) {
        const sameTableLeft = nextQueue.some(item => item.table === currentItem.table)
        if (!sameTableLeft) {
          const completionCountToday = recordTableCompletion(profile, currentItem.table)
          const remainingTables = Array.from(new Set(nextQueue.map(item => item.table)))
          setTableMilestone({
            table: currentItem.table,
            remainingTablesCount: remainingTables.length,
            completionCountToday,
            masteredTwoToNineToday: shouldTriggerDailyBoss(profile, [2, 3, 4, 5, 6, 7, 8, 9]),
            boss: completionCountToday >= 3,
            finalizeAfter: remainingTables.length === 0,
            finalCelebration: remainingTables.length === 0
          })
        }
      }
    } else if (!sessionAssignment) {
      const breakPolicy = getBreakPolicy(currentProblem, isTableDrill)
      const shouldPromptBreak = breakPolicy.enabled && shouldSuggestBreak(
        profile,
        newCount,
        updatedSessionCorrectness,
        {
          questionThreshold: breakPolicy.questionThreshold,
          recentWindow: breakPolicy.recentWindow,
          errorThreshold: breakPolicy.errorThreshold
        }
      )

      if (
        shouldPromptBreak
        && (lastBreakPromptAt === 0 || Date.now() - lastBreakPromptAt >= BREAK_PROMPT_COOLDOWN_MS)
      ) {
        recordTelemetryEvent(profile, 'break_prompt_queued', {
          sessionId: sessionMeta?.sessionId || '',
          answered: newCount,
          recentCorrect: updatedSessionCorrectness.filter(Boolean).length,
          recentTotal: updatedSessionCorrectness.length
        }, answerTs)
        setPendingBreakSuggestion(true)
        setBreakDurationMinutes(breakPolicy.recommendedBreakMinutes)
        setLastBreakPromptAt(Date.now())
        breakSuggested = true
      }
    }

    if (!isTableDrill && !sessionAssignment && !breakSuggested) {
      const offer = shouldOfferSteadyAdvance(profile, {
        progressionMode,
        operation: (mode && isKnownMode(mode)) ? mode : currentProblem.type
      })
      if (offer) {
        setAdvancePrompt(offer)
      }
    }

    saveProfile(profile, levelMasteredNow ? { forceSync: true } : undefined)
  }, [
    profile,
    currentProblem,
    answer,
    startTime,
    isLevelFocusMode,
    mode,
    fixedPracticeLevel,
    attentionRef,
    sessionAssignment,
    isTableDrill,
    progressionMode,
    sessionCount,
    sessionRecentCorrectnessRef,
    sessionTelemetryRef,
    ncmQueueRef,
    ncmTotalRef,
    tableQueue,
    lastBreakPromptAt,
    setLevelFocusMilestone,
    setSessionCount,
    setFeedback,
    setNcmRemainingCount,
    setTableQueue,
    setTableMilestone,
    setPendingBreakSuggestion,
    setBreakDurationMinutes,
    setLastBreakPromptAt,
    setAdvancePrompt,
    setDailyLevelStreakMilestone
  ])

  return {
    goToNextProblem,
    handleSubmit
  }
}
