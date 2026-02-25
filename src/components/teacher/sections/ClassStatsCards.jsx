export default function ClassStatsCards({ classStats }) {
  return (
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
  )
}
