import { useEffect, useState } from 'react'
import { getSyncHealth, subscribeSyncHealth } from '../../../lib/storage'
import { getPilotStudentRuntime } from '../../../lib/pilotStudentRuntime'

const INITIAL_STATUS = Object.freeze({
  state: 'idle',
  pendingCount: 0,
  lastSuccessAt: 0,
  lastErrorAt: 0,
  lastError: ''
})

export function useStudentSyncStatus(studentId, isPilotStudent) {
  const [status, setStatus] = useState(INITIAL_STATUS)

  useEffect(() => {
    if (!studentId) return undefined
    if (isPilotStudent) {
      const runtime = getPilotStudentRuntime()
      setStatus(runtime.getSyncStatus())
      return runtime.subscribeSyncStatus(setStatus)
    }

    const readStatus = () => setStatus(getSyncHealth(studentId))
    readStatus()
    return subscribeSyncHealth(readStatus)
  }, [studentId, isPilotStudent])

  return status
}
