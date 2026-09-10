/**
 * Admin-panel för att hantera lärarkonton och klasser.
 * Visas bara för adminanvändare (isAdmin === true).
 */
import { useEffect, useState } from 'react'
import ClassAdministration from './ClassAdministration'
import TeacherAccountsAdmin from './TeacherAccountsAdmin'
import { apiFetch } from './adminApi'

export default function TeacherAdminPanel() {
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [status, setStatus] = useState('')
  const [activeTab, setActiveTab] = useState('teachers')

  const load = async () => {
    const [teacherResponse, classResponse] = await Promise.all([apiFetch('/api/admin/teachers'), apiFetch('/api/admin/classes')])
    if (teacherResponse.ok) setTeachers(teacherResponse.data.teachers || [])
    if (classResponse.ok) setClasses(classResponse.data.classes || [])
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
        <div className="flex gap-2">
          {['teachers', 'classes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={'px-3 py-1.5 text-xs font-semibold rounded-lg ' + (activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {tab === 'teachers' ? 'Lärare' : 'Klasser'}
            </button>
          ))}
        </div>
      </div>
      {status && <div className={'mb-3 px-3 py-2 rounded text-xs ' + (status.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{status}</div>}
      {activeTab === 'teachers' && <TeacherAccountsAdmin teachers={teachers} onRefresh={load} setStatus={setStatus} />}
      {activeTab === 'classes' && <ClassAdministration classes={classes} teachers={teachers} onRefresh={load} setStatus={setStatus} />}
    </div>
  )
}
