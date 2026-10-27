// The caller supplies its authenticated API function; credentials never enter the result.
export async function fetchPupilEvidence(api, { studentId, classId, from, to, source = 'practice' }) {
  const params = new URLSearchParams({ resource: 'evidence', classId, from, to, source, limit: '100' })
  let result
  const cursors = new Set()
  do {
    const page = await api(`/api/teacher-students/${encodeURIComponent(studentId)}?${params}`)
    if (!result) result = { ...page, entries: [] }
    if (result.snapshotRevision !== page.snapshotRevision) throw new Error('Underlaget ändrades under exporten.')
    result.entries.push(...page.entries)
    if (!page.nextCursor) break
    if (cursors.has(page.nextCursor)) throw new Error('Servern upprepade samma sidreferens.')
    cursors.add(page.nextCursor)
    params.set('cursor', page.nextCursor)
    params.set('snapshotRevision', result.snapshotRevision)
  } while (params.has('cursor'))
  if (result.entries.length !== result.total) throw new Error('Ofullständig underlagsexport.')
  return { ...result, nextCursor: null }
}
