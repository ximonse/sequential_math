import { ATTENTION_LABELS } from './attentionHistory'
import { ATTENTION_PROTOCOLS, attentionProtocolId, legacyProtocol } from './attentionProtocols'
import { ATTENTION_FORM_DEFINITION } from './attentionForm'

export const ATTENTION_DATA_DICTIONARY = {
  format: 'attention-export-v1', language: 'sv-SE', timeZone: 'Europe/Stockholm',
  timestamps: 'startedAt/finishedAt är Unix-tid i millisekunder (UTC); datum/klockslag visas i svensk tid. finishedAt är senast sparat för ej avslutade försök.',
  activeMs: 'Aktiv tid i millisekunder; dold flik räknas bort. Avbrutna och ej fullföljda försök behålls.',
  trials: 'Endast färdigställda signaler. at är signalens start i aktiv passtid (ms). responseMs är tid till första accepterade tryck; null betyder inget tryck.',
  kinds: { go: 'Tryck krävs', stop: 'Avstå', first: 'Första MULTI-uppgiften', repeat: 'Samma regel', switch: 'Bytt regel' },
  outcomes: { hit: 'Rätt tryck', miss: 'Uteblivet svar', wrong: 'Feltryck', withheld: 'Korrekt avstått' },
  events: 'Start, visad signal (även kasserad), för tidigt tryck, dold-flik-paus, återkomst och avslut. at i aktiv passtid; wallMs är millisekunder sedan start inklusive dold tid. signal.stimulus anger visad figur/regel eller färg/väntetid. stimuli följer samma index som trials. Ignorerade dubbeltryck är inte mätvärden.',
  summaries: 'hits/rätt, misses/missade, wrong/fel, withheld/avstått, early/för tidigt. median är median-ms för rätta svar i ett pass. MULTI repeat/switch redovisas separat.',
  missing: 'Äldre versioner saknar råfält som inte samlades in. Inga värden har återskapats eller uppskattats.',
  versions: 'version avser dataschema; protocolId och protocol anger aktivitetens mätregler. Ändrat beteende kräver nytt protokoll-ID. Olika protokoll jämförs inte i dagsform.',
  retention: 'Arkivet saknar automatisk ålders- eller antalgräns. Uttrycklig elevradering/anonymisering följer appens separata livscykel. Exporten innehåller insamlade data, inte en medicinsk bedömning.'
}

export function buildAttentionExport(rows, { studentId = 'all', mode = 'all', from = '', to = '', asOf = Date.now() } = {}) {
  if (from && to && from > to) throw new Error('Fråndatum måste komma före tilldatum.')
  const date = timestamp => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(timestamp)
  const selected = rows.filter(row => studentId === 'all' || row.studentId === studentId)
  if (selected.some(row => row.status !== 'ready')) throw new Error('Alla valda elevers arkiv måste hämtas före export.')
  const records = selected.flatMap(row => row.history.filter(pass => (mode === 'all' || mode === pass.mode)
    && (!from || date(pass.startedAt) >= from) && (!to || date(pass.startedAt) <= to))
    .map(result => ({ studentId: row.studentId, name: row.name, result })))
  const protocols = Object.fromEntries(records.map(({ result }) => [attentionProtocolId(result), result.protocol || legacyProtocol(result)]))
  const identity = ({ studentId, name, result }) => ({ ElevID: studentId, Elev: name, PassID: result.id,
    Aktivitet: ATTENTION_LABELS[result.mode], Protokoll: attentionProtocolId(result), Dataversion: result.version,
    DatumKlockslag: new Date(result.startedAt).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }), StartUTC: new Date(result.startedAt).toISOString() })
  return {
    json: { ...ATTENTION_DATA_DICTIONARY, exportedAt: new Date().toISOString(), dataReadAt: new Date(asOf).toISOString(), selection: { studentId, mode, from, to },
      analysisDefinition: ATTENTION_FORM_DEFINITION, protocols, records },
    passes: records.map(entry => ({ ...identity(entry), SlutEllerSenastSparatUTC: new Date(entry.result.finishedAt).toISOString(),
      AktivTidMs: entry.result.activeMs, Avbrutet: entry.result.aborted, Avslutsorsak: entry.result.completionReason || (entry.result.aborted ? 'ended' : 'completed'),
      Träffar: entry.result.summary.hits ?? entry.result.summary.correct, Missade: entry.result.summary.misses ?? entry.result.summary.missed,
      Feltryck: entry.result.summary.wrong, Avstått: entry.result.summary.withheld ?? null, FörTidigt: entry.result.summary.early ?? null,
      MedianMs: entry.result.summary.median ?? null, UpprepadAntal: entry.result.summary.repeat?.total ?? null,
      UpprepadRätt: entry.result.summary.repeat?.correct ?? null, UpprepadMedianMs: entry.result.summary.repeat?.median ?? null,
      ByttAntal: entry.result.summary.switch?.total ?? null, ByttRätt: entry.result.summary.switch?.correct ?? null,
      ByttMedianMs: entry.result.summary.switch?.median ?? null,
      SammanfattningJSON: JSON.stringify(entry.result.summary), ProtokollJSON: JSON.stringify(protocols[attentionProtocolId(entry.result)]) })),
    trials: records.flatMap(entry => (entry.result.trials || []).map((trial, index) => ({ ...identity(entry), Signal: index + 1,
      AktivStartMs: trial.at, Typ: ATTENTION_DATA_DICTIONARY.kinds[trial.kind], TypKod: trial.kind,
      Utfall: ATTENTION_DATA_DICTIONARY.outcomes[trial.outcome], UtfallKod: trial.outcome, SvarstidMs: trial.responseMs,
      StimulusJSON: entry.result.stimuli?.[index] ? JSON.stringify(entry.result.stimuli[index]) : '',
      ProtokollJSON: JSON.stringify(protocols[attentionProtocolId(entry.result)]) }))),
    events: records.flatMap(entry => (entry.result.events || []).map(event => ({ ...identity(entry), AktivTidMs: event.at,
      TidSedanStartMs: event.wallMs, Händelse: event.type, StimulusJSON: event.stimulus ? JSON.stringify(event.stimulus) : '',
      ProtokollJSON: JSON.stringify(protocols[attentionProtocolId(entry.result)]) })))
  }
}

// Export the registry too, including definitions not represented in a selection.
export const attentionProtocolRegistry = () => structuredClone(ATTENTION_PROTOCOLS)
