import { useState } from 'react'

export default function StudentLoginForm({ className, onLogin, busy, error, onClearError }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none'
  return <form onSubmit={event => { event.preventDefault(); if (!busy) onLogin({ name, code, remember }) }} className="space-y-4">
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-blue-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Du loggar in i klass</p>
      <p className="mt-1 text-2xl font-bold">{className}</p>
    </div>
    <div><label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-2">Ditt namn</label><input id="studentName" className={inputClass} value={name} required maxLength={100} onChange={event => { setName(event.target.value); onClearError() }} autoComplete="username" disabled={busy} /></div>
    <div><label htmlFor="studentCode" className="block text-sm font-medium text-gray-700 mb-2">Din fyrsiffriga kod</label><input id="studentCode" className={inputClass} value={code} required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} onChange={event => { setCode(event.target.value.replace(/\D/g, '')); onClearError() }} autoComplete="current-password" disabled={busy} /></div>
    <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Kom ihåg mig på den här enheten</label>
    {error && <p role="alert" className="text-red-700 text-sm text-center">{error}</p>}
    <button type="submit" disabled={busy} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">{busy ? 'Loggar in…' : 'Logga in'}</button>
  </form>
}