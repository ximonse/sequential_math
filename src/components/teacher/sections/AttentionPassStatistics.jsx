import { attentionNumber, attentionPassStatistics } from '../../../lib/attentionStatistics'
import { AttentionRate } from './AttentionStatisticsOverview'

const ms = value => value === null ? '–' : `${Math.round(value)} ms`
function Metric({ label, value, detail }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold text-slate-900">{value}{detail && <span className="mt-0.5 block text-xs font-normal text-slate-500">{detail}</span>}</dd></div>
}
export default function AttentionPassStatistics({ result }) {
  const s = result.summary
  const stats = attentionPassStatistics(result)
  return <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
    {result.mode === 'multi' ? <>
      <AttentionRate label="Rätta svar" rate={stats.accuracy} detail={`${s.wrong} fel · ${s.missed} missade`} />
      <AttentionRate label="Upprepad regel" rate={stats.repeat} detail={`Median ${ms(s.repeat.median)} · ${s.repeat.correct} rätta svar`} />
      <AttentionRate label="Bytt regel" rate={stats.switch} detail={`Median ${ms(s.switch.median)} · ${s.switch.correct} rätta svar`} />
      <Metric label="Tidsskillnad: byte − upprepning" value={stats.switchTimeDifference === null ? '–' : `${stats.switchTimeDifference > 0 ? '+' : ''}${Math.round(stats.switchTimeDifference)} ms`} detail="Plus betyder längre tid vid regelbyte. Första uppgiften ingår inte i regeljämförelsen." />
    </> : <>
      <AttentionRate label="Upptäckta gröna signaler" rate={stats.go} detail={`${s.misses} missade signaler`} />
      {result.mode === 'choose' && <AttentionRate label="Rätt avstådda stopp" rate={stats.stop} detail={`${s.wrong} tryck på fel signal`} />}
      <Metric label="För tidiga tryck / aktiv minut" value={attentionNumber(stats.earlyPerMinute)} detail={`${s.early} för tidiga tryck totalt`} />
      <Metric label="Medianreaktionstid (träffar)" value={ms(s.median)} detail={`${s.hits} träffar med svarstid`} />
    </>}
  </dl>
}
