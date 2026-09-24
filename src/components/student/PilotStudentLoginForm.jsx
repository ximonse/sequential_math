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

function CameraIcon({ crossed = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
      <path d="M5 7h2l1.5-2h7L17 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
      {crossed ? <line x1="3" y1="21" x2="21" y2="3" /> : null}
    </svg>
  )
}

function StepHeader({ number, label, active }) {
  return (
    <div className={`flex items-center gap-2 ${active ? '' : 'opacity-40'}`}>
      <span aria-hidden="true" className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-600'}`}>{number}</span>
      <span className={`text-sm font-semibold ${active ? 'text-slate-900' : 'text-gray-500'}`}>{label}</span>
    </div>
  )
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
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none disabled:bg-gray-100'
  const fadeClass = 'transition-opacity duration-200 motion-reduce:transition-none'

  const cardRead = Boolean(studentId && qrSecret)
  const stepOneDone = loginMode === 'qr' ? cardRead : loginCode.trim().length > 0
  const canSubmit = stepOneDone && pin.length === 4 && !busy

  const switchMode = nextMode => {
    setLoginMode(nextMode)
    setScannerOpen(false)
    setScannerMessage('')
    setStudentId('')
    setQrSecret('')
    setLoginCode('')
    onClearError()
  }

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
        if (active) setScannerMessage('Kameran kunde inte starta. Tillåt kamera eller skriv ditt kodnamn i stället.')
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
      if (canSubmit) onLogin(loginMode === 'qr' ? { studentId, qrSecret, pin } : { loginCode, pin })
    }} className="space-y-4">

      <div className="space-y-2">
        <StepHeader number="1" label={loginMode === 'qr' ? 'Skanna ditt elevkort' : 'Skriv ditt kodnamn'} active />
        <div className={fadeClass}>
          {loginMode === 'qr' ? (cardRead ? (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-green-900">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                  strokeLinejoin="round" className="h-5 w-5 flex-none" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
                Elevkortet är läst
              </p>
              <button type="button" onClick={() => { setStudentId(''); setQrSecret(''); setPin(''); setScannerMessage('') }}
                className="mt-1 text-sm text-green-900 underline">Skanna ett annat kort</button>
            </div>
          ) : (<>
            <button type="button" onClick={() => { setScannerMessage(''); setScannerOpen(true) }} disabled={busy || scannerOpen}
              className="flex w-full flex-col items-center gap-1 rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:bg-gray-300">
              <CameraIcon />
              {scannerOpen ? 'Kameran är öppen' : 'Öppna kameran'}
            </button>
            {scannerOpen ? <div className="mt-2 rounded-xl border-2 border-teal-200 bg-teal-50 p-3">
              <div id={scannerId} className="overflow-hidden rounded-lg" />
              <button type="button" onClick={() => setScannerOpen(false)} className="mt-2 text-sm text-teal-900 underline">Avbryt skanning</button>
            </div> : null}
            <button type="button" onClick={() => switchMode('code')}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-400 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <CameraIcon crossed />
              Om kameran inte fungerar, klicka här.
            </button>
          </>)) : (<>
            <label htmlFor="pilotLoginCode" className="sr-only">Kodnamn</label>
            <input id="pilotLoginCode" type="text" className={inputClass} value={loginCode} maxLength={80}
              onChange={event => { setLoginCode(event.target.value); onClearError() }}
              placeholder="Till exempel Gul Fyr Katt" autoComplete="username" disabled={busy} />
            <p className="mt-1 text-xs text-gray-500">Kodnamnet står på ditt elevkort.</p>
            <button type="button" onClick={() => switchMode('qr')}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-400 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <CameraIcon />
              Tillbaka till kameran
            </button>
          </>)}
        </div>
      </div>

      <div className="space-y-2">
        <StepHeader number="2" label="Skriv din PIN" active={stepOneDone} />
        <div className={`${fadeClass} ${stepOneDone ? '' : 'opacity-40'}`}>
          <label htmlFor="pilotPin" className="sr-only">Fyrsiffrig PIN</label>
          <input id="pilotPin" type="password" inputMode="numeric" pattern="[0-9]{4}" className={inputClass} value={pin}
            maxLength={4} disabled={busy || !stepOneDone}
            onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 4)); onClearError() }}
            placeholder="••••" autoComplete="current-password" />
        </div>
      </div>

      {scannerMessage ? <p role="status" className="text-sm text-teal-800">{scannerMessage}</p> : null}
      {error && <p role="alert" className="text-red-700 text-sm text-center">{error}</p>}

      <div className="space-y-2">
        <StepHeader number="3" label="Logga in" active={canSubmit} />
        <button type="submit" disabled={!canSubmit}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors motion-reduce:transition-none ${canSubmit ? 'bg-sky-400 hover:bg-sky-500 text-slate-900' : 'bg-gray-200 text-gray-500'}`}>
          {busy ? 'Loggar in…' : 'Logga in'}
        </button>
      </div>
    </form>
  )
}
