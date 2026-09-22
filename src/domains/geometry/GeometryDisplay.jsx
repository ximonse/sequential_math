function Shape({ subject }) {
  const kind = subject?.kind
  const common = { fill: 'rgba(14,116,144,.10)', stroke: '#0e7490', strokeWidth: 4, strokeLinejoin: 'round' }
  if (['line', 'ray', 'segment'].includes(kind)) return <svg viewBox="0 0 240 110" className="h-32 w-full" aria-label={kind}><line x1="45" y1="55" x2="195" y2="55" {...common} />{kind !== 'line' && <circle cx="45" cy="55" r="7" fill="#0e7490" />}{kind !== 'segment' && <path d="M195 55l-18-11v22z" fill="#0e7490" />}{kind === 'line' && <><path d="M45 55l18-11v22z" fill="#0e7490"/><path d="M195 55l-18-11v22z" fill="#0e7490"/></>}</svg>
  if (kind === 'circle' || subject?.part) return <svg viewBox="0 0 220 150" className="h-40 w-full" aria-label="cirkel"><circle cx="110" cy="75" r="58" {...common}/><circle cx="110" cy="75" r="5" fill="#0e7490"/>{subject?.part === 'radius' && <line x1="110" y1="75" x2="168" y2="75" {...common}/>} {subject?.part === 'diameter' && <line x1="52" y1="75" x2="168" y2="75" {...common}/>}</svg>
  const sides = Number(subject?.sides || ({ triangle: 3, quadrilateral: 4, pentagon: 5, hexagon: 6 }[kind]) || 4)
  const points = Array.from({ length: sides }, (_, index) => { const a = -Math.PI / 2 + index * 2 * Math.PI / sides; return `${110 + Math.cos(a) * 65},${78 + Math.sin(a) * 58}` }).join(' ')
  if (kind && ['cube', 'cuboid', 'pyramid', 'cylinder', 'cone', 'sphere'].includes(kind)) return <Solid kind={kind} common={common}/>
  return <svg viewBox="0 0 220 160" className="h-40 w-full" aria-label="månghörning"><polygon points={points} {...common}/></svg>
}

function Solid({ kind, common }) {
  if (kind === 'sphere') return <svg viewBox="0 0 220 160" className="h-40 w-full"><circle cx="110" cy="80" r="58" {...common}/><ellipse cx="110" cy="80" rx="58" ry="20" fill="none" stroke="#0e7490" strokeWidth="3" strokeDasharray="6 5"/></svg>
  if (kind === 'cylinder') return <svg viewBox="0 0 220 160" className="h-40 w-full"><path d="M55 42v76c0 15 110 15 110 0V42" {...common}/><ellipse cx="110" cy="42" rx="55" ry="18" {...common}/><path d="M55 118c0 15 110 15 110 0" fill="none" stroke="#0e7490" strokeWidth="4"/></svg>
  if (kind === 'cone') return <svg viewBox="0 0 220 160" className="h-40 w-full"><path d="M110 20L50 125M110 20l60 105" {...common}/><ellipse cx="110" cy="125" rx="60" ry="18" {...common}/></svg>
  if (kind === 'pyramid') return <svg viewBox="0 0 220 160" className="h-40 w-full"><path d="M110 18L45 120l120 18 20-82-140 64 120 18M110 18l75 38M110 18l55 120" {...common}/></svg>
  const wide = kind === 'cuboid' ? 85 : 62
  return <svg viewBox="0 0 220 160" className="h-40 w-full"><rect x="42" y="48" width={wide} height="72" {...common}/><rect x="78" y="25" width={wide} height="72" {...common}/><path d={`M42 48l36-23M${42 + wide} 48l36-23M${42 + wide} 120l36-23M42 120l36-23`} {...common}/></svg>
}

export default function GeometryDisplay({ problem, feedback, inputValue, onInputChange, onSubmit, onNext, leftPanel = null }) {
  if (!problem) return null
  const answering = !feedback
  const options = problem.values?.options || []
  return <div className="w-full"><div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,.8fr)]">
    <section className="overflow-hidden rounded-2xl border-2 border-cyan-200 bg-cyan-50 shadow-sm">
      <div className="border-b border-cyan-200 bg-cyan-900 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-50">Geometriverkstad · nivå {problem.level}</div>
      <div className="bg-[linear-gradient(rgba(14,116,144,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,.08)_1px,transparent_1px)] bg-[size:20px_20px] p-4 sm:p-6">
        <p className="mb-3 text-center text-lg font-bold text-slate-800">{problem.display?.text}</p>
        {!String(problem.metadata?.representation || '').includes('text') && <Shape subject={problem.values?.subject}/>} 
      </div>
      {leftPanel && <div className="p-4">{leftPanel}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-2" role="radiogroup" aria-label="Svarsalternativ">{options.map(item => {
        const selected = inputValue === item.id
        const correct = feedback && item.id === problem.answer.correct
        const wrong = feedback && selected && !correct
        return <button key={item.id} type="button" role="radio" aria-checked={selected} disabled={!answering} onClick={() => onInputChange(item.id)} className={`min-h-14 rounded-xl border-2 px-4 py-3 text-left text-lg font-semibold transition ${correct ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : wrong ? 'border-rose-500 bg-rose-50 text-rose-900' : selected ? 'border-cyan-600 bg-cyan-50 text-cyan-950' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-300'}`}>{item.label}</button>
      })}</div>
      <button type="button" onClick={answering ? onSubmit : onNext} disabled={answering && !inputValue} className={`mt-4 min-h-14 w-full rounded-xl text-xl font-bold text-white disabled:bg-slate-300 ${answering ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{answering ? 'Svara' : 'Nästa'}</button>
    </section>
  </div></div>
}

