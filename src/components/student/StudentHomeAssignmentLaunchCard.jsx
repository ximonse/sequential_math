export default function StudentHomeAssignmentLaunchCard({
  assignment,
  selectedProgressionMode,
  getProgressionModeLabel,
  onStart
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-gray-500">
            Läge: {assignment ? `${assignment.kind === 'ncm' ? 'NCM-uppdrag' : 'Uppdrag'} (${assignment.title})` : 'Fri träning'}
          </p>
          {!assignment && (
            <p className="text-xs text-gray-400 mt-1">
              Tempo: {getProgressionModeLabel(selectedProgressionMode)}
            </p>
          )}
        </div>
        <button
          onClick={onStart}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
        >
          {assignment ? 'Fortsätt uppdrag' : 'Starta fri träning'}
        </button>
      </div>
    </div>
  )
}
