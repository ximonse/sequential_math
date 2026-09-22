import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { buildAssignmentLink } from '../../../lib/assignments'

export default function AssignmentQrDialog({ assignment, classLoginToken, onClose }) {
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const assignmentUrl = buildAssignmentLink(assignment.id, assignment, classLoginToken)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(assignmentUrl, {
      width: 960,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' }
    }).then(url => {
      if (active) setImageUrl(url)
    }).catch(() => {
      if (active) setError('Kunde inte skapa QR-koden. Kopiera länken i stället.')
    })
    return () => { active = false }
  }, [assignmentUrl])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="assignment-qr-title">
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 text-center shadow-2xl sm:p-6">
        <h3 id="assignment-qr-title" className="text-xl font-bold text-slate-900">{assignment.title}</h3>
        <p className="mt-1 text-sm text-slate-600">Skanna för att öppna uppdraget.</p>
        {imageUrl ? (
          <img src={imageUrl} alt={`QR-kod för ${assignment.title}`} className="mx-auto my-4 w-full max-w-[34rem] rounded-lg border-4 border-white shadow-md" />
        ) : !error ? (
          <p className="my-20 text-sm text-slate-500">Skapar QR-kod…</p>
        ) : (
          <p className="my-20 text-sm text-red-700">{error}</p>
        )}
        <p className="mx-auto max-w-lg break-all text-xs text-slate-500">{assignmentUrl}</p>
        <button type="button" onClick={onClose} className="mt-4 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-950">Stäng</button>
      </div>
    </div>
  )
}
