import SessionHeader from '../SessionHeader'
import SessionModeBanner from './SessionModeBanner'
import ProblemView from '../ProblemView'
import MathScratchpad from '../MathScratchpad'
import FeedbackOverlay from '../FeedbackOverlay'
import CurrentOperationMastery from './CurrentOperationMastery'
import StudentSyncStatus from './StudentSyncStatus'

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
  currentOperationLabel,
  masteredHistorical,
  masteredThisWeek,
  syncStatus
}) {
  const showInlineScratchpad = Boolean(currentProblem) && !feedback
  const showScratchpadControl = Boolean(currentProblem)

  return (
    <div className="min-h-[100dvh] overflow-x-hidden student-role-surface py-4 sm:py-8">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">
        <SessionHeader
          profileName={profileName}
          sessionCount={sessionCount}
          streak={streak}
          onExit={onExit}
        />
        <StudentSyncStatus status={syncStatus} />

        <div className="py-4 sm:py-8">
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
            leftPanel={showScratchpadControl ? (
              <div className="w-full flex flex-col items-center">
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={onToggleScratchpad}
                    disabled={!showInlineScratchpad}
                    className={`px-4 py-2 rounded-lg text-sm font-medium disabled:cursor-default disabled:opacity-60 ${
                      showScratchpad && showInlineScratchpad
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    {showScratchpad && showInlineScratchpad ? 'Dölj rityta' : 'Visa rityta'}
                  </button>
                </div>
                <MathScratchpad visible={showScratchpad && showInlineScratchpad} />
              </div>
            ) : null}
          />

          <FeedbackOverlay feedback={feedback} />
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
