import { useEffect, useId, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { normalizePilotStudentId } from '../../lib/pilotStudentRuntime'

function parseCredentialQr(value) {
  try {
    const parsed = JSON.parse(String(value || ''))
    const studentId = normalizePilotStudentId(parsed?.studentId)
    const qrSecret = String(parsed?.qrSecret || '').trim()
    if (!studentId || !qrSecret) return null
    return { studentId, qrSecret }
  } catch {
    return null
  }
}

export default function PilotStudentLoginForm({ onLogin, busy, error, onClearError }) {
  const [studentId, setStudentId] = useState('')
  const [qrSecret, setQrSecret] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [pin, setPin] = useState('')
  const [loginMode, setLoginMode] = useState('qr')
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
        if (active) setScannerMessage('Kameran kunde inte starta. Tillåt kamera eller använd kodnamnet i stället.')
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
      if (!busy) onLogin(loginMode === 'qr' ? { studentId, qrSecret, pin } : { loginCode, pin })
    }} className="space-y-4">
      <p className="text-center text-sm font-medium text-slate-700">Välj ett sätt att logga in</p>
      <div className="grid grid-cols-2 rounded-lg border border-teal-200 p-1 text-sm">
        <button type="button" onClick={() => { setLoginMode('qr'); onClearError() }} className={`rounded px-2 py-2 font-medium ${loginMode === 'qr' ? 'bg-teal-700 text-white' : 'text-teal-900'}`}>Skanna QR-kod</button>
        <button type="button" onClick={() => { setLoginMode('code'); onClearError() }} className={`rounded px-2 py-2 font-medium ${loginMode === 'code' ? 'bg-teal-700 text-white' : 'text-teal-900'}`}>Skriv kodnamn</button>
      </div>
      {loginMode === 'qr' && (!studentId || !qrSecret) ? <>
      <button type="button" onClick={() => { setScannerMessage(''); setScannerOpen(true) }} disabled={busy || scannerOpen}
        className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:bg-gray-300">
        {scannerOpen ? 'Kameran är öppen' : 'Öppna kameran och skanna QR-koden'}
      </button>
      {scannerOpen ? <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-3">
        <div id={scannerId} className="overflow-hidden rounded-lg" />
        <button type="button" onClick={() => setScannerOpen(false)} className="mt-2 text-sm text-teal-900 underline">Avbryt skanning</button>
      </div> : null}
      </> : loginMode === 'qr' ? <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
        <p className="font-semibold">Elevkortet är läst.</p>
        <button type="button" onClick={() => { setStudentId(''); setQrSecret(''); setPin(''); setScannerMessage('') }} className="mt-1 underline">Skanna ett annat kort</button>
      </div> : <div>
        <label htmlFor="pilotLoginCode" className="block text-sm font-medium text-gray-700 mb-2">Kodnamn</label>
        <input id="pilotLoginCode" type="text" className={inputClass} value={loginCode} required maxLength={80}
          onChange={event => { setLoginCode(event.target.value); onClearError() }}
          placeholder="Till exempel Gul Fyr Katt" autoComplete="username" disabled={busy} />
        <p className="mt-1 text-xs text-gray-500">Kodnamnet står på ditt elevkort. Skriv sedan din fyrsiffriga PIN-kod.</p>
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
        className="w-full py-3 px-4 bg-sky-400 hover:bg-sky-500 disabled:bg-gray-300 text-slate-900 font-semibold rounded-lg transition-colors">
        {busy ? 'Loggar in…' : 'Logga in'}
      </button>
    </form>
  )
}
