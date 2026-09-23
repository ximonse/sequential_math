import { SHAPES_2D, SOLIDS } from './geometryModel'

const DEFINITIONS = {
  square: 'fyra lika långa sidor och fyra räta vinklar',
  rectangle: 'fyra räta vinklar',
  rhombus: 'fyra lika långa sidor',
  parallelogram: 'motstående sidor är parallella'
}

function Facts({ rows, table = false }) {
  return <div className="mx-auto max-w-sm rounded-xl border-2 border-cyan-300 bg-white p-4 text-base text-slate-900" aria-label="Figurens egenskaper">
    {table ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">{rows.map(([label, value]) => <div key={label} className="contents"><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}</dl>
      : <p>{rows.map(([label, value]) => `${label}: ${value}`).join('. ')}.</p>}
  </div>
}

function Solid({ kind, silhouette }) {
  const style = { fill: silhouette ? '#0e7490' : 'rgba(14,116,144,.10)', stroke: '#0e7490', strokeWidth: 4, strokeLinejoin: 'round' }
  if (kind === 'sphere') return <svg viewBox="0 0 220 160" className="h-40 w-full" role="img" aria-label="Klot"><circle cx="110" cy="80" r="58" {...style}/>{!silhouette && <ellipse cx="110" cy="80" rx="58" ry="20" fill="none" stroke="#0e7490" strokeWidth="3" strokeDasharray="6 5"/>}</svg>
  if (kind === 'cylinder') return <svg viewBox="0 0 220 160" className="h-40 w-full" role="img" aria-label="Cylinder"><path d="M55 42v76c0 15 110 15 110 0V42" {...style}/><ellipse cx="110" cy="42" rx="55" ry="18" {...style}/>{!silhouette && <path d="M55 118c0 15 110 15 110 0" fill="none" stroke="#0e7490" strokeWidth="4"/>}</svg>
  if (kind === 'cone') return <svg viewBox="0 0 220 160" className="h-40 w-full" role="img" aria-label="Kon"><path d="M110 20L50 125M110 20l60 105" {...style}/><ellipse cx="110" cy="125" rx="60" ry="18" {...style}/></svg>
  if (kind === 'pyramid') return <svg viewBox="0 0 220 160" className="h-40 w-full" role="img" aria-label="Pyramid">{silhouette ? <path d="M110 18L35 130h150z" {...style}/> : <path d="M110 18L45 120l120 18 20-82-140 64 120 18M110 18l75 38M110 18l55 120" {...style}/>}</svg>
  const width = kind === 'cube' ? 72 : 100
  if (silhouette) return <svg viewBox="0 0 220 160" className="h-40 w-full" role="img" aria-label={kind === 'cube' ? 'Kubens siluett' : 'Rätblockets siluett'}><path d={`M42 48l36-23h${width}l-36 23v72H42z`} {...style}/></svg>
  return <svg viewBox="0 0 220 160" className="h-40 w-full" role="img" aria-label={kind === 'cube' ? 'Kub' : 'Rätblock'}><rect x="42" y="48" width={width} height="72" {...style}/><rect x="78" y="25" width={width} height="72" {...style}/><path d={`M42 48l36-23M${42 + width} 48l36-23M${42 + width} 120l36-23M42 120l36-23`} {...style}/></svg>
}

function Shape({ subject, representation }) {
  const kind = subject?.kind
  const style = { fill: representation === 'filled_grid' ? '#a5f3fc' : 'rgba(14,116,144,.10)', stroke: '#0e7490', strokeWidth: 4, strokeLinejoin: 'round' }
  if (['line', 'ray', 'segment'].includes(kind)) return <svg viewBox="0 0 240 110" className="h-32 w-full" role="img" aria-label={kind === 'line' ? 'Linje med pilar åt båda håll' : kind === 'ray' ? 'Stråle med en ändpunkt och en pil' : 'Sträcka med två ändpunkter'}><line x1="45" y1="55" x2="195" y2="55" {...style}/>{kind !== 'line' && <circle cx="45" cy="55" r="7" fill="#0e7490"/>}{kind === 'segment' && <circle cx="195" cy="55" r="7" fill="#0e7490"/>}{kind === 'line' && <path d="M45 55l18-11v22z" fill="#0e7490"/>}{kind !== 'segment' && <path d="M195 55l-18-11v22z" fill="#0e7490"/>}</svg>
  if (kind === 'circle' || subject?.part) return <svg viewBox="0 0 220 150" className="h-40 w-full" role="img" aria-label="Cirkel med markerad del"><circle cx="110" cy="75" r="58" {...style}/><circle cx="110" cy="75" r="5" fill="#0e7490"/>{subject?.part === 'radius' && <line x1="110" y1="75" x2="168" y2="75" {...style}/>} {subject?.part === 'diameter' && <line x1="52" y1="75" x2="168" y2="75" {...style}/>}</svg>
  if (kind && SOLIDS[kind]) return <div className={subject.view === 'tilted_left' ? '-rotate-12' : subject.view === 'tilted_right' ? 'rotate-12' : ''}><Solid kind={kind} silhouette={representation === 'silhouette'}/></div>
  const sides = subject?.sides || SHAPES_2D[kind]?.sides
  const points = Array.from({ length: sides }, (_, index) => { const angle = -Math.PI / 2 + index * 2 * Math.PI / sides; return `${110 + Math.cos(angle) * 65},${78 + Math.sin(angle) * 58}` }).join(' ')
  const transform = `translate(110 78) rotate(${subject?.rotation || 0}) scale(${subject?.stretch || 1} 1) translate(-110 -78)`
  return <svg viewBox="0 0 220 160" className={`h-40 w-full ${representation === 'filled_grid' ? 'rounded-lg bg-[linear-gradient(rgba(14,116,144,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,.18)_1px,transparent_1px)] bg-[size:16px_16px]' : ''}`} role="img" aria-label="Månghörning"><polygon points={points} transform={transform} {...style}/></svg>
}

