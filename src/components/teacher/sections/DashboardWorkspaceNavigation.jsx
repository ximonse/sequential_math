const TABS = [
  { id: 'classes', label: 'Klasser & elever' },
  { id: 'work', label: 'Uppdrag & exit tickets' },
  { id: 'knowledge', label: 'Tabeller & kunskapsområden' },
  { id: 'statistics', label: 'Statistik' }
]

export default function DashboardWorkspaceNavigation({ activeTab, onChange }) {
  return (
    <nav aria-label="Lärarvyns huvudområden" className="mb-5 rounded-lg bg-white p-2 shadow">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === tab.id
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
