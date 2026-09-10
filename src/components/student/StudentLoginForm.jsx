import { useState } from 'react'
import { useStudentLoginClasses } from './useStudentLoginClasses'

export default function StudentLoginForm({ onLogin, busy, error, onClearError }) {
  const [mode, setMode] = useState('class')
  const [schoolId, setSchoolId] = useState(null)
  const [classId, setClassId] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const { classes, loading, error: classError, retry } = useStudentLoginClasses()
  const schools = [...new Map(classes.map(item => [item.schoolId || '', { id: item.schoolId || '', name: item.schoolName || 'Skola ej angiven' }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
  const visibleClasses = classes.filter(item => (item.schoolId || '') === schoolId)
  const isClassLogin = mode === 'class'
  const inputClass = 'w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none'

  return (
    <form onSubmit={event => {
      event.preventDefault()
      if (!busy) onLogin({ classId: isClassLogin ? classId : '', name, password, schoolId: schoolId || '' })
    }} className="space-y-4">
      {isClassLogin && (
        <div>
          <label htmlFor="login-school" className="block text-sm font-medium text-gray-700 mb-2">Din skola</label>
          <select id="login-school" className={inputClass} value={schoolId === null ? '__choose__' : schoolId}
            onChange={event => { setSchoolId(event.target.value === '__choose__' ? null : event.target.value); setClassId(''); onClearError() }}
            disabled={busy || loading || schools.length === 0}>
            <option value="__choose__">Välj din skola</option>
            {schools.map(item => <option key={item.id} value={item.id}>
              {item.name}{schools.filter(other => other.name === item.name).length > 1 ? ` · ${item.id.slice(-6)}` : ''}
            </option>)}
          </select>
          <label htmlFor="login-class" className="block text-sm font-medium text-gray-700 mb-2 mt-4">Din klass/grupp</label>
          <select id="login-class" className={inputClass} value={classId} required
            onChange={event => { setClassId(event.target.value); onClearError() }}
            disabled={busy || loading || schoolId === null || visibleClasses.length === 0}>
            <option value="">{loading ? 'Hämtar klasser…' : 'Välj din klass'}</option>
            {visibleClasses.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}{visibleClasses.filter(other => other.name === item.name).length > 1 ? ` · ${item.id.slice(-6)}` : ''}
              </option>
            ))}
          </select>
          {classError && <p role="alert" className="mt-2 text-sm text-red-700">{classError}</p>}
          {!loading && !classError && classes.length === 0 && (
            <p className="mt-2 text-sm text-gray-600">Inga klasser är tillgängliga. Be läraren om hjälp eller använd ditt elev-ID.</p>
          )}
          {classError && <button type="button" onClick={retry} className="mt-2 text-sm underline text-blue-700">Hämta klasser igen</button>}
        </div>
      )}
      <div>
        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
          {isClassLogin ? 'Ditt namn' : 'Elev-ID'}
        </label>
        <input type="text" id="studentId" className={inputClass} value={name} required
          onChange={event => { setName(event.target.value); onClearError() }}
          placeholder={isClassLogin ? 'Som läraren skrev det i klasslistan' : 'Elev-ID från läraren'}
          autoComplete="username" disabled={busy} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Lösenord</label>
        <input type="password" id="password" className={inputClass} value={password} required
          onChange={event => setPassword(event.target.value)} placeholder="Ditt lösenord"
          autoComplete="current-password" disabled={busy} />
      </div>
      {error && <p role="alert" className="text-red-700 text-sm text-center">{error}</p>}
      <p className="text-xs text-gray-500">Startlösenordet är ditt namn som läraren skrev det, om du inte har bytt lösenord.</p>
      <button type="submit" disabled={busy || (isClassLogin && (schoolId === null || !classId || loading || Boolean(classError)))}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">
        {busy ? 'Loggar in…' : 'Logga in'}
      </button>
      <button type="button" disabled={busy} onClick={() => {
        setMode(isClassLogin ? 'id' : 'class'); setName(''); setPassword(''); onClearError()
      }} className="w-full py-2 text-sm text-blue-700 underline">
        {isClassLogin ? 'Logga in med elev-ID' : 'Logga in med skola, klass och namn'}
      </button>
    </form>
  )
}
