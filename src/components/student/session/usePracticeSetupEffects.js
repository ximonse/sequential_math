import { useEffect } from 'react'
import {
  clearActiveStudentSession,
  getOrCreateProfileWithSync,
  isStudentSessionActive,
  saveProfile
} from '../../../lib/storage'
import { decodeAssignmentPayload, getActiveAssignment, getAssignmentById } from '../../../lib/assignments'
import { inferOperationFromProblemType as inferOperationFromType } from '../../../lib/mathUtils'
import { PROGRESSION_MODE_STEADY } from '../../../lib/progressionModes'
import {
  addTelemetryDurationMs,
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../../lib/telemetry'
import {
  buildNcmAssignmentSkillPool,
  createTableProblem,
  createTableQueue,
  estimateOperationLevel,
  getNcmAssignmentKey,
  getSessionRules,
  isKnownMode,
  makeSessionTelemetryId,
  readNcmAssignmentProgress
} from './sessionUtils'

export function usePracticeSetupEffects({
  studentId,
  navigate,
  location,
  mode,
  assignmentId,
  assignmentPayload,
  progressionMode,
  tableSet,
  fixedPracticeLevel,
  isTableDrill,
  profile,
  setProfile,
  currentProblem,
  setCurrentProblem,
  feedback,
  setFeedback,
  setAnswer,
  setStartTime,
  setSessionCount,
  sessionAssignment,
  setSessionAssignment,
  sessionWarmup,
  setSessionWarmup,
  setTableQueue,
  tableQueue,
  setTableMilestone,
  setAdvancePrompt,
  setPendingBreakSuggestion,
  setCoarsePointer,
  resetAttentionTracker,
  sessionRecentCorrectnessRef,
  sessionTelemetryRef,
  ncmQueueRef,
  ncmTotalRef,
  setNcmTotalCount,
  setNcmRemainingCount,
  setNcmCompletedSession,
  completedThisSession,
  safeSelectProblem,
  freeOps = []
}) {
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
  }, [studentId, navigate, location.pathname, location.search, sessionRecentCorrectnessRef, setProfile])

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
  }, [assignmentId, assignmentPayload, mode, tableSet, setSessionAssignment])

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
  }, [profile, studentId, assignmentId, mode, progressionMode, tableSet, sessionTelemetryRef])

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
  }, [profile, mode, isTableDrill, progressionMode, setSessionWarmup])

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
  }, [
    profile,
    isTableDrill,
    tableSet,
    resetAttentionTracker,
    sessionRecentCorrectnessRef,
    setTableQueue,
    setTableMilestone,
    setAdvancePrompt,
    setPendingBreakSuggestion,
    setCurrentProblem,
    setAnswer,
    setFeedback,
    setSessionCount,
    setStartTime
  ])

  useEffect(() => {
    if (!profile || !sessionAssignment || sessionAssignment.kind !== 'ncm') {
      ncmQueueRef.current = []
      ncmTotalRef.current = 0
      setNcmTotalCount(0)
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
    setNcmTotalCount(pool.length)
    setNcmRemainingCount(remaining.length)
    setNcmCompletedSession(pool.length > 0 && remaining.length === 0)
  }, [profile, sessionAssignment, ncmQueueRef, ncmTotalRef, setNcmTotalCount, setNcmRemainingCount, setNcmCompletedSession])

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
        fixedPracticeLevel,
        freeOps
      )
      const problem = safeSelectProblem(profile, rules)
      if (!problem) return
      setCurrentProblem(problem)
      resetAttentionTracker()
      setStartTime(Date.now())
    }
  }, [
    profile,
    currentProblem,
    feedback,
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
    safeSelectProblem,
    setCurrentProblem,
    setStartTime
  ])

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
  }, [setCoarsePointer])
}
