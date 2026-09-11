export default function ClassStatsCards({ classStats, supportCount }) {
  const cards = [
    { label: 'Elever i urval', value: classStats.totalStudents, valueClass: 'text-gray-800' },
    { label: 'Tränat idag', value: classStats.activeToday, valueClass: 'text-green-600' },
    { label: 'Tränat i veckan', value: classStats.activeThisWeek, valueClass: 'text-blue-600' },
    { label: 'Tydlig stödsignal', value: supportCount, valueClass: supportCount > 0 ? 'text-rose-600' : 'text-gray-500' }
  ]

  return (
    <section className="dashboard-class-stats grid grid-cols-2 gap-1.5 rounded-lg bg-white p-1.5 shadow sm:grid-cols-4">
      {cards.map(card => (
        <div key={card.label} className="rounded-md bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
          <p className={`text-lg font-bold leading-tight ${card.valueClass}`}>{card.value}</p>
        </div>
      ))}
    </section>
  )
}
