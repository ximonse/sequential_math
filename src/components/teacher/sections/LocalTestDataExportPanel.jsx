import { useEffect, useState } from 'react'
import { getAllProfilesWithSync } from '../../../lib/storage'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import LocalTestDataPanel from './LocalTestDataPanel'

export default function LocalTestDataExportPanel() {
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [status, setStatus] = useState('Läser klasser och elever…')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const token = getTeacherApiToken()
        const [response, profiles] = await Promise.all([
          fetch('/api/teacher-classes', { headers: { 'x-teacher-token': token }, cache: 'no-store' }),
          getAllProfilesWithSync()
        ])
        if (!response.ok) throw new Error('Kunde inte läsa klasserna.')
        const data = await response.json()
        if (!active) return
        setClasses(Array.isArray(data.classes) ? data.classes : [])
        setStudents(profiles)
        setStatus('')
      } catch (error) {
        if (active) setStatus(error.message || 'Kunde inte läsa klasserna och eleverna.')
      }
    }
    void load()
    return () => { active = false }
  }, [])

  return <div className="mt-6">
    <LocalTestDataPanel mode="export" classes={classes} students={students} />
    {status && <p role="status" className="mt-2 text-sm text-slate-600">{status}</p>}
  </div>
}
