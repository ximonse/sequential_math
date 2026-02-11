import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getOrCreateProfile } from '../../lib/storage'
import { getMasteryOverview, getStartOfWeekTimestamp } from '../../lib/studentProfile'
import { getOperationLabel, OPERATION_LABELS } from '../../lib/operations'
import { getActiveAssignment, getAssignmentById } from '../../lib/assignments'

function StudentHome() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [assignment, setAssignment] = useState(null)

  const assignmentId = searchParams.get('assignment')

  useEffect(() => {
    setProfile(getOrCreateProfile(studentId))
  }, [studentId])

  useEffect(() => {
    if (assignmentId) {
      setAssignment(getAssignmentById(assignmentId))
      return
    }
    setAssignment(getActiveAssignment())
  }, [assignmentId])

  const masteredOperations = useMemo(() => {
    if (!profile) return []
    const historical = getMasteryOverview(profile)
    const weekly = getMasteryOverview(profile, { since: getStartOfWeekTimestamp() })

    const operations = Array.from(new Set([
      ...Object.keys(historical),
      ...Object.keys(weekly)
    ])).sort((a, b) => a.localeCompare(b))

    return operations.map(operation => ({
      operation,
      historical: historical[operation] || [],
      weekly: weekly[operation] || []
    })).filter(item => item.historical.length > 0 || item.weekly.length > 0)
  }, [profile])

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Laddar...</p>
      </div>
    )
  }

  const assignmentPracticePath = assignment
    ? `/student/${studentId}/practice?assignment=${encodeURIComponent(assignment.id)}`
    : `/student/${studentId}/practice`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hej {profile.name}</h1>
            <p className="text-sm text-gray-500">Din matteöversikt</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Byt elev
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-gray-500">
                Läge: {assignment ? `Uppdrag (${assignment.title})` : 'Fri träning'}
              </p>
            </div>
            <button
              onClick={() => navigate(assignmentPracticePath)}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              {assignment ? 'Fortsätt uppdrag' : 'Starta fri träning'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Välj träning</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => navigate(`/student/${studentId}/practice`)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              Fri träning
            </button>
            {Object.keys(OPERATION_LABELS).map(operation => (
              <button
                key={operation}
                onClick={() => navigate(`/student/${studentId}/practice?mode=${encodeURIComponent(operation)}`)}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                {getOperationLabel(operation)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Klarade nivåer</h2>
          {masteredOperations.length === 0 ? (
            <p className="text-sm text-gray-500">Inga nivåer klara ännu. Börja träna.</p>
          ) : (
            <div className="space-y-3">
              {masteredOperations.map((item) => (
                <div key={item.operation}>
                  <p className="text-sm font-medium text-gray-700 mb-1">{getOperationLabel(item.operation)}</p>
                  <OperationMasteryRows
                    operation={item.operation}
                    historical={item.historical}
                    weekly={item.weekly}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OperationMasteryRows({ operation, historical, weekly }) {
  return (
    <div className="space-y-1">
      {historical.length > 0 && (
        <MasteryRow
          label="Historiskt"
          operation={operation}
          levels={historical}
        />
      )}
      {weekly.length > 0 && (
        <MasteryRow
          label="Denna vecka"
          operation={operation}
          levels={weekly}
        />
      )}
    </div>
  )
}

function MasteryRow({ label, operation, levels }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 min-w-[88px]">{label}</span>
      {levels.map(level => (
        <span
          key={`${operation}-${label}-${level}`}
          className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-100 text-green-800 text-xs font-semibold"
        >
          Nivå {level}
        </span>
      ))}
    </div>
  )
}

export default StudentHome