function Evidence({ problem }) {
  const { questionKind, subject, representation } = problem.values
  if (questionKind === 'line_primitive' && representation === 'description') return <Facts rows={[["Beskrivning", { line: 'inga ändpunkter; fortsätter åt båda håll', ray: 'en ändpunkt; fortsätter åt ett håll', segment: 'två ändpunkter; bestämd längd' }[subject.kind]]]}/>
  if (questionKind === 'polygon_sides' && representation === 'side_count') return <Facts rows={[["Antal raka sidor", subject.sides]]}/>
  if (questionKind === 'quadrilateral_relation' && representation === 'question_text') return null
  if (questionKind === 'quadrilateral_relation' && representation === 'category_table') return <Facts table rows={[[SHAPES_2D[subject.from].label, DEFINITIONS[subject.from]], [SHAPES_2D[subject.to].label, DEFINITIONS[subject.to]]]}/>
  if (questionKind === 'circle_part' && representation === 'description') return <Facts rows={[["Beskrivning", { center: 'punkten mitt i cirkeln', radius: 'sträckan från centrum till randen', diameter: 'sträckan genom centrum mellan två punkter på randen' }[subject.part]]]}/>
  if (questionKind === 'quadrilateral_properties') return <Facts table={representation === 'property_table'} rows={[["Alla sidor lika långa", subject.equalSides ? 'ja' : 'nej'], ["Alla vinklar räta", subject.rightAngles ? 'ja' : 'nej'], ["Motstående sidor parallella", 'ja']]}/>
  if (questionKind === 'solid_identity' && representation === 'face_properties') return <Facts rows={[["Sidoytor", subject.kind === 'cube' ? 'sex kvadrater' : 'sex rektanglar, inte alla kvadrater']]}/>
  if (questionKind === 'solid_count' && representation === 'count_description') return <Facts rows={[["Kropp", SOLIDS[subject.kind].label], ["Sök", { faces: 'ytor', edges: 'kanter', vertices: 'hörn' }[subject.property]]]}/>
  if (questionKind === 'solid_face_shapes') return <Facts table={representation === 'face_clue_table'} rows={[["Ytformer", subject.faceShape]]}/>
  if (questionKind === 'solid_clues') return <Facts table={representation === 'multi_clue_table'} rows={[["Sidoytor", subject.faces], ["Kanter", subject.edges], ["Hörn", subject.vertices], ["Ytformer", subject.faceShape]]}/>
  return <Shape subject={subject} representation={representation}/>
}

export default function GeometryDisplay({ problem, feedback, inputValue, onInputChange, onSubmit, onNext, leftPanel = null }) {
  if (!problem) return null
  const answering = !feedback
  const options = problem.values?.options || []
  return <div className="w-full"><div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,.8fr)]">
    <section className="overflow-hidden rounded-2xl border-2 border-cyan-200 bg-cyan-50 shadow-sm">
      <div className="border-b border-cyan-200 bg-cyan-900 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-50">Geometriverkstad · nivå {problem.level}</div>
      <div className="bg-[linear-gradient(rgba(14,116,144,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,.08)_1px,transparent_1px)] bg-[size:20px_20px] p-4 sm:p-6"><p className="mb-3 text-center text-lg font-bold text-slate-800">{problem.display?.text}</p><Evidence problem={problem}/></div>
      {leftPanel && <div className="p-4">{leftPanel}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-2" role="group" aria-label="Svarsalternativ">{options.map(item => {
        const selected = inputValue === item.id
        const correct = feedback && item.id === problem.answer.correct
        const wrong = feedback && selected && !correct
        return <button key={item.id} type="button" aria-pressed={selected} disabled={!answering} onClick={() => onInputChange(item.id)} className={`min-h-14 rounded-xl border-2 px-4 py-3 text-left text-lg font-semibold transition ${correct ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : wrong ? 'border-rose-500 bg-rose-50 text-rose-900' : selected ? 'border-cyan-600 bg-cyan-50 text-cyan-950' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-300'}`}>{item.label}</button>
      })}</div>
      <button type="button" onClick={answering ? onSubmit : onNext} disabled={answering && !inputValue} className={`mt-4 min-h-14 w-full rounded-xl text-xl font-bold text-white disabled:bg-slate-300 ${answering ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{answering ? 'Svara' : 'Nästa'}</button>
    </section>
  </div></div>
}
