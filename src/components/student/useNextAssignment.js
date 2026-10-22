import { useEffect, useState } from 'react'
import { fetchStudentActiveAssignments } from '../../lib/studentSessionClient'
import { nextUndoneAssignment } from '../../lib/assignmentQueue'

// The oldest assignment still to do, fetched once a finished assignment asks for it.
export function useNextAssignment(profile, currentId, enabled) {
  const [next, setNext] = useState(null)
  useEffect(() => {
    if (!enabled || !profile) { setNext(null); return undefined }
    let active = true
    void fetchStudentActiveAssignments().then(result => {
      if (active) setNext(result.ok ? nextUndoneAssignment(profile, result.assignments, currentId) : null)
    })
    return () => { active = false }
  }, [enabled, profile, currentId])
  return next
}
