import { OPERATION_LABELS } from '../../lib/operations.js'

const filters = { all: 'alla tal', even: 'jämna tal', odd: 'udda tal', ten: 'tiotal', five: 'multiplar av fem' }
const yesNo = value => value ? 'Ja' : 'Nej'
export default function MaterialPracticeSummary({ frame }) {
  const rows = [['Träningssätt', { standard: 'Områdesträning', math_practice: 'Valt talområde', table: 'Tabeller', ncm: 'NCM-uppdrag', subitizing: 'Talbild', focus: 'Fokusaktivitet' }[frame.kind]]]
  if (frame.problemTypes?.length) rows.push(['Innehåll', frame.problemTypes.map(type => OPERATION_LABELS[type] || type).join(', ')])
  if (frame.kind === 'standard') rows.push(['Nivåram', `${frame.minLevel}–${frame.maxLevel}`])
  if (frame.tables) rows.push(['Valda tabeller', frame.tables.join(', ')])
  if (frame.focusMode) rows.push(['Aktivitet', { discover: 'FOKUS', choose: 'KONTROLL', multi: 'MULTI' }[frame.focusMode]])
  if (frame.ncmCodes?.length) rows.push(['Diagnosområden', frame.ncmCodes.join(', ')])
  if (frame.ncmAbilityTags?.length) rows.push(['Förmågor', frame.ncmAbilityTags.join(', ')])
  if (frame.operations) rows.push(['Räknesätt', frame.operations.map(value => OPERATION_LABELS[value] || value).join(', ')])
  if (frame.numberRange) for (const [key, label] of [['first', 'Första talet'], ['second', 'Andra talet']]) {
    const range = frame.numberRange[key]
    rows.push([label, `${range.min}–${range.max}, ${filters[range.filter] || range.filter}`])
  }
  if (frame.settings) rows.push(['Tid per uppgift', `${frame.settings.maxTimePerProblem} sekunder`],
    ['Blandad ordning', yesNo(frame.settings.randomizeOrder)], ['Dold nedräkning', yesNo(frame.settings.hideCountdown)])
  if (frame.kind !== 'table' && frame.kind !== 'focus') rows.push(['Antalsinställning', frame.targetCount])
  if (frame.workspaces) rows.push(['Räknehäfte', yesNo(frame.workspaces.notebook)], ['Rityta', yesNo(frame.workspaces.drawing)])
  rows.push(['Pausspel', yesNo(frame.breakGames)])
  return <><dl className="material-frame">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{frame.kind === 'table' ? 'Tabelluppdraget avslutas när de valda tabellerna är klara.' : 'Uppgifterna genereras inom den valda ramen.'}</p></>
}
