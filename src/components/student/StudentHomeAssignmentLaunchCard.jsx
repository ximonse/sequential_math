export default function StudentHomeAssignmentLaunchCard({
  assignment,
  onStart
}) {
  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Ditt nästa steg</h2>
          <p className="text-sm text-gray-600 mt-1">
            {assignment ? assignment.title : 'Fortsätt med blandad träning på din nivå.'}
          </p>
        </div>
        <button
          onClick={onStart}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
        >
          {assignment ? 'Starta uppdraget' : 'Fortsätt träna'}
        </button>
      </div>
    </div>
  )
}
