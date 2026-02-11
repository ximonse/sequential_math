import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createClassFromRoster,
  getAllProfilesWithSync,
  getClasses,
  removeClass,
  resetStudentPasswordToLoginName
} from '../../lib/storage'
import {
  clearCustomTeacherPassword,
  getTeacherPasswordSource,
  logoutTeacher,
  setCustomTeacherPassword,
  verifyTeacherPassword
} from '../../lib/teacherAuth'
import { evaluateAnswerQuality } from '../../lib/answerQuality'
import { getOperationLabel } from '../../lib/operations'
import { getStartOfWeekTimestamp } from '../../lib/studentProfile'
import {
  buildAssignmentLink,
  clearAllAssignments,
  clearActiveAssignment,
  createAssignment,
  deleteAssignment,
  getActiveAssignment,
  getAssignments,
  setActiveAssignment
} from '../../lib/assignments'

function Dashboard() {
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [viewMode, setViewMode] = useState('daily')
  const [sortBy, setSortBy] = useState('active_today')
  const [sortDir, setSortDir] = useState('desc')
  const [classes, setClasses] = useState([])
  const [selectedClassIds, setSelectedClassIds] = useState([])
  const [classNameInput, setClassNameInput] = useState('')
  const [rosterInput, setRosterInput] = useState('')
  const [classStatus, setClassStatus] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [activeAssignmentId, setActiveAssignmentId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState('')
  const [passwordSource, setPasswordSource] = useState('default')
  const navigate = useNavigate()

  useEffect(() => {
    void loadStudents()
    setClasses(getClasses())
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setPasswordSource(getTeacherPasswordSource())
  }, [])

  const handleRefresh = () => {
    void loadStudents()
    setClasses(getClasses())
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setPasswordSource(getTeacherPasswordSource())
  }

  const handleLogout = () => {
    logoutTeacher()
    navigate('/teacher-login')
  }

  const classStats = {
    totalStudents: students.length,
    activeToday: students.filter(s => {
      const last = s.recentProblems[s.recentProblems.length - 1]?.timestamp
      if (!last) return false
      const today = new Date().setHours(0, 0, 0, 0)
      return last > today
    }).length,
    avgSuccessRate: students.length > 0
      ? students.reduce((sum, s) => sum + (s.stats.overallSuccessRate || 0), 0) / students.length
      : 0,
    totalProblems: students.reduce((sum, s) => sum + (s.stats.totalProblems || 0), 0)
  }

  const filteredStudents = selectedClassIds.length > 0
    ? students.filter(student => selectedClassIds.includes(student.classId))
    : students

  const tableRows = getSortedRows(
    filteredStudents.map(student => buildStudentRow(student)),
    sortBy,
    sortDir
  )
  const visibleRows = tableRows

  const loadStudents = async () => {
    const profiles = await getAllProfilesWithSync()
    profiles.sort((a, b) => {
      const aLast = a.recentProblems[a.recentProblems.length - 1]?.timestamp || 0
      const bLast = b.recentProblems[b.recentProblems.length - 1]?.timestamp || 0
      return bLast - aLast
    })
    setStudents(profiles)
  }

  const handleCreatePreset = (presetKey) => {
    const preset = getPresetConfig(presetKey)
    createAssignment(preset)
    setAssignments(getAssignments())
  }

  const handleCopyAssignmentLink = async (assignmentId) => {
    const link = buildAssignmentLink(assignmentId)
    await navigator.clipboard.writeText(link)
    setCopiedId(assignmentId)
    window.setTimeout(() => setCopiedId(''), 1200)
  }

  const handleActivateForAll = (assignmentId) => {
    setActiveAssignment(assignmentId)
    setActiveAssignmentId(assignmentId)
  }

  const handleClearActiveForAll = () => {
    clearActiveAssignment()
    setActiveAssignmentId('')
  }

  const handleDeleteAssignment = (assignmentId) => {
    deleteAssignment(assignmentId)
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
  }

  const handleClearAllAssignments = () => {
    clearAllAssignments()
    setAssignments([])
    setActiveAssignmentId('')
  }

  const handleCreateClass = () => {
    const result = createClassFromRoster(classNameInput, rosterInput, 4)
    if (!result.ok) {
      setClassStatus(result.error)
      return
    }

    setClassNameInput('')
    setRosterInput('')
    setClassStatus(`Klass skapad: ${result.classRecord.name} (${result.classRecord.studentIds.length} elever)`)
    setClasses(getClasses())
    void loadStudents()
  }

  const handleDeleteClass = (classId) => {
    removeClass(classId)
    setSelectedClassIds(prev => prev.filter(id => id !== classId))
    setClasses(getClasses())
    setClassStatus('Klass borttagen.')
  }

  const handleToggleClassFilter = (classId) => {
    setSelectedClassIds(prev => (
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    ))
  }

  const clearClassFilter = () => {
    setSelectedClassIds([])
  }

  const handleResetStudentPassword = (studentId) => {
    const result = resetStudentPasswordToLoginName(studentId)
    setClassStatus(result.ok ? `Lösenord återställt för ${studentId}` : result.error)
  }

  const handlePasswordChange = (e) => {
    e.preventDefault()
    setPasswordStatus('')

    if (!verifyTeacherPassword(currentPassword)) {
      setPasswordStatus('Nuvarande lösenord stämmer inte.')
      return
    }

    if (newPassword.trim().length < 4) {
      setPasswordStatus('Nytt lösenord måste vara minst 4 tecken.')
      return
    }

    const ok = setCustomTeacherPassword(newPassword)
    if (!ok) {
      setPasswordStatus('Kunde inte spara nytt lösenord.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setPasswordSource(getTeacherPasswordSource())
    setPasswordStatus('Lösenord uppdaterat.')
  }

  const handleResetPasswordSource = () => {
    clearCustomTeacherPassword()
    setPasswordSource(getTeacherPasswordSource())
    setPasswordStatus('Lokal override borttagen.')
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Elevöversikt</h1>
            <p className="text-gray-600">Matteträning - Dashboard</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white hover:bg-gray-50 border rounded-lg text-gray-600"
            >
              Uppdatera
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Tillbaka
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg"
            >
              Logga ut
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Antal elever</p>
            <p className="text-3xl font-bold text-gray-800">{classStats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Aktiva idag</p>
            <p className="text-3xl font-bold text-green-600">{classStats.activeToday}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Genomsnitt success</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(classStats.avgSuccessRate * 100)}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Totalt problem</p>
            <p className="text-3xl font-bold text-purple-600">{classStats.totalProblems}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Uppdrag via länk</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleCreatePreset('addition')}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Nytt: Bara addition
            </button>
            <button
              onClick={() => handleCreatePreset('multiplication')}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
            >
              Nytt: Bara multiplikation
            </button>
            <button
              onClick={() => handleCreatePreset('subtraction')}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              Nytt: Bara subtraktion
            </button>
            <button
              onClick={() => handleCreatePreset('division')}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
            >
              Nytt: Bara division
            </button>
            <button
              onClick={() => handleCreatePreset('mixed')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
            >
              Nytt: Kombination
            </button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500">Inga uppdrag skapade ännu.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <p className="text-xs text-gray-500">
                  Aktivt för alla: {activeAssignmentId ? activeAssignmentId : 'Ingen (fri träning)'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearActiveForAll}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs"
                  >
                    Rensa aktivt
                  </button>
                  <button
                    onClick={handleClearAllAssignments}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                  >
                    Rensa alla
                  </button>
                </div>
              </div>
              {assignments.slice(0, 10).map(assignment => (
                <div
                  key={assignment.id}
                  className={`flex flex-wrap items-center justify-between gap-2 border rounded p-2 ${
                    activeAssignmentId === assignment.id ? 'border-green-400 bg-green-50' : ''
                  }`}
                >
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">{assignment.title}</p>
                    <p className="text-gray-500">
                      {assignment.problemTypes.join(', ')} | Nivå {assignment.minLevel}-{assignment.maxLevel}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{assignment.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleActivateForAll(assignment.id)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                    >
                      Aktivera för alla
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                    >
                      Ta bort
                    </button>
                    <button
                      onClick={() => handleCopyAssignmentLink(assignment.id)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white rounded text-xs"
                    >
                      {copiedId === assignment.id ? 'Kopierad' : 'Kopiera länk'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Lärarlösenord</h2>
          <p className="text-sm text-gray-500 mb-3">
            Aktiv källa: {passwordSource === 'custom' ? 'Lokal override' : passwordSource === 'env' ? 'Miljövariabel' : 'Standardlösenord'}
          </p>
          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <input
              type="password"
              placeholder="Nuvarande lösenord"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="password"
              placeholder="Nytt lösenord"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-800 hover:bg-black text-white rounded text-sm"
            >
              Ändra lösenord
            </button>
          </form>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${passwordStatus.includes('uppdaterat') ? 'text-green-600' : 'text-gray-600'}`}>
              {passwordStatus || ' '}
            </p>
            <button
              onClick={handleResetPasswordSource}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
            >
              Återställ till env/default
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Klasser</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <input
              type="text"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              placeholder="Klassnamn, t.ex. 4A"
              className="px-3 py-2 border rounded text-sm"
            />
            <button
              onClick={handleCreateClass}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Skapa klass från listan
            </button>
          </div>
          <textarea
            value={rosterInput}
            onChange={(e) => setRosterInput(e.target.value)}
            placeholder={'Klistra in elevlista, en per rad\\nAnna Andersson\\nBo Berg'}
            className="w-full min-h-28 px-3 py-2 border rounded text-sm mb-3"
          />
          <p className="text-xs text-gray-500 mb-2">
            Inloggningsnamn skapas från elevens namn. Startlösenord sätts till elevens namn.
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button
              onClick={clearClassFilter}
              className={`px-2 py-1 rounded text-xs ${
                selectedClassIds.length === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alla klasser
            </button>
            {classes.map(item => (
              <button
                key={`filter-${item.id}`}
                onClick={() => handleToggleClassFilter(item.id)}
                className={`px-2 py-1 rounded text-xs ${
                  selectedClassIds.includes(item.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mb-3">{classStatus || ' '}</p>

          {classes.length > 0 && (
            <div className="space-y-1.5">
              {classes.map(item => {
                const classStudents = students.filter(student => student.classId === item.id)
                const loggedInCount = classStudents.filter(student => student.auth?.lastLoginAt).length
                return (
                  <div key={item.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.studentIds.length} elever | {loggedInCount} har loggat in
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteClass(item.id)}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                    >
                      Ta bort klass
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-500 text-lg">Inga elever ännu</p>
            <p className="text-gray-400 mt-2">
              Elever skapas automatiskt när de loggar in med sitt ID
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dagsvy
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alla elever
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    viewMode === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Veckovy
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-gray-500">Sortera</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="active_today">Aktiv idag</option>
                  <option value="today_attempts">Dagens mängd</option>
                  <option value="today_wrong">Dagens felsvar</option>
                  <option value="today_struggle">Dagens kämp-index</option>
                  <option value="today_answer_length">Dagens svarslängd</option>
                  <option value="active_week">Aktiv denna vecka</option>
                  <option value="week_attempts">Veckans mängd</option>
                  <option value="week_correct">Veckans rätt</option>
                  <option value="week_wrong">Veckans felsvar</option>
                  <option value="week_active_time">Veckans aktiv tid</option>
                  <option value="week_success_rate">Veckans träffsäkerhet</option>
                  <option value="week_answer_length">Veckans svarslängd</option>
                  <option value="logged_in">Har loggat in</option>
                  <option value="last_active">Senast aktiv</option>
                  <option value="attempts">Totala försök</option>
                  <option value="success_rate">Total träffsäkerhet</option>
                </select>
                <button
                  onClick={() => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
                >
                  {sortDir === 'desc' ? 'Fallande' : 'Stigande'}
                </button>
              </div>
            </div>

            {viewMode === 'daily' && visibleRows.length === 0 && (
              <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Inga elever i valt urval.
              </div>
            )}
            {viewMode === 'weekly' && visibleRows.length === 0 && (
              <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Inga elever i valt urval.
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-0 font-semibold">Namn</th>
                  <th className="px-4 py-0 font-semibold">ID</th>
                  <th className="px-4 py-0 font-semibold">Klass</th>
                  {viewMode === 'daily' ? (
                    <>
                      <th className="px-4 py-0 font-semibold">Gjort idag</th>
                      <th className="px-4 py-0 font-semibold">Rätt/fel idag</th>
                      <th className="px-4 py-0 font-semibold">Kämpar med idag</th>
                      <th className="px-4 py-0 font-semibold">Svarslängd idag</th>
                      <th className="px-4 py-0 font-semibold">Senast aktiv</th>
                      <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                    </>
                  ) : viewMode === 'weekly' ? (
                    <>
                      <th className="px-4 py-0 font-semibold">Gjort denna vecka</th>
                      <th className="px-4 py-0 font-semibold">Aktiv tid</th>
                      <th className="px-4 py-0 font-semibold">Rätt/fel vecka</th>
                      <th className="px-4 py-0 font-semibold">Kämpar med vecka</th>
                      <th className="px-4 py-0 font-semibold">Svarslängd vecka</th>
                      <th className="px-4 py-0 font-semibold">Senast aktiv</th>
                      <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-0 font-semibold">Försök</th>
                      <th className="px-4 py-0 font-semibold">Rätt</th>
                      <th className="px-4 py-0 font-semibold">Rimlighet</th>
                      <th className="px-4 py-0 font-semibold">Medelavvikelse</th>
                      <th className="px-4 py-0 font-semibold">Trend</th>
                      <th className="px-4 py-0 font-semibold">Senast aktiv</th>
                      <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(row => (
                  <tr key={row.studentId} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className={`px-4 py-0 font-semibold ${row.hasLoggedIn ? 'text-green-700' : 'text-gray-800'}`}>
                      {row.name}
                    </td>
                    <td className="px-4 py-0 text-xs text-gray-400 font-mono">
                      {row.studentId}
                    </td>
                    <td className="px-4 py-0 text-gray-700">
                      {row.className || '-'}
                    </td>
                    {viewMode === 'daily' ? (
                      <>
                        <td className="px-4 py-0 text-gray-700">
                          {row.todayAttempts}
                          <div className="text-xs text-gray-500 mt-1">{row.todayOperationSummary}</div>
                        </td>
                        <td className="px-4 py-0">
                          <span className={getSuccessColorClass(row.todaySuccessRate)}>
                            {row.todayCorrectCount}/{row.todayAttempts || 0}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Fel: {row.todayWrongCount} | Rimliga fel: {row.todayReasonableWrongCount}
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.todayStruggle
                            ? (
                              <>
                                <div className="font-medium">{row.todayStruggle.skillLabel}</div>
                                <div className="text-xs text-gray-500">
                                  {row.todayStruggle.attempts} försök, {row.todayStruggle.wrong} fel
                                </div>
                              </>
                            )
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.todayAvgAnswerLength === null
                            ? '-'
                            : `${row.todayAvgAnswerLength.toFixed(1)} tecken`}
                        </td>
                        <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                      </>
                    ) : viewMode === 'weekly' ? (
                      <>
                        <td className="px-4 py-0 text-gray-700">
                          {row.weekAttempts}
                          <div className="text-xs text-gray-500 mt-1">{row.weekOperationSummary}</div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {formatDuration(row.weekActiveTimeSec)}
                          <div className="text-xs text-gray-500 mt-1">
                            snitt {row.weekAvgTimePerProblemSec > 0 ? `${Math.round(row.weekAvgTimePerProblemSec)}s/problem` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-0">
                          <span className={getSuccessColorClass(row.weekSuccessRate)}>
                            {row.weekCorrectCount}/{row.weekAttempts || 0}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Fel: {row.weekWrongCount} | Rimliga fel: {row.weekReasonableWrongCount}
                          </div>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.weekStruggle
                            ? (
                              <>
                                <div className="font-medium">{row.weekStruggle.skillLabel}</div>
                                <div className="text-xs text-gray-500">
                                  {row.weekStruggle.attempts} försök, {row.weekStruggle.wrong} fel
                                </div>
                              </>
                            )
                            : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.weekAvgAnswerLength === null
                            ? '-'
                            : `${row.weekAvgAnswerLength.toFixed(1)} tecken`}
                        </td>
                        <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-0 text-gray-700">{row.attempts}</td>
                        <td className="px-4 py-0">
                          <span className={getSuccessColorClass(row.successRate)}>
                            {row.correctCount}/{row.attempts} ({toPercent(row.successRate)})
                          </span>
                        </td>
                        <td className="px-4 py-0">
                          <span className={getReasonableColorClass(row.reasonableRate)}>
                            {row.reasonableCount}/{row.attempts} ({toPercent(row.reasonableRate)})
                          </span>
                        </td>
                        <td className="px-4 py-0 text-gray-700">
                          {row.avgRelativeError === null ? '-' : `${Math.round(row.avgRelativeError * 100)}%`}
                        </td>
                        <td className="px-4 py-0">
                          {row.trend === null ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className={row.trend >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {row.trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(row.trend * 100))}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                      </>
                    )}
                    <td className="px-4 py-0 text-right">
                      <button
                        onClick={() => handleResetStudentPassword(row.studentId)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        Byt lösen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function getPresetConfig(presetKey) {
  if (presetKey === 'addition') {
    return {
      title: 'Addition nivå 1-8',
      problemTypes: ['addition'],
      minLevel: 1,
      maxLevel: 8,
      targetCount: 20
    }
  }

  if (presetKey === 'multiplication') {
    return {
      title: 'Multiplikation nivå 3-10',
      problemTypes: ['multiplication'],
      minLevel: 3,
      maxLevel: 10,
      targetCount: 20
    }
  }

  if (presetKey === 'subtraction') {
    return {
      title: 'Subtraktion nivå 1-8',
      problemTypes: ['subtraction'],
      minLevel: 1,
      maxLevel: 8,
      targetCount: 20
    }
  }

  if (presetKey === 'division') {
    return {
      title: 'Division nivå 3-10',
      problemTypes: ['division'],
      minLevel: 3,
      maxLevel: 10,
      targetCount: 18
    }
  }

  return {
    title: 'Kombination nivå 2-10',
    problemTypes: ['addition', 'subtraction', 'multiplication', 'division'],
    minLevel: 2,
    maxLevel: 10,
    targetCount: 25
  }
}

function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function buildStudentRow(student) {
  const attempts = student.recentProblems.length
  const correctCount = student.recentProblems.filter(p => p.correct).length
  const successRate = attempts > 0 ? correctCount / attempts : 0

  const quality = student.recentProblems.map(p => evaluateAnswerQuality(p))
  const reasonableCount = quality.filter(q => q.isReasonable).length
  const reasonableRate = attempts > 0 ? reasonableCount / attempts : 0

  const wrongQuality = quality.filter((q, idx) => !student.recentProblems[idx].correct)
  const avgRelativeError = wrongQuality.length > 0
    ? wrongQuality.reduce((sum, q) => sum + q.relativeError, 0) / wrongQuality.length
    : null

  const trend = calculateTrend(student.recentProblems)
  const lastActive = student.recentProblems[student.recentProblems.length - 1]?.timestamp || null

  const todayStart = getStartOfDayTimestamp()
  const todayProblems = student.recentProblems.filter(problem => problem.timestamp >= todayStart)
  const todayAttempts = todayProblems.length
  const todayCorrectCount = todayProblems.filter(problem => problem.correct).length
  const todayWrongCount = todayAttempts - todayCorrectCount
  const todaySuccessRate = todayAttempts > 0 ? todayCorrectCount / todayAttempts : 0
  const todayWrongReasonable = todayProblems
    .filter(problem => !problem.correct)
    .map(problem => evaluateAnswerQuality(problem))
    .filter(item => item.isReasonable)
    .length
  const todayAvgAnswerLength = getAverageAnswerLength(todayProblems)
  const todayByOperation = summarizeByOperation(todayProblems)
  const todayBySkill = summarizeBySkill(todayProblems)
  const todayOperationSummary = todayByOperation.length > 0
    ? todayByOperation.map(item => `${getOperationLabel(item.operation)}: ${item.attempts}`).join(' | ')
    : '-'
  const todayStruggle = getStruggleSkill(todayBySkill)
  const todayStruggleIndex = todayStruggle
    ? ((todayStruggle.wrong / Math.max(1, todayStruggle.attempts)) * 100) + todayStruggle.wrong
    : 0

  const weekStart = getStartOfWeekTimestamp()
  const weekProblems = student.recentProblems.filter(problem => problem.timestamp >= weekStart)
  const weekAttempts = weekProblems.length
  const weekCorrectCount = weekProblems.filter(problem => problem.correct).length
  const weekWrongCount = weekAttempts - weekCorrectCount
  const weekSuccessRate = weekAttempts > 0 ? weekCorrectCount / weekAttempts : 0
  const weekWrongReasonable = weekProblems
    .filter(problem => !problem.correct)
    .map(problem => evaluateAnswerQuality(problem))
    .filter(item => item.isReasonable)
    .length
  const weekActiveTimeSec = weekProblems.reduce((sum, problem) => sum + (Number(problem.timeSpent) || 0), 0)
  const weekAvgTimePerProblemSec = weekAttempts > 0 ? weekActiveTimeSec / weekAttempts : 0
  const weekAvgAnswerLength = getAverageAnswerLength(weekProblems)
  const weekByOperation = summarizeByOperation(weekProblems)
  const weekBySkill = summarizeBySkill(weekProblems)
  const weekOperationSummary = weekByOperation.length > 0
    ? weekByOperation.map(item => `${getOperationLabel(item.operation)}: ${item.attempts}`).join(' | ')
    : '-'
  const weekStruggle = getStruggleSkill(weekBySkill)
  const weekStruggleIndex = weekStruggle
    ? ((weekStruggle.wrong / Math.max(1, weekStruggle.attempts)) * 100) + weekStruggle.wrong
    : 0

  return {
    studentId: student.studentId,
    name: student.name,
    classId: student.classId || '',
    className: student.className || '',
    hasLoggedIn: Boolean(student.auth?.lastLoginAt),
    attempts,
    correctCount,
    successRate,
    reasonableCount,
    reasonableRate,
    avgRelativeError,
    trend,
    lastActive,
    activeToday: todayAttempts > 0,
    todayAttempts,
    todayCorrectCount,
    todayWrongCount,
    todaySuccessRate,
    todayReasonableWrongCount: todayWrongReasonable,
    todayAvgAnswerLength,
    todayOperationSummary,
    todayStruggle,
    todayStruggleIndex,
    activeThisWeek: weekAttempts > 0,
    weekAttempts,
    weekCorrectCount,
    weekWrongCount,
    weekSuccessRate,
    weekReasonableWrongCount: weekWrongReasonable,
    weekActiveTimeSec,
    weekAvgTimePerProblemSec,
    weekAvgAnswerLength,
    weekOperationSummary,
    weekStruggle,
    weekStruggleIndex
  }
}

function summarizeByOperation(problems) {
  const stats = new Map()

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const prev = stats.get(operation) || {
      operation,
      attempts: 0,
      wrong: 0,
      answerLengthSum: 0
    }

    const answerLength = getAnswerLength(problem)
    prev.attempts += 1
    if (!problem.correct) prev.wrong += 1
    prev.answerLengthSum += answerLength
    stats.set(operation, prev)
  }

  return Array.from(stats.values())
    .map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.attempts - item.wrong) / item.attempts : 0,
      avgAnswerLength: item.attempts > 0 ? item.answerLengthSum / item.attempts : 0
    }))
    .sort((a, b) => b.attempts - a.attempts)
}

function getStruggleSkill(skillStats) {
  if (skillStats.length === 0) return null

  const best = [...skillStats].sort((a, b) => {
    if (a.wrong !== b.wrong) return b.wrong - a.wrong
    if (a.successRate !== b.successRate) return a.successRate - b.successRate
    return b.attempts - a.attempts
  })[0]

  if (!best || best.wrong === 0) return null
  return best
}

function summarizeBySkill(problems) {
  const stats = new Map()

  for (const problem of problems) {
    const operation = inferOperationFromProblemType(problem.problemType)
    const rawTag = problem.skillTag || problem.problemType || operation
    const skillKey = String(rawTag)
    const prev = stats.get(skillKey) || {
      operation,
      skillKey,
      skillLabel: formatSkillLabel(operation, skillKey),
      attempts: 0,
      wrong: 0
    }

    prev.attempts += 1
    if (!problem.correct) prev.wrong += 1
    stats.set(skillKey, prev)
  }

  return Array.from(stats.values())
    .map(item => ({
      ...item,
      successRate: item.attempts > 0 ? (item.attempts - item.wrong) / item.attempts : 0
    }))
}

function formatSkillLabel(operation, skillKey) {
  const operationLabel = getOperationLabel(operation)
  const normalized = String(skillKey || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return operationLabel

  const lower = normalized.toLowerCase()
  if (lower.startsWith('add ') || lower.startsWith('sub ') || lower.startsWith('mul ') || lower.startsWith('div ')) {
    return `${operationLabel} (${normalized})`
  }

  return `${operationLabel} (${normalized})`
}

function getAnswerLength(problem) {
  if (Number.isFinite(problem.answerLength)) return problem.answerLength
  if (problem.studentAnswer === null || problem.studentAnswer === undefined) return 0

  const normalized = String(problem.studentAnswer).replace('-', '').replace('.', '').trim()
  return normalized.length
}

function getAverageAnswerLength(problems) {
  if (problems.length === 0) return null
  const total = problems.reduce((sum, problem) => sum + getAnswerLength(problem), 0)
  return total / problems.length
}

function inferOperationFromProblemType(problemType = '') {
  if (problemType.startsWith('add_')) return 'addition'
  if (problemType.startsWith('sub_')) return 'subtraction'
  if (problemType.startsWith('mul_')) return 'multiplication'
  if (problemType.startsWith('div_')) return 'division'
  return 'addition'
}

function calculateTrend(problems) {
  if (problems.length < 15) return null

  const last10 = problems.slice(-10)
  const previous10 = problems.slice(-20, -10)
  if (previous10.length < 5) return null

  const lastRate = last10.filter(p => p.correct).length / last10.length
  const prevRate = previous10.filter(p => p.correct).length / previous10.length
  return lastRate - prevRate
}

function getSortedRows(rows, sortBy, sortDir) {
  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortBy))
  return sortDir === 'asc' ? sorted : sorted.reverse()
}

function compareRows(a, b, sortBy) {
  if (sortBy === 'active_today') {
    if (a.activeToday !== b.activeToday) return Number(a.activeToday) - Number(b.activeToday)
    return (a.lastActive || 0) - (b.lastActive || 0)
  }

  if (sortBy === 'today_attempts') return a.todayAttempts - b.todayAttempts
  if (sortBy === 'today_wrong') return a.todayWrongCount - b.todayWrongCount
  if (sortBy === 'today_struggle') return a.todayStruggleIndex - b.todayStruggleIndex
  if (sortBy === 'today_answer_length') return (a.todayAvgAnswerLength || 0) - (b.todayAvgAnswerLength || 0)
  if (sortBy === 'active_week') {
    if (a.activeThisWeek !== b.activeThisWeek) return Number(a.activeThisWeek) - Number(b.activeThisWeek)
    return (a.lastActive || 0) - (b.lastActive || 0)
  }
  if (sortBy === 'week_attempts') return a.weekAttempts - b.weekAttempts
  if (sortBy === 'week_correct') return a.weekCorrectCount - b.weekCorrectCount
  if (sortBy === 'week_wrong') return a.weekWrongCount - b.weekWrongCount
  if (sortBy === 'week_active_time') return a.weekActiveTimeSec - b.weekActiveTimeSec
  if (sortBy === 'week_success_rate') return a.weekSuccessRate - b.weekSuccessRate
  if (sortBy === 'week_answer_length') return (a.weekAvgAnswerLength || 0) - (b.weekAvgAnswerLength || 0)
  if (sortBy === 'logged_in') return Number(a.hasLoggedIn) - Number(b.hasLoggedIn)
  if (sortBy === 'last_active') return (a.lastActive || 0) - (b.lastActive || 0)
  if (sortBy === 'attempts') return a.attempts - b.attempts
  if (sortBy === 'success_rate') return a.successRate - b.successRate

  return (a.lastActive || 0) - (b.lastActive || 0)
}

function toPercent(rate) {
  return `${Math.round(rate * 100)}%`
}

function getSuccessColorClass(rate) {
  if (rate >= 0.8) return 'text-green-600 font-semibold'
  if (rate >= 0.6) return 'text-yellow-700 font-semibold'
  return 'text-red-600 font-semibold'
}

function getReasonableColorClass(rate) {
  if (rate >= 0.9) return 'text-green-600 font-semibold'
  if (rate >= 0.75) return 'text-yellow-700 font-semibold'
  return 'text-red-600 font-semibold'
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Aldrig'

  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just nu'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min sedan`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} tim sedan`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dagar sedan`
  return new Date(timestamp).toLocaleDateString('sv-SE')
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export default Dashboard
