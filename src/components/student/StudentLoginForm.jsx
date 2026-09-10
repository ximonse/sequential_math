import { useState } from 'react'

export default function StudentLoginForm({ onLogin, busy, error, onClearError }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none'

  return (
    <form onSubmit={event => {
      event.preventDefault()
      if (!busy) onLogin({ name, password })
    }} className="space-y-4">
      <div>
        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">Namn eller elev-ID</label>
        <input type="text" id="studentId" className={inputClass} value={name} required maxLength={100}
          onChange={event => { setName(event.target.value); onClearError() }}
          placeholder="Ditt namn eller elev-ID från läraren"
          autoComplete="username" disabled={busy} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Lösenord</label>
        <input type="password" id="password" className={inputClass} value={password} required
          onChange={event => { setPassword(event.target.value); onClearError() }} placeholder="Ditt lösenord"
          autoComplete="current-password" disabled={busy} />
      </div>
      {error && <p role="alert" className="text-red-700 text-sm text-center">{error}</p>}
      <p className="text-xs text-gray-500">Startlösenordet är ditt namn som läraren skrev det, om du inte har bytt lösenord.</p>
      <button type="submit" disabled={busy}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">
        {busy ? 'Loggar in…' : 'Logga in'}
      </button>
    </form>
  )
}
