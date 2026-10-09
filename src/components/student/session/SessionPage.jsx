import { lazy, Suspense, useState } from 'react'
import SessionHeader from '../SessionHeader'
import SessionModeBanner from './SessionModeBanner'
import ProblemView from '../ProblemView'
import MathScratchpad from '../MathScratchpad'
import FeedbackOverlay from '../FeedbackOverlay'
import CurrentOperationMastery from './CurrentOperationMastery'
import StudentSyncStatus from './StudentSyncStatus'
const PracticeNotebook = lazy(() => import('../PracticeNotebook'))

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
  revisitingMasteredLevel = false,
  onContinueAdaptively,
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
  syncStatus,
  remainingCount = null,
  praise = ''
}) {
  const [notebookVisible, setNotebookVisible] = useState(false)
  const [notebookOpened, setNotebookOpened] = useState(false)
  const notebookAllowed = sessionAssignment?.workspaces?.notebook === true
  const drawingAllowed = !sessionAssignment?.workspaces || sessionAssignment.workspaces.drawing === true
  const showInlineScratchpad = Boolean(currentProblem) && !feedback
  const showScratchpadControl = Boolean(currentProblem)

  return (
    <div className="min-h-[100dvh] overflow-x-hidden student-role-surface py-4 sm:py-8">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">
        <SessionHeader
          profileName={profileName}
          sessionCount={sessionCount}
          streak={streak}
          remainingCount={remainingCount}
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
          {revisitingMasteredLevel && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <p>Du har redan klarat nivå {fixedPracticeLevel}. Här tränar du bara den nivån.</p>
              <button type="button" onClick={onContinueAdaptively} className="mt-2 rounded bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800">
                Fortsätt med {currentOperationLabel}
              </button>
            </div>
          )}
          {sessionError && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-sm">
              {sessionError}
            </div>
          )}

          {praise && (
            <div role="status" className="mb-4 rounded-lg bg-emerald-100 px-4 py-3 text-center text-2xl font-bold text-emerald-800 shadow">
              {praise}
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
            leftPanel={showScratchpadControl && drawingAllowed ? (
              <div className="w-full flex flex-col items-center">
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={onToggleScratchpad}
                    disabled={!showInlineScratchpad}
                    className={`px-2 py-1 min-h-11 rounded-lg text-sm font-medium disabled:cursor-default disabled:opacity-60 ${
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

          {notebookAllowed && currentProblem && <section className="mt-2" aria-label="Arbetsyta för uppdraget">
            <button type="button" aria-expanded={notebookVisible} disabled={!showInlineScratchpad}
              className="rounded border border-slate-400 bg-white px-2 py-1 min-h-11 text-sm text-slate-900"
              onClick={() => { setNotebookOpened(true); setNotebookVisible(value => !value) }}>
              {notebookVisible ? 'Dölj räknehäfte' : 'Visa räknehäfte'}
            </button>
            <div hidden={!notebookVisible || !showInlineScratchpad}>
              {notebookOpened && <Suspense fallback={<p>Öppnar räknehäftet…</p>}><PracticeNotebook /></Suspense>}
            </div>
          </section>}

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
