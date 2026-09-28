import { useState, useMemo } from 'react'
import { getMathPracticeResults } from '../../../lib/mathPracticeResults'
import { getAssignments } from '../../../lib/assignments'

export default function MathPracticeResultsPanel({ students, filteredStudents }) {
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')
  const [filterAssignmentId, setFilterAssignmentId] = useState('')
  const [filterStudentId, setFilterStudentId] = useState('')

  const results = useMemo(() => {
    let items = getMathPracticeResults()

    if (filterAssignmentId) {
      items = items.filter(r => r.assignmentId === filterAssignmentId)
    }
    if (filterStudentId) {
      items = items.filter(r => r.studentId === filterStudentId)
    }

    const sorted = [...items].sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'timestamp':
          aVal = a.completedAt || 0
          bVal = b.completedAt || 0
          break
        case 'success':
          aVal = a.successRate || 0
          bVal = b.successRate || 0
          break
        case 'time':
          aVal = a.avgTimeMs || 0
          bVal = b.avgTimeMs || 0
          break
        case 'correct':
          aVal = a.correctAnswers || 0
          bVal = b.correctAnswers || 0
          break
        default:
          aVal = a.completedAt || 0
          bVal = b.completedAt || 0
      }

      if (sortDir === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })

    return sorted
  }, [sortBy, sortDir, filterAssignmentId, filterStudentId])

  const assignments = useMemo(() => getAssignments().filter(a => a.kind === 'math_practice'), [])

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId)
    return student?.displayAlias || studentId
  }

  const getSuccessColor = (rate) => {
    if (rate >= 0.8) return 'text-green-700 bg-green-50'
    if (rate >= 0.6) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('sv-SE', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (results.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow p-4" style={{ order: -45 }}>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Matematikövningar — Resultat</h2>
        <p className="text-sm text-gray-500">Inga resultat från matematikövningar än.</p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-lg shadow p-4" style={{ order: -45 }}>
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Matematikövningar — Resultat</h2>

      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Övning</label>
          <select
            value={filterAssignmentId}
            onChange={(e) => setFilterAssignmentId(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Alla övningar</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Elev</label>
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Alla elever</option>
            {filteredStudents.map(s => (
              <option key={s.id} value={s.id}>{s.displayAlias || s.id}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Sortera</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="timestamp">Senaste först</option>
            <option value="success">Framgångsgrad</option>
            <option value="correct">Antal rätt</option>
            <option value="time">Genomsnittlig tid</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Elev</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Övning</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-700">Rätt</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-700">Framgång</th>
              <th className="text-center px-3 py-2 font-semibold text-gray-700">Snitt tid</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Datum</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 50).map(result => (
              <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-800">{getStudentName(result.studentId)}</td>
                <td className="px-3 py-2 text-gray-700">{result.assignmentTitle}</td>
                <td className="px-3 py-2 text-center text-gray-700">
                  {result.correctAnswers}/{result.totalProblems}
                </td>
                <td className={`px-3 py-2 text-center font-semibold rounded ${getSuccessColor(result.successRate)}`}>
                  {Math.round(result.successRate * 100)}%
                </td>
                <td className="px-3 py-2 text-center text-gray-700">
                  {(result.avgTimeMs / 1000).toFixed(1)}s
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {formatDate(result.completedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {results.length > 50 && (
        <p className="mt-3 text-xs text-gray-500">
          Visar {results.slice(0, 50).length} av {results.length} resultat
        </p>
      )}
    </section>
  )
}
