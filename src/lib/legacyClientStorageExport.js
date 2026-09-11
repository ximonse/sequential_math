const LEGACY_CLASS_KEY = 'mathapp_classes_v1'
const LEGACY_PREFIXES = ['mathapp_student_', 'mathapp_students_list', 'mathapp_assignments', 'mathapp_active_assignment', 'mathapp_ticket_templates_v1', 'mathapp_ticket_dispatches_v1', 'mathapp_wal_', 'mathapp_pending_']

function isLegacyBusinessKey(key) {
  return key === LEGACY_CLASS_KEY || LEGACY_PREFIXES.some(prefix => key.startsWith(prefix))
}

export function collectLegacyBusinessStorage(storage = window.localStorage) {
  const records = {}
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || !isLegacyBusinessKey(key)) continue
    records[key] = storage.getItem(key)
  }
  return { schemaVersion: 1, exportedAt: Date.now(), records }
}

export function downloadLegacyBusinessStorage(exportData = collectLegacyBusinessStorage()) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `matematik-legacy-backup-${new Date(exportData.exportedAt).toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  return exportData
}

export function hasLegacyClassStorage(storage = window.localStorage) {
  try { return storage.getItem(LEGACY_CLASS_KEY) !== null } catch { return false }
}
