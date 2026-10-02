import { replayDiagnosticGrid } from '../domains/arithmetic/diagnosticGridModel.js'

function sharedPrefix(left, right) {
  let index = 0
  while (index < left.length && index < right.length
    && JSON.stringify(left[index]) === JSON.stringify(right[index])) index += 1
  return index
}

// A local draft can only resume automatically when its saved server prefix is
// identical. Divergent work stays visible on this device and must not be sent.
export function recoverDiagnosticDraft(serverSnapshot, localSnapshot) {
  const server = replayDiagnosticGrid(serverSnapshot)
  if (!localSnapshot) return { snapshot: server, conflict: false }
  const local = replayDiagnosticGrid(localSnapshot)
  if (local.attemptId !== server.attemptId || local.taskId !== server.taskId
    || local.taskVersion !== server.taskVersion || local.rows !== server.rows
    || local.columns !== server.columns) {
    throw new Error('Den lokala arbetskopian hör inte till det här räknehäftet.')
  }
  const prefix = sharedPrefix(server.events, local.events)
  if (prefix === local.events.length) return { snapshot: server, conflict: false }
  if (prefix === server.events.length) return { snapshot: local, conflict: false }
  return { snapshot: local, conflict: true }
}
