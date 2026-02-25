import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { changeStudentPassword, clearActiveStudentSession, getOrCreateProfileWithSync, isStudentSessionActive, saveProfile } from '../../lib/storage'
import { getStartOfWeekTimestamp } from '../../lib/studentProfile'
import { inferOperationFromProblemType } from '../../lib/mathUtils'
import { getOperationLabel, OPERATION_LABELS, STANDARD_OPERATIONS } from '../../lib/operations'
import { decodeAssignmentPayload, encodeAssignmentPayload, getActiveAssignment, getAssignmentById } from '../../lib/assignments'
import { getProgressionModeLabel, PROGRESSION_MODE_CHALLENGE, PROGRESSION_MODE_STEADY, normalizeProgressionMode } from '../../lib/progressionModes'
import { markStudentPresence, PRESENCE_HEARTBEAT_MS, PRESENCE_SAVE_THROTTLE_MS } from '../../lib/studentPresence'
import { incrementTelemetryDailyMetric, recordTelemetryEvent } from '../../lib/telemetry'
import StudentHomeAssignmentLaunchCard from './StudentHomeAssignmentLaunchCard'
import StudentHomePasswordCard from './StudentHomePasswordCard'
import StudentHomeProgressCard from './StudentHomeProgressCard'
import StudentHomeTableDrillCard from './StudentHomeTableDrillCard'
import StudentHomeTicketCard from './StudentHomeTicketCard'
import StudentHomeTrainingOptionsCard from './StudentHomeTrainingOptionsCard'
import { buildLevelMasteryView, buildPracticePath, buildTableStatus, createOperationLevelBuckets, getTableStatusClass, LEVELS, MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE, TABLES } from './studentHomeUtils'

