import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

export default function ClassLoginQrDialog({ classRecord, onClose }) {
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const loginUrl = `${window.location.origin}/?class=${classRecord.loginToken}`

  useEffect(() => {
    let active = true
    QRCode.toDataURL(loginUrl, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' }
    }).then(url => {
      if (active) setImageUrl(url)
    }).catch(() => {
      if (active) setError('Kunde inte skapa QR-koden. Kopiera elevlänken i stället.')
    })
    return () => { active = false }
  }, [loginUrl])

  const showFullscreen = async () => {
    try { await dialogRef.current?.requestFullscreen?.() }
    catch { /* Browsers may block fullscreen until the next direct user action. */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="class-qr-title">
      <div ref={dialogRef} className="w-full max-w-2xl rounded-2xl bg-white p-5 text-center shadow-2xl sm:p-8">
        <h3 id="class-qr-title" className="text-2xl font-bold text-slate-900">{classRecord.name}</h3>
        <p className="mt-1 text-sm text-slate-600">Låt eleverna skanna för att öppna sin inloggning.</p>
        {imageUrl ? (
          <img src={imageUrl} alt={`QR-kod för ${classRecord.name}`} className="mx-auto my-5 w-full max-w-[32rem] rounded-xl border-8 border-white shadow-sm" />
        ) : !error ? (
          <p className="my-20 text-sm text-slate-500">Skapar QR-kod…</p>
        ) : (
          <p className="my-20 text-sm text-red-700">{error}</p>
        )}
        <p className="mx-auto max-w-md break-all text-xs text-slate-500">{loginUrl}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => navigator.clipboard.writeText(loginUrl)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Kopiera elevlänk</button>
          <button type="button" onClick={showFullscreen} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-950">Visa helskärm</button>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Stäng</button>
        </div>
      </div>
    </div>
  )
}