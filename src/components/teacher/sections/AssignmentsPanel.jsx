export default function AssignmentsPanel({
  assignments,
  activeAssignmentId,
  copiedId,
  formatAssignmentSummaryLine,
  onCreatePreset,
  onClearActiveForAll,
  onClearAllAssignments,
  onActivateForAll,
  onDeleteAssignment,
  onCopyAssignmentLink
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8" style={{ order: -60 }}>
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Uppdrag via länk</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => onCreatePreset('addition')}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Nytt: Bara addition
        </button>
        <button
          onClick={() => onCreatePreset('multiplication')}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
        >
          Nytt: Bara multiplikation
        </button>
        <button
          onClick={() => onCreatePreset('subtraction')}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
        >
          Nytt: Bara subtraktion
        </button>
        <button
          onClick={() => onCreatePreset('division')}
          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
        >
          Nytt: Bara division
        </button>
        <button
          onClick={() => onCreatePreset('mixed')}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
        >
          Nytt: Kombination
        </button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">Inga uppdrag skapade ännu.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <p className="text-xs text-gray-500">
              Aktivt för alla: {activeAssignmentId ? activeAssignmentId : 'Ingen (fri träning)'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClearActiveForAll}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs"
              >
                Rensa aktivt
              </button>
              <button
                onClick={onClearAllAssignments}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
              >
                Rensa alla
              </button>
            </div>
          </div>
          {assignments.slice(0, 10).map(assignment => (
            <div
              key={assignment.id}
              className={`flex flex-wrap items-center justify-between gap-2 border rounded p-2 ${activeAssignmentId === assignment.id ? 'border-green-400 bg-green-50' : ''
                }`}
            >
              <div className="text-sm">
                <p className="font-medium text-gray-800">{assignment.title}</p>
                <p className="text-gray-500">{formatAssignmentSummaryLine(assignment)}</p>
                <p className="text-xs text-gray-400 font-mono">{assignment.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onActivateForAll(assignment.id)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                >
                  Aktivera för alla
                </button>
                <button
                  onClick={() => onDeleteAssignment(assignment.id)}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                >
                  Ta bort
                </button>
                <button
                  onClick={() => onCopyAssignmentLink(assignment.id)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white rounded text-xs"
                >
                  {copiedId === assignment.id ? 'Kopierad' : 'Kopiera länk'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
