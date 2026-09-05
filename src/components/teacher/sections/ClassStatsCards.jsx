export default function ClassStatsCards({ classStats, supportCount }) {
  const cards = [
    { label: 'Elever i urval', value: classStats.totalStudents, valueClass: 'text-gray-800' },
    { label: 'Tränat idag', value: classStats.activeToday, valueClass: 'text-green-600' },
    { label: 'Tränat i veckan', value: classStats.activeThisWeek, valueClass: 'text-blue-600' },
    { label: 'Tydlig stödsignal', value: supportCount, valueClass: supportCount > 0 ? 'text-rose-600' : 'text-gray-500' }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className={`text-3xl font-bold ${card.valueClass}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
