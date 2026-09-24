import { useEffect, useState } from 'react'
import { getPilotStudentRuntime } from '../../../lib/pilotStudentRuntime'

const INITIAL_STATUS = Object.freeze({
  state: 'idle',
  pendingCount: 0,
  lastSuccessAt: 0,
  lastErrorAt: 0,
  lastError: ''
})

export function useStudentSyncStatus(studentId) {
  const [status, setStatus] = useState(INITIAL_STATUS)

  useEffect(() => {
    if (!studentId) return undefined
    const runtime = getPilotStudentRuntime()
    setStatus(runtime.getSyncStatus())
    return runtime.subscribeSyncStatus(setStatus)
  }, [studentId])

  return status
}
