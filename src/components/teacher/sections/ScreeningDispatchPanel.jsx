import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreeningCollectionList from './ScreeningCollectionList'
import ScreeningDispatchFlow from './ScreeningDispatchFlow'
import useScreeningLibrary from './useScreeningLibrary'
import './screeningFlow.css'

export default function ScreeningDispatchPanel({ classes, students, teacherGroups = [], active = true, onDirtyChange, onResults }) {
  const navigate = useNavigate()
  const context = useMemo(() => ({ classes, students, groups: teacherGroups }), [classes, students, teacherGroups])
  const library = useScreeningLibrary(classes, active)
  const [flow, setFlow] = useState(null)
  const [showFlow, setShowFlow] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  function start(source = null, draftId = '') {
    if (dirty && !window.confirm('Du har ett pågående utkast. Vill du börja en ny utdelning och lämna utkastet?')) return
    setFlow({ id: crypto.randomUUID(), source, draftId })
    setShowFlow(true)
    setDirty(false)
  }
  function openMaterial(path) {
    if (dirty && !window.confirm('Du har ett pågående utkast. Vill du lämna det och öppna materialgranskningen?')) return
    navigate(path)
  }
  return <section data-screening-flow aria-label="Dela ut screening" className="rounded-lg border border-slate-300 bg-white p-3 text-slate-800 shadow-sm">
    <h2 id="screening-dispatch-title" className="screening-page-title">{showFlow ? 'Dela ut screening' : 'Screeningar'}</h2>
    <span className="sr-only">Dela ut screening</span>
    <div hidden={showFlow}>
      <ScreeningCollectionList context={context} library={library} onStart={() => start()} onReuse={start} onOpenDraft={id => start(null, id)}
        onOpenMaterial={openMaterial}
        onResults={onResults} hasDraft={Boolean(flow)} onResume={() => setShowFlow(true)} />
    </div>
    {flow && <div hidden={!showFlow}><ScreeningDispatchFlow key={flow.id} context={context} library={library}
      initialSource={flow.source} initialDraftId={flow.draftId} onClose={() => { setShowFlow(false); library.reload() }} onDirtyChange={setDirty} /></div>}
  </section>
}
