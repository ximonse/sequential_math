import { useState } from 'react'
import { downloadStudentCredentialPdf } from '../../../lib/studentCredentialPdf'
import { credentialText } from '../../../lib/studentCredentialText'
import { CARDS_PER_ROW, CARD_HEIGHT_MM, CARD_WIDTH_MM } from '../../../lib/studentCardLayout'
import StudentCredentialCard from './StudentCredentialCard'

export default function StudentCredentialCards({ credentials, onClear, title = 'Nya elevkort' }) {
  const [status, setStatus] = useState('')
  const cards = Array.isArray(credentials) ? credentials : []
  if (!cards.length) return null

  const downloadPdf = async () => {
    setStatus('Skapar PDF…')
    try {
      const result = await downloadStudentCredentialPdf(cards)
      setStatus('PDF klar: ' + result.count + ' kort på ' + result.pages + ' A4-sida(or). Spara filen säkert.')
    } catch (error) {
      setStatus(error?.message || 'Kunde inte skapa PDF.')
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentialText(cards))
      setStatus('Kopierat. Radera uppgifterna från tillfälliga dokument efter säker utskrift.')
    } catch {
      setStatus('Kunde inte kopiera automatiskt.')
    }
  }

  return (
    <section className="mt-3 rounded border border-teal-300 bg-teal-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h3 className="text-sm font-semibold text-teal-950">{title}</h3>
          <p className="text-xs text-teal-900">Korten visas som de skrivs ut. Uppgifterna finns bara i denna vy tills sidan laddas om — hämta PDF:en nu.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadPdf} className="rounded bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800">Hämta PDF (8 A7/A4)</button>
          <button type="button" onClick={copy} className="rounded border border-teal-700 px-1.5 py-0.5 text-xs font-semibold text-teal-900">Kopiera reservlista</button>
          <button type="button" onClick={() => window.print()} className="rounded border border-teal-700 px-1.5 py-0.5 text-xs font-semibold text-teal-900">Skriv ut</button>
          {onClear ? <button type="button" onClick={onClear} className="rounded border border-slate-400 px-1.5 py-0.5 text-xs text-slate-700">Rensa vyn</button> : null}
        </div>
      </div>
      {status ? <p role="status" className="mt-2 text-xs text-teal-950 print:hidden">{status}</p> : null}
      <ol className="student-credential-grid mt-3 flex list-none flex-wrap gap-2 p-0">
        {cards.map(credential => <li key={credential.studentId}><StudentCredentialCard credential={credential} /></li>)}
      </ol>
      <style>{[
        '@media print {',
        '@page { size: A4 landscape; margin: 0; }',
        'body * { visibility: hidden; }',
        '.student-credential-grid, .student-credential-grid * { visibility: visible; }',
        `.student-credential-grid { position: absolute; left: 0; top: 0; width: 297mm; display: grid !important; grid-template-columns: repeat(${CARDS_PER_ROW}, ${CARD_WIDTH_MM}mm) !important; grid-auto-rows: ${CARD_HEIGHT_MM}mm; gap: 0; margin: 0 !important; padding: 0; list-style: none; }`,
        '.student-credential-card { break-inside: avoid; }',
        '}'
      ].join('\n')}</style>
    </section>
  )
}
