import { useState } from 'react'
import PupilAdministration from './PupilAdministration'
import TeacherAccountsAdmin from './TeacherAccountsAdmin'
import SchoolYearRollover from './SchoolYearRollover'
import { NewSchoolForm } from './SchoolControls'

// Teachers, schools and pupil records: administrator work that is not about
// one class. Role and school boundaries are enforced by the server APIs.
export default function AdminDirectorySection({ teachers, classes, directory, canManageSchools, canRetirePupils, onRefresh, setStatus }) {
  const tabs = [['teachers', 'Lärare'], ['schools', 'Skolor och läsår'], ...(canRetirePupils ? [['pupils', 'Elevdata']] : [])]
  const [activeTab, setActiveTab] = useState('teachers')
  return (
    <section aria-labelledby="admin-directory-title" className="mt-6 border-t border-gray-200 pt-4">
      <h3 id="admin-directory-title" className="text-base font-semibold text-gray-800">Lärare, skolor och elevdata</h3>
      <div role="tablist" aria-label="Administration" className="mt-2 flex flex-wrap gap-1">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}
            className={'rounded-lg px-3 py-1.5 text-xs font-semibold ' + (activeTab === id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {activeTab === 'teachers' && <TeacherAccountsAdmin teachers={teachers} onRefresh={onRefresh} setStatus={setStatus} />}
        {activeTab === 'schools' && <div className="space-y-3">
          {canManageSchools && <NewSchoolForm directory={directory} />}
          <SchoolYearRollover schools={directory.schools} onCompleted={onRefresh} setStatus={setStatus} />
        </div>}
        {activeTab === 'pupils' && canRetirePupils && <PupilAdministration classes={classes} onRefresh={onRefresh} setStatus={setStatus} />}
      </div>
    </section>
  )
}
