/**
 * Administration for teacher accounts and classes.
 * Role and school boundaries are enforced by the server APIs.
 */
import { useEffect, useState } from 'react'
import ClassAdministration from './ClassAdministration'
import PupilAdministration from './PupilAdministration'
import TeacherAccountsAdmin from './TeacherAccountsAdmin'
import { apiFetch } from './adminApi'
import { isTeacherSuperAdmin } from '../../../lib/teacherAuth'
import { fillTeacherPupilLabelsFromCreationNames } from '../../../lib/teacherPupilLabels'

export default function TeacherAdminPanel() {
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [status, setStatus] = useState('')
  const [activeTab, setActiveTab] = useState('teachers')
  const [fillingLabels, setFillingLabels] = useState(false)

  const load = async () => {
    const [teacherResponse, classResponse] = await Promise.all([
      apiFetch('/api/admin/teachers'),
      apiFetch('/api/admin/classes')
    ])
    if (teacherResponse.ok) setTeachers(teacherResponse.data.teachers || [])
    if (classResponse.ok) setClasses(classResponse.data.classes || [])
  }

  useEffect(() => { void load() }, [])

  // Pupils show their code name until this teacher has a private label. The
  // name typed when creating them is already on the record, so reuse it.
  const showCreationNames = async () => {
    setFillingLabels(true)
    const result = await fillTeacherPupilLabelsFromCreationNames()
    setFillingLabels(false)
    if (!result.ok) { setStatus(result.error || 'Kunde inte hämta tilltalsnamnen.'); return }
    setStatus(result.added > 0
      ? `✓ ${result.added} tilltalsnamn visas nu i dina vyer. Ladda om sidan för att se dem.`
      : 'Alla elever du kommer åt har redan ett tilltalsnamn.')
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={showCreationNames} disabled={fillingLabels}
            title="Använder namnet du skrev när eleverna skapades. Namnen är privata för ditt konto."
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:bg-gray-100 disabled:text-gray-400">
            {fillingLabels ? 'Hämtar…' : 'Visa tilltalsnamn'}
          </button>
          {['teachers', 'classes', ...(isTeacherSuperAdmin() ? ['pupils'] : [])].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={'px-3 py-1.5 text-xs font-semibold rounded-lg ' + (activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {tab === 'teachers' ? 'Lärare' : tab === 'classes' ? 'Klasser' : 'Elever'}
            </button>
          ))}
        </div>
      </div>
      {status && <div className={'mb-3 px-3 py-2 rounded text-xs ' + (status.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{status}</div>}
      {activeTab === 'teachers' && <TeacherAccountsAdmin teachers={teachers} onRefresh={load} setStatus={setStatus} />}
      {activeTab === 'classes' && <ClassAdministration classes={classes} teachers={teachers} onRefresh={load} setStatus={setStatus} />}
      {activeTab === 'pupils' && isTeacherSuperAdmin() && <PupilAdministration classes={classes} onRefresh={load} setStatus={setStatus} />}
    </div>
  )
}
