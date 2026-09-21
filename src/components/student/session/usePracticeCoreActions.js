import { useCallback } from 'react'
import { saveProfile } from '../../../lib/storage'
import { addProblemResult } from '../../../lib/studentProfile'
import { createWalEntry, appendToWal } from '../../../lib/syncWal'
import { getPilotStudentRuntime, normalizePilotStudentId } from '../../../lib/pilotStudentRuntime'
import {
  adjustDifficulty,
  shouldSuggestBreak
} from '../../../lib/difficultyAdapter'
import {
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../../lib/telemetry'
import { buildProblemNoveltyDescriptor, scoreCandidateNovelty } from '../../../lib/problemNovelty'
import { resolveProblemOperation } from '../../../lib/mathUtils'
import { buildTrainingContext } from '../../../lib/trainingContext'
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
  shouldTriggerAllTablesBoss,
  shouldTriggerDailyBoss
} from './sessionUtils'

const BREAK_PROMPT_COOLDOWN_MS = 8 * 60 * 1000
const NEXT_PROBLEM_MAX_ATTEMPTS = 8
const NOVELTY_ACCEPT_SCORE = 2
const NOVELTY_HISTORY_WINDOW = 8

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
  setProgressionMilestone,
  setTableQueue,
  setTableMilestone,
  setLastBreakPromptAt,
  setDailyLevelStreakMilestone,
  freeOps = [],
  persistProfile
}) {
  const isPilotStudent = Boolean(normalizePilotStudentId(profile?.studentId))
  const goToNextProblem = useCallback(() => {
    if (!profile) return

    if (pendingBreakSuggestion) {
      const now = Date.now()
      recordTelemetryEvent(profile, 'break_prompt_shown', {
        sessionId: sessionTelemetryRef.current?.sessionId || '',
        afterAnswers: sessionTelemetryRef.current?.answered || sessionCount
      }, now)
      incrementTelemetryDailyMetric(profile, 'break_prompts_shown', 1, now)
      void persistProfile(profile)
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
      fixedPracticeLevel,
      freeOps,
      profile
    )

    const recentHistory = [
      ...(Array.isArray(profile?.recentProblems) ? profile.recentProblems.slice(-NOVELTY_HISTORY_WINDOW) : []),
      currentProblem
    ].filter(Boolean)
    const currentDescriptor = currentProblem
      ? buildProblemNoveltyDescriptor(currentProblem)
      : null

    let nextProblem = null
    let bestScore = Number.POSITIVE_INFINITY
    let blockedImmediateRepeat = null
    for (let attempt = 0; attempt < NEXT_PROBLEM_MAX_ATTEMPTS; attempt++) {
      const candidate = safeSelectProblem(profile, rules)
      if (!candidate) continue

      const noveltyScore = scoreCandidateNovelty(candidate, recentHistory, {
        historyWindow: NOVELTY_HISTORY_WINDOW
      })
      const candidateDescriptor = buildProblemNoveltyDescriptor(candidate)
      const isImmediateExactRepeat = Boolean(
        currentDescriptor?.exactKey
        && candidateDescriptor?.exactKey
        && currentDescriptor.exactKey === candidateDescriptor.exactKey
      )

      if (isImmediateExactRepeat) {
        if (!blockedImmediateRepeat || noveltyScore < blockedImmediateRepeat.score) {
          blockedImmediateRepeat = {
            problem: candidate,
            score: noveltyScore
          }
        }
        continue
      }

      if (noveltyScore < bestScore) {
        bestScore = noveltyScore
        nextProblem = candidate
      }

      if (noveltyScore <= NOVELTY_ACCEPT_SCORE) break
    }
    if (!nextProblem && blockedImmediateRepeat) {
      nextProblem = blockedImmediateRepeat.problem
    }
    if (!nextProblem) return
    setCurrentProblem(nextProblem)
    setAnswer('')
    setFeedback(null)
    resetAttentionTracker()
    setStartTime(Date.now())
  }, [
    profile,
    currentProblem,
    pendingBreakSuggestion,
    sessionAssignment,
    mode,
    sessionWarmup,
    completedThisSession,
    tableSet,
    progressionMode,
    fixedPracticeLevel,
    freeOps,
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
    setStartTime,
    persistProfile
  ])

  const handleSubmit = useCallback(async () => {
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

    const interruption = finalizeAttentionSnapshot(attentionRef.current)
    const mixedMode = isMixedTrainingSession(mode, sessionAssignment, isTableDrill)
    const trainingContext = buildTrainingContext({
      sessionId: sessionTelemetryRef.current?.sessionId || '',
      assignment: sessionAssignment,
      mode: isKnownMode(mode) ? mode : '',
      fixedLevel: fixedPracticeLevel,
      isTableDrill,
      tableSet,
      freeOps,
      progressionMode
    })
    const { correct, result, walEntries } = addProblemResult(
      profile,
      currentProblem,
      studentAnswer,
      timeSpent,
      {
        rawAnswer: normalizedAnswer,
        interruption,
        isMixedMode: mixedMode,
        trainingContext
      }
    )
    const isPartial = Boolean(result?.isPartial)

    if (!isTableDrill && !isLevelFocusMode && !isPartial) {
      adjustDifficulty(profile, correct, {
        progressionMode,
        timeSpent: result.speedTimeSec,
        problem: currentProblem,
        errorCategory: result.errorCategory
      })
    }

    const progressionDecision = Array.isArray(walEntries)
      ? walEntries.find(entry => entry?.type === 'adaptation_decision')?.payload || null
      : null
    const masteryEvent = Array.isArray(walEntries)
      ? walEntries.find(entry => entry?.type === 'mastery_achieved')?.payload || null
      : null
    const levelMasteredNow = isLevelFocusMode && progressionDecision
      ? getOperationLevelMasteryStatus(profile, mode, fixedPracticeLevel)
      : null
    if (progressionDecision) {
      setProgressionMilestone({
        ...progressionDecision,
        attempts: Number(masteryEvent?.window?.attempts || 0),
        correct: Number(masteryEvent?.window?.correct || 0)
      })
      recordTelemetryEvent(profile, 'automatic_progression_decision', {
        sessionId: sessionTelemetryRef.current?.sessionId || '',
        decisionId: progressionDecision.decisionId,
        ruleVersion: progressionDecision.ruleVersion,
        action: progressionDecision.action,
        purpose: progressionDecision.purpose,
        operation: progressionDecision.operation,
        fromLevel: progressionDecision.fromLevel,
        nextLevel: progressionDecision.nextLevel,
        frameId: progressionDecision.frameId
      }, progressionDecision.decidedAt)
      incrementTelemetryDailyMetric(profile, 'automatic_progression_decisions', 1, progressionDecision.decidedAt)
    }

    const newCount = sessionCount + 1
    const updatedSessionCorrectness = [...sessionRecentCorrectnessRef.current, correct].slice(-10)
    sessionRecentCorrectnessRef.current = updatedSessionCorrectness
    setSessionCount(newCount)

    setFeedback({
      correct,
      correctAnswer: result.correctAnswer,
      studentAnswer,
      isPartial,
      partialCode: result.partialCode || '',
      partialDetail: result.partialDetail || '',
      hint: result.hint || ''
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
      if (isPartial) {
        sessionMeta.partial = Number(sessionMeta.partial || 0) + 1
      } else if (correct) {
        sessionMeta.correct += 1
      } else {
        sessionMeta.wrong += 1
      }
    }

	    incrementTelemetryDailyMetric(profile, 'practice_answers', 1, answerTs)
    if (isPartial) {
      incrementTelemetryDailyMetric(profile, 'practice_partial', 1, answerTs)
    } else {
      incrementTelemetryDailyMetric(profile, correct ? 'practice_correct' : 'practice_wrong', 1, answerTs)
    }
	    const currentOperation = resolveProblemOperation(currentProblem, { fallback: '' })
	    recordTelemetryEvent(profile, 'practice_answer', {
	      sessionId: sessionMeta?.sessionId || '',
	      correct,
	      partial: isPartial,
	      problemType: currentProblem.template || currentProblem.problemType || '',
	      operation: currentOperation,
      skillTag: result?.skillTag || '',
      errorCategory: result?.errorCategory || '',
      partialCode: result?.partialCode || '',
      speedTimeSec: Number.isFinite(Number(result?.speedTimeSec))
        ? Number(Number(result.speedTimeSec).toFixed(2))
        : null,
	      excludedFromSpeed: Boolean(result?.excludedFromSpeed),
	      progressionMode,
      trainingMode: trainingContext.mode,
      trainingSource: trainingContext.source,
      assignmentId: trainingContext.assignmentId
    }, answerTs)

	    if (levelMasteredNow) {
	      recordTelemetryEvent(profile, 'level_focus_mastered', {
	        sessionId: sessionMeta?.sessionId || '',
	        operation: mode || currentOperation,
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

    const pilotEvents = []
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
          if (profile.studentId) {
            const timestamp = profile.tableDrill?.completions?.at(-1)?.timestamp
            const tableEvent = createWalEntry('table_completed', profile.studentId, { table: currentItem.table, timestamp })
            if (isPilotStudent) pilotEvents.push(tableEvent)
            else appendToWal(tableEvent)
          }
          const remainingTables = Array.from(new Set(nextQueue.map(item => item.table)))
          const allTablesBoss = shouldTriggerAllTablesBoss(profile)
          setTableMilestone({
            table: currentItem.table,
            remainingTablesCount: remainingTables.length,
            completionCountToday,
            masteredAllTablesToday: allTablesBoss,
            masteredTwoToNineToday: !allTablesBoss && shouldTriggerDailyBoss(profile, [2, 3, 4, 5, 6, 7, 8, 9]),
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
      }
    }

    // Pilotens krypterade valv skrivs före nätverkssynk. Den äldre WAL:en
    // används bara av den äldre inloggningen.
    if (Array.isArray(walEntries) && profile.studentId) {
      for (const we of walEntries) {
        const event = createWalEntry(we.type, profile.studentId, we.payload)
        if (isPilotStudent) pilotEvents.push(event)
        else appendToWal(event)
      }
    }

    const shouldForceSync = Boolean(progressionDecision) || isTableDrill
    if (isPilotStudent) {
      const runtime = getPilotStudentRuntime()
      for (const event of pilotEvents) {
        await runtime.persistEvent(profile, event)
      }
      if (pilotEvents.length === 0) await persistProfile(profile, shouldForceSync ? { forceSync: true } : undefined)
    } else saveProfile(profile, shouldForceSync ? { forceSync: true } : undefined)
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
    tableSet,
    freeOps,
    sessionCount,
    sessionRecentCorrectnessRef,
    sessionTelemetryRef,
    ncmQueueRef,
    ncmTotalRef,
    tableQueue,
    lastBreakPromptAt,
    setProgressionMilestone,
    setSessionCount,
    setFeedback,
    setNcmRemainingCount,
    setTableQueue,
    setTableMilestone,
    setPendingBreakSuggestion,
    setBreakDurationMinutes,
    setLastBreakPromptAt,
    setDailyLevelStreakMilestone,
    isPilotStudent,
    persistProfile
  ])

  return {
    goToNextProblem,
    handleSubmit
  }
}
