import { ATTENTION_LABELS } from '../../../lib/attentionHistory'
import { attentionNumber, attentionPercent } from '../../../lib/attentionStatistics'

export function AttentionRate({ label, rate, detail }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold text-slate-900">{attentionPercent(rate)} <span className="text-xs font-normal text-slate-600">{rate.total ? `(${rate.correct} av ${rate.total})` : 'Inget underlag'}</span>{detail && <span className="mt-0.5 block text-xs font-normal text-slate-500">{detail}</span>}</dd></div>
}

export default function AttentionStatisticsOverview({ groups }) {
  if (!groups.length) return null
  return <div className="my-4" aria-label="Översikt över färdiga fokuspass">
    <h4 className="text-sm font-semibold text-slate-800">Översikt · färdiga tvåminuterspass</h4>
    <p className="mt-1 text-xs text-slate-600">Jämför inom samma aktivitet. Andelar bygger på summerade antal för respektive signaltyp; avbrutna pass ingår inte. Svarstider visas per pass nedan.</p>
    <div className={`mt-3 grid gap-3 ${groups.length > 1 ? 'lg:grid-cols-3' : ''}`}>{groups.map(group => <article key={group.mode} data-testid={`attention-overview-${group.mode}`} className="rounded-xl border border-slate-200 bg-white p-3">
      <h5 className="text-sm font-semibold text-slate-800">{ATTENTION_LABELS[group.mode]}</h5>
      <p className="mt-1 text-xs text-slate-500">Färdiga: {group.completed} · Avbrutna: {group.aborted}</p>
      <dl className={`mt-3 ${groups.length > 1 ? 'space-y-2' : 'grid gap-3 sm:grid-cols-3'}`}>
        {group.mode === 'multi' ? <>
          <AttentionRate label="Rätta svar" rate={group.accuracy} />
          <AttentionRate label="Upprepad regel" rate={group.repeat} />
          <AttentionRate label="Bytt regel" rate={group.switch} />
        </> : <>
          <AttentionRate label="Upptäckta gröna signaler" rate={group.go} />
          {group.mode === 'choose' && <AttentionRate label="Rätt avstådda stopp" rate={group.stop} />}
          <div><dt className="text-xs text-slate-500">För tidiga tryck / aktiv minut</dt><dd className="mt-0.5 font-semibold text-slate-900">{attentionNumber(group.earlyPerMinute)} <span className="text-xs font-normal text-slate-600">{group.completed ? `(${group.early} tryck på ${attentionNumber(group.activeMs / 60000)} min)` : 'Inget underlag'}</span></dd></div>
        </>}
      </dl>
    </article>)}</div>
  </div>
}
