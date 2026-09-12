import { useState } from 'react'

export default function PilotStudentLoginForm({ onLogin, busy, error, onClearError }) {
  const [studentId, setStudentId] = useState('')
  const [qrSecret, setQrSecret] = useState('')
  const [pin, setPin] = useState('')
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none'

  return (
    <form onSubmit={event => {
      event.preventDefault()
      if (!busy) onLogin({ studentId, qrSecret, pin })
    }} className="space-y-4">
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
      <div>
        <label htmlFor="pilotPin" className="block text-sm font-medium text-gray-700 mb-2">Fyrsiffrig PIN</label>
        <input id="pilotPin" type="password" inputMode="numeric" pattern="[0-9]{4}" className={inputClass} value={pin} required maxLength={4}
          onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 4)); onClearError() }}
          placeholder="••••" autoComplete="current-password" disabled={busy} />
      </div>
      {error && <p role="alert" className="text-red-700 text-sm text-center">{error}</p>}
      <button type="submit" disabled={busy}
        className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">
        {busy ? 'Loggar in…' : 'Logga in'}
      </button>
    </form>
  )
}
