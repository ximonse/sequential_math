import { describeFocusEvidence, FOCUS_DIMENSIONS } from './attentionSignals'
import { localFocusSignal } from './attentionReference'

export default function AttentionSignalDetails({ row, mode, reference }) {
  if (row.status !== 'ready') return null
  return <details className="focus-signal-details"><summary>Färg och underlag för {row.name}</summary>
    {FOCUS_DIMENSIONS.filter(dimension => dimension.mode === mode).map(dimension => {
      const signal = localFocusSignal(row, dimension.id, reference)
      return <div key={dimension.id}><h4>{dimension.label} · {signal.label}</h4><p>{describeFocusEvidence(signal)}</p><p>{signal.trend.mark} {signal.trend.label}.</p></div>
    })}
    <p>Varje dag väger lika i färgbeskrivningen. Flera pass samma dag ersätter inte flera dagar. Grönt har en bred, preliminär träffzon. Blått kräver fler dagar och genomgående höga träffandelar. Gult betyder färre träffar i övningen; det säger inte att eleven ligger under genomsnittet.</p>
    <p>Rött och orange är preliminära lokala uppföljningssignaler. De kräver minst åtta andra elever med tillräckligt underlag och återkommande stora skillnader över flera dagar. De anger inte en statistiskt säkerställd avvikelse eller en åldersnorm. Svarstid och för tidiga tryck finns i passdetaljerna och påverkar inte färgen.</p>
  </details>
}
