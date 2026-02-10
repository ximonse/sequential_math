import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProblemDisplay from './ProblemDisplay'
import PongGame from './PongGame'
import MathScratchpad from './MathScratchpad'
import { getOrCreateProfile, saveProfile } from '../../lib/storage'
import { addProblemResult, getCurrentStreak } from '../../lib/studentProfile'
import { selectNextProblem, adjustDifficulty, shouldSuggestBreak } from '../../lib/difficultyAdapter'

const AUTO_CONTINUE_DELAY = 3000 // 3 sekunder

function StudentSession() {
  const { studentId } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [currentProblem, setCurrentProblem] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false)
  const [showPong, setShowPong] = useState(false)
  const [showScratchpad, setShowScratchpad] = useState(false)
  const inputRef = useRef(null)

  // Ladda profil vid start
  useEffect(() => {
    const loadedProfile = getOrCreateProfile(studentId)
    setProfile(loadedProfile)
  }, [studentId])

  // Generera första problemet när profil är laddad
  useEffect(() => {
    if (profile && !currentProblem && !feedback) {
      const problem = selectNextProblem(profile)
      setCurrentProblem(problem)
      setStartTime(Date.now())
    }
  }, [profile, currentProblem, feedback])

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
    const nextProblem = selectNextProblem(profile)
    setCurrentProblem(nextProblem)
    setAnswer('')
    setFeedback(null)
    setStartTime(Date.now())
  }, [profile])

  // Auto-fortsätt efter 3 sekunder när feedback visas
  useEffect(() => {
    if (!feedback || showBreakSuggestion) return

    const timer = setTimeout(() => {
      goToNextProblem()
    }, AUTO_CONTINUE_DELAY)

    return () => clearTimeout(timer)
  }, [feedback, showBreakSuggestion]) // Medvetet utelämnar goToNextProblem för att undvika re-triggers

  // Lyssna på Enter för att fortsätta (med fördröjning för att undvika dubbel-trigger)
  useEffect(() => {
    if (!feedback || showBreakSuggestion) return

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
  }, [feedback, showBreakSuggestion, goToNextProblem])

  const handleSubmit = () => {
    if (!currentProblem || answer.trim() === '') return

    const timeSpent = (Date.now() - startTime) / 1000
    const normalizedAnswer = answer.trim().replace(/,/g, '.')
    const studentAnswer = parseFloat(normalizedAnswer)
    if (!Number.isFinite(studentAnswer)) return

    // Lägg till resultat
    const { correct } = addProblemResult(profile, currentProblem, studentAnswer, timeSpent)

    // Justera svårighet
    adjustDifficulty(profile, correct)

    // Spara profil
    saveProfile(profile)

    // Uppdatera session count
    const newCount = sessionCount + 1
    setSessionCount(newCount)

    // Visa feedback
    setFeedback({
      correct,
      correctAnswer: currentProblem.result,
      studentAnswer
    })

    // Kolla om paus behövs
    if (shouldSuggestBreak(profile, newCount)) {
      setShowBreakSuggestion(true)
    }
  }

  const handleTakeBreak = () => {
    setShowBreakSuggestion(false)
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

  const streak = getCurrentStreak(profile)

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
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600"
          >
            Avsluta
          </button>
        </div>

        {/* Main content */}
        <div className="py-8">
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
      </div>
    </div>
  )
}

export default StudentSession
