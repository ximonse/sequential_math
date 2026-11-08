import { lazy, Suspense, useCallback, useState } from 'react'
import SessionHeader from '../SessionHeader'
import SessionModeBanner from './SessionModeBanner'
import ProblemView from '../ProblemView'
import MathScratchpad from '../MathScratchpad'
import CurrentOperationMastery from './CurrentOperationMastery'
import StudentSyncStatus from './StudentSyncStatus'
import FloatingNotices from './FloatingNotices'
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
  fluencyProgress = '',
  praise = ''
}) {
  // Open for one question at a time: a new question closes the notebook sheet.
  const [notebookFor, setNotebookFor] = useState(null)
  const notebookOpen = Boolean(currentProblem) && notebookFor === currentProblem
  const closeNotebook = useCallback(() => setNotebookFor(null), [])
  const [notebookOpened, setNotebookOpened] = useState(false)
  const notebookAllowed = sessionAssignment?.workspaces?.notebook === true
  const drawingAllowed = !sessionAssignment?.workspaces || sessionAssignment.workspaces.drawing === true
  const showInlineScratchpad = Boolean(currentProblem) && !feedback
  const showScratchpadControl = Boolean(currentProblem)

  return (
    <div className="min-h-[100dvh] overflow-x-hidden student-role-surface py-1 sm:py-8">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">
        <SessionHeader
          profileName={profileName}
          sessionCount={sessionCount}
          streak={streak}
          remainingCount={remainingCount}
          onExit={onExit}
        />
        <FloatingNotices>
          <StudentSyncStatus status={syncStatus} />
          {sessionError && (
            <div role="alert" className="rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-sm shadow">
              {sessionError}
            </div>
          )}
          {praise && (
            <div role="status" className="rounded-lg bg-emerald-100 px-4 py-3 text-center text-2xl font-bold text-emerald-800 shadow">
              {praise}
            </div>
          )}
        </FloatingNotices>

        <div className="pt-1 pb-4 sm:py-8">
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

          {fluencyProgress && <p className="mb-3 text-sm text-gray-600">{fluencyProgress}</p>}

          <ProblemView
            problem={currentProblem}
            feedback={feedback}
            inputValue={answer}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onNext={onNext}
            inputRef={inputRef}
            suppressSoftKeyboard={coarsePointer}
            workspace={{
              // Drawing and notebook sit side by side: under the question on iPad, under the keypad on phones.
              tools: (showScratchpadControl && drawingAllowed) || (notebookAllowed && currentProblem) ? <>
                {showScratchpadControl && drawingAllowed && <button type="button" onClick={onToggleScratchpad} disabled={!showInlineScratchpad}
                  aria-pressed={showScratchpad && showInlineScratchpad}
                  className={`min-h-11 rounded-lg border px-3 py-1 text-sm font-medium disabled:cursor-default disabled:opacity-60 ${showScratchpad && showInlineScratchpad ? 'border-indigo-300 bg-indigo-100 text-indigo-700' : 'border-gray-300 bg-white text-gray-700'}`}>
                  {showScratchpad && showInlineScratchpad ? 'Dölj rityta' : 'Visa rityta'}
                </button>}
                {notebookAllowed && currentProblem && <button type="button" aria-expanded={notebookOpen}
                  className="min-h-11 rounded-lg border px-3 py-1 text-sm font-medium disabled:cursor-default disabled:opacity-60 border-gray-300 bg-white text-gray-700"
                  onClick={() => { setNotebookOpened(true); setNotebookFor(currentProblem) }}>
                  Visa räknehäfte
                </button>}
              </> : null,
              scratchpad: showScratchpadControl && drawingAllowed ? <MathScratchpad visible={showScratchpad && showInlineScratchpad} /> : null,
              // The notebook opens over the page with the question and the same answer box above the grid.
              notebook: notebookAllowed && notebookOpened
                // A new question starts with an empty notebook (Simon 2026-11-08).
                ? <Suspense fallback={<p>Öppnar räknehäftet…</p>}><PracticeNotebook key={currentProblem?.id || ''} /></Suspense> : null,
              notebookOpen,
              onCloseNotebook: closeNotebook
            }}
          />
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
