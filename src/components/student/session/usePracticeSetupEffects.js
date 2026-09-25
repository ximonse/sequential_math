import { useEffect } from 'react'
import {
  clearActiveStudentSession,
  getOrCreateProfileWithSync,
  isStudentSessionActive
} from '../../../lib/storage'
import { decodeAssignmentPayload, getActiveAssignment, getAssignmentById } from '../../../lib/assignments'
import { getLowestUnmasteredLevel } from '../../../lib/studentProfile'
import {
  addTelemetryDurationMs,
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../../lib/telemetry'
import {
  buildNcmAssignmentSkillPool,
  createTableProblem,
  createTableQueue,
  getNcmAssignmentKey,
  getSessionRules,
  isKnownMode,
  makeSessionTelemetryId,
  readNcmAssignmentProgress
} from './sessionUtils'
import { getPilotStudentRuntime, normalizePilotStudentId } from '../../../lib/pilotStudentRuntime'
import { buildFocusedSessionStartPlan } from '../../../lib/sessionStartDecision'

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
  setProgressionMilestone,
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
  freeOps = [],
  persistProfile
}) {
  useEffect(() => {
    if (normalizePilotStudentId(studentId)) {
      let active = true
      ;(async () => {
        const bootstrapped = await getPilotStudentRuntime().bootstrap(studentId)
        if (!active) return
        if (!bootstrapped.ok) { navigate('/', { replace: true }); return }
        sessionRecentCorrectnessRef.current = []
        setProfile(bootstrapped.profile)
      })()
      return () => { active = false }
    }
    if (!isStudentSessionActive(studentId)) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
      navigate(`/?redirect=${redirect}`, { replace: true })
      return undefined
    }

    let active = true
    ;(async () => {
      const loadedProfile = await getOrCreateProfileWithSync(studentId, null, 4, {
        createIfMissing: false,
        onCloudMerge: (mergedProfile) => {
          if (!active) return
          setProfile(mergedProfile)
        }
      })
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

    const startSession = () => {
      const startedAt = Date.now()
      const sessionId = makeSessionTelemetryId(studentId)
      sessionTelemetryRef.current = {
        sessionId,
        startedAt,
        answered: 0,
        correct: 0,
        wrong: 0,
        partial: 0
      }
      recordTelemetryEvent(profile, 'practice_session_start', {
        sessionId,
        mode: mode || '',
        assignmentId: assignmentId || '',
        progressionMode,
        tableSet
      }, startedAt)
      incrementTelemetryDailyMetric(profile, 'practice_sessions_started', 1, startedAt)
      void persistProfile(profile)
    }

    const endSession = () => {
      const meta = sessionTelemetryRef.current
      if (!meta) return
      const endedAt = Date.now()
      const durationMs = Math.max(0, endedAt - meta.startedAt)
      recordTelemetryEvent(profile, 'practice_session_end', {
        sessionId: meta.sessionId,
        answered: meta.answered,
        correct: meta.correct,
        wrong: meta.wrong,
        partial: Number(meta.partial || 0),
        durationSec: Math.round(durationMs / 1000)
      }, endedAt)
      incrementTelemetryDailyMetric(profile, 'practice_sessions_ended', 1, endedAt)
      addTelemetryDurationMs(profile, 'practice_session_ms', durationMs, endedAt)
      void persistProfile(profile, { forceSync: true })
      sessionTelemetryRef.current = null
    }

    // Pupils rarely press Startsida: they lock the iPad, switch app or close
    // the tab. A hidden page therefore ends the session, and coming back
    // starts a new one, so started and ended sessions stay paired.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') endSession()
      else if (!sessionTelemetryRef.current) startSession()
    }

    startSession()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', endSession)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', endSession)
      endSession()
    }
  }, [profile, studentId, assignmentId, mode, progressionMode, tableSet, sessionTelemetryRef, persistProfile])

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

    const targetLevel = getLowestUnmasteredLevel(profile, mode)
    const frameId = String(sessionTelemetryRef.current?.sessionId || '')
    setSessionWarmup(previous => {
      if (previous?.frameId === frameId && previous?.operation === mode) return previous
      return buildFocusedSessionStartPlan({
        profile,
        operation: mode,
        destinationLevel: targetLevel,
        progressionMode,
        frameId
      })
    })
  }, [profile, mode, isTableDrill, progressionMode, sessionTelemetryRef, setSessionWarmup])

  useEffect(() => {
    if (!profile) return
    if (!isTableDrill) return

    const initialQueue = createTableQueue(tableSet)
    setTableQueue(initialQueue)
    setTableMilestone(null)
    setProgressionMilestone(null)
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
    setProgressionMilestone,
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
        freeOps,
        profile,
        sessionTelemetryRef.current?.sessionId
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
    freeOps,
    isTableDrill,
    tableQueue,
    sessionTelemetryRef,
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
