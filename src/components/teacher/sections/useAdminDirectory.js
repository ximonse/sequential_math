import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './adminApi'

// Teacher accounts and every class an administrator may manage, archived ones
// included. Ordinary teachers never call the admin APIs.
export function useAdminDirectory(enabled) {
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])

  const reload = useCallback(async () => {
    if (!enabled) return
    const [teacherResponse, classResponse] = await Promise.all([
      apiFetch('/api/admin/teachers'),
      apiFetch('/api/admin/classes')
    ])
    if (teacherResponse.ok) setTeachers(teacherResponse.data.teachers || [])
    if (classResponse.ok) setClasses(classResponse.data.classes || [])
  }, [enabled])

  useEffect(() => { void reload() }, [reload])

  return { teachers, classes, reload }
}
