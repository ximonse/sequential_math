import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreeningCollectionList from './ScreeningCollectionList'
import ScreeningDispatchFlow from './ScreeningDispatchFlow'
import ScreeningMaterialLibrary from './ScreeningMaterialLibrary'
import useScreeningLibrary from './useScreeningLibrary'
import './screeningFlow.css'

// Tabs (Simon 2026-11-02): create a screening, open saved drafts and see the issued
// ones. Creating comes first; handing out is the last step of creating.
// Results became the fourth tab, and the tabs follow the work order (Simon 2026-11-07).
export default function ScreeningDispatchPanel({ classes, students, teacherGroups = [], active = true, onDirtyChange, onResults,
  renderResults, isResultsDirty, onLeaveResults }) {
  const navigate = useNavigate()
  const context = useMemo(() => ({ classes, students, groups: teacherGroups }), [classes, students, teacherGroups])
  const library = useScreeningLibrary(classes, active)
  const [flow, setFlow] = useState(() => ({ id: crypto.randomUUID(), source: null, draftId: '' }))
  const [tab, setTab] = useState('create')
  // Once opened, the issued list stays mounted so its search and filters survive a
  // visit to the results tab, as they did when results were a page of their own.
  const [issuedSeen, setIssuedSeen] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  function openTab(next) {
    if (next === tab) return
    if (tab === 'results' && isResultsDirty?.() && !window.confirm('Genomgången har osparade ändringar. Vill du lämna dem?')) return
    // Results can stop a screening, so the issued list is read again afterwards.
    if (tab === 'results') { onLeaveResults?.(); library.reload() }
    if (next === 'issued') setIssuedSeen(true)
    setTab(next)
  }
  function start(source = null, draftId = '') {
    if (dirty && !window.confirm('Du har en screening som inte är klar. Vill du börja om och lämna den?')) return
    setFlow({ id: crypto.randomUUID(), source, draftId })
    setTab('create')
    setDirty(false)
  }
  function openMaterial(path) {
    if (dirty && !window.confirm('Du har en screening som inte är klar. Vill du lämna den och öppna materialgranskningen?')) return
    navigate(path)
  }
  return <section data-screening-flow aria-label="Screening" className="rounded-lg border border-slate-300 bg-white p-3 text-slate-800 shadow-sm">
    <h2 id="screening-dispatch-title" className="screening-page-title">Screening</h2>
    <ScreeningTabs tab={tab} onTab={openTab} />
    <div role="tabpanel" id="screening-tab-panel" aria-labelledby={`screening-tab-${tab}`}>
      <div hidden={tab !== 'create'}>
        <ScreeningDispatchFlow key={flow.id} context={context} library={library} initialSource={flow.source} initialDraftId={flow.draftId}
          onClose={({ finished = false } = {}) => {
            if (finished) { setDirty(false); setFlow({ id: crypto.randomUUID(), source: null, draftId: '' }) }
            setIssuedSeen(true); setTab('issued'); library.reload() }}
          onDirtyChange={setDirty} />
      </div>
      {(tab === 'issued' || issuedSeen) && <div hidden={tab !== 'issued'}>
        <ScreeningCollectionList context={context} library={library} onReuse={start}
          onResults={(collection, picks) => { onResults?.(collection, picks); openTab('results') }} />
      </div>}
      {tab === 'drafts' && <ScreeningMaterialLibrary library={library} onOpenDraft={id => start(null, id)} onOpenMaterial={openMaterial} />}
      <div data-screening-results hidden={tab !== 'results'}>{renderResults?.(active && tab === 'results')}</div>
    </div>
  </section>
}

const TABS = [['create', 'Skapa ny', 'Skapa en screening och dela ut den'], ['drafts', 'Utkast', 'Sparade screeningar som inte är utdelade'],
  ['issued', 'Utdelade', 'Screeningar som eleverna har fått'], ['results', 'Resultat', 'Elevernas svar och avslut']]

function ScreeningTabs({ tab, onTab }) {
  return <div className="screening-tabs" role="tablist" aria-label="Screening" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    // Arrow keys move from the focused tab, which need not be the open one.
    const focused = event.target.closest?.('[data-screening-tab]')?.dataset.screeningTab ?? tab
    const index = TABS.findIndex(([value]) => value === focused)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    onTab(TABS[next][0])
    event.currentTarget.querySelector(`[data-screening-tab="${TABS[next][0]}"]`).focus()
  }}>
    {TABS.map(([value, label, hint]) => <button key={value} type="button" role="tab" title={hint} id={`screening-tab-${value}`} data-screening-tab={value}
      aria-controls="screening-tab-panel" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => onTab(value)}>{label}</button>)}
  </div>
}
