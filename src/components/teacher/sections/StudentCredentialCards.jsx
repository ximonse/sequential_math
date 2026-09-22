import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { downloadStudentCredentialPdf } from '../../../lib/studentCredentialPdf'

function credentialText(credentials) {
  return credentials.map(({ name, displayAlias, studentId, pin }) => (
    `${displayAlias || 'Elev'}\nKodnamn: ${displayAlias || '–'}\nPIN: ${pin}\nElev-ID: ${studentId}`
  )).join('\\n\\n')
}

function StudentCredentialCard({ credential }) {
  const [qrCode, setQrCode] = useState('')
  useEffect(() => {
    let active = true
    const payload = JSON.stringify({ version: 1, studentId: credential.studentId, qrSecret: credential.qrSecret })
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 320 })
      .then(value => { if (active) setQrCode(value) })
      .catch(() => { if (active) setQrCode('') })
    return () => { active = false }
  }, [credential.studentId, credential.qrSecret])

  return (
    <article className="student-credential-card border border-slate-700 bg-white p-3 text-xs text-slate-800">
      <div className="flex h-full items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">{credential.displayAlias || 'Elev'}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Matteträning · elevkort</p>
          <p className="mt-3">Kodnamn: <span className="font-semibold">{credential.displayAlias || '–'}</span></p>
          <p className="mt-2 font-mono text-base font-bold">PIN: {credential.pin}</p>
          <p className="mt-3 text-[10px] text-slate-600">Skanna QR-koden och skriv PIN.</p>
          <p className="mt-1 font-mono text-[9px] break-all text-slate-500">Elev-ID: {credential.studentId}</p>
        </div>
        {qrCode ? <img className="h-24 w-24 shrink-0" src={qrCode} alt={'QR-kod för ' + (credential.displayAlias || 'elev')} /> : null}
      </div>
    </article>
  )
}

export default function StudentCredentialCards({ credentials, onClear, title = 'Nya elevkort' }) {
  const [status, setStatus] = useState('')
  const cards = Array.isArray(credentials) ? credentials : []
  if (!cards.length) return null

  const downloadPdf = async () => {
    setStatus('Skapar PDF…')
    try {
      const result = await downloadStudentCredentialPdf(cards.map(card => ({ ...card, name: '' })))
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
          <p className="text-xs text-teal-900">Uppgifterna finns bara i denna vy tills sidan laddas om. Hämta PDF:en nu.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadPdf} className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">Hämta PDF (8 A7/A4)</button>
          <button type="button" onClick={copy} className="rounded border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-900">Kopiera reservlista</button>
          <button type="button" onClick={() => window.print()} className="rounded border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-900">Skriv ut</button>
          {onClear ? <button type="button" onClick={onClear} className="rounded border border-slate-400 px-3 py-1.5 text-xs text-slate-700">Rensa vyn</button> : null}
        </div>
      </div>
      {status ? <p role="status" className="mt-2 text-xs text-teal-950 print:hidden">{status}</p> : null}
      <ol className="student-credential-grid mt-3 grid gap-2 md:grid-cols-2">
        {cards.map(credential => <li key={credential.studentId}><StudentCredentialCard credential={credential} /></li>)}
      </ol>
      <style>{[
        '@media print {',
        '@page { size: A4 landscape; margin: 0; }',
        'body * { visibility: hidden; }',
        '.student-credential-grid, .student-credential-grid * { visibility: visible; }',
        '.student-credential-grid { position: absolute; left: 0; top: 0; width: 297mm; display: grid !important; grid-template-columns: repeat(4, 74.25mm) !important; grid-auto-rows: 105mm; gap: 0; margin: 0 !important; padding: 0; list-style: none; }',
        '.student-credential-card { box-sizing: border-box; height: 105mm; border: 0.35mm solid #1e293b !important; padding: 5mm !important; break-inside: avoid; }',
        '}'
      ].join('\\n')}</style>
    </section>
  )
}
