import { useEffect, useMemo, useState } from 'react'
import ScreeningCollectionList from './ScreeningCollectionList'
import ScreeningDispatchFlow from './ScreeningDispatchFlow'
import useScreeningLibrary from './useScreeningLibrary'
import './screeningFlow.css'

export default function ScreeningDispatchPanel({ classes, students, teacherGroups = [], active = true, onDirtyChange, onResults }) {
  const context = useMemo(() => ({ classes, students, groups: teacherGroups }), [classes, students, teacherGroups])
  const library = useScreeningLibrary(classes, active)
  const [flow, setFlow] = useState(null)
  const [showFlow, setShowFlow] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  function start(source = null) {
    if (dirty && !window.confirm('Du har ett pågående utkast. Vill du börja en ny utdelning och lämna utkastet?')) return
    setFlow({ id: crypto.randomUUID(), source })
    setShowFlow(true)
    setDirty(false)
  }
  return <section data-screening-flow aria-labelledby="screening-dispatch-title" className="rounded-lg border border-slate-300 bg-white p-3 text-slate-800 shadow-sm">
    <h2 id="screening-dispatch-title" className="text-lg font-semibold">Dela ut screening</h2>
    <div hidden={showFlow}>
      <ScreeningCollectionList context={context} library={library} onStart={() => start()} onReuse={start}
        onResults={onResults} hasDraft={Boolean(flow)} onResume={() => setShowFlow(true)} />
    </div>
    {flow && <div hidden={!showFlow}><ScreeningDispatchFlow key={flow.id} context={context} library={library}
      initialSource={flow.source} onClose={() => setShowFlow(false)} onDirtyChange={setDirty} /></div>}
  </section>
}
