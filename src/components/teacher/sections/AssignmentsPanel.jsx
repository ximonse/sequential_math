import { DEFAULT_PRACTICE_SPEECH_MODE, PRACTICE_SPEECH_MODES } from '../../../lib/practiceSpeech.js'
import { createAssignment } from '../../../lib/assignments.js'
import { conceptDecks } from '../../../lib/conceptPractice.js'
import ConceptAssignmentResults from './ConceptAssignmentResults.jsx'
import { useState } from 'react'
import AssignmentQrDialog from './AssignmentQrDialog'
import MathPracticeCreatorDialog from './MathPracticeCreatorDialog'
import SubitizingCreatorDialog from './SubitizingCreatorDialog'
import AssignmentWorkspaceOptions from './AssignmentWorkspaceOptions'
import { AssignmentFocusPreset, AssignmentTablePreset } from './AssignmentExtraPresets'
import AssignmentBuilder from './AssignmentBuilder'
import AssignmentModuleBox from './AssignmentModuleBox'
import ModuleInfoHint from './ModuleInfoHint'
import ForeignAssignmentRows from './ForeignAssignmentRows'
import { workspaceSummary } from '../../../lib/assignmentSettings'
import { geometryGroups } from '../../../domains/geometry/groups.js'

const BUTTON_BASE = 'rounded-md border px-1.5 py-0.5 text-sm font-medium transition-colors'
const TONES = {
  numberSense: 'border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200',
  basic: 'border-sky-200 bg-sky-100 text-sky-900 hover:bg-sky-200',
  algebra: 'border-violet-200 bg-violet-100 text-violet-900 hover:bg-violet-200',
  other: 'border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
  custom: 'border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200'
}

const FLUENCY_KEYS = ['number_bonds', 'doubles']

// What each module does, and — just as important — where a shared setting
// above does not reach. A ticked box that quietly does nothing breaks R1.
const HINTS = {
  workspaces: 'Räknehäfte och rityta som eleven kan öppna medan uppdraget pågår. Gäller domäner, eget uppdrag, tabell och Skapa egna. Fokusövning och talbild körs i egna elevvyer utan arbetsyta.',
  domains: 'Färdiga uppdrag per kunskapsområde. Eleven får frågor på sin egen nivå utifrån sin träning. Talbild öppnar en egen dialog där du ställer in övningen.',
  builder: 'Du bestämmer räknesätt, antal frågor och hur nivån väljs: anpassad efter eleven, stigande genom uppdraget, eller en bestämd nivå. "Skapa egna" ger fler inställningar, som talområde och tid per tal.',
  table: 'Multiplikationstabellerna du markerar blir ett uppdrag. Eleven övar en tabell i taget.',
  focus: 'Korta uppmärksamhetsövningar. Eleven kan göra dem, men resultaten visas bara för superadmin, under arbetsytan Fokusövningar. Arbetsytor och pausspel gäller inte här.',
  breakGames: 'Pong eller Snake i uppdragets pauser i stället för en vanlig vilopaus. Gäller domäner, eget uppdrag, tabell, talbild och Skapa egna. Fokusövning har inga pauser.'
}

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

