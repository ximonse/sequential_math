export default function SupportPriorityPanel({
  supportRows,
  RiskBadgeComponent,
  onOpenStudentDetail,
  onCreateQuickAssignment
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Behöver stöd nu</h2>
        <span className="text-xs text-gray-500">Signal · varför · underlag · nästa steg</span>
      </div>
      {supportRows.length === 0 ? (
        <p className="text-sm text-gray-500">Inga elever uppfyller de tydliga stödreglerna just nu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-3">Elev</th>
                <th className="py-2 pr-3">Signal</th>
                <th className="py-2 pr-3">Varför</th>
                <th className="py-2 pr-3">Underlag</th>
                <th className="py-2">Nästa steg</th>
              </tr>
            </thead>
            <tbody>
              {supportRows.map(row => (
                <tr key={`support-${row.studentId}`} className="align-top border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => onOpenStudentDetail(row.studentId)}
                      className="text-left hover:underline text-indigo-700 font-medium"
                    >
                      {row.name}
                    </button>
                    <div className="text-xs text-gray-500">
                      {row.classNameLabel || row.className || 'Ingen klass'} · {row.studentId}
                    </div>
                  </td>
                  <td className="py-3 pr-3"><RiskBadgeComponent level={row.riskLevel} /></td>
                  <td className="py-3 pr-3 text-gray-700">{row.riskCodes.slice(0, 2).join(' · ')}</td>
                  <td className="py-3 pr-3 text-gray-600">{row.evidenceLabel}</td>
                  <td className="py-3">
                    <p className="mb-2 max-w-72 text-xs text-gray-700">{row.nextAction}</p>
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => onOpenStudentDetail(row.studentId)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs">Elevvy</button>
                      <button onClick={() => onCreateQuickAssignment(row, 'focus')} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs">Fokus</button>
                      <button onClick={() => onCreateQuickAssignment(row, 'warmup')} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs">Värm</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
