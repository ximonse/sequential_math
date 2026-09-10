export default function AssignedClassPicker({ assignments, onChoose, onBack, busy }) {
  const hasSeveral = assignments.length > 1
  return (
    <section aria-labelledby="assigned-class-heading" className="space-y-5">
      <div className="text-center">
        <p className="text-sm font-medium text-blue-700">Inloggningen är godkänd</p>
        <h2 id="assigned-class-heading" className="mt-1 text-2xl font-bold text-gray-800">
          {hasSeveral ? 'Välj din grupp' : 'Fortsätt till din grupp'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {hasSeveral ? 'Du kan bara välja bland grupper som din lärare har tilldelat.' : 'Det här är gruppen som din lärare har tilldelat dig.'}
        </p>
      </div>
      <div className="space-y-3">
        {assignments.map(assignment => (
          <button key={assignment.classId} type="button" disabled={busy}
            onClick={() => onChoose(assignment.classId)}
            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-4 text-left transition hover:border-blue-500 hover:bg-blue-100 disabled:opacity-50">
            <span className="block text-lg font-semibold text-gray-800">{assignment.className}</span>
            <span className="mt-1 block text-sm text-gray-600">{assignment.schoolName}</span>
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={onBack} className="w-full py-2 text-sm text-blue-700 underline">
        Byt namn eller elev-ID
      </button>
    </section>
  )
}
