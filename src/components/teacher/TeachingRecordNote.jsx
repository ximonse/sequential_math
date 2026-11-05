const helpLabels = { unknown: 'Hjälp okänd', given: 'Hjälp gavs', none_reported: 'Ingen hjälp enligt läraren' }
export default function TeachingRecordNote({ record }) {
  if (!record) return null
  return <div className="mt-2 text-sm">
    <p><strong>{record.kind === 'teaching' ? 'Undervisningsnotering' : 'Kontrollobservation'}</strong> · {record.taughtOn} · {helpLabels[record.help]}</p>
    <p>{record.noteSv}</p><p>Ursprungsmaterial: version {record.materialVersion}. {record.checkInRevision ? `Avstämning ${record.checkInRevision}.` : ''} Uppgiften om hjälp är lärarens anteckning.</p>
  </div>
}
