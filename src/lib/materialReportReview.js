const fail = message => { throw Object.assign(new Error(message), { status: 409, code: 'report_review_changed' }) }

// The API supplies only the authenticated teacher's owned report state.
export function materialReportReview(reference, state, records, modelId, { rebase = false } = {}) {
  if (!reference || Object.keys(reference).some(key => !['studentId', 'reportId', 'hypothesisId', 'checkInRevision', 'reopen'].includes(key))
    || reference.studentId !== state.studentId || typeof reference.reopen !== 'boolean') fail('Ogiltig rapportreferens.')
  const report = state.reports.find(item => item.id === reference.reportId)
  const check = report?.checkIns.at(-1)
  if (!report || reference.checkInRevision !== (check?.revision ?? 0)) fail('Rapportens avstämning har ändrats. Läs rapporten igen.')
  const hypothesis = report.report.hypotheses.find(item => item.id === reference.hypothesisId)
  const sources = records.filter(record => record.basis.studentId === state.studentId)
  if (!hypothesis || hypothesis.basis !== 'rule_candidate' || hypothesis.signalCode !== modelId || !sources.length
    || sources.some(({ basis }) => basis.classId !== state.classId || (!rebase && basis.snapshotRevision !== report.report.snapshotRevision)
      || basis.from !== report.report.period.from || basis.to !== report.report.period.to || (basis.source || 'practice') !== report.report.source)
    || (!rebase && JSON.stringify([...new Set(sources.flatMap(({ basis }) => basis.supportRefs))].sort()) !== JSON.stringify([...hypothesis.supportRefs].sort()))) fail('Rapportreferensen stämmer inte med prövningens stöd.')
  const sourceBindings = []
  if (rebase) {
    for (const field of ['supportRefs', 'counterRefs']) {
      const expected = hypothesis[field], found = sources.flatMap(({ basis, evidence }) => (basis[field] || []).map(ref => evidence.entries.find(entry => entry.ref === ref)))
      if (found.length !== expected.length || found.some(entry => !entry)) fail('Rapportens källsvar saknas i aktuellt underlag.')
      for (const ref of expected) {
        const original = report.report.evidence.find(entry => entry.ref === ref)
        const current = found.find(entry => original && JSON.stringify(entry.reference) === JSON.stringify(original.reference))
        if (!current) fail('Ett ursprungligt källsvar har ändrats. Skapa och granska en ny rapport.')
        sourceBindings.push({ reportRef: ref, currentRef: current.ref })
      }
    }
  }
  const decision = check?.decisions.find(item => item.hypothesisId === hypothesis.id)
  if (['revised', 'rejected'].includes(decision?.decision) && !reference.reopen) fail('Hypotesen är ändrad eller avfärdad. Välj uttryckligen att pröva den ursprungliga modellen igen.')
  return { ...reference, reportVersion: report.version, decision: decision?.decision ?? 'undecided',
    ...(rebase ? { sourceReportSnapshotRevision: report.report.snapshotRevision, sourceBindings } : {}),
    interpretationSv: decision?.interpretationSv ?? '', goalSv: check?.goalSv ?? '', noteSv: check?.noteSv ?? '' }
}
