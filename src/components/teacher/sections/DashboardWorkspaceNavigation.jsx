const TABS = [
  { id: 'work', label: 'Uppdrag & exit tickets' },
  { id: 'knowledge', label: 'Tabeller & kunskapsområden' },
  { id: 'statistics', label: 'Statistik' },
  { id: 'classes', label: 'Klasser & elever' }
]

export default function DashboardWorkspaceNavigation({ activeTab, onChange }) {
  return (
    <nav aria-label="Lärarvyns huvudområden" className="dashboard-workspace-tabs mb-4 overflow-x-auto border-b border-slate-300">
      <div role="tablist" className="flex min-w-max">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`-mb-px flex-1 border-b-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-600 hover:border-slate-300 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
