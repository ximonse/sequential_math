import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import ProblemDisplay from './ProblemDisplay'
import PongGame from './PongGame'
import SnakeGame from './SnakeGame'
import MathScratchpad from './MathScratchpad'
import {
  clearActiveStudentSession,
  getOrCreateProfileWithSync,
  isStudentSessionActive,
  saveProfile
} from '../../lib/storage'
import {
  addProblemResult,
  getCurrentStreak,
  getMasteryForOperation,
  getStartOfWeekTimestamp
} from '../../lib/studentProfile'
import {
  selectNextProblem,
  adjustDifficulty,
  recordSteadyAdvanceDecision,
  shouldOfferSteadyAdvance,
  shouldSuggestBreak,
  getOperationAbility,
  setOperationAbility
} from '../../lib/difficultyAdapter'
import { decodeAssignmentPayload, getActiveAssignment, getAssignmentById } from '../../lib/assignments'
import { inferOperationFromProblemType as inferOperationFromType } from '../../lib/mathUtils'
import { getOperationLabel } from '../../lib/operations'
import {
  PROGRESSION_MODE_STEADY,
  getProgressionModeLabel,
  normalizeProgressionMode
} from '../../lib/progressionModes'
import {
  markStudentPresence,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_SAVE_THROTTLE_MS
} from '../../lib/studentPresence'
import {
  addTelemetryDurationMs,
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../lib/telemetry'
import { filterNcmProblems } from '../../lib/ncmProblemBank'

const AUTO_CONTINUE_DELAY = 3000 // 3 sekunder
const TABLE_BOSS_URL = 'https://www.youtube.com/watch?v=6jevdk_u8g4'
const BREAK_PROMPT_COOLDOWN_MS = 8 * 60 * 1000
const DEFAULT_BREAK_MINUTES = 1
const SINGLE_DIGIT_BREAK_MINUTES = 2
const LEVEL_MASTERY_MIN_ATTEMPTS = 5
const LEVEL_MASTERY_MIN_SUCCESS_RATE = 0.8

function openTableBossVideo() {
  if (typeof window === 'undefined') return false
  try {
    const opened = window.open(TABLE_BOSS_URL, '_blank', 'noopener,noreferrer')
    return Boolean(opened)
  } catch {
    return false
  }
}

function StudentSession() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [profile, setProfile] = useState(null)
  const [currentProblem, setCurrentProblem] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false)
  const [pendingBreakSuggestion, setPendingBreakSuggestion] = useState(false)
  const [lastBreakPromptAt, setLastBreakPromptAt] = useState(0)
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(DEFAULT_BREAK_MINUTES)
  const [activeBreakGame, setActiveBreakGame] = useState(null)
  const [showScratchpad, setShowScratchpad] = useState(false)
  const [coarsePointer, setCoarsePointer] = useState(false)
  const [sessionAssignment, setSessionAssignment] = useState(null)
  const [sessionWarmup, setSessionWarmup] = useState(undefined)
  const [sessionError, setSessionError] = useState('')
  const [tableQueue, setTableQueue] = useState([])
  const [tableMilestone, setTableMilestone] = useState(null)
  const [levelFocusMilestone, setLevelFocusMilestone] = useState(null)
  const [advancePrompt, setAdvancePrompt] = useState(null)
  const inputRef = useRef(null)
  const attentionRef = useRef(createAttentionTracker())
  const sessionRecentCorrectnessRef = useRef([])
  const sessionTelemetryRef = useRef(null)
  const ncmQueueRef = useRef([])
  const ncmTotalRef = useRef(0)
  const presenceSyncRef = useRef({
    lastSavedAt: 0
  })
  const [ncmRemainingCount, setNcmRemainingCount] = useState(0)
  const [ncmCompletedSession, setNcmCompletedSession] = useState(false)

  const assignmentId = searchParams.get('assignment')
  const assignmentPayload = searchParams.get('assignment_payload')
  const mode = searchParams.get('mode')
  const progressionMode = normalizeProgressionMode(searchParams.get('pace'))
  const fixedPracticeLevel = parsePracticeLevel(searchParams.get('level'))
  const tableSet = useMemo(() => parseTableSet(searchParams.get('tables')), [searchParams])
  const isTableDrill = tableSet.length > 0
  const isLevelFocusMode = !isTableDrill
    && mode
    && isKnownMode(mode)
    && Number.isInteger(fixedPracticeLevel)

  const resetAttentionTracker = useCallback(() => {
    attentionRef.current = createAttentionTracker()
  }, [])

  // Ladda profil vid start
  useEffect(() => {
    if (!isStudentSessionActive(studentId)) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
      navigate(`/?redirect=${redirect}`, { replace: true })
      return undefined
    }

    let active = true
    ;(async () => {
      const loadedProfile = await getOrCreateProfileWithSync(studentId, null, 4, { createIfMissing: false })
      if (!active) return
      if (!loadedProfile) {
        clearActiveStudentSession()
        navigate('/', { replace: true })
        return
      }
      sessionRecentCorrectnessRef.current = []
      setProfile(loadedProfile)
    })()
    return () => { active = false }
  }, [studentId, navigate, location.pathname, location.search])

  useEffect(() => {
    if (mode && isKnownMode(mode)) {
      setSessionAssignment(null)
      return
    }
    if (tableSet.length > 0) {
      setSessionAssignment(null)
      return
    }
    const payloadAssignment = decodeAssignmentPayload(assignmentPayload)

    if (!assignmentId) {
      if (payloadAssignment) {
        setSessionAssignment(payloadAssignment)
        return
      }
      setSessionAssignment(getActiveAssignment())
      return
    }
    if (payloadAssignment && String(payloadAssignment.id) === String(assignmentId)) {
      setSessionAssignment(payloadAssignment)
      return
    }
    const assignment = getAssignmentById(assignmentId)
    setSessionAssignment(assignment)
  }, [assignmentId, assignmentPayload, mode, tableSet])

  useEffect(() => {
    if (!profile) return undefined
    if (sessionTelemetryRef.current) return undefined

    const startedAt = Date.now()
    const sessionId = makeSessionTelemetryId(studentId)
    sessionTelemetryRef.current = {
      sessionId,
      startedAt,
      answered: 0,
      correct: 0,
      wrong: 0
    }

    recordTelemetryEvent(profile, 'practice_session_start', {
      sessionId,
      mode: mode || '',
      assignmentId: assignmentId || '',
      progressionMode,
      tableSet
    }, startedAt)
    incrementTelemetryDailyMetric(profile, 'practice_sessions_started', 1, startedAt)
    saveProfile(profile)

    return () => {
      const meta = sessionTelemetryRef.current
      if (!meta) return
      const endedAt = Date.now()
      const durationMs = Math.max(0, endedAt - meta.startedAt)
      recordTelemetryEvent(profile, 'practice_session_end', {
        sessionId: meta.sessionId,
        answered: meta.answered,
        correct: meta.correct,
        wrong: meta.wrong,
        durationSec: Math.round(durationMs / 1000)
      }, endedAt)
      incrementTelemetryDailyMetric(profile, 'practice_sessions_ended', 1, endedAt)
      addTelemetryDurationMs(profile, 'practice_session_ms', durationMs, endedAt)
      saveProfile(profile, { forceSync: true })
      sessionTelemetryRef.current = null
    }
  }, [profile, studentId])

  useEffect(() => {
    if (!profile) return
    if (isTableDrill) {
      setSessionWarmup(null)
      return
    }
    if (!mode || !isKnownMode(mode)) {
      setSessionWarmup(null)
      return
    }

    const operationHistory = profile.recentProblems.filter(
      p => inferOperationFromType(p.problemType, { fallback: 'addition', allowUnknownPrefix: false }) === mode
    )
    const hasHistory = operationHistory.length > 0
    const estimatedLevel = estimateOperationLevel(profile, mode)
    const isSteadyMode = progressionMode === PROGRESSION_MODE_STEADY
    const warmupCount = isSteadyMode ? 4 : 3

    if (!hasHistory) {
      setSessionWarmup({
        operation: mode,
        targetLevel: 1,
        startLevel: 1,
        warmupCount
      })
      return
    }

    const roundedEstimatedLevel = Math.max(1, Math.min(12, Math.round(estimatedLevel)))
    const startDrop = isSteadyMode ? 3 : 1
    const targetDrop = isSteadyMode ? 1 : 0
    const startLevel = Math.max(1, roundedEstimatedLevel - startDrop)
    const targetLevel = Math.max(startLevel, roundedEstimatedLevel - targetDrop)
    setSessionWarmup({
      operation: mode,
      targetLevel,
      startLevel,
      warmupCount
    })
  }, [profile, mode, isTableDrill, progressionMode])

  useEffect(() => {
    if (!profile) return
    if (!isTableDrill) return

    const initialQueue = createTableQueue(tableSet)
    setTableQueue(initialQueue)
    setTableMilestone(null)
    setAdvancePrompt(null)
    setPendingBreakSuggestion(false)
    sessionRecentCorrectnessRef.current = []
    setCurrentProblem(initialQueue.length > 0 ? createTableProblem(initialQueue[0]) : null)
    setAnswer('')
    setFeedback(null)
    setSessionCount(0)
    resetAttentionTracker()
    setStartTime(Date.now())
  }, [profile, isTableDrill, tableSet, resetAttentionTracker])

  useEffect(() => {
    if (!profile || !sessionAssignment || sessionAssignment.kind !== 'ncm') {
      ncmQueueRef.current = []
      ncmTotalRef.current = 0
      setNcmRemainingCount(0)
      setNcmCompletedSession(false)
      return
    }

    const assignmentKey = getNcmAssignmentKey(sessionAssignment)
    const pool = buildNcmAssignmentSkillPool(sessionAssignment)
    const progress = readNcmAssignmentProgress(profile, assignmentKey)
    const completedSet = new Set(
      (Array.isArray(progress.completedSkillTags) ? progress.completedSkillTags : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    )
    const remaining = pool.filter(skillTag => !completedSet.has(skillTag))

    ncmQueueRef.current = [...remaining]
    ncmTotalRef.current = pool.length
    setNcmRemainingCount(remaining.length)
    setNcmCompletedSession(pool.length > 0 && remaining.length === 0)
  }, [profile, sessionAssignment])

  const completedThisSession = useMemo(() => sessionCount, [sessionCount])

  // Generera första problemet när profil är laddad
  useEffect(() => {
    if (profile && !currentProblem && !feedback) {
      const needsWarmupResolution = !isTableDrill && mode && isKnownMode(mode)
      if (needsWarmupResolution && typeof sessionWarmup === 'undefined') {
        return
      }
      if (isTableDrill) {
        if (tableQueue.length === 0) return
        const problem = createTableProblem(tableQueue[0])
        setCurrentProblem(problem)
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
      const problem = safeSelectProblem(profile, rules)
      if (!problem) return
      setCurrentProblem(problem)
      resetAttentionTracker()
      setStartTime(Date.now())
    }
  }, [profile, currentProblem, feedback, sessionAssignment, mode, sessionWarmup, completedThisSession, tableSet, progressionMode, fixedPracticeLevel, isTableDrill, tableQueue, resetAttentionTracker])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarsePointer(media.matches)
    update()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  // levelFocusMilestone visas tills eleven väljer nästa steg (ingen auto-dismiss)

  const updatePresence = useCallback((options = {}) => {
    if (!profile) return
    const now = Date.now()
    markStudentPresence(profile, {
      now,
      page: 'practice',
      interaction: options.interaction === true,
      inFocus: typeof options.inFocus === 'boolean' ? options.inFocus : undefined
    })

    const force = options.force === true
    if (!force && (now - presenceSyncRef.current.lastSavedAt) < PRESENCE_SAVE_THROTTLE_MS) {
      return
    }
    saveProfile(profile)
    presenceSyncRef.current.lastSavedAt = now
  }, [profile])

  useEffect(() => {
    if (!profile) return undefined

    updatePresence({ force: true, interaction: true })

    const onVisibilityChange = () => updatePresence({ force: true })
    const onFocus = () => updatePresence({ force: true })
    const onBlur = () => updatePresence({ force: true, inFocus: false })
    const onInteraction = () => updatePresence({ interaction: true })

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointerdown', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('touchstart', onInteraction)

    const heartbeat = setInterval(() => {
      updatePresence()
    }, PRESENCE_HEARTBEAT_MS)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
      updatePresence({ force: true, inFocus: false })
    }
  }, [profile, updatePresence])

  // Fokusera input när nytt problem visas
  useEffect(() => {
    if (currentProblem && !feedback && inputRef.current && !coarsePointer) {
      inputRef.current.focus()
    }
  }, [currentProblem, feedback, coarsePointer])

  // Gå till nästa problem
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
  }, [profile, pendingBreakSuggestion, sessionAssignment, mode, sessionWarmup, completedThisSession, tableSet, progressionMode, fixedPracticeLevel, isTableDrill, tableQueue, resetAttentionTracker, sessionCount])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!currentProblem || feedback) return
      if (document.hidden) {
        beginHiddenTracking(attentionRef.current)
      } else {
        endHiddenTracking(attentionRef.current)
      }
    }

    const onBlur = () => {
      if (!currentProblem || feedback) return
      attentionRef.current.blurCount += 1
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
      endHiddenTracking(attentionRef.current)
    }
  }, [currentProblem, feedback])

  const safeSelectProblem = (currentProfile, rules) => {
    try {
      setSessionError('')
      const nextRules = { ...(rules || {}) }
      if (sessionAssignment?.kind === 'ncm') {
        const preferredSkillTag = peekNextNcmSkillTag(ncmQueueRef.current)
        if (preferredSkillTag) {
          nextRules.ncmPreferredSkillTag = preferredSkillTag
        }
      }
      return selectNextProblem(currentProfile, nextRules)
    } catch (err) {
      console.error('Problem selection failed', err)
      setSessionError('Kunde inte ladda nästa uppgift. Försök igen.')
      return null
    }
  }

  // Auto-fortsätt efter 3 sekunder när feedback visas
  useEffect(() => {
    if (!feedback || !feedback.correct || showBreakSuggestion || tableMilestone || advancePrompt || levelFocusMilestone) return

    const timer = setTimeout(() => {
      goToNextProblem()
    }, AUTO_CONTINUE_DELAY)

    return () => clearTimeout(timer)
  }, [feedback, showBreakSuggestion, tableMilestone, advancePrompt, levelFocusMilestone]) // Medvetet utelämnar goToNextProblem för att undvika re-triggers

  // Lyssna på Enter för att fortsätta (med fördröjning för att undvika dubbel-trigger)
  useEffect(() => {
    if (!feedback || showBreakSuggestion || tableMilestone || advancePrompt || levelFocusMilestone) return

    let handleKeyDown = null

    // Vänta 100ms så att Enter från submit hinner släppas
    const activateTimer = setTimeout(() => {
      handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          goToNextProblem()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
    }, 100)

    return () => {
      clearTimeout(activateTimer)
      if (handleKeyDown) {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [feedback, showBreakSuggestion, tableMilestone, advancePrompt, levelFocusMilestone, goToNextProblem])

  const handleSubmit = () => {
    if (!currentProblem || answer.trim() === '') return

    const timeSpent = (Date.now() - startTime) / 1000
    const normalizedAnswer = answer.trim().replace(/,/g, '.')
    if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalizedAnswer)) return
    const studentAnswer = Number(normalizedAnswer)
    if (!Number.isFinite(studentAnswer)) return

    const masteryBeforeLevelFocus = isLevelFocusMode
      ? getOperationLevelMasteryStatus(profile, mode, fixedPracticeLevel)
      : null

    // Lägg till resultat
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
      // Justera svårighet i vanliga lägen
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

    // Uppdatera session count
    const newCount = sessionCount + 1
    const updatedSessionCorrectness = [...sessionRecentCorrectnessRef.current, correct].slice(-10)
    sessionRecentCorrectnessRef.current = updatedSessionCorrectness
    setSessionCount(newCount)

    // Visa feedback
    setFeedback({
      correct,
      correctAnswer: currentProblem.result,
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
      incrementTelemetryDailyMetric(profile, 'level_focus_mastered', 1, answerTs)
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
      // Kolla om paus behövs i vanliga lägen
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

    // Spara profil efter alla eventuella uppdateringar
    saveProfile(profile)
  }

  const handleAdvanceDecision = (accepted) => {
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
  }

  const handleTakeBreak = () => {
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
  }

  const goToNextProblemAfterBreakSuggestion = () => {
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
    setSessionCount(0)  // Reset session count
    setBreakDurationMinutes(DEFAULT_BREAK_MINUTES)
    sessionRecentCorrectnessRef.current = []
    goToNextProblem()
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Laddar...</p>
      </div>
    )
  }

  const closeBreakGameAndContinue = (gameType) => {
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
  }

  const openBreakGame = (gameType) => {
    if (profile) {
      const now = Date.now()
      recordTelemetryEvent(profile, `break_${gameType}_opened`, {
        sessionId: sessionTelemetryRef.current?.sessionId || ''
      }, now)
      incrementTelemetryDailyMetric(profile, `break_${gameType}_opened`, 1, now)
      saveProfile(profile)
    }
    setActiveBreakGame(gameType)
  }

  // Spel under paus
  if (activeBreakGame) {
    const isPong = activeBreakGame === 'pong'
    return (
      <div className={`min-h-screen flex items-center justify-center relative ${
        isPong
          ? 'bg-gradient-to-br from-indigo-900 to-purple-900'
          : 'bg-gradient-to-br from-emerald-900 to-cyan-900'
      }`}
      >
        {isPong ? (
          <PongGame onClose={() => closeBreakGameAndContinue('pong')} />
        ) : (
          <SnakeGame onClose={() => closeBreakGameAndContinue('snake')} />
        )}
      </div>
    )
  }

  // Break suggestion modal
  if (showBreakSuggestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">&#9749;</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Dags för en paus?
          </h2>
          <p className="text-gray-600 mb-6">
            Du har gjort {sessionCount} uppgifter! Ta gärna cirka {breakDurationMinutes} min paus innan du fortsätter.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => openBreakGame('pong')}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              🏓 Spela Pong (max 2 min)
            </button>
            <button
              onClick={() => openBreakGame('snake')}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              🐍 Spela Snake (max 2 min)
            </button>
            <button
              onClick={handleTakeBreak}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
            >
              Till startsidan
            </button>
            <button
              onClick={goToNextProblemAfterBreakSuggestion}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
            >
              Fortsätt räkna
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (tableMilestone) {
    const continueAfterMilestone = () => {
      if (tableMilestone.masteredTwoToNineToday) {
        // Försök öppna video direkt i användarens klickhändelse.
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
    }

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer pointer-events-auto"
        role="button"
        tabIndex={0}
        onClick={continueAfterMilestone}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            continueAfterMilestone()
          }
        }}
      >
        <div className="text-center px-4">
          <div className="text-7xl mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]">
            {tableMilestone.finalCelebration ? '🏆' : tableMilestone.boss ? '😎' : '🎉'}
          </div>
          <h2 className={`text-6xl font-extrabold mb-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] ${
            tableMilestone.finalCelebration ? 'text-emerald-200' : 'text-yellow-200'
          }`}>
            {tableMilestone.masteredTwoToNineToday
              ? 'TABELL-BOSS!'
              : tableMilestone.finalCelebration
              ? 'Lysande!'
              : tableMilestone.boss
                ? 'Like a boss'
                : `${tableMilestone.table}:an klar!`}
          </h2>
          <p className="text-xl text-white mb-6 drop-shadow-[0_3px_8px_rgba(0,0,0,0.55)]">
            {tableMilestone.masteredTwoToNineToday
              ? 'Du har klarat 2:an till 9:an idag. Dags för boss-låt!'
              : tableMilestone.finalCelebration
              ? 'Du klarade alla valda tabeller.'
              : tableMilestone.boss
                ? `${tableMilestone.table}:an klar ${tableMilestone.completionCountToday} gånger idag.`
              : 'Grymt jobbat!'} {tableMilestone.remainingTablesCount > 0
              ? `${tableMilestone.remainingTablesCount} tabell(er) kvar.`
              : tableMilestone.finalCelebration ? '' : 'Klar för slutfirning!'}
          </p>
          {tableMilestone.masteredTwoToNineToday && (
            <a
              href={TABLE_BOSS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold shadow hover:bg-blue-50"
            >
              Öppna boss-video
            </a>
          )}
          <p className="text-sm text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            Tryck var som helst för att fortsätta
          </p>
        </div>
      </div>
    )
  }

  if (ncmCompletedSession && sessionAssignment?.kind === 'ncm') {
    const solved = Math.max(0, ncmTotalRef.current - ncmRemainingCount)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-200 to-cyan-200 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            NCM-uppdrag klart
          </h2>
          <p className="text-gray-600 mb-6">
            Du har gjort {solved} av {ncmTotalRef.current} frågor i uppdraget.
          </p>
          <button
            onClick={() => navigate(`/student/${studentId}`)}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg"
          >
            Till startsidan
          </button>
        </div>
      </div>
    )
  }

  if (advancePrompt && feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 to-cyan-600">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
          <div className="text-5xl mb-3">📈</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Stabil nivå!
          </h2>
          <p className="text-gray-600 mb-2">
            Du är stabil på nivå {advancePrompt.fromLevel} i {getOperationLabel(advancePrompt.operation)}.
          </p>
          <p className="text-gray-600 mb-6">
            Vill du prova nivå {advancePrompt.nextLevel}?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleAdvanceDecision(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
            >
              Ja, testa nästa nivå
            </button>
            <button
              onClick={() => handleAdvanceDecision(false)}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
            >
              Stanna kvar lite till
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (levelFocusMilestone && feedback) {
    const nextLevel = levelFocusMilestone.level < 12 ? levelFocusMilestone.level + 1 : null
    const successPercent = levelFocusMilestone.attempts > 0
      ? Math.round((levelFocusMilestone.correct / levelFocusMilestone.attempts) * 100)
      : 0
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-green-600">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Grattis!
          </h2>
          <p className="text-gray-600 mb-2">
            Du har klarat nivå {levelFocusMilestone.level} i {getOperationLabel(levelFocusMilestone.operation)}!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {levelFocusMilestone.correct}/{levelFocusMilestone.attempts} rätt ({successPercent}%)
          </p>
          <div className="grid grid-cols-1 gap-3">
            {nextLevel && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set('level', String(nextLevel))
                  setLevelFocusMilestone(null)
                  navigate(`/student/${studentId}/practice?${params.toString()}`, { replace: true })
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
              >
                Öva nivå {nextLevel}
              </button>
            )}
            <button
              onClick={() => {
                setLevelFocusMilestone(null)
                goToNextProblem()
              }}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
            >
              Stanna kvar på nivå {levelFocusMilestone.level}
            </button>
            <button
              onClick={() => navigate(`/student/${studentId}`)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Tillbaka till startsidan
            </button>
          </div>
        </div>
      </div>
    )
  }

  const streak = getCurrentStreak(profile)
  const currentOperation = currentProblem?.type || 'addition'
  const weekStart = getStartOfWeekTimestamp()
  const masteredHistorical = getMasteryForOperation(profile, currentOperation)
  const masteredThisWeek = getMasteryForOperation(profile, currentOperation, { since: weekStart })
  const showInlineScratchpad = Boolean(currentProblem) && !feedback

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-gray-500">{profile.name}</p>
            <p className="text-xs text-gray-400">
              {sessionCount} denna session
            </p>
          </div>

          {streak >= 3 && (
            <div className="bg-yellow-100 px-3 py-1 rounded-full">
              <span className="text-yellow-700 font-semibold">
                &#128293; {streak} i rad!
              </span>
            </div>
          )}

          <button
            onClick={() => {
              navigate(`/student/${studentId}`)
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            Avsluta
          </button>
        </div>

        {/* Main content */}
        <div className="py-8">
          <SessionModeBanner
            assignment={sessionAssignment}
            mode={mode}
            tableSet={tableSet}
            progressionMode={progressionMode}
            fixedLevel={fixedPracticeLevel}
          />
          {sessionError && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-sm">
              {sessionError}
            </div>
          )}

          <ProblemDisplay
            problem={currentProblem}
            feedback={feedback}
            inputValue={answer}
            onInputChange={setAnswer}
            onSubmit={handleSubmit}
            onNext={goToNextProblem}
            inputRef={inputRef}
            suppressSoftKeyboard={coarsePointer}
            leftPanel={showInlineScratchpad ? (
              <div className="w-full flex flex-col items-center">
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowScratchpad(prev => !prev)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      showScratchpad
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    {showScratchpad ? 'Dölj rityta' : 'Visa rityta'}
                  </button>
                </div>
                <MathScratchpad visible={showScratchpad} />
              </div>
            ) : null}
          />

          {/* levelFocusMilestone hanteras nu som fullskärms-celebration ovan */}

          {/* Feedback + nästa-knapp */}
          <div className="mt-8 flex flex-col items-center min-h-28">
            {/* Feedback text - reserverad plats */}
            <div className="h-10 flex items-center">
              {feedback && (
                <p className={`text-2xl font-bold ${feedback.correct ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback.correct ? 'Rätt!' : 'Inte riktigt'}
                </p>
              )}
            </div>

            {/* Hint text - reserverad plats */}
            <div className="h-6 mt-2">
              {feedback && (
                <p className="text-sm text-gray-400">
                  {feedback.correct ? 'Enter, knappsatsknappen eller vänta...' : 'Tryck Enter eller knappsatsknappen när du är redo'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Success rate</span>
            <span>{Math.round(profile.stats.overallSuccessRate * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${profile.stats.overallSuccessRate * 100}%` }}
            />
          </div>
        </div>

        <CurrentOperationMastery
          operationLabel={getOperationLabel(currentOperation)}
          historical={masteredHistorical}
          weekly={masteredThisWeek}
        />
      </div>
    </div>
  )
}

function CurrentOperationMastery({ operationLabel, historical, weekly }) {
  const showHistorical = Array.isArray(historical) && historical.length > 0
  const showWeekly = Array.isArray(weekly) && weekly.length > 0

  if (!showHistorical && !showWeekly) return null

  return (
    <div className="mt-4 text-xs text-gray-500">
      <span className="font-medium">{operationLabel}</span>
      {showHistorical && (
        <span className="ml-2">
          Historiskt: <span className="text-green-700">nivå {historical.join(', ')}</span>
        </span>
      )}
      {showWeekly && (
        <span className="ml-2">
          Denna vecka: <span className="text-green-700">nivå {weekly.join(', ')}</span>
        </span>
      )}
    </div>
  )
}

function SessionModeBanner({ assignment, mode, tableSet, progressionMode, fixedLevel = null }) {
  const paceLabel = getProgressionModeLabel(progressionMode)
  if (!assignment) {
    if (tableSet.length > 0) {
      return (
        <div className="mb-5 bg-white border border-orange-200 text-orange-700 rounded-lg px-4 py-2 text-sm">
          Läge: Tabellövning | {tableSet.join(',')}:an | Tempo: {paceLabel}
        </div>
      )
    }

    if (mode && isKnownMode(mode)) {
      return (
        <div className="mb-5 bg-white border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-sm">
          Läge: {getOperationLabel(mode)}
          {Number.isInteger(fixedLevel) ? ` | Nivåfokus ${fixedLevel}` : ''}
          {' | '}
          Tempo: {paceLabel}
        </div>
      )
    }
    return (
      <div className="mb-5 bg-white border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm">
        Läge: Fri träning | Tempo: {paceLabel}
      </div>
    )
  }

  if (assignment.kind === 'ncm') {
    const codes = Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes.filter(Boolean) : []
    const codeText = codes.length > 0 ? ` | ${codes.join(', ')}` : ''
    return (
      <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
        Läge: NCM-uppdrag | {assignment.title}{codeText} | Tempo: {paceLabel}
      </div>
    )
  }

  return (
    <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
      Läge: Uppdrag | {assignment.title} | Nivå {assignment.minLevel}-{assignment.maxLevel} | Tempo: {paceLabel}
    </div>
  )
}

function getSessionRules(assignment, mode, warmup, solvedCount, tableSet = [], progressionMode = 'challenge', fixedLevel = null) {
  const rules = { progressionMode: normalizeProgressionMode(progressionMode) }

  if (assignment) {
    if (assignment.kind === 'ncm') {
      rules.ncmFilter = {
        codes: Array.isArray(assignment.ncmCodes) ? assignment.ncmCodes : [],
        abilityTags: Array.isArray(assignment.ncmAbilityTags) ? assignment.ncmAbilityTags : []
      }
      return rules
    }
    rules.allowedTypes = assignment.problemTypes
    rules.levelRange = [assignment.minLevel, assignment.maxLevel]
    return rules
  }

  if (mode && isKnownMode(mode)) {
    rules.allowedTypes = [mode]
  }

  if (Array.isArray(tableSet) && tableSet.length > 0) {
    rules.allowedTypes = ['multiplication']
    rules.tableSet = tableSet
  }

  if (Number.isInteger(fixedLevel) && mode && isKnownMode(mode) && (!Array.isArray(tableSet) || tableSet.length === 0)) {
    const clampedLevel = Math.max(1, Math.min(12, fixedLevel))
    rules.allowedTypes = [mode]
    rules.levelRange = [clampedLevel, clampedLevel]
    rules.forcedLevel = clampedLevel
    rules.forcedType = mode
    rules.forceReason = 'manual_level_focus'
    rules.forceBucket = 'core'
    return rules
  }

  if (warmup && solvedCount < warmup.warmupCount) {
    const forcedLevel = Math.min(
      warmup.targetLevel,
      warmup.startLevel + solvedCount
    )
    rules.forcedLevel = forcedLevel
    rules.forcedType = warmup.operation
    rules.forceReason = 'operation_mode_warmup'
    rules.forceBucket = solvedCount === 0 ? 'very_easy' : 'easy'
  }

  return rules
}

function parseTableSet(value) {
  if (!value) return []
  const entries = String(value)
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => Number.isInteger(v) && v >= 2 && v <= 12)

  return Array.from(new Set(entries)).sort((a, b) => a - b)
}

