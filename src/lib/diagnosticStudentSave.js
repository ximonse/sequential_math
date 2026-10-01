const SAVE_BATCH_SIZE = 20

// Acknowledge each batch separately so a failed later batch remains pending.
export async function savePendingDiagnosticEvents({ attemptId, events, savedSequence, revision, append, onAck }) {
  const pending = events.slice(savedSequence)
  let sequence = savedSequence
  let currentRevision = revision
  for (let offset = 0; offset < pending.length; offset += SAVE_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + SAVE_BATCH_SIZE)
    const result = await append(attemptId, currentRevision, batch)
    if (!result.ok || !Array.isArray(result.ack)
      || !batch.every(event => result.ack.includes(event.eventId))
      || !Number.isInteger(result.serverRevision) || result.serverRevision <= currentRevision) {
      throw new Error(result.error || 'Servern bekräftade inte alla ändringar.')
    }
    currentRevision = result.serverRevision
    sequence += batch.length
    onAck?.({ sequence, revision: currentRevision })
  }
  return { sequence, revision: currentRevision }
}
