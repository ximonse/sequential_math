import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import SessionLoadingView from './SessionLoadingView'
import SessionHeader from './SessionHeader'
import SubitizingDice from './session/SubitizingDice'
import { getCurrentStreak, addSubitizingSessionResult } from '../../lib/studentProfile'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime'
import { recordSubitizingResult } from '../../lib/subitizingResults'

function SubitizingSession() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [profile, setProfile] = useState(null)
  const [sessionAssignment, setSessionAssignment] = useState(null)
  const [currentDiceValue, setCurrentDiceValue] = useState(null)
  const [sessionActive, setSessionActive] = useState(true)
  const [sessionStats, setSessionStats] = useState({
    totalProblems: 0,
    correctAnswers: 0,
    totalTimeMs: 0
  })
  const [sessionData, setSessionData] = useState([])

  const sessionStartRef = useRef(Date.now())
  const problemCountRef = useRef(0)
  const problemsRef = useRef([])

  const assignmentId = searchParams.get('assignment')
  const assignmentPayload = searchParams.get('assignment_payload')

  const persistProfile = useCallback(nextProfile => {
    return getPilotStudentRuntime().persistCheckpoint(nextProfile)
  }, [])

  // Load profile and assignment
  useEffect(() => {
    const loadSession = async () => {
      try {
        const runtime = getPilotStudentRuntime()
        const loadedProfile = await runtime.getCheckpoint(studentId)

        if (!loadedProfile) {
          navigate(`/student/${studentId}`)
          return
        }

        setProfile(loadedProfile)

        // Load assignment if provided
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
        }
      } catch (err) {
        console.error('Session load error', err)
        navigate(`/student/${studentId}`)
      }
    }

    loadSession()
  }, [studentId, assignmentId, assignmentPayload, navigate])

  const generateDiceValue = useCallback(() => {
    return Math.floor(Math.random() * 10) + 1
  }, [])

  const startNewProblem = useCallback(() => {
    if (problemCountRef.current > 0) {
      setSessionStats(prev => ({
        ...prev,
        totalProblems: prev.totalProblems + 1
      }))
    }
    problemCountRef.current += 1
    setCurrentDiceValue(generateDiceValue())
  }, [generateDiceValue])

  const handleDiceAnswer = useCallback((selectedNumber, timeMs) => {
    const isCorrect = selectedNumber === currentDiceValue

    if (isCorrect) {
      setSessionStats(prev => ({
        ...prev,
        correctAnswers: prev.correctAnswers + 1,
        totalTimeMs: prev.totalTimeMs + timeMs
      }))
    }

    problemsRef.current.push({
      correctAnswer: currentDiceValue,
      studentAnswer: selectedNumber,
      isCorrect,
      timeMs: Math.max(0, timeMs)
    })

    setTimeout(() => startNewProblem(), 300)
  }, [currentDiceValue, startNewProblem])

  const handleEndSession = useCallback(async () => {
    setSessionActive(false)

    if (!profile || !sessionAssignment) return

    const totalProblems = problemCountRef.current
    const correctAnswers = sessionStats.correctAnswers
    const avgTimeMs = totalProblems > 0
      ? sessionStats.totalTimeMs / correctAnswers || 0
      : 0

    const sessionResult = {
      totalProblems,
      correctAnswers,
      avgTimeMs,
      successRate: totalProblems > 0 ? correctAnswers / totalProblems : 0,
      problemDetails: problemsRef.current,
      completedAt: Date.now()
    }

    recordSubitizingResult(profile.studentId, sessionAssignment.id, sessionAssignment.title, sessionResult)

    const updatedProfile = addSubitizingSessionResult(profile, sessionAssignment, sessionResult)
    setProfile(updatedProfile)
    await persistProfile(updatedProfile)

    navigate(`/student/${studentId}`)
  }, [profile, sessionAssignment, sessionStats, studentId, navigate, persistProfile])

  // Initialize first problem
  useEffect(() => {
    if (profile && sessionAssignment && currentDiceValue === null) {
      startNewProblem()
    }
  }, [profile, sessionAssignment, currentDiceValue, startNewProblem])

  // Auto-end session after 2 minutes of inactivity
  useEffect(() => {
    if (!sessionActive) return

    const timer = setTimeout(() => {
      handleEndSession()
    }, 120000)

    return () => clearTimeout(timer)
  }, [sessionActive, handleEndSession])

  if (!profile || !sessionAssignment) {
    return <SessionLoadingView />
  }

  const streak = getCurrentStreak(profile)

  return (
    <div className="min-h-[100dvh] overflow-x-hidden student-role-surface py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <SessionHeader
          profileName={profile.displayAlias}
          sessionCount={problemCountRef.current}
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
              Rätt: {sessionStats.correctAnswers} / {sessionStats.totalProblems}
            </p>
          </div>

          {currentDiceValue !== null && sessionActive && (
            <div className="bg-white rounded-lg shadow p-8 mb-6">
              <SubitizingDice
                value={currentDiceValue}
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
