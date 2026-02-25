import { useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import SessionLoadingView from './SessionLoadingView'
import SessionOverlayRouter from './session/SessionOverlayRouter'
import SessionPage from './session/SessionPage'
import { buildSessionOverlayProps } from './session/sessionOverlayPropsBuilder'
import { usePracticeSessionActions } from './session/usePracticeSessionActions'
import { usePracticeSetupEffects } from './session/usePracticeSetupEffects'
import { usePracticeUiEffects } from './session/usePracticeUiEffects'
import {
  createAttentionTracker,
  DEFAULT_BREAK_MINUTES,
  isKnownMode,
  parsePracticeLevel,
  parseTableSet,
  peekNextNcmSkillTag
} from './session/sessionUtils'
import {
  saveProfile
} from '../../lib/storage'
import {
  getCurrentStreak,
  getMasteryForOperation,
  getStartOfWeekTimestamp
} from '../../lib/studentProfile'
import { selectNextProblemForProfile } from '../../engine/adaptiveEngine'
import { getOperationLabel } from '../../lib/operations'
import {
  normalizeProgressionMode
} from '../../lib/progressionModes'
const TABLE_BOSS_URL = 'https://www.youtube.com/watch?v=6jevdk_u8g4'
const openTableBossVideo = () => {
  if (typeof window === 'undefined') return false
  try { return Boolean(window.open(TABLE_BOSS_URL, '_blank', 'noopener,noreferrer')) } catch {
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
  const [dailyLevelStreakMilestone, setDailyLevelStreakMilestone] = useState(null)
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
  const [ncmTotalCount, setNcmTotalCount] = useState(0)
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

  const completedThisSession = useMemo(() => sessionCount, [sessionCount])

  const safeSelectProblem = useCallback((currentProfile, rules) => {
    try {
      setSessionError('')
      const nextRules = { ...(rules || {}) }
      if (sessionAssignment?.kind === 'ncm') {
        const preferredSkillTag = peekNextNcmSkillTag(ncmQueueRef.current)
        if (preferredSkillTag) {
          nextRules.ncmPreferredSkillTag = preferredSkillTag
        }
      }
      return selectNextProblemForProfile(currentProfile, nextRules)
    } catch (err) {
      console.error('Problem selection failed', err)
      setSessionError('Kunde inte ladda nästa uppgift. Försök igen.')
      return null
    }
  }, [sessionAssignment])

  usePracticeSetupEffects({
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
    safeSelectProblem
  })

  const {
    goToNextProblem,
    handleSubmit,
    handleAdvanceDecision,
    handleTakeBreak,
    goToNextProblemAfterBreakSuggestion,
    closeBreakGameAndContinue,
    openBreakGame,
    continueAfterMilestone
  } = usePracticeSessionActions({
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
    tableMilestone,
    sessionAssignment,
    advancePrompt,
    sessionWarmup,
    completedThisSession,
    tableSet,
    pendingBreakSuggestion,
    sessionCount,
    lastBreakPromptAt,
    studentId,
    navigate,
    resetAttentionTracker,
    safeSelectProblem,
    openTableBossVideo,
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
    setActiveBreakGame,
    setNcmCompletedSession,
    setNcmRemainingCount,
    setLevelFocusMilestone,
    setTableQueue,
    setTableMilestone,
    setAdvancePrompt,
    setLastBreakPromptAt,
    setDailyLevelStreakMilestone
  })

  usePracticeUiEffects({
    profile,
    currentProblem,
    feedback,
    inputRef,
    coarsePointer,
    goToNextProblem,
    showBreakSuggestion,
    tableMilestone,
    advancePrompt,
    levelFocusMilestone,
    dailyLevelStreakMilestone,
    attentionRef,
    presenceSyncRef
  })

  if (!profile) {
    return <SessionLoadingView />
  }

  const goHome = () => navigate(`/student/${studentId}`)
  const overlayProps = buildSessionOverlayProps({
    activeBreakGame,
    showBreakSuggestion,
    tableMilestone,
    ncmCompletedSession,
    sessionAssignmentKind: sessionAssignment?.kind,
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
    tableBossUrl: TABLE_BOSS_URL
  })
  if (overlayProps) {
    return <SessionOverlayRouter {...overlayProps} />
  }

  const streak = getCurrentStreak(profile)
  const currentOperation = currentProblem?.type || 'addition'
  const weekStart = getStartOfWeekTimestamp()
  const masteredHistorical = getMasteryForOperation(profile, currentOperation)
  const masteredThisWeek = getMasteryForOperation(profile, currentOperation, { since: weekStart })

  return (
    <SessionPage
      profileName={profile.name}
      sessionCount={sessionCount}
      streak={streak}
      onExit={() => {
        if (profile) saveProfile(profile, { forceSync: true })
        goHome()
      }}
      sessionAssignment={sessionAssignment}
      mode={mode}
      tableSet={tableSet}
      progressionMode={progressionMode}
      fixedPracticeLevel={fixedPracticeLevel}
      sessionError={sessionError}
      currentProblem={currentProblem}
      feedback={feedback}
      answer={answer}
      onInputChange={setAnswer}
      onSubmit={handleSubmit}
      onNext={goToNextProblem}
      inputRef={inputRef}
      coarsePointer={coarsePointer}
      showScratchpad={showScratchpad}
      onToggleScratchpad={() => setShowScratchpad(prev => !prev)}
      overallSuccessRate={profile.stats.overallSuccessRate}
      currentOperationLabel={getOperationLabel(currentOperation)}
      masteredHistorical={masteredHistorical}
      masteredThisWeek={masteredThisWeek}
    />
  )
}

export default StudentSession
