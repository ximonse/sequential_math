import { useState } from 'react'
import AssignmentQrDialog from './AssignmentQrDialog'

const PRESET_BUTTONS = [
  ['addition', 'Nytt: Bara addition', 'bg-blue-600 hover:bg-blue-700'],
  ['multiplication', 'Nytt: Bara multiplikation', 'bg-indigo-600 hover:bg-indigo-700'],
  ['subtraction', 'Nytt: Bara subtraktion', 'bg-purple-600 hover:bg-purple-700'],
  ['division', 'Nytt: Bara division', 'bg-cyan-600 hover:bg-cyan-700'],
  ['mixed', 'Nytt: Kombination', 'bg-emerald-600 hover:bg-emerald-700'],
  ['fractions', 'Nytt: Bråk', 'bg-lime-600 hover:bg-lime-700'],
  ['percentage', 'Nytt: Procent', 'bg-amber-600 hover:bg-amber-700'],
  ['arithmetic_expressions', 'Nytt: Prioriteringsregler', 'bg-rose-600 hover:bg-rose-700'],
  ['algebra_evaluate', 'Nytt: Algebra (räkna ut)', 'bg-indigo-600 hover:bg-indigo-700'],
  ['algebra_simplify', 'Nytt: Algebra (förenkla)', 'bg-violet-600 hover:bg-violet-700']
]

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
  const [qrAssignment, setQrAssignment] = useState(null)

  return (
    <section className="bg-white rounded-lg shadow p-3" style={{ order: -60 }}>
      <h2 className="mb-2 text-lg font-semibold text-gray-800">Uppdrag via länk</h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESET_BUTTONS.map(([key, label, colorClass]) => (
          <button
            key={key}
            type="button"
            onClick={() => onCreatePreset(key)}
            className={`rounded px-2.5 py-1.5 text-sm text-white ${colorClass}`}
          >
            {label}
          </button>
        ))}
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">Inga uppdrag skapade ännu.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 py-0.5">
            <p className="text-xs text-gray-500">
              Aktivt för alla: {activeAssignmentId ? activeAssignmentId : 'Ingen (fri träning)'}
            </p>
            <div className="flex gap-1">
              <button onClick={onClearActiveForAll} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300">Rensa aktivt</button>
              <button onClick={onClearAllAssignments} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">Rensa alla</button>
            </div>
          </div>
          {assignments.slice(0, 10).map(assignment => (
            <div key={assignment.id} className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5 ${activeAssignmentId === assignment.id ? 'border-green-400 bg-green-50' : ''}`}>
              <div className="min-w-0 text-sm">
                <p className="font-medium text-gray-800">{assignment.title}</p>
                <p className="text-gray-500">{formatAssignmentSummaryLine(assignment)}</p>
                <p className="font-mono text-xs text-gray-400">{assignment.id}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => onActivateForAll(assignment.id)} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Aktivera för alla</button>
                <button onClick={() => onCopyAssignmentLink(assignment.id)} className="rounded bg-gray-800 px-2 py-1 text-xs text-white hover:bg-black">{copiedId === assignment.id ? 'Kopierad' : 'Kopiera länk'}</button>
                <button type="button" onClick={() => setQrAssignment(assignment)} className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200" aria-label={`Visa QR-kod för ${assignment.title}`} title="Visa QR-kod">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M3 3h7v7H3V3Zm2 2v3h3V5H5Zm9-2h7v7h-7V3Zm2 2v3h3V5h-3ZM3 14h7v7H3v-7Zm2 2v3h3v-3H5Zm7-2h2v2h-2v-2Zm3 0h6v3h-2v-1h-2v2h-2v-4Zm-3 3h3v4h-3v-4Zm5 2h4v2h-4v-2Z" /></svg>
                </button>
                <button onClick={() => onDeleteAssignment(assignment.id)} className="rounded bg-red-100 px-1.5 py-1 text-[11px] text-red-700 hover:bg-red-200">Ta bort</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {qrAssignment && <AssignmentQrDialog assignment={qrAssignment} onClose={() => setQrAssignment(null)} />}
    </section>
  )
}
