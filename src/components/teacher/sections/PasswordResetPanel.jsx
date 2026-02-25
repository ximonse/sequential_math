export default function PasswordResetPanel({
  sectionId,
  passwordResetRows,
  passwordResetSearch,
  onSetPasswordResetSearch,
  onClearPasswordResetSearch,
  passwordResetStatus,
  onOpenStudentDetail,
  onResetStudentPassword,
  passwordResetBusyId,
  formatTimeAgo
}) {
  return (
    <div id={sectionId} className="bg-white rounded-lg shadow p-4 mt-8 border-2 border-rose-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-lg font-semibold text-rose-800">Nollställ elevlösenord</h2>
        <p className="text-xs text-gray-500">
          {passwordResetRows.length} elev(er) i aktuellt urval
        </p>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Använd för att återställa elevlösenord till elevens inloggnings-ID.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          type="text"
          value={passwordResetSearch}
          onChange={(event) => onSetPasswordResetSearch(event.target.value)}
          placeholder="Sök elev (namn, ID eller klass)"
          className="px-3 py-2 border rounded text-sm min-w-[240px] flex-1"
        />
        <button
          type="button"
          onClick={onClearPasswordResetSearch}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
        >
          Rensa
        </button>
      </div>
      <p className="text-xs text-gray-600 mb-3 min-h-5">{passwordResetStatus || ' '}</p>

      {passwordResetRows.length === 0 ? (
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Inga elever att visa i valt urval.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Namn</th>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Klass</th>
                  <th className="px-3 py-2 font-semibold">Senaste inloggning</th>
                  <th className="px-3 py-2 font-semibold text-right">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {passwordResetRows.map(row => (
                  <tr key={`password-reset-${row.studentId}`} className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-gray-800">
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="text-left hover:underline text-indigo-700 font-medium"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono">{row.studentId}</td>
                    <td className="px-3 py-2 text-gray-700">{row.className || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{formatTimeAgo(row.lastLoginAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onResetStudentPassword(row.studentId)}
                        disabled={passwordResetBusyId === row.studentId}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded text-xs font-semibold"
                      >
                        {passwordResetBusyId === row.studentId ? 'Nollställer...' : 'Nollställ lösenord'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
