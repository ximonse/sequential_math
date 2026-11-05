export async function readEvidenceWindow(request, baseUrl, period, source) {
  const found = [], cursors = new Set()
  let cursor = null, revision = null
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ resource: 'evidence', from: period.from, to: period.to, source, limit: '100',
      ...(cursor ? { cursor, snapshotRevision: revision } : {}) })
    const response = await request(`${baseUrl}&${params}`)
    if (!response.ok) throw new Error(response.data.error || 'Underlaget kunde inte läsas.')
    const data = response.data
    if (!Array.isArray(data.entries) || typeof data.snapshotRevision !== 'string' || (revision && revision !== data.snapshotRevision)
      || data.coverage?.screening?.invalidRecords > 0) throw new Error('Underlaget ändrades eller är ofullständigt. Läs det igen.')
    revision = data.snapshotRevision
    found.push(...data.entries)
    if (data.nextCursor === null) return { entries: found, snapshotRevision: revision }
    if (typeof data.nextCursor !== 'string' || !data.nextCursor || cursors.has(data.nextCursor)) break
    cursors.add(data.nextCursor); cursor = data.nextCursor
  }
  throw new Error('Historiken kunde inte läsas fullständigt. Ingen ny kontroll skapas.')
}
