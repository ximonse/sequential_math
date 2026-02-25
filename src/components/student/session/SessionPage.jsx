import SessionHeader from '../SessionHeader'
import SessionModeBanner from './SessionModeBanner'
import ProblemView from '../ProblemView'
import MathScratchpad from '../MathScratchpad'
import FeedbackOverlay from '../FeedbackOverlay'
import CurrentOperationMastery from './CurrentOperationMastery'

function SessionPage({
  profileName,
  sessionCount,
  streak,
  onExit,
  sessionAssignment,
  mode,
  tableSet,
  progressionMode,
  fixedPracticeLevel,
  sessionError,
  currentProblem,
  feedback,
  answer,
  onInputChange,
  onSubmit,
  onNext,
  inputRef,
  coarsePointer,
  showScratchpad,
  onToggleScratchpad,
  overallSuccessRate,
  currentOperationLabel,
  masteredHistorical,
  masteredThisWeek
}) {
  const showInlineScratchpad = Boolean(currentProblem) && !feedback

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <SessionHeader
          profileName={profileName}
          sessionCount={sessionCount}
          streak={streak}
          onExit={onExit}
        />

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

          <ProblemView
            problem={currentProblem}
            feedback={feedback}
            inputValue={answer}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onNext={onNext}
            inputRef={inputRef}
            suppressSoftKeyboard={coarsePointer}
            leftPanel={showInlineScratchpad ? (
              <div className="w-full flex flex-col items-center">
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={onToggleScratchpad}
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

          <FeedbackOverlay feedback={feedback} />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Success rate</span>
            <span>{Math.round(overallSuccessRate * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${overallSuccessRate * 100}%` }}
            />
          </div>
        </div>

        <CurrentOperationMastery
          operationLabel={currentOperationLabel}
          historical={masteredHistorical}
          weekly={masteredThisWeek}
        />
      </div>
    </div>
  )
}

export default SessionPage
