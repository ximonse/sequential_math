const fail = message => { throw Object.assign(new Error(message), { status: 409, code: 'report_review_changed' }) }

// The API supplies only the authenticated teacher's owned report state.
export function materialReportReview(reference, state, records, modelId) {
  if (!reference || Object.keys(reference).some(key => !['studentId', 'reportId', 'hypothesisId', 'checkInRevision', 'reopen'].includes(key))
    || reference.studentId !== state.studentId || typeof reference.reopen !== 'boolean') fail('Ogiltig rapportreferens.')
  const report = state.reports.find(item => item.id === reference.reportId)
  const check = report?.checkIns.at(-1)
  if (!report || reference.checkInRevision !== (check?.revision ?? 0)) fail('Rapportens avstämning har ändrats. Läs rapporten igen.')
  const hypothesis = report.report.hypotheses.find(item => item.id === reference.hypothesisId)
  const sources = records.filter(record => record.basis.studentId === state.studentId)
  if (!hypothesis || hypothesis.basis !== 'rule_candidate' || hypothesis.signalCode !== modelId || !sources.length
    || sources.some(({ basis }) => basis.classId !== state.classId || basis.snapshotRevision !== report.report.snapshotRevision
      || basis.from !== report.report.period.from || basis.to !== report.report.period.to || (basis.source || 'practice') !== report.report.source)
    || JSON.stringify([...new Set(sources.flatMap(({ basis }) => basis.supportRefs))].sort()) !== JSON.stringify([...hypothesis.supportRefs].sort())) fail('Rapportreferensen stämmer inte med prövningens stöd.')
  const decision = check?.decisions.find(item => item.hypothesisId === hypothesis.id)
  if (['revised', 'rejected'].includes(decision?.decision) && !reference.reopen) fail('Hypotesen är ändrad eller avfärdad. Välj uttryckligen att pröva den ursprungliga modellen igen.')
  return { ...reference, reportVersion: report.version, decision: decision?.decision ?? 'undecided',
    interpretationSv: decision?.interpretationSv ?? '', goalSv: check?.goalSv ?? '', noteSv: check?.noteSv ?? '' }
}
