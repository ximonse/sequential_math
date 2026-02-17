import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  changeStudentPassword,
  clearActiveStudentSession,
  getOrCreateProfileWithSync,
  isStudentSessionActive,
  saveProfile
} from '../../lib/storage'
import { getStartOfWeekTimestamp } from '../../lib/studentProfile'
import { inferOperationFromProblemType } from '../../lib/mathUtils'
import { getOperationLabel, OPERATION_LABELS } from '../../lib/operations'
import { getActiveAssignment, getAssignmentById } from '../../lib/assignments'
import {
  getProgressionModeLabel,
  PROGRESSION_MODE_CHALLENGE,
  PROGRESSION_MODE_STEADY,
  normalizeProgressionMode
} from '../../lib/progressionModes'
import {
  markStudentPresence,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_SAVE_THROTTLE_MS
} from '../../lib/studentPresence'
import {
  incrementTelemetryDailyMetric,
  recordTelemetryEvent
} from '../../lib/telemetry'

const MASTERY_MIN_ATTEMPTS = 5
const MASTERY_MIN_SUCCESS_RATE = 0.8
const LEVELS = Array.from({ length: 12 }, (_, index) => index + 1)

function StudentHome() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
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
    if (!assignmentId && !mode && !requestedPace) return

    const params = new URLSearchParams()
    if (assignmentId) params.set('assignment', assignmentId)
    if (mode) params.set('mode', mode)
    if (requestedPace) params.set('pace', requestedPace)

    navigate(`/student/${studentId}/practice?${params.toString()}`, { replace: true })
  }, [studentId, assignmentId, mode, requestedPace, ticketId, ticketPayload, navigate])

  useEffect(() => {
    if (assignmentId) {
      setAssignment(getAssignmentById(assignmentId))
      return
    }
    setAssignment(getActiveAssignment())
  }, [assignmentId])

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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Laddar...</p>
      </div>
    )
  }

  const assignmentPracticePath = assignment
    ? `/student/${studentId}/practice?assignment=${encodeURIComponent(assignment.id)}`
    : `/student/${studentId}/practice`
  const activeTicketPayload = profile?.ticketInbox?.activePayload || null
  const activeTicketEncoded = String(profile?.ticketInbox?.activeEncoded || '')
  const activeTicketResponse = activeTicketPayload
    ? (Array.isArray(profile.ticketResponses)
      ? profile.ticketResponses.find(item => item.dispatchId === activeTicketPayload.dispatchId) || null
      : null)
    : null

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

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-gray-500">
                Läge: {assignment ? `Uppdrag (${assignment.title})` : 'Fri träning'}
              </p>
              {!assignment && (
                <p className="text-xs text-gray-400 mt-1">
                  Tempo: {getProgressionModeLabel(selectedProgressionMode)}
                </p>
              )}
            </div>
            <button
              onClick={() => {
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
              }}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              {assignment ? 'Fortsätt uppdrag' : 'Starta fri träning'}
            </button>
          </div>
        </div>

        {activeTicketPayload && (
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 border border-amber-300/90 rounded-2xl p-4 md:p-5 mb-6 shadow-[0_14px_36px_-24px_rgba(146,64,14,0.6)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-amber-800 font-semibold">
                  Aktiv ticket
                </p>
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mt-1">
                  {activeTicketPayload.title || (activeTicketPayload.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket')}
                </h2>
                <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">
                  {activeTicketPayload.question}
                </p>
                {activeTicketResponse && (
                  <p className="text-xs text-emerald-700 mt-1.5 font-semibold">
                    Svar registrerat {activeTicketResponse.answeredAt ? `(${new Date(activeTicketResponse.answeredAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })})` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
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
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-sm whitespace-nowrap"
              >
                Öppna ticket
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Tabellövning - mängdträning</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
            {TABLES.map(table => (
              <button
                key={table}
                type="button"
                onClick={() => toggleTable(table)}
                className={`h-11 rounded-lg border-2 text-sm font-semibold relative ${
                  selectedTables.includes(table)
                    ? 'border-orange-500'
                    : 'border-gray-200'
                } ${getTableStatusClass(tableStatus[table])}`}
              >
                {table}
                {tableStatus[table] === 'star' && (
                  <span className="absolute -top-1 -right-1 text-yellow-500 text-sm" aria-hidden="true">★</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Välj en eller flera tabeller och tryck Kör.
            </p>
            <button
              type="button"
              onClick={startTableDrill}
              disabled={selectedTables.length === 0}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold"
            >
              Kör
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Välj träning</h2>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Tempo</span>
            {[PROGRESSION_MODE_CHALLENGE, PROGRESSION_MODE_STEADY].map(modeOption => (
              <button
                key={modeOption}
                type="button"
                onClick={() => handleProgressionModeSelect(modeOption)}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  selectedProgressionMode === modeOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getProgressionModeLabel(modeOption)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                const now = Date.now()
                recordTelemetryEvent(profile, 'practice_launch_free', {
                  progressionMode: selectedProgressionMode
                }, now)
                incrementTelemetryDailyMetric(profile, 'practice_launches', 1, now)
                saveProfile(profile)
                navigate(buildPracticePath(studentId, {
                  progressionMode: selectedProgressionMode
                }))
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              Fri träning ({getProgressionModeLabel(selectedProgressionMode)})
            </button>
            {Object.keys(OPERATION_LABELS).map(operation => (
              <button
                key={operation}
                onClick={() => {
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
                }}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                {getOperationLabel(operation)} ({getProgressionModeLabel(selectedProgressionMode)})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Byt elevlösenord</h2>
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nuvarande"
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nytt lösenord"
              className="px-3 py-2 border rounded text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Spara
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">{passwordMessage || ' '}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Framsteg</h2>
          <p className="text-xs text-gray-500 mb-3">
            Alla nivåer 1-12 visas. Grön = klarad (minst {MASTERY_MIN_ATTEMPTS} försök och minst {Math.round(MASTERY_MIN_SUCCESS_RATE * 100)}% rätt), blå = pågående, transparent = ej tränad ännu.
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Tryck på en nivå-ruta för att öva just den nivån.
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] mb-4">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700">
              Klarad
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700">
              Pågående
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-400 opacity-60">
              Ej startad
            </span>
          </div>
          <div className="space-y-4">
            {operationMasteryBoards.map((item) => (
              <div key={item.operation}>
                <p className="text-sm font-medium text-gray-700 mb-1">{getOperationLabel(item.operation)}</p>
                <OperationMasteryRows
                  operation={item.operation}
                  historical={item.historical}
                  weekly={item.weekly}
                  onSelectLevel={startLevelPractice}
                />
              </div>
            ))}
          </div>
          {profile.recentProblems.length === 0 && (
            <p className="text-sm text-gray-500 mt-4">Ingen träningshistorik ännu.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function OperationMasteryRows({ operation, historical, weekly, onSelectLevel }) {
  return (
    <div className="space-y-2">
      <MasteryLevelGrid
        label="Historiskt"
        operation={operation}
        levels={historical}
        onSelectLevel={onSelectLevel}
      />
      <MasteryLevelGrid
        label="Denna vecka"
        operation={operation}
        levels={weekly}
        onSelectLevel={onSelectLevel}
      />
    </div>
  )
}

function MasteryLevelGrid({ label, operation, levels, onSelectLevel }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {levels.map((levelData) => (
          <button
            type="button"
            key={`${operation}-${label}-${levelData.level}`}
            title={levelData.title}
            onClick={() => onSelectLevel(operation, levelData.level)}
            className={`inline-flex h-11 w-11 flex-col items-center justify-center rounded-md border text-[10px] leading-none ${getMasteryLevelClassName(levelData.status)}`}
          >
            <span className="font-bold text-[11px]">{levelData.level}</span>
            <span className="mt-0.5">{levelData.metricsLabel}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function createOperationLevelBuckets() {
  const makeLevelMap = () => Object.fromEntries(
    LEVELS.map(level => [level, { attempts: 0, correct: 0 }])
  )

  return {
    historical: makeLevelMap(),
    weekly: makeLevelMap()
  }
}

function buildLevelMasteryView(level, bucket = {}) {
  const attempts = Number(bucket.attempts || 0)
  const correct = Number(bucket.correct || 0)
  const successRate = attempts > 0 ? correct / attempts : 0
  const isMastered = attempts >= MASTERY_MIN_ATTEMPTS && successRate >= MASTERY_MIN_SUCCESS_RATE
  const isStarted = attempts > 0

  const status = isMastered ? 'mastered' : (isStarted ? 'started' : 'empty')
  const successPercent = Math.round(successRate * 100)
  const metricsLabel = isStarted ? `${correct}/${attempts}` : '-'
  const title = isStarted
    ? `Nivå ${level}: ${correct}/${attempts} rätt (${successPercent}%)`
    : `Nivå ${level}: ingen träning ännu`

  return {
    level,
    attempts,
    correct,
    successRate,
    successPercent,
    status,
    metricsLabel,
    title
  }
}

function getMasteryLevelClassName(status) {
  if (status === 'mastered') {
    return 'bg-green-100 text-green-800 border-green-300'
  }
  if (status === 'started') {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }
  return 'bg-gray-50 text-gray-400 border-gray-200 opacity-45'
}

export default StudentHome

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function buildTableStatus(profile) {
  const fallback = Object.fromEntries(TABLES.map(table => [table, 'default']))
  if (!profile) return fallback

  const startToday = getStartOfDayTimestamp()
  const startWeek = getStartOfWeekTimestamp()
  const completionCountsToday = getTableCompletionCountsToday(profile, startToday)
  const problemSource = getTableProblemSource(profile)
  const todayDoneMap = computeStickyTableCompletionMap(problemSource, startToday)
  const weekDoneMap = computeStickyTableCompletionMap(problemSource, startWeek)

  const result = {}
  for (const table of TABLES) {
    const weekDone = Boolean(weekDoneMap[table])
    const todayDone = Boolean(todayDoneMap[table])
    const star = (completionCountsToday[table] || 0) >= 3

    if (star) {
      result[table] = 'star'
    } else if (todayDone) {
      result[table] = 'today'
    } else if (weekDone) {
      result[table] = 'week'
    } else {
      result[table] = 'default'
    }
  }

  return result
}

function getTableProblemSource(profile) {
  const problemLog = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recentProblems = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []

  if (problemLog.length === 0) return recentProblems
  if (recentProblems.length === 0) return problemLog

  const logLatest = getLatestProblemTimestamp(problemLog)
  const recentLatest = getLatestProblemTimestamp(recentProblems)
  if (recentLatest > logLatest) return recentProblems
  if (logLatest > recentLatest) return problemLog
  return problemLog.length >= recentProblems.length ? problemLog : recentProblems
}

function getLatestProblemTimestamp(list) {
  if (!Array.isArray(list) || list.length === 0) return 0
  let maxTs = 0
  for (const item of list) {
    const ts = Number(item?.timestamp || 0)
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts
  }
  return maxTs
}

function computeStickyTableCompletionMap(problemSource, startTimestamp) {
  const progress = TABLES.reduce((acc, table) => {
    acc[table] = {
      attempts: 0,
      correct: 0,
      reached: false
    }
    return acc
  }, {})

  if (!Array.isArray(problemSource) || problemSource.length === 0) {
    return TABLES.reduce((acc, table) => {
      acc[table] = false
      return acc
    }, {})
  }

  const scoped = problemSource
    .filter(item => Number(item?.timestamp || 0) >= startTimestamp)
    .slice()
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0))

  for (const problem of scoped) {
    const table = inferMultiplicationTable(problem)
    if (!table) continue

    const entry = progress[table]
    entry.attempts += 1
    if (problem.correct) entry.correct += 1
    if (!entry.reached && isTableCompleted(entry)) {
      entry.reached = true
    }
  }

  return TABLES.reduce((acc, table) => {
    acc[table] = Boolean(progress[table]?.reached)
    return acc
  }, {})
}

function getTableCompletionCountsToday(profile, startTodayTimestamp) {
  const counts = TABLES.reduce((acc, table) => {
    acc[table] = 0
    return acc
  }, {})

  const completions = profile?.tableDrill?.completions
  if (!Array.isArray(completions)) return counts

  for (const completion of completions) {
    const table = Number(completion?.table)
    const ts = Number(completion?.timestamp || 0)
    if (!TABLES.includes(table)) continue
    if (ts < startTodayTimestamp) continue
    counts[table] += 1
  }

  return counts
}

function inferMultiplicationTable(problem) {
  const tag = String(problem?.skillTag || '')
  const match = tag.match(/^mul_table_(\d{1,2})$/)
  if (match) {
    const n = Number(match[1])
    if (n >= 2 && n <= 12) return n
  }

  if (!String(problem?.problemType || '').startsWith('mul_')) return null
  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null

  if (a >= 2 && a <= 12 && b >= 1 && b <= 12) return a
  if (b >= 2 && b <= 12 && a >= 1 && a <= 12) return b
  return null
}

function isTableCompleted(stats) {
  if (!stats) return false
  if (stats.attempts < 10) return false
  const success = stats.correct / Math.max(1, stats.attempts)
  return success >= 0.8
}

function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function getTableStatusClass(status) {
  if (status === 'star') return 'bg-green-500 text-white'
  if (status === 'today') return 'bg-green-500 text-white'
  if (status === 'week') return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-700'
}

function buildPracticePath(studentId, options = {}) {
  const params = new URLSearchParams()
  if (options.mode) params.set('mode', options.mode)
  const progressionMode = normalizeProgressionMode(options.progressionMode, PROGRESSION_MODE_CHALLENGE)
  params.set('pace', progressionMode)
  const level = Number(options.level)
  if (Number.isInteger(level) && level >= 1 && level <= 12) {
    params.set('level', String(level))
  }
  const query = params.toString()
  return query
    ? `/student/${studentId}/practice?${query}`
    : `/student/${studentId}/practice`
}
