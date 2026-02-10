import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProfiles } from '../../lib/storage'
import { logoutTeacher } from '../../lib/teacherAuth'
import StudentCard from './StudentCard'

function Dashboard() {
  const [students, setStudents] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const profiles = getAllProfiles()
    // Sortera efter senast aktiv
    profiles.sort((a, b) => {
      const aLast = a.recentProblems[a.recentProblems.length - 1]?.timestamp || 0
      const bLast = b.recentProblems[b.recentProblems.length - 1]?.timestamp || 0
      return bLast - aLast
    })
    setStudents(profiles)
  }, [])

  const handleRefresh = () => {
    setStudents(getAllProfiles())
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

        {/* Students grid */}
        {students.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow text-center">
            <p className="text-gray-500 text-lg">Inga elever ännu</p>
            <p className="text-gray-400 mt-2">
              Elever skapas automatiskt när de loggar in med sitt ID
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
              <StudentCard key={student.studentId} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