function parsePracticeLevel(value) {
  if (value === null || value === undefined || value === '') return null
  const level = Number(value)
  if (!Number.isInteger(level)) return null
  if (level < 1 || level > 12) return null
  return level
}

function createTableQueue(tableSet) {
  const queue = []
  for (const table of tableSet) {
    for (let factor = 1; factor <= 12; factor++) {
      queue.push({ table, factor })
    }
  }
  return shuffle(queue)
}

function createTableProblem(item) {
  const table = Number(item.table)
  const factor = Number(item.factor)
  const tableFirst = Math.random() < 0.5
  const a = tableFirst ? table : factor
  const b = tableFirst ? factor : table
  const result = a * b

  return {
    id: `mul_table_${table}_${factor}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    template: 'mul_table_drill',
    type: 'multiplication',
    values: { a, b },
    result,
    difficulty: {
      conceptual_level: 4,
      cognitive_load: { working_memory: 1, steps_required: 1, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_carry: false, mixed_digits: false },
      magnitude: { a_digits: 1, b_digits: 1 }
    },
    metadata: {
      table,
      factor,
      skillTag: `mul_table_${table}`,
      selectionReason: 'table_drill_queue',
      description: `Tabellovning ${table}:an`
    },
    generated_at: Date.now()
  }
}

function shuffle(items) {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

function recordTableCompletion(profile, table) {
  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  if (!Array.isArray(profile.tableDrill.completions)) {
    profile.tableDrill.completions = []
  }

  const now = Date.now()
  profile.tableDrill.completions.push({ table: Number(table), timestamp: now })

  if (profile.tableDrill.completions.length > 1000) {
    profile.tableDrill.completions = profile.tableDrill.completions.slice(-1000)
  }

  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startTs = startToday.getTime()

  return profile.tableDrill.completions.filter(
    item => Number(item.table) === Number(table) && item.timestamp >= startTs
  ).length
}

function hasMasteredTablesToday(profile, tables) {
  if (!profile?.tableDrill || !Array.isArray(profile.tableDrill.completions)) return false
  const required = new Set((tables || []).map(Number))
  if (required.size === 0) return false

  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startTs = startToday.getTime()

  const completedToday = new Set(
    profile.tableDrill.completions
      .filter(item => item.timestamp >= startTs)
      .map(item => Number(item.table))
  )

  for (const table of required) {
    if (!completedToday.has(table)) return false
  }
  return true
}

function shouldTriggerDailyBoss(profile, tables) {
  if (!hasMasteredTablesToday(profile, tables)) return false
  return !isDailyBossAlreadyShown(profile)
}

function isDailyBossAlreadyShown(profile) {
  const shownDate = profile?.tableDrill?.dailyBossShownDate
  return shownDate === getTodayKey()
}

function markDailyBossShown(profile) {
  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  profile.tableDrill.dailyBossShownDate = getTodayKey()
}

function getTodayKey() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function makeSessionTelemetryId(studentId) {
  const normalized = String(studentId || 'student').toUpperCase()
  return `sess_${normalized}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function estimateOperationLevel(profile, operation) {
  const relevant = profile.recentProblems
    .filter(
      p => inferOperationFromType(p.problemType, { fallback: 'addition', allowUnknownPrefix: false }) === operation
    )
    .slice(-20)

  if (relevant.length === 0) return 1

  const sum = relevant.reduce((acc, p) => {
    const lvl = p.difficulty?.conceptual_level || Math.round(getOperationAbility(profile, operation)) || 1
    return acc + lvl
  }, 0)

  return sum / relevant.length
}

function isKnownMode(mode) {
  return mode === 'addition'
    || mode === 'subtraction'
    || mode === 'multiplication'
    || mode === 'division'
}

function isMixedTrainingSession(mode, assignment, isTableDrill) {
  if (isTableDrill) return false
  if (mode && isKnownMode(mode)) return false
  if (!assignment) return true
  if (assignment.kind === 'ncm') return true
  const types = Array.isArray(assignment.problemTypes) ? assignment.problemTypes : []
  return types.length !== 1
}

function getBreakPolicy(problem, isTableDrill) {
  if (isTableDrill) {
    return {
      enabled: false,
      questionThreshold: Infinity,
      recentWindow: 10,
      errorThreshold: 5,
      recommendedBreakMinutes: DEFAULT_BREAK_MINUTES
    }
  }

  if (isSingleDigitAddOrSubProblem(problem)) {
    return {
      enabled: true,
      questionThreshold: 20,
      recentWindow: 10,
      errorThreshold: 5,
      recommendedBreakMinutes: SINGLE_DIGIT_BREAK_MINUTES
    }
  }

  return {
    enabled: true,
    questionThreshold: 15,
    recentWindow: 10,
    errorThreshold: 5,
    recommendedBreakMinutes: DEFAULT_BREAK_MINUTES
  }
}

function isSingleDigitAddOrSubProblem(problem) {
  if (!problem || (problem.type !== 'addition' && problem.type !== 'subtraction')) return false

  const magnitude = problem.difficulty?.magnitude || {}
  const magA = Number(magnitude.a_digits)
  const magB = Number(magnitude.b_digits)
  if (Number.isFinite(magA) && Number.isFinite(magB)) {
    return magA <= 1 && magB <= 1
  }

  const a = Number(problem.values?.a)
  const b = Number(problem.values?.b)
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return Math.abs(a) < 10 && Math.abs(b) < 10
  }

  return false
}

function getOperationLevelMasteryStatus(profile, operation, level) {
  if (!profile || !operation || !Number.isInteger(level)) {
    return {
      attempts: 0,
      correct: 0,
      successRate: 0,
      isMastered: false
    }
  }

  const relevant = profile.recentProblems.filter((item) => {
    const itemOperation = inferOperationFromType(item.problemType, {
      fallback: 'addition',
      allowUnknownPrefix: false
    })
    const itemLevel = Math.round(Number(item?.difficulty?.conceptual_level || 0))
    return itemOperation === operation && itemLevel === level
  })

  const attempts = relevant.length
  const correct = relevant.filter(item => item.correct).length
  const successRate = attempts > 0 ? correct / attempts : 0
  const isMastered = attempts >= LEVEL_MASTERY_MIN_ATTEMPTS && successRate >= LEVEL_MASTERY_MIN_SUCCESS_RATE

  return {
    attempts,
    correct,
    successRate,
    isMastered
  }
}

export default StudentSession

function createAttentionTracker() {
  return {
    hiddenSinceTs: null,
    hiddenDurationMs: 0,
    blurCount: 0
  }
}

function beginHiddenTracking(tracker) {
  if (!tracker || tracker.hiddenSinceTs) return
  tracker.hiddenSinceTs = Date.now()
}

function endHiddenTracking(tracker) {
  if (!tracker || !tracker.hiddenSinceTs) return
  tracker.hiddenDurationMs += Math.max(0, Date.now() - tracker.hiddenSinceTs)
  tracker.hiddenSinceTs = null
}

function finalizeAttentionSnapshot(tracker) {
  if (!tracker) return { hiddenDurationSec: 0, blurCount: 0 }
  endHiddenTracking(tracker)
  return {
    hiddenDurationSec: tracker.hiddenDurationMs / 1000,
    blurCount: tracker.blurCount
  }
}

function buildNcmAssignmentSkillPool(assignment) {
  const filter = {
    codes: Array.isArray(assignment?.ncmCodes) ? assignment.ncmCodes : [],
    abilityTags: Array.isArray(assignment?.ncmAbilityTags) ? assignment.ncmAbilityTags : []
  }
  const candidates = filterNcmProblems(filter)
  return Array.from(new Set(
    candidates
      .map(item => String(item?.skillTag || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'sv'))
}

function getNcmAssignmentKey(assignment) {
  const id = String(assignment?.id || '').trim()
  if (id) return `assignment:${id}`

  return buildNcmAssignmentSignature(assignment)
}

function buildNcmAssignmentSignature(assignment) {
  const codes = Array.isArray(assignment?.ncmCodes)
    ? assignment.ncmCodes.map(item => String(item || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'sv'))
    : []
  const abilities = Array.isArray(assignment?.ncmAbilityTags)
    ? assignment.ncmAbilityTags.map(item => String(item || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b, 'sv'))
    : []
  return `codes:${codes.join(',')}|abilities:${abilities.join(',')}`
}

function readNcmAssignmentProgress(profile, assignmentKey) {
  if (!profile || !assignmentKey) return { completedSkillTags: [] }
  const store = getAssignmentProgressStore(profile)
  const raw = store[assignmentKey]
  if (!raw || typeof raw !== 'object') return { completedSkillTags: [] }

  const completedSkillTags = Array.isArray(raw.completedSkillTags)
    ? raw.completedSkillTags.map(item => String(item || '').trim()).filter(Boolean)
    : []
  return {
    ...raw,
    completedSkillTags
  }
}

function markNcmSkillCompleted(profile, assignment, skillTag, totalSkillTags) {
  if (!profile || !assignment || !skillTag) return
  const assignmentKey = getNcmAssignmentKey(assignment)
  if (!assignmentKey) return

  const store = getAssignmentProgressStore(profile)
  const previous = readNcmAssignmentProgress(profile, assignmentKey)
  const completedSet = new Set(previous.completedSkillTags)
  completedSet.add(String(skillTag))
  const completedSkillTags = Array.from(completedSet)
  const now = Date.now()
  const total = Math.max(0, Number(totalSkillTags || 0))

  store[assignmentKey] = {
    kind: 'ncm',
    assignmentId: String(assignment?.id || ''),
    assignmentTitle: String(assignment?.title || ''),
    totalSkillTags: total,
    completedSkillTags,
    completedAt: total > 0 && completedSkillTags.length >= total
      ? now
      : Number(previous.completedAt || 0) || 0,
    updatedAt: now
  }
}

function getAssignmentProgressStore(profile) {
  if (!profile.assignmentProgress || typeof profile.assignmentProgress !== 'object') {
    profile.assignmentProgress = {}
  }
  return profile.assignmentProgress
}

function peekNextNcmSkillTag(queue) {
  if (!Array.isArray(queue) || queue.length === 0) return ''
  return String(queue[0] || '').trim()
}
