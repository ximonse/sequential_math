import { useState } from 'react'

function StepHeader({ number, label, active }) {
  return (
    <div className={`flex items-center gap-2 ${active ? '' : 'opacity-40'}`}>
      <span aria-hidden="true" className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-600'}`}>{number}</span>
      <span className={`text-sm font-semibold ${active ? 'text-slate-900' : 'text-gray-500'}`}>{label}</span>
    </div>
  )
}

export default function PilotStudentLoginForm({ onLogin, busy, error, onClearError }) {
  const [loginCode, setLoginCode] = useState('')
  const [pin, setPin] = useState('')
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none disabled:bg-gray-100'

  const stepOneDone = loginCode.trim().length > 0
  const canSubmit = stepOneDone && pin.length === 4 && !busy

  return (
    <form onSubmit={event => {
      event.preventDefault()
      if (canSubmit) onLogin({ loginCode, pin })
    }} className="space-y-4">

      <div className="space-y-2">
        <StepHeader number="1" label="Skriv ditt kodnamn" active />
        <label htmlFor="pilotLoginCode" className="sr-only">Kodnamn</label>
        <input id="pilotLoginCode" type="text" className={inputClass} value={loginCode} maxLength={80}
          onChange={event => { setLoginCode(event.target.value); onClearError() }}
          placeholder="Till exempel Gul Fyr Katt" autoComplete="username" disabled={busy} autoFocus />
        <p className="text-xs text-gray-500">Kodnamnet står på ditt elevkort.</p>
      </div>

      <div className="space-y-2">
        <StepHeader number="2" label="Skriv din PIN" active={stepOneDone} />
        <div className={`transition-opacity duration-200 motion-reduce:transition-none ${stepOneDone ? '' : 'opacity-40'}`}>
          <label htmlFor="pilotPin" className="sr-only">Fyrsiffrig PIN</label>
          <input id="pilotPin" type="password" inputMode="numeric" pattern="[0-9]{4}" className={inputClass} value={pin}
            maxLength={4} disabled={busy || !stepOneDone}
            onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 4)); onClearError() }}
            placeholder="••••" autoComplete="current-password" />
        </div>
      </div>

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
