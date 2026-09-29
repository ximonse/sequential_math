import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import SessionLoadingView from './SessionLoadingView'
import SessionHeader from './SessionHeader'
import BreakPrompt from './BreakPrompt'
import BreakGameOverlay from './BreakGameOverlay'
import SubitizingDice from './session/SubitizingDice'
import { getCurrentStreak, addSubitizingSessionResult } from '../../lib/studentProfile'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'
import { recordSubitizingResult } from '../../lib/subitizingResults'
import { createTalbildLayout, nextTalbildLevel } from '../../lib/talbildLayout'

const DEFAULT_TARGET_COUNT = 30
const BREAK_EVERY = 15
const PRAISE_AT = 8
const PRAISE_MS = 1600
const BREAK_MINUTES = 2
const PRAISE_MESSAGES = ['Starkt jobbat!!', 'Snyggt! Fortsätt så!', 'Wow, vad snabb du är!', 'Kämpa på, du är på gång!']

function SubitizingSession() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [profile, setProfile] = useState(null)
  const [sessionAssignment, setSessionAssignment] = useState(null)
  const [currentDiceValue, setCurrentDiceValue] = useState(null)
  const [layout, setLayout] = useState([])
  const [problemNumber, setProblemNumber] = useState(0)
  const [sessionActive, setSessionActive] = useState(true)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [showBreak, setShowBreak] = useState(false)
  const [activeBreakGame, setActiveBreakGame] = useState(null)
  const [praise, setPraise] = useState('')

  const problemCountRef = useRef(0)
  const problemsRef = useRef([])
  const levelRef = useRef(0)
  const levelWindowRef = useRef([])
  const answerLockRef = useRef(false)

  const assignmentId = searchParams.get('assignment')
  const assignmentPayload = searchParams.get('assignment_payload')

  const persistProfile = useCallback(nextProfile => {
    return getPilotStudentRuntime().persistCheckpoint(nextProfile)
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        const runtime = getPilotStudentRuntime()
        const bootstrapped = await runtime.bootstrap(studentId)

        if (!bootstrapped.ok) {
          navigate('/', { replace: true })
          return
        }

        setProfile(bootstrapped.profile)

        if (assignmentPayload) {
          try {
            const payload = JSON.parse(atob(assignmentPayload))
            setSessionAssignment(payload)
          } catch {
            console.error('Failed to parse assignment')
          }
        } else if (assignmentId) {
          try {
            const { getAssignmentById } = await import('../../lib/assignments')
            const assignment = getAssignmentById(assignmentId)
            if (assignment) {
              setSessionAssignment(assignment)
            }
          } catch {
            console.error('Failed to load assignment')
          }
        } else {
          setSessionAssignment({ id: 'talbild_free', kind: 'subitizing', title: 'Talbild', targetCount: DEFAULT_TARGET_COUNT })
        }
      } catch (err) {
        console.error('Session load error', err)
        navigate(`/student/${studentId}`)
      }
    }

    loadSession()
  }, [studentId, assignmentId, assignmentPayload, navigate])

  const targetCount = Number(sessionAssignment?.targetCount) > 0
    ? Number(sessionAssignment.targetCount)
    : DEFAULT_TARGET_COUNT

  const startNewProblem = useCallback(() => {
    const value = Math.floor(Math.random() * 10) + 1
    answerLockRef.current = false
    problemCountRef.current += 1
    setProblemNumber(problemCountRef.current)
    setCurrentDiceValue(value)
    setLayout(createTalbildLayout(value, levelRef.current))
  }, [])

  const handleEndSession = useCallback(async () => {
    setSessionActive(false)

    if (!profile || !sessionAssignment) return

    const details = problemsRef.current
    const totalProblems = details.length
    const correct = details.filter(item => item.isCorrect)
    const avgTimeMs = correct.length
      ? correct.reduce((sum, item) => sum + item.timeMs, 0) / correct.length
      : 0

    const sessionResult = {
      totalProblems,
      correctAnswers: correct.length,
      avgTimeMs,
      successRate: totalProblems > 0 ? correct.length / totalProblems : 0,
      problemDetails: details,
      completedAt: Date.now()
    }

    recordSubitizingResult(profile.studentId, sessionAssignment.id, sessionAssignment.title, sessionResult)

    const updatedProfile = addSubitizingSessionResult(profile, sessionAssignment, sessionResult)
    setProfile(updatedProfile)
    await persistProfile(updatedProfile)

    navigate(`/student/${studentId}`)
  }, [profile, sessionAssignment, studentId, navigate, persistProfile])

  const handleDiceAnswer = useCallback((selectedNumber, timeMs) => {
    if (answerLockRef.current) return
    answerLockRef.current = true
    const isCorrect = selectedNumber === currentDiceValue
    const entry = {
      correctAnswer: currentDiceValue,
      studentAnswer: selectedNumber,
      isCorrect,
      timeMs: Math.max(0, timeMs)
    }
    problemsRef.current.push(entry)
    setAnsweredCount(problemsRef.current.length)
    if (isCorrect) setCorrectCount(count => count + 1)

    levelWindowRef.current.push(entry)
    const next = nextTalbildLevel(levelRef.current, levelWindowRef.current)
    levelRef.current = next.level
    if (next.resetWindow) levelWindowRef.current = []

    const answered = problemsRef.current.length
    if (answered >= targetCount) {
      setSessionActive(false)
      setTimeout(() => handleEndSession(), 300)
      return
    }
    if (answered % BREAK_EVERY === 0) {
      setTimeout(() => setShowBreak(true), 300)
      return
    }
    if (answered % BREAK_EVERY === PRAISE_AT) {
      setPraise(PRAISE_MESSAGES[Math.floor(answered / BREAK_EVERY) % PRAISE_MESSAGES.length])
    }
    setTimeout(() => startNewProblem(), 300)
  }, [currentDiceValue, startNewProblem, targetCount, handleEndSession])

  useEffect(() => {
    if (profile && sessionAssignment && currentDiceValue === null) {
      startNewProblem()
    }
  }, [profile, sessionAssignment, currentDiceValue, startNewProblem])

  useEffect(() => {
    if (!praise) return undefined
    const timer = setTimeout(() => setPraise(''), PRAISE_MS)
    return () => clearTimeout(timer)
  }, [praise])

  // Idle auto-end; suspended while a break is showing.
  useEffect(() => {
    if (!sessionActive || showBreak || activeBreakGame) return undefined
    const timer = setTimeout(() => {
      handleEndSession()
    }, 120000)
    return () => clearTimeout(timer)
  }, [sessionActive, showBreak, activeBreakGame, problemNumber, handleEndSession])

  const continueAfterBreak = () => {
    setShowBreak(false)
    setActiveBreakGame(null)
    startNewProblem()
  }

  if (!profile || !sessionAssignment) {
    return <SessionLoadingView />
  }

  if (activeBreakGame) {
    return (
      <BreakGameOverlay
        activeBreakGame={activeBreakGame}
        onClose={() => setActiveBreakGame(null)}
        studentId={studentId}
        studentName={profile.displayAlias}
        classId={profile.classId || ''}
      />
    )
  }

  if (showBreak) {
    return (
      <BreakPrompt
        sessionCount={answeredCount}
        breakDurationMinutes={BREAK_MINUTES}
        onOpenPong={() => setActiveBreakGame('pong')}
        onOpenSnake={() => setActiveBreakGame('snake')}
        showGames={sessionAssignment.id === 'talbild_free' || sessionAssignment.breakGames === true}
        onTakeBreak={handleEndSession}
        onContinue={continueAfterBreak}
      />
    )
  }

  const streak = getCurrentStreak(profile)
  const remaining = Math.max(0, targetCount - answeredCount)

  return (
    <div className="min-h-[100dvh] overflow-x-hidden student-role-surface py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <SessionHeader
          profileName={profile.displayAlias}
          sessionCount={answeredCount}
          streak={streak}
          onExit={() => {
            void persistProfile(profile, { forceSync: true })
            navigate(`/student/${studentId}`)
          }}
        />

        <div className="py-8">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {sessionAssignment.title}
            </h1>
            <p className="text-sm text-gray-600">
              Rätt: {correctCount} / {answeredCount} · {remaining} kvar
            </p>
            <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(100, (answeredCount / targetCount) * 100)}%` }}
              />
            </div>
          </div>

          {praise && (
            <div role="status" className="mb-6 rounded-lg bg-emerald-100 px-4 py-3 text-center text-2xl font-bold text-emerald-800 shadow">
              {praise}
            </div>
          )}

          {currentDiceValue !== null && sessionActive && (
            <div className="bg-white rounded-lg shadow p-3 sm:p-8 mb-6">
              <SubitizingDice
                key={problemNumber}
                layout={layout}
                onAnswer={handleDiceAnswer}
                disabled={!sessionActive}
              />
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleEndSession}
              disabled={!sessionActive}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-300"
            >
              Avsluta övning
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubitizingSession
