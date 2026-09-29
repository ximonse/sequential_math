import { useState } from 'react'
import AssignmentQrDialog from './AssignmentQrDialog'
import MathPracticeCreatorDialog from './MathPracticeCreatorDialog'
import SubitizingCreatorDialog from './SubitizingCreatorDialog'

const BUTTON_BASE = 'rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors'
const TONES = {
  numberSense: 'border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200',
  basic: 'border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-200',
  algebra: 'border-violet-200 bg-violet-100 text-violet-900 hover:bg-violet-200',
  other: 'border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
  custom: 'border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200'
}

const FLUENCY_KEYS = ['number_bonds', 'doubles']

const PRESET_GROUPS = [
  [
    ['number_bonds', 'Talpar'],
    ['doubles', 'Dubblor'],
    ['talbild', 'Talbild']
  ].map(([key, label]) => [key, label, TONES.numberSense]),
  [
    ['addition', 'Bara addition'],
    ['subtraction', 'Bara subtraktion'],
    ['multiplication', 'Bara multiplikation'],
    ['division', 'Bara division']
  ].map(([key, label]) => [key, label, TONES.basic]),
  [
    ['algebra_evaluate', 'Algebra (räkna ut)'],
    ['algebra_simplify', 'Algebra (förenkla)']
  ].map(([key, label]) => [key, label, TONES.algebra]),
  [
    ['mixed', 'Kombination'],
    ['fractions', 'Bråk'],
    ['percentage', 'Procent'],
    ['arithmetic_expressions', 'Prioriteringsregler']
  ].map(([key, label]) => [key, label, TONES.other])
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
  onCopyAssignmentLink,
  classes,
  selectedClassIds,
  onCreateMathPractice
}) {
  const [qrAssignment, setQrAssignment] = useState(null)
  const [showMathPracticeCreator, setShowMathPracticeCreator] = useState(false)
  const [showSubitizingCreator, setShowSubitizingCreator] = useState(false)
  const [presetTarget, setPresetTarget] = useState('')
  const [breakGames, setBreakGames] = useState(false)
  const selectedClass = selectedClassIds.length === 1
    ? classes.find(item => String(item.id) === String(selectedClassIds[0]))
    : null
  const classLoginToken = String(selectedClass?.loginToken || '').trim()
  const canShareAssignment = Boolean(classLoginToken)

  return (
    <section className="bg-white rounded-lg shadow p-3" style={{ order: -60 }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Uppdrag via länk</h2>
        <button onClick={() => setShowMathPracticeCreator(true)} className={`${BUTTON_BASE} ${TONES.custom}`}>Skapa egna</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {PRESET_GROUPS.map((group, index) => (
          <div key={index} className="flex flex-wrap gap-1.5">
            {group.map(([key, label, tone]) => (
              <button
                key={key}
                type="button"
                onClick={() => (key === 'talbild' ? setShowSubitizingCreator(true) : onCreatePreset(key, FLUENCY_KEYS.includes(key) ? presetTarget : undefined, breakGames))}
                className={`${BUTTON_BASE} ${tone}`}
              >
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>
      <label className="mb-3 flex items-center gap-2 text-xs text-gray-600">
        Max antal uppgifter för Talpar/Dubblor (tomt = 20)
        <input
          type="number"
          min="1"
          max="200"
          value={presetTarget}
          onChange={(event) => setPresetTarget(event.target.value)}
          className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-sm"
        />
      </label>

      <label className="mb-3 flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={breakGames} onChange={(event) => setBreakGames(event.target.checked)} />
        Pausspel (Pong/Snake) i nya uppdrag. Av = vanlig vilopaus.
      </label>

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">Inga uppdrag skapade ännu.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 py-0.5">
            <p className="text-xs text-gray-500">Aktivt för alla: {activeAssignmentId ? (assignments.find(item => item.id === activeAssignmentId)?.title || 'okänt uppdrag') : 'Inget (fri träning)'}</p>
            <div className="flex gap-1">
              <button onClick={onClearActiveForAll} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300">Rensa aktivt</button>
              <button onClick={onClearAllAssignments} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">Rensa alla</button>
            </div>
          </div>
          {!canShareAssignment && <p className="text-xs text-amber-700">Välj exakt en klass ovanför innan du delar ett uppdrag.</p>}
          {assignments.slice(0, 10).map(assignment => {
            const isActive = activeAssignmentId === assignment.id
            return (
            <div key={assignment.id} className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5 ${isActive ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-100'}`}>
              <div className="min-w-0 text-sm">
                <p className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>{assignment.title}</p>
                <p className="text-gray-500">{formatAssignmentSummaryLine(assignment)}</p>
                <p className="font-mono text-xs text-gray-400">{assignment.id}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {isActive ? (
                  <button onClick={onClearActiveForAll} className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700">Avaktivera</button>
                ) : (
                  <button onClick={() => onActivateForAll(assignment.id)} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Aktivera för alla</button>
                )}
                <button onClick={() => onCopyAssignmentLink(assignment.id, classLoginToken)} disabled={!canShareAssignment} className="rounded bg-gray-800 px-2 py-1 text-xs text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300">{copiedId === assignment.id ? 'Kopierad' : 'Kopiera länk'}</button>
                <button type="button" onClick={() => setQrAssignment(assignment)} disabled={!canShareAssignment} className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300" aria-label={`Visa QR-kod för ${assignment.title}`} title="Visa QR-kod">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M3 3h7v7H3V3Zm2 2v3h3V5H5Zm9-2h7v7h-7V3Zm2 2v3h3V5h-3ZM3 14h7v7H3v-7Zm2 2v3h3v-3H5Zm7-2h2v2h-2v-2Zm3 0h6v3h-2v-1h-2v2h-2v-4Zm-3 3h3v4h-3v-4Zm5 2h4v2h-4v-2Z" /></svg>
                </button>
                <button onClick={() => onDeleteAssignment(assignment.id)} className="rounded bg-red-100 px-1.5 py-1 text-[11px] text-red-700 hover:bg-red-200">Ta bort</button>
              </div>
            </div>
            )
          })}
        </div>
      )}
      {qrAssignment && <AssignmentQrDialog assignment={qrAssignment} classLoginToken={classLoginToken} onClose={() => setQrAssignment(null)} />}
      {showMathPracticeCreator && (
        <MathPracticeCreatorDialog
          onCreate={(assignment) => {
            onCreateMathPractice(assignment)
            setShowMathPracticeCreator(false)
          }}
          onClose={() => setShowMathPracticeCreator(false)}
        />
      )}
      {showSubitizingCreator && (
        <SubitizingCreatorDialog
          onCreate={(assignment) => {
            onCreateMathPractice(assignment)
            setShowSubitizingCreator(false)
          }}
          onClose={() => setShowSubitizingCreator(false)}
        />
      )}
    </section>
  )
}