function PracticeSpeechModeSelect({ value, onChange }) {
  return <label className="mb-2 inline-flex flex-wrap items-center gap-2 text-sm">
    Uppläsning
    <select className="rounded border border-gray-300 bg-white px-2 py-1"
      value={value} onChange={event => onChange(event.target.value)}>
      {PRACTICE_SPEECH_MODES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
  </label>
}

export default function AssignmentsPanel({
  assignments,
  students = [],
  assignmentTargets = [],
  foreignActiveAssignments = [],
  recipients = [],
  copiedId,
  formatAssignmentSummaryLine,
  onCreatePreset,
  onDeactivateAssignment,
  onClearAllAssignments,
  onActivateAssignment,
  onDeleteAssignment,
  onCopyAssignmentLink,
  classes,
  selectedClassIds,
  onCreateMathPractice,
  collapseControl
}) {
  const [qrAssignment, setQrAssignment] = useState(null)
  const [showMathPracticeCreator, setShowMathPracticeCreator] = useState(false)
  const [showSubitizingCreator, setShowSubitizingCreator] = useState(false)
  const [presetTarget, setPresetTarget] = useState('')
  const [breakGames, setBreakGames] = useState(false)
  const [workspaces, setWorkspaces] = useState({ notebook: false, drawing: true })
  const [geometrySelection, setGeometrySelection] = useState([])
  const [conceptSpeechMode, setConceptSpeechMode] = useState(DEFAULT_PRACTICE_SPEECH_MODE)
  const [geometrySpeechMode, setGeometrySpeechMode] = useState(DEFAULT_PRACTICE_SPEECH_MODE)
  const selectedClass = selectedClassIds.length === 1
    ? classes.find(item => String(item.id) === String(selectedClassIds[0]))
    : null
  const classLoginToken = String(selectedClass?.loginToken || '').trim()
  const canShareAssignment = Boolean(classLoginToken)
  const selectedTargets = assignmentTargets.filter(item => recipients.some(pick => pick.type === item.type && pick.id === item.id))

  return (
    <section className="bg-white rounded-lg shadow p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Uppdrag via länk</h2>
        {collapseControl}
      </div>

      <AssignmentModuleBox title="Arbetsytor" hint={HINTS.workspaces}>
        <AssignmentWorkspaceOptions value={workspaces} onChange={setWorkspaces} showLegend={false} />
      </AssignmentModuleBox>

      <AssignmentModuleBox title="Geometri">
        <PracticeSpeechModeSelect value={geometrySpeechMode} onChange={setGeometrySpeechMode} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {Object.entries(geometryGroups).map(([skill, label]) => (
            <label key={skill} className="inline-flex items-center gap-1">
              <input type="checkbox" checked={geometrySelection.includes(skill)} onChange={event => {
                const checked = event.target.checked
                setGeometrySelection(previous => checked ? [...previous, skill] : previous.filter(value => value !== skill))
              }} />
              {label}
            </label>
          ))}
          <button type="button" disabled={!geometrySelection.length}
            onClick={() => onCreatePreset(geometrySelection, undefined, false, { notebook: false, drawing: false }, geometrySpeechMode)}
            className={`${BUTTON_BASE} ${TONES.other} disabled:opacity-50`}>
            Skapa geometriuppdrag
          </button>
        </div>
      </AssignmentModuleBox>

      <AssignmentModuleBox title="Domäner" hint={HINTS.domains}>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {PRESET_GROUPS.map((group, index) => (
            <div key={index} className="flex flex-wrap gap-1.5">
              {group.map(([key, label, tone]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => (key === 'talbild' ? setShowSubitizingCreator(true) : onCreatePreset(key, FLUENCY_KEYS.includes(key) ? presetTarget : undefined, breakGames, workspaces))}
                  className={`${BUTTON_BASE} ${tone}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
        <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-600">
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
      </AssignmentModuleBox>

      <AssignmentModuleBox
        title="Eget uppdrag"
        hint={HINTS.builder}
        actions={<button type="button" onClick={() => setShowMathPracticeCreator(true)} className={`${BUTTON_BASE} ${TONES.custom}`}>Skapa egna</button>}
      >
        <AssignmentBuilder breakGames={breakGames} workspaces={workspaces} onCreated={onCreateMathPractice} />
      </AssignmentModuleBox>

      <AssignmentModuleBox title="Begrepp">
        <PracticeSpeechModeSelect value={conceptSpeechMode} onChange={setConceptSpeechMode} />
        <div className="flex flex-wrap gap-2">
          {Object.values(conceptDecks).map(deck => <button key={deck.id} type="button"
            className={`${BUTTON_BASE} ${TONES.custom}`}
            onClick={() => onCreateMathPractice(createAssignment({ kind: 'concept', conceptDeckId: deck.id, speechMode: conceptSpeechMode }))}>{deck.title}</button>)}
        </div>
      </AssignmentModuleBox>

      <AssignmentModuleBox title="Tabell" hint={HINTS.table}>
        <AssignmentTablePreset breakGames={breakGames} workspaces={workspaces} onCreated={onCreateMathPractice} />
      </AssignmentModuleBox>

      <AssignmentModuleBox title="Fokusövning" hint={HINTS.focus}>
        <AssignmentFocusPreset breakGames={breakGames} workspaces={workspaces} onCreated={onCreateMathPractice} />
      </AssignmentModuleBox>

      <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={breakGames} onChange={(event) => setBreakGames(event.target.checked)} />
          Pausspel (Pong/Snake) i nya uppdrag. Av = vanlig vilopaus.
        </label>
        <ModuleInfoHint label="Pausspel">{HINTS.breakGames}</ModuleInfoHint>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">Inga uppdrag skapade ännu.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 py-0.5">
            <p className="text-xs text-gray-500">Aktiverar för: {selectedTargets.length ? selectedTargets.map(item => item.name).join(', ') : 'alla klasser'}</p>
            <button onClick={onClearAllAssignments} className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-200">Rensa alla</button>
          </div>
          {!canShareAssignment && <p className="text-xs text-amber-700">Välj exakt en klass ovanför innan du delar ett uppdrag.</p>}
          {assignments.slice(0, 10).map(assignment => {
            const activeIn = assignmentTargets.filter(item => item.assignmentIds.includes(assignment.id))
            const activeInSelected = selectedTargets.filter(item => item.assignmentIds.includes(assignment.id))
            const isActive = selectedTargets.length ? activeInSelected.length > 0 : activeIn.length > 0
            const canActivate = selectedTargets.length ? activeInSelected.length < selectedTargets.length : true
            return (
            <div key={assignment.id} data-assignment-row className={`flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5 ${isActive ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-100'}`}>
              <div className="min-w-0 text-sm">
                <p className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>{assignment.title}</p>
                <p className="text-gray-500">{formatAssignmentSummaryLine(assignment)}</p>
                <p className={`text-xs ${activeIn.length ? 'text-green-800' : 'text-gray-500'}`}>
                  {activeIn.length ? `Aktiv i ${activeIn.map(item => item.name).join(', ')}` : 'Inte aktiv'}</p>
                {assignment.workspaces && <p className="text-xs text-gray-600">Arbetsytor: {workspaceSummary(assignment.workspaces)}</p>}
                <p className="sr-only" title={`Uppdrags-ID: ${assignment.id}`}>{assignment.id}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {canActivate && <button onClick={() => onActivateAssignment(assignment.id)} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 font-semibold">
                  {selectedTargets.length ? 'Aktivera' : 'Aktivera för alla klasser'}</button>}
                {isActive && <button onClick={() => onDeactivateAssignment(assignment.id)} className="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-700 font-semibold">
                  {selectedTargets.length ? 'Avaktivera' : 'Avaktivera överallt'}</button>}
                <button onClick={() => onCopyAssignmentLink(assignment.id, classLoginToken)} disabled={!canShareAssignment} className="rounded bg-gray-800 px-3 py-1 text-xs text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300 font-semibold">{copiedId === assignment.id ? 'Kopierad' : 'Kopiera länk'}</button>
                <button type="button" onClick={() => setQrAssignment(assignment)} disabled={!canShareAssignment} className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300" aria-label={`Visa QR-kod för ${assignment.title}`} title="Visa QR-kod">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M3 3h7v7H3V3Zm2 2v3h3V5H5Zm9-2h7v7h-7V3Zm2 2v3h3V5h-3ZM3 14h7v7H3v-7Zm2 2v3h3v-3H5Zm7-2h2v2h-2v-2Zm3 0h6v3h-2v-1h-2v2h-2v-4Zm-3 3h3v4h-3v-4Zm5 2h4v2h-4v-2Z" /></svg>
                </button>
                <button onClick={() => onDeleteAssignment(assignment.id)} className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700 hover:bg-red-200">Ta bort</button>
              </div>
              {assignment.kind === 'concept' && <div className="basis-full">
                <ConceptAssignmentResults assignment={assignment} students={students} classIds={selectedClassIds} />
              </div>}
            </div>
            )
          })}
        </div>
      )}
      <ForeignAssignmentRows items={foreignActiveAssignments} formatAssignmentSummaryLine={formatAssignmentSummaryLine} />
      {qrAssignment && <AssignmentQrDialog assignment={qrAssignment} classLoginToken={classLoginToken} onClose={() => setQrAssignment(null)} />}
      {showMathPracticeCreator && (
        <MathPracticeCreatorDialog
          initialWorkspaces={workspaces}
          initialBreakGames={breakGames}
          onCreate={(assignment) => {
            onCreateMathPractice(assignment)
            setShowMathPracticeCreator(false)
          }}
          onClose={() => setShowMathPracticeCreator(false)}
        />
      )}
      {showSubitizingCreator && (
        <SubitizingCreatorDialog
          initialBreakGames={breakGames}
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
