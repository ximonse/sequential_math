export default function NcmOverviewPanel({
  ncmOverview,
  filteredStudentsCount,
  onOpenStudentDetail,
  toPercent
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">NCM - domänöversikt</h2>
        <span className="text-xs text-gray-500">Vecka (måndag 00:00 till nu)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">NCM-försök vecka</p>
          <p className="font-semibold text-gray-800">{ncmOverview.totalAttemptsWeek}</p>
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Elever med NCM-data vecka</p>
          <p className="font-semibold text-gray-800">
            {ncmOverview.studentsWithAttemptsWeek}/{filteredStudentsCount}
          </p>
        </div>
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-700">Starkast domän (klass)</p>
          <p className="font-semibold text-emerald-800">{ncmOverview.strongestDomainLabel}</p>
        </div>
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">Mest stödbehov (klass)</p>
          <p className="font-semibold text-amber-800">{ncmOverview.weakestDomainLabel}</p>
        </div>
      </div>

      {ncmOverview.rows.length === 0 ? (
        <p className="text-sm text-gray-500">Ingen NCM-relaterad data i aktuellt klassurval ännu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 pr-2">Elev</th>
                <th className="py-1 pr-2">Klass</th>
                <th className="py-1 pr-2">Försök v</th>
                <th className="py-1 pr-2">Träff v</th>
                <th className="py-1 pr-2">Kunskapsfel v</th>
                <th className="py-1 pr-2">Ouppm. v</th>
                <th className="py-1 pr-2">Svagast domän</th>
                <th className="py-1 pr-2">Starkast domän</th>
                <th className="py-1">Senaste NCM-kod</th>
              </tr>
            </thead>
            <tbody>
              {ncmOverview.rows.map(row => (
                <tr key={`ncm-${row.studentId}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 text-gray-700">
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="text-left hover:underline text-indigo-700 font-medium"
                      >
                        {row.name}
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-400">{row.studentId}</div>
                  </td>
                  <td className="py-1 pr-2 text-gray-700">{row.className || '-'}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.weekAttempts}</td>
                  <td className="py-1 pr-2 text-gray-700">{toPercent(row.weekSuccessRate)}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.weekKnowledgeWrong}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.weekInattentionWrong}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.weakestDomainLabel}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.strongestDomainLabel}</td>
                  <td className="py-1 text-gray-700">{row.lastNcmCode || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
