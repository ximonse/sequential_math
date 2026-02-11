import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import ProblemDisplay from './ProblemDisplay'
import PongGame from './PongGame'
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
import { selectNextProblem, adjustDifficulty, shouldSuggestBreak } from '../../lib/difficultyAdapter'
import { getActiveAssignment, getAssignmentById } from '../../lib/assignments'
import { getOperationLabel } from '../../lib/operations'

const AUTO_CONTINUE_DELAY = 3000 // 3 sekunder
const TABLE_BOSS_URL = 'https://www.youtube.com/watch?v=6jevdk_u8g4'

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
  const [showPong, setShowPong] = useState(false)
  const [showScratchpad, setShowScratchpad] = useState(false)
  const [sessionAssignment, setSessionAssignment] = useState(null)
  const [sessionWarmup, setSessionWarmup] = useState(null)
  const [sessionError, setSessionError] = useState('')
  const [tableQueue, setTableQueue] = useState([])
  const [tableMilestone, setTableMilestone] = useState(null)
  const inputRef = useRef(null)

  const assignmentId = searchParams.get('assignment')
  const mode = searchParams.get('mode')
  const tableSet = useMemo(() => parseTableSet(searchParams.get('tables')), [searchParams])
  const isTableDrill = tableSet.length > 0

  // Ladda profil vid start
  useEffect(() => {
    if (!isStudentSessionActive(studentId)) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
      navigate(`/?redirect=${redirect}`, { replace: true })
      return undefined
    }

    let active = true
    ;(async () => {
      const loadedProfile = await getOrCreateProfileWithSync(studentId)
      if (active) setProfile(loadedProfile)
    })()
    return () => { active = false }
  }, [studentId, navigate, location.pathname, location.search])

  useEffect(() => {
    if (!assignmentId) {
      setSessionAssignment(getActiveAssignment())
      return
    }
    const assignment = getAssignmentById(assignmentId)
    setSessionAssignment(assignment)
  }, [assignmentId])

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

    const operationHistory = profile.recentProblems.filter(p => inferOperationFromType(p.problemType) === mode)
    const hasHistory = operationHistory.length > 0
    const estimatedLevel = estimateOperationLevel(profile, mode)

    if (!hasHistory) {
      setSessionWarmup({
        operation: mode,
        targetLevel: 1,
        startLevel: 1,
        warmupCount: 3
      })
      return
    }

    const startLevel = Math.max(1, Math.round(estimatedLevel) - 1)
    const targetLevel = Math.max(startLevel, Math.round(estimatedLevel))
    setSessionWarmup({
      operation: mode,
      targetLevel,
      startLevel,
      warmupCount: 3
    })
  }, [profile, mode, isTableDrill])

  useEffect(() => {
    if (!profile) return
    if (!isTableDrill) return

    const initialQueue = createTableQueue(tableSet)
    setTableQueue(initialQueue)
    setTableMilestone(null)
    setCurrentProblem(initialQueue.length > 0 ? createTableProblem(initialQueue[0]) : null)
    setAnswer('')
    setFeedback(null)
    setSessionCount(0)
    setStartTime(Date.now())
  }, [profile, isTableDrill, tableSet])

  const completedThisSession = useMemo(() => sessionCount, [sessionCount])

  // Generera första problemet när profil är laddad
  useEffect(() => {
    if (profile && !currentProblem && !feedback) {
      if (isTableDrill) {
        if (tableQueue.length === 0) return
        const problem = createTableProblem(tableQueue[0])
        setCurrentProblem(problem)
        setStartTime(Date.now())
        return
      }
      const rules = getSessionRules(sessionAssignment, mode, sessionWarmup, completedThisSession, tableSet)
      const problem = safeSelectProblem(profile, rules)
      if (!problem) return
      setCurrentProblem(problem)
      setStartTime(Date.now())
    }
  }, [profile, currentProblem, feedback, sessionAssignment, mode, sessionWarmup, completedThisSession, tableSet, isTableDrill, tableQueue])

  // Fokusera input när nytt problem visas
  useEffect(() => {
    if (currentProblem && !feedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentProblem, feedback])

  useEffect(() => {
    if (currentProblem?.type !== 'multiplication') {
      setShowScratchpad(false)
    }
  }, [currentProblem])

  // Gå till nästa problem
  const goToNextProblem = useCallback(() => {
    if (!profile) return
    if (isTableDrill) {
      if (tableQueue.length === 0) return
      const nextProblem = createTableProblem(tableQueue[0])
      setCurrentProblem(nextProblem)
      setAnswer('')
      setFeedback(null)
      setStartTime(Date.now())
      return
    }
    const rules = getSessionRules(sessionAssignment, mode, sessionWarmup, completedThisSession, tableSet)
    const nextProblem = safeSelectProblem(profile, rules)
    if (!nextProblem) return
    setCurrentProblem(nextProblem)
    setAnswer('')
    setFeedback(null)
    setStartTime(Date.now())
  }, [profile, sessionAssignment, mode, sessionWarmup, completedThisSession, tableSet, isTableDrill, tableQueue])

  const safeSelectProblem = (currentProfile, rules) => {
    try {
      setSessionError('')
      return selectNextProblem(currentProfile, rules)
    } catch (err) {
      console.error('Problem selection failed', err)
      setSessionError('Kunde inte ladda nästa uppgift. Försök igen.')
      return null
    }
  }

  // Auto-fortsätt efter 3 sekunder när feedback visas
  useEffect(() => {
    if (!feedback || showBreakSuggestion || tableMilestone) return

    const timer = setTimeout(() => {
      goToNextProblem()
    }, AUTO_CONTINUE_DELAY)

    return () => clearTimeout(timer)
  }, [feedback, showBreakSuggestion, tableMilestone]) // Medvetet utelämnar goToNextProblem för att undvika re-triggers

  // Lyssna på Enter för att fortsätta (med fördröjning för att undvika dubbel-trigger)
  useEffect(() => {
    if (!feedback || showBreakSuggestion || tableMilestone) return

    // Vänta 100ms så att Enter från submit hinner släppas
    const activateTimer = setTimeout(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          goToNextProblem()
        }
      }
      window.addEventListener('keydown', handleKeyDown)

      // Spara referens för cleanup
      window._mathEnterHandler = handleKeyDown
    }, 100)

    return () => {
      clearTimeout(activateTimer)
      if (window._mathEnterHandler) {
        window.removeEventListener('keydown', window._mathEnterHandler)
        window._mathEnterHandler = null
      }
    }
  }, [feedback, showBreakSuggestion, tableMilestone, goToNextProblem])

  const handleSubmit = () => {
    if (!currentProblem || answer.trim() === '') return

    const timeSpent = (Date.now() - startTime) / 1000
    const normalizedAnswer = answer.trim().replace(/,/g, '.')
    const studentAnswer = parseFloat(normalizedAnswer)
    if (!Number.isFinite(studentAnswer)) return

    // Lägg till resultat
    const { correct } = addProblemResult(
      profile,
      currentProblem,
      studentAnswer,
      timeSpent,
      { rawAnswer: normalizedAnswer }
    )

    if (!isTableDrill) {
      // Justera svårighet i vanliga lägen
      adjustDifficulty(profile, correct)
    }

    // Uppdatera session count
    const newCount = sessionCount + 1
    setSessionCount(newCount)

    // Visa feedback
    setFeedback({
      correct,
      correctAnswer: currentProblem.result,
      studentAnswer
    })

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
            masteredTwoToNineToday: hasMasteredTablesToday(profile, [2, 3, 4, 5, 6, 7, 8, 9]),
            boss: completionCountToday >= 3,
            finalizeAfter: remainingTables.length === 0,
            finalCelebration: remainingTables.length === 0
          })
        }
      }
    } else if (shouldSuggestBreak(profile, newCount)) {
      // Kolla om paus behövs i vanliga lägen
      setShowBreakSuggestion(true)
    }

    // Spara profil efter alla eventuella uppdateringar
    saveProfile(profile)
  }

  const handleTakeBreak = () => {
    setShowBreakSuggestion(false)
    clearActiveStudentSession()
    navigate('/')
  }

  const goToNextProblemAfterBreakSuggestion = () => {
    setShowBreakSuggestion(false)
    setSessionCount(0)  // Reset session count
    goToNextProblem()
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Laddar...</p>
      </div>
    )
  }

  // Pong-spel under paus
  if (showPong) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 relative">
        <PongGame onClose={() => {
          setShowPong(false)
          setShowBreakSuggestion(false)
          setSessionCount(0)
          goToNextProblem()
        }} />
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
            Du har gjort {sessionCount} uppgifter! En kort paus hjälper hjärnan att vila.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setShowPong(true)}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              🏓 Spela Pong (max 3 min)
            </button>
            <button
              onClick={handleTakeBreak}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
            >
              Avsluta för idag
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
      const finalizeAfter = tableMilestone.finalizeAfter
      setTableMilestone(null)
      if (finalizeAfter) {
        navigate(`/student/${studentId}`)
        return
      }
      if (tableMilestone.masteredTwoToNineToday) {
        window.location.href = TABLE_BOSS_URL
        return
      }
      if (tableQueue.length > 0) {
        const nextProblem = createTableProblem(tableQueue[0])
        setCurrentProblem(nextProblem)
        setAnswer('')
        setFeedback(null)
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
          <p className="text-sm text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            Tryck var som helst för att fortsätta
          </p>
        </div>
      </div>
    )
  }

  const streak = getCurrentStreak(profile)
  const currentOperation = currentProblem?.type || 'addition'
  const weekStart = getStartOfWeekTimestamp()
  const masteredHistorical = getMasteryForOperation(profile, currentOperation)
  const masteredThisWeek = getMasteryForOperation(profile, currentOperation, { since: weekStart })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-gray-500">{profile.name}</p>
            <p className="text-xs text-gray-400">
              Nivå {Math.round(profile.currentDifficulty)} | {sessionCount} denna session
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
              if (isTableDrill && tableQueue.length > 0) {
                setSessionError('Avsluta efter att du svarat rätt på alla tabeller i kön.')
                return
              }
              clearActiveStudentSession()
              navigate('/')
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            Avsluta
          </button>
        </div>

        {/* Main content */}
        <div className="py-8">
          <SessionModeBanner assignment={sessionAssignment} mode={mode} tableSet={tableSet} />
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
            inputRef={inputRef}
          />

          {currentProblem?.type === 'multiplication' && !feedback && (
            <div className="mt-5 flex justify-center">
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
          )}

          <MathScratchpad visible={showScratchpad && currentProblem?.type === 'multiplication' && !feedback} />

          {/* Knapp + feedback - fast höjd */}
          <div className="mt-8 flex flex-col items-center h-28">
            {/* Feedback text - reserverad plats */}
            <div className="h-10 flex items-center">
              {feedback && (
                <p className={`text-2xl font-bold ${feedback.correct ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback.correct ? 'Rätt!' : 'Inte riktigt'}
                </p>
              )}
            </div>

            {/* Knapp - alltid samma plats och storlek */}
            <button
              onClick={feedback ? goToNextProblem : handleSubmit}
              disabled={!feedback && answer.trim() === ''}
              className={`px-10 py-3 text-white text-xl font-semibold rounded-xl transition-colors min-w-[140px] ${
                feedback
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300'
              }`}
            >
              {feedback ? 'Nästa' : 'Svara'}
            </button>

            {/* Hint text - reserverad plats */}
            <div className="h-6 mt-2">
              {feedback && (
                <p className="text-sm text-gray-400">Enter eller vänta...</p>
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

function SessionModeBanner({ assignment, mode, tableSet }) {
  if (!assignment) {
    if (tableSet.length > 0) {
      return (
        <div className="mb-5 bg-white border border-orange-200 text-orange-700 rounded-lg px-4 py-2 text-sm">
          Läge: Tabellövning | {tableSet.join(',')}:an
        </div>
      )
    }

    if (mode && isKnownMode(mode)) {
      return (
        <div className="mb-5 bg-white border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-sm">
          Läge: {getOperationLabel(mode)}
        </div>
      )
    }
    return (
      <div className="mb-5 bg-white border border-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm">
        Läge: Fri träning
      </div>
    )
  }

  return (
    <div className="mb-5 bg-white border border-indigo-200 text-indigo-700 rounded-lg px-4 py-2 text-sm">
      Läge: Uppdrag | {assignment.title} | Nivå {assignment.minLevel}-{assignment.maxLevel}
    </div>
  )
}

function getSessionRules(assignment, mode, warmup, solvedCount, tableSet = []) {
  const rules = {}

  if (assignment) {
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

function estimateOperationLevel(profile, operation) {
  const relevant = profile.recentProblems
    .filter(p => inferOperationFromType(p.problemType) === operation)
    .slice(-20)

  if (relevant.length === 0) return 1

  const sum = relevant.reduce((acc, p) => {
    const lvl = p.difficulty?.conceptual_level || Math.round(profile.currentDifficulty) || 1
    return acc + lvl
  }, 0)

  return sum / relevant.length
}

function inferOperationFromType(problemType = '') {
  if (problemType.startsWith('add_')) return 'addition'
  if (problemType.startsWith('sub_')) return 'subtraction'
  if (problemType.startsWith('mul_')) return 'multiplication'
  if (problemType.startsWith('div_')) return 'division'
  return 'addition'
}

function isKnownMode(mode) {
  return mode === 'addition'
    || mode === 'subtraction'
    || mode === 'multiplication'
    || mode === 'division'
}

export default StudentSession
