import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProfilesWithSync } from '../../lib/storage'
import {
  clearCustomTeacherPassword,
  getTeacherPasswordSource,
  logoutTeacher,
  setCustomTeacherPassword,
  verifyTeacherPassword
} from '../../lib/teacherAuth'
import { evaluateAnswerQuality } from '../../lib/answerQuality'
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
  const [copiedId, setCopiedId] = useState('')
  const [activeAssignmentId, setActiveAssignmentId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState('')
  const [passwordSource, setPasswordSource] = useState('default')
  const navigate = useNavigate()

  useEffect(() => {
    void loadStudents()
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setPasswordSource(getTeacherPasswordSource())
  }, [])

  const handleRefresh = () => {
    void loadStudents()
    setAssignments(getAssignments())
    setActiveAssignmentId(getActiveAssignment()?.id || '')
    setPasswordSource(getTeacherPasswordSource())
  }

  const handleLogout = () => {
    logoutTeacher()
    navigate('/teacher-login')
  }

  // Beräkna klassstatistik
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

  const tableRows = students.map(student => buildStudentRow(student))

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
        {/* Header */}
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

        {/* Class stats */}
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

        {/* Students table */}
        {students.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-500 text-lg">Inga elever ännu</p>
            <p className="text-gray-400 mt-2">
              Elever skapas automatiskt när de loggar in med sitt ID
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-semibold">Elev</th>
                  <th className="px-4 py-3 font-semibold">Försök</th>
                  <th className="px-4 py-3 font-semibold">Rätt</th>
                  <th className="px-4 py-3 font-semibold">Rimlighet</th>
                  <th className="px-4 py-3 font-semibold">Medelavvikelse</th>
                  <th className="px-4 py-3 font-semibold">Trend</th>
                  <th className="px-4 py-3 font-semibold">Senast aktiv</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(row => (
                  <tr key={row.studentId} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{row.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{row.studentId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.attempts}</td>
                    <td className="px-4 py-3">
                      <span className={getSuccessColorClass(row.successRate)}>
                        {row.correctCount}/{row.attempts} ({toPercent(row.successRate)})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={getReasonableColorClass(row.reasonableRate)}>
                        {row.reasonableCount}/{row.attempts} ({toPercent(row.reasonableRate)})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.avgRelativeError === null ? '-' : `${Math.round(row.avgRelativeError * 100)}%`}
                    </td>
                    <td className="px-4 py-3">
                      {row.trend === null ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span className={row.trend >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {row.trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(row.trend * 100))}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
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

  return {
    studentId: student.studentId,
    name: student.name,
    attempts,
    correctCount,
    successRate,
    reasonableCount,
    reasonableRate,
    avgRelativeError,
    trend,
    lastActive
  }
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

export default Dashboard
