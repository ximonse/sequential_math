import { useCallback, useEffect, useState } from 'react'
import {
  createTeacherGroup,
  deleteTeacherGroup,
  loadTeacherGroups,
  updateTeacherGroup
} from './teacherGroupsApi'

export const studentIdOf = student => String(student?.studentId || student?.id || '').trim().toUpperCase()

// Loads the teacher's groups and saves changes. Other views listen for
// 'teacher-groups-updated' to refresh their copy.
export function useTeacherGroups(onStatusChange) {
  const [groups, setGroups] = useState([])
  const [teachers, setTeachers] = useState([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await loadTeacherGroups()
      setGroups(Array.isArray(data.groups) ? data.groups : [])
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
    } catch (error) {
      onStatusChange?.(error.message)
    }
  }, [onStatusChange])

  useEffect(() => { void refresh() }, [refresh])

  const run = async (action, message) => {
    setBusy(true)
    try {
      const result = await action()
      onStatusChange?.(message)
      await refresh()
      window.dispatchEvent(new Event('teacher-groups-updated'))
      return result || true
    } catch (error) {
      onStatusChange?.(error.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const save = (id, payload) => run(
    () => (id ? updateTeacherGroup({ id, ...payload }) : createTeacherGroup(payload)),
    id ? 'Gruppen är uppdaterad.' : 'Gruppen är skapad.'
  )
  const remove = group => (window.confirm(`Ta bort gruppen ${group.name}?`)
    ? run(() => deleteTeacherGroup(group.id), 'Gruppen är borttagen.')
    : Promise.resolve(null))

  return { groups, teachers, busy, save, remove }
}
