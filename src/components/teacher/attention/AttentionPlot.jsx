import { attentionNumber } from '../../../lib/attentionStatistics'
import { attentionCoordinates } from './attentionGroup'

const PLOT_AXES = {
  discover: ['Medianreaktionstid i senaste fullföljda passet (ms)', 'För tidiga tryck / aktiv minut i samma pass'],
  choose: ['Upptäckta gröna signaler (%)', 'Rätt avstådda stopp (%)'],
  multi: ['Rätt vid upprepad regel (%)', 'Rätt vid bytt regel (%)']
}

export default function AttentionPlot({ rows, mode, selectedId, onSelect }) {
  const points = rows.map(row => attentionCoordinates(row, mode)).filter(Boolean)
  const maxX = mode === 'discover' ? 5000 : 100
  const maxY = mode === 'discover' ? Math.max(1, Math.ceil(Math.max(0, ...points.map(point => point.y)))) : 100
  const clusters = new Map()
  for (const point of points) {
    const key = `${point.x}:${point.y}`
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key).push(point)
  }
  const [xLabel, yLabel] = PLOT_AXES[mode]
  if (!points.length) return <p className="focus-empty">Punktdiagrammet behöver färdiga pass med underlag för båda axlarna. Matrisen visar även övriga elever.</p>
  return <div>
    <p className="focus-muted">{mode === 'discover' ? 'Varje punkt visar elevens senaste fullföljda femsekunderspass i perioden. Ingen gemensam median räknas ut.' : 'Varje punkt visar en elevs färdiga pass i perioden.'} Sammanfallande punkter visar antal elever. Välj namn nedanför för att se individen.</p>
    <svg className="focus-chart" viewBox="0 0 640 330" role="img" aria-label={`Gruppens punktdiagram: ${xLabel} och ${yLabel}`}>
      <title>Individer i gruppen</title>
      <desc>{points.length} av {rows.length} elever har underlag för båda axlarna. Alla värden och namn finns i knapparna nedanför.</desc>
      {[0, 25, 50, 75, 100].map(tick => <g key={tick} className="focus-grid-line">
        <line x1="65" x2="610" y1={270 - tick * 2.3} y2={270 - tick * 2.3} />
        <text x="55" y={274 - tick * 2.3} textAnchor="end">{attentionNumber(tick * maxY / 100)}</text>
        <text x={65 + tick * 5.45} y="289" textAnchor="middle">{attentionNumber(tick * maxX / 100)}</text>
      </g>)}
      <text x="65" y="20" className="focus-axis-title">{yLabel}</text><text x="338" y="320" textAnchor="middle" className="focus-axis-title">{xLabel}</text>
      {[...clusters.entries()].map(([key, cluster]) => {
        const point = cluster[0]
        const selected = cluster.some(item => item.row.studentId === selectedId)
        return <g key={key} transform={`translate(${65 + point.x / maxX * 545} ${270 - point.y / maxY * 230})`} className={selected ? 'focus-point is-selected' : 'focus-point'}>
          <title>{cluster.map(item => item.row.name).join(', ')}: {attentionNumber(point.x)}, {attentionNumber(point.y)}</title>
          <circle r={cluster.length > 1 ? 12 : selected ? 8 : 6} />
          {cluster.length > 1 && <text textAnchor="middle" dy="4" className="focus-cluster-count">{cluster.length}</text>}
        </g>
      })}
    </svg>
    <p className="focus-muted">{points.length} av {rows.length} elever visas. Saknat underlag och hämtningsfel visas i matrisen. {mode === 'discover' ? 'Ej fullföljda och äldre tvåsekunderspass ingår inte.' : 'Axlarna går från 0 till 100 procent.'}</p>
    <div className="focus-plot-names">{points.map(({ row, x, y }) => <button type="button" key={row.studentId} aria-pressed={selectedId === row.studentId}
      onClick={() => onSelect(row.studentId)} title={`${xLabel}: ${attentionNumber(x)}. ${yLabel}: ${attentionNumber(y)}.`}>
      <strong>{row.name}</strong><span>{attentionNumber(x)}{mode === 'discover' ? ' ms' : ' %'} · {attentionNumber(y)}{mode === 'discover' ? '/min' : ' %'}</span>
    </button>)}</div>
  </div>
}
