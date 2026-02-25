export default function StudentDetailNcmPanel({
  renderCollapseHeader,
  isCollapsed,
  detailStudentViewData,
  toPercent
}) {
  return (
    <div className="mt-4 rounded border border-violet-200 bg-violet-50/30 p-3">
      {renderCollapseHeader(
        'ncm',
        <h3 className="text-sm font-semibold text-violet-900">NCM-resultat (elev)</h3>,
        {
          rightContent: (
            <p className="text-[11px] text-violet-700">
              Senaste NCM-kod: {detailStudentViewData.ncmDetail.lastNcmCode || '-'}
            </p>
          )
        }
      )}
      {isCollapsed('ncm') ? null : (
        <>
          {detailStudentViewData.ncmDetail.attemptsTotal === 0 ? (
            <p className="text-xs text-violet-800 mt-2">Ingen NCM-data för denna elev ännu.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 text-xs">
                <NcmMetricCard label="Försök totalt" value={detailStudentViewData.ncmDetail.attemptsTotal} />
                <NcmMetricCard label="Träff totalt" value={toPercent(detailStudentViewData.ncmDetail.successRateTotal)} />
                <NcmMetricCard label="Kunskapsfel totalt" value={detailStudentViewData.ncmDetail.knowledgeWrongTotal} />
                <NcmMetricCard label="Ouppm. totalt" value={detailStudentViewData.ncmDetail.inattentionWrongTotal} />
                <NcmMetricCard label="Försök vecka" value={detailStudentViewData.ncmDetail.attemptsWeek} />
                <NcmMetricCard label="Träff vecka" value={toPercent(detailStudentViewData.ncmDetail.successRateWeek)} />
                <NcmMetricCard label="Starkast domän" value={detailStudentViewData.ncmDetail.strongestDomainLabel} />
                <NcmMetricCard label="Mest stödbehov" value={detailStudentViewData.ncmDetail.weakestDomainLabel} />
              </div>

              {detailStudentViewData.ncmDetail.assignmentRows.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-violet-700 border-b border-violet-200">
                        <th className="py-1 pr-2">NCM-uppdrag</th>
                        <th className="py-1 pr-2">Klara</th>
                        <th className="py-1 pr-2">Andel</th>
                        <th className="py-1 pr-2">Klar</th>
                        <th className="py-1">Senast uppd.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailStudentViewData.ncmDetail.assignmentRows.slice(0, 8).map(item => (
                        <tr key={`detail-ncm-assignment-${item.assignmentKey}`} className="border-b border-violet-100 last:border-b-0">
                          <td className="py-1 pr-2 text-violet-900 font-medium">{item.assignmentTitle}</td>
                          <td className="py-1 pr-2 text-violet-900">{item.completedCount}/{item.totalSkillTags || '-'}</td>
                          <td className="py-1 pr-2 text-violet-900">{toPercent(item.completionRate)}</td>
                          <td className="py-1 pr-2 text-violet-900">
                            {item.completedAt ? new Date(item.completedAt).toLocaleString('sv-SE') : '-'}
                          </td>
                          <td className="py-1 text-violet-900">
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleString('sv-SE') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {detailStudentViewData.ncmDetail.recentRows.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <h4 className="text-xs font-semibold text-violet-800 mb-1">Senaste NCM-svar (5 senaste)</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-violet-700 border-b border-violet-200">
                        <th className="py-1 pr-2">Tid</th>
                        <th className="py-1 pr-2">Kod</th>
                        <th className="py-1 pr-2">Svar</th>
                        <th className="py-1 pr-2">Facit</th>
                        <th className="py-1 pr-2">Resultat</th>
                        <th className="py-1">Tid/svar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailStudentViewData.ncmDetail.recentRows.slice(0, 5).map((item, index) => (
                        <tr key={`detail-ncm-recent-${item.ncmCode}-${item.timestamp}-${index}`} className="border-b border-violet-100 last:border-b-0">
                          <td className="py-1 pr-2 text-violet-900">{item.timestamp ? new Date(item.timestamp).toLocaleString('sv-SE') : '-'}</td>
                          <td className="py-1 pr-2 text-violet-900 font-medium">{item.ncmCode}</td>
                          <td className="py-1 pr-2 text-violet-900">{item.studentAnswer ?? '-'}</td>
                          <td className="py-1 pr-2 text-violet-900">{item.correctAnswer ?? '-'}</td>
                          <td className={`py-1 pr-2 font-semibold ${item.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {item.correct ? 'Rätt' : 'Fel'}
                          </td>
                          <td className="py-1 text-violet-900">
                            {Number.isFinite(item.speedTimeSec) ? `${item.speedTimeSec.toFixed(1)}s` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  )
}

function NcmMetricCard({ label, value }) {
  return (
    <div className="rounded border border-violet-200 bg-white px-2 py-1.5">
      <p className="text-violet-700">{label}</p>
      <p className="font-semibold text-violet-900">{value}</p>
    </div>
  )
}