function StudentHome() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [enabledExtras, setEnabledExtras] = useState(null) // null = loading, [] = no extras
  const [assignment, setAssignment] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [selectedTables, setSelectedTables] = useState([])
  const [selectedProgressionMode, setSelectedProgressionMode] = useState(PROGRESSION_MODE_CHALLENGE)
  const presenceSyncRef = useRef({
    lastSavedAt: 0
  })

  const assignmentId = searchParams.get('assignment')
  const assignmentPayload = searchParams.get('assignment_payload')
  const mode = searchParams.get('mode')
  const requestedPace = normalizeProgressionMode(searchParams.get('pace'), '')
  const ticketId = searchParams.get('ticket')
  const ticketPayload = searchParams.get('ticket_payload')

  useEffect(() => {
    if (!isStudentSessionActive(studentId)) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
      navigate(`/?redirect=${redirect}`, { replace: true })
      return
    }

    let active = true
    ;(async () => {
      const loaded = await getOrCreateProfileWithSync(studentId, null, 4, { createIfMissing: false })
      if (!active) return
      if (!loaded) {
        clearActiveStudentSession()
        navigate('/', { replace: true })
        return
      }
      const preferredMode = normalizeProgressionMode(
        loaded?.preferences?.defaultProgressionMode,
        PROGRESSION_MODE_CHALLENGE
      )
      setSelectedProgressionMode(preferredMode)
      setProfile(loaded)
    })()

    return () => { active = false }
  }, [studentId, navigate, location.pathname, location.search])

  useEffect(() => {
    if (!studentId) return
    if (ticketId) {
      const params = new URLSearchParams()
      params.set('ticket', ticketId)
      if (ticketPayload) params.set('ticket_payload', ticketPayload)
      navigate(`/student/${studentId}/ticket?${params.toString()}`, { replace: true })
      return
    }
    if (!assignmentId && !assignmentPayload && !mode && !requestedPace) return

    const params = new URLSearchParams()
    if (assignmentId) params.set('assignment', assignmentId)
    if (assignmentPayload) params.set('assignment_payload', assignmentPayload)
    if (mode) params.set('mode', mode)
    if (requestedPace) params.set('pace', requestedPace)

    navigate(`/student/${studentId}/practice?${params.toString()}`, { replace: true })
  }, [studentId, assignmentId, assignmentPayload, mode, requestedPace, ticketId, ticketPayload, navigate])

  useEffect(() => {
    if (!profile) return
    const classId = String(profile?.classId || '').trim()
    if (!classId) { setEnabledExtras([]); return }
    let active = true
    fetch(`/api/class-config?classId=${encodeURIComponent(classId)}`)
      .then(r => r.json())
      .then(data => { if (active) setEnabledExtras(Array.isArray(data?.enabledExtras) ? data.enabledExtras : []) })
      .catch(() => { if (active) setEnabledExtras([]) })
    return () => { active = false }
  }, [profile?.classId])

  useEffect(() => {
    const fromPayload = decodeAssignmentPayload(assignmentPayload)
    if (assignmentId) {
      if (fromPayload && String(fromPayload.id) === String(assignmentId)) {
        setAssignment(fromPayload)
        return
      }
      setAssignment(getAssignmentById(assignmentId))
      return
    }
    if (fromPayload) {
      setAssignment(fromPayload)
      return
    }
    setAssignment(getActiveAssignment())
  }, [assignmentId, assignmentPayload])

  const updateHomePresence = useCallback((options = {}) => {
    if (!profile) return
    const now = Date.now()
    markStudentPresence(profile, {
      now,
      page: 'home',
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

    updateHomePresence({ force: true, interaction: true })

    const onVisibilityChange = () => updateHomePresence({ force: true })
    const onFocus = () => updateHomePresence({ force: true })
    const onBlur = () => updateHomePresence({ force: true, inFocus: false })
    const onInteraction = () => updateHomePresence({ interaction: true })

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointerdown', onInteraction)
    window.addEventListener('keydown', onInteraction)
    window.addEventListener('touchstart', onInteraction)

    const heartbeat = setInterval(() => {
      updateHomePresence()
    }, PRESENCE_HEARTBEAT_MS)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointerdown', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.removeEventListener('touchstart', onInteraction)
      updateHomePresence({ force: true, inFocus: false })
    }
  }, [profile, updateHomePresence])

  const operationMasteryBoards = useMemo(() => {
    if (!profile) return []
    const weekStart = getStartOfWeekTimestamp()
    const operationIds = Object.keys(OPERATION_LABELS)
    const buckets = Object.fromEntries(
      operationIds.map(operation => [operation, createOperationLevelBuckets()])
    )

    for (const result of (Array.isArray(profile.recentProblems) ? profile.recentProblems : [])) {
      const operation = inferOperationFromProblemType(result.problemType, {
        fallback: 'addition',
        allowUnknownPrefix: false
      })
      if (!buckets[operation]) continue

      const level = Math.round(Number(result?.difficulty?.conceptual_level || 0))
      if (!Number.isInteger(level) || level < 1 || level > 12) continue

      const historicalBucket = buckets[operation].historical[level]
      historicalBucket.attempts += 1
      if (result.correct) historicalBucket.correct += 1

      if (Number(result.timestamp || 0) >= weekStart) {
        const weeklyBucket = buckets[operation].weekly[level]
        weeklyBucket.attempts += 1
        if (result.correct) weeklyBucket.correct += 1
      }
    }

    return operationIds.map(operation => ({
      operation,
      historical: LEVELS.map(level => buildLevelMasteryView(level, buckets[operation].historical[level])),
      weekly: LEVELS.map(level => buildLevelMasteryView(level, buckets[operation].weekly[level]))
    }))
  }, [profile])

  const tableStatus = useMemo(() => buildTableStatus(profile), [profile])

  const handleStudentLogout = () => {
    if (profile) {
      saveProfile(profile, { forceSync: true })
    }
    clearActiveStudentSession()
    navigate('/')
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    let result
    try {
      result = await changeStudentPassword(studentId, currentPassword, newPassword)
    } catch {
      setPasswordMessage('Kunde inte byta lösenord just nu.')
      return
    }

    if (!result.ok) {
      setPasswordMessage(result.error)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setPasswordMessage('Lösenord uppdaterat.')
  }

  const toggleTable = (table) => {
    setSelectedTables(prev => (
      prev.includes(table)
        ? prev.filter(item => item !== table)
        : [...prev, table].sort((a, b) => a - b)
    ))
  }

  const startTableDrill = () => {
    if (selectedTables.length === 0) return
    const now = Date.now()
    recordTelemetryEvent(profile, 'practice_launch_table_drill', {
      tables: selectedTables,
      progressionMode: selectedProgressionMode
    }, now)
    incrementTelemetryDailyMetric(profile, 'practice_launches', 1, now)
    saveProfile(profile)
    const params = new URLSearchParams()
    params.set('mode', 'multiplication')
    params.set('tables', selectedTables.join(','))
    params.set('pace', selectedProgressionMode)
    navigate(`/student/${studentId}/practice?${params.toString()}`)
  }

  const handleProgressionModeSelect = (modeValue) => {
    const normalized = normalizeProgressionMode(modeValue, PROGRESSION_MODE_CHALLENGE)
    setSelectedProgressionMode(normalized)
    if (!profile) return

    if (!profile.preferences || typeof profile.preferences !== 'object') {
      profile.preferences = {}
    }
    profile.preferences.defaultProgressionMode = normalized
    saveProfile(profile)
  }

  const startLevelPractice = useCallback((operation, level) => {
    if (!profile) return
    if (!Object.prototype.hasOwnProperty.call(OPERATION_LABELS, operation)) return
    if (!Number.isInteger(level) || level < 1 || level > 12) return

    const now = Date.now()
    recordTelemetryEvent(profile, 'practice_launch_level_focus', {
      operation,
      level,
      progressionMode: selectedProgressionMode
    }, now)
    incrementTelemetryDailyMetric(profile, 'practice_launches', 1, now)
    saveProfile(profile)
    navigate(buildPracticePath(studentId, {
      mode: operation,
      progressionMode: selectedProgressionMode,
      level
    }))
  }, [profile, navigate, selectedProgressionMode, studentId])

  const startFreePractice = () => {
    const now = Date.now()
    recordTelemetryEvent(profile, 'practice_launch_free', {
      progressionMode: selectedProgressionMode
    }, now)
    incrementTelemetryDailyMetric(profile, 'practice_launches', 1, now)
    saveProfile(profile)
    navigate(buildPracticePath(studentId, {
      progressionMode: selectedProgressionMode
    }))
  }

  const startOperationPractice = (operation) => {
    const now = Date.now()
    recordTelemetryEvent(profile, 'practice_launch_operation', {
      operation,
      progressionMode: selectedProgressionMode
    }, now)
    incrementTelemetryDailyMetric(profile, 'practice_launches', 1, now)
    saveProfile(profile)
    navigate(buildPracticePath(studentId, {
      mode: operation,
      progressionMode: selectedProgressionMode
    }))
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Laddar...</p>
      </div>
    )
  }

  const encodedAssignmentPayload = assignment
    ? (assignmentPayload || encodeAssignmentPayload(assignment))
    : ''
  const assignmentPracticePath = assignment
    ? `/student/${studentId}/practice?${new URLSearchParams({
      assignment: String(assignment.id || ''),
      ...(encodedAssignmentPayload ? { assignment_payload: encodedAssignmentPayload } : {})
    }).toString()}`
    : `/student/${studentId}/practice`
  const activeTicketPayload = profile?.ticketInbox?.activePayload || null
  const activeTicketEncoded = String(profile?.ticketInbox?.activeEncoded || '')
  const activeTicketResponse = activeTicketPayload
    ? (Array.isArray(profile.ticketResponses)
      ? profile.ticketResponses.find(item => item.dispatchId === activeTicketPayload.dispatchId) || null
      : null)
    : null
  const handleOpenActiveTicket = () => {
    if (!activeTicketPayload) return
    const params = new URLSearchParams()
    params.set('ticket', activeTicketPayload.dispatchId || '')
    if (activeTicketEncoded) params.set('ticket_payload', activeTicketEncoded)
    const now = Date.now()
    recordTelemetryEvent(profile, 'ticket_open_from_home', {
      dispatchId: activeTicketPayload.dispatchId || '',
      kind: activeTicketPayload.kind || 'start'
    }, now)
    incrementTelemetryDailyMetric(profile, 'ticket_launches', 1, now)
    saveProfile(profile)
    navigate(`/student/${studentId}/ticket?${params.toString()}`)
  }
  const handleStartAssignmentOrFree = () => {
    const now = Date.now()
    recordTelemetryEvent(profile, 'practice_launch_assignment_or_free', {
      assignmentId: assignment?.id || '',
      progressionMode: selectedProgressionMode
    }, now)
    incrementTelemetryDailyMetric(profile, 'practice_launches', 1, now)
    saveProfile(profile)
    if (assignment) {
      navigate(assignmentPracticePath)
      return
    }
    navigate(buildPracticePath(studentId, {
      progressionMode: selectedProgressionMode
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hej {profile.name}</h1>
            <p className="text-sm text-gray-500">Din matteöversikt</p>
          </div>
          <button
            onClick={handleStudentLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logga ut
          </button>
        </div>

        <StudentHomeTableDrillCard
          tables={TABLES}
          selectedTables={selectedTables}
          tableStatus={tableStatus}
          onToggleTable={toggleTable}
          getTableStatusClass={getTableStatusClass}
          onStartTableDrill={startTableDrill}
        />

        <StudentHomeTrainingOptionsCard
          selectedProgressionMode={selectedProgressionMode}
          progressionModeOptions={[PROGRESSION_MODE_CHALLENGE, PROGRESSION_MODE_STEADY]}
          onSelectProgressionMode={handleProgressionModeSelect}
          getProgressionModeLabel={getProgressionModeLabel}
          onStartFreePractice={startFreePractice}
          operationKeys={[
            ...STANDARD_OPERATIONS,
            ...Object.keys(OPERATION_LABELS).filter(op =>
              !STANDARD_OPERATIONS.includes(op) &&
              (enabledExtras ?? []).includes(op)
            )
          ]}
          onStartOperationPractice={startOperationPractice}
          getOperationLabel={getOperationLabel}
        />

        <StudentHomeProgressCard
          operationMasteryBoards={operationMasteryBoards}
          onSelectLevel={startLevelPractice}
          hasRecentProblems={profile.recentProblems.length > 0}
          masteryMinAttempts={MASTERY_MIN_ATTEMPTS}
          masteryMinSuccessRate={MASTERY_MIN_SUCCESS_RATE}
        />

        {activeTicketPayload && !activeTicketResponse && (
          <StudentHomeTicketCard
            activeTicketPayload={activeTicketPayload}
            activeTicketResponse={activeTicketResponse}
            onOpenTicket={handleOpenActiveTicket}
          />
        )}

        <StudentHomePasswordCard
          currentPassword={currentPassword}
          newPassword={newPassword}
          passwordMessage={passwordMessage}
          onSetCurrentPassword={setCurrentPassword}
          onSetNewPassword={setNewPassword}
          onSubmit={handleChangePassword}
        />
      </div>
    </div>
  )
}

export default StudentHome
