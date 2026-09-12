import { useEffect, useId, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

function parseCredentialQr(value) {
  try {
    const parsed = JSON.parse(String(value || ''))
    const studentId = String(parsed?.studentId || '').trim().toUpperCase()
    const qrSecret = String(parsed?.qrSecret || '').trim()
    if (!/^[A-F0-9]{32}$/.test(studentId) || !qrSecret) return null
    return { studentId, qrSecret }
  } catch {
    return null
  }
}

export default function PilotStudentLoginForm({ onLogin, busy, error, onClearError }) {
  const [studentId, setStudentId] = useState('')
  const [qrSecret, setQrSecret] = useState('')
  const [pin, setPin] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('')
  const scannerId = useId().replace(/:/g, '')
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none'

  useEffect(() => {
    if (!scannerOpen) return undefined
    let scanner = null
    let active = true
    ;(async () => {
      try {
        scanner = new Html5Qrcode(scannerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          decoded => {
            const credential = parseCredentialQr(decoded)
            if (!credential || !active) {
              setScannerMessage('Det här är inte ett giltigt elevkort.')
              return
            }
            setStudentId(credential.studentId)
            setQrSecret(credential.qrSecret)
            setScannerMessage('Elevkort läst. Skriv din PIN-kod.')
            setScannerOpen(false)
          },
          () => {}
        )
      } catch {
        if (active) setScannerMessage('Kameran kunde inte starta. Tillåt kamera eller använd reservinmatning.')
      }
    })()
    return () => {
      active = false
      if (scanner?.isScanning) void scanner.stop().catch(() => {})
      else if (scanner) void scanner.clear().catch(() => {})
    }
  }, [scannerOpen, scannerId])

  return (
    <form onSubmit={event => {
      event.preventDefault()
      if (!busy) onLogin({ studentId, qrSecret, pin })
    }} className="space-y-4">
      {!studentId || !qrSecret ? <>
      <button type="button" onClick={() => { setScannerMessage(''); setScannerOpen(true) }} disabled={busy || scannerOpen}
        className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:bg-gray-300">
        {scannerOpen ? 'Kameran är öppen' : 'Skanna elevkortets QR-kod'}
      </button>
      {scannerOpen ? <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-3">
        <div id={scannerId} className="overflow-hidden rounded-lg" />
        <button type="button" onClick={() => setScannerOpen(false)} className="mt-2 text-sm text-teal-900 underline">Avbryt skanning</button>
      </div> : null}
      <details className="rounded-lg border border-gray-200 p-3 text-sm">
        <summary className="cursor-pointer text-gray-700">Reserv: skriv uppgifterna från kortet</summary>
        <div className="mt-3 space-y-3">
      <div>
        <label htmlFor="pilotStudentId" className="block text-sm font-medium text-gray-700 mb-2">Elev-ID</label>
        <input id="pilotStudentId" type="password" className={inputClass} value={studentId} required maxLength={32}
          onChange={event => { setStudentId(event.target.value); onClearError() }}
          placeholder="Koden på ditt kort" autoComplete="off" disabled={busy} />
      </div>
      <div>
        <label htmlFor="pilotQrSecret" className="block text-sm font-medium text-gray-700 mb-2">QR-hemlighet</label>
        <input id="pilotQrSecret" type="password" className={inputClass} value={qrSecret} required maxLength={100}
          onChange={event => { setQrSecret(event.target.value); onClearError() }}
          placeholder="Skanna eller skriv koden" autoComplete="off" disabled={busy} />
      </div>
        </div>
      </details>
      </> : <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
        <p className="font-semibold">Elevkortet är läst.</p>
        <button type="button" onClick={() => { setStudentId(''); setQrSecret(''); setPin(''); setScannerMessage('') }} className="mt-1 underline">Skanna ett annat kort</button>
      </div>}
      <div>
        <label htmlFor="pilotPin" className="block text-sm font-medium text-gray-700 mb-2">Fyrsiffrig PIN</label>
        <input id="pilotPin" type="password" inputMode="numeric" pattern="[0-9]{4}" className={inputClass} value={pin} required maxLength={4}
          onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 4)); onClearError() }}
          placeholder="••••" autoComplete="current-password" disabled={busy} />
      </div>
      {scannerMessage ? <p role="status" className="text-sm text-teal-800">{scannerMessage}</p> : null}
      {error && <p role="alert" className="text-red-700 text-sm text-center">{error}</p>}
      <button type="submit" disabled={busy}
        className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">
        {busy ? 'Loggar in…' : 'Logga in'}
      </button>
    </form>
  )
}
