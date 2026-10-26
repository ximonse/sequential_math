import { useState } from 'react'
import PupilAdministration from './PupilAdministration'
import TeacherAccountsAdmin from './TeacherAccountsAdmin'
import SchoolYearRollover from './SchoolYearRollover'
import { NewSchoolForm } from './SchoolControls'

// Teachers, schools and pupil records: administrator work that is not about
// one class. Role and school boundaries are enforced by the server APIs.
export default function AdminDirectorySection({ teachers, classes, directory, canManageSchools, canRetirePupils, onRefresh, setStatus, testDataPanel }) {
  const tabs = [['teachers', 'Lärare'], ['schools', 'Skolor och läsår'], ...(canRetirePupils ? [['pupils', 'Elevdata']] : []),
    ...(testDataPanel ? [['testdata', 'Testdata']] : [])]
  const [activeTab, setActiveTab] = useState('teachers')
  return (
    <section aria-labelledby="admin-directory-title">
      <h2 id="admin-directory-title" className="text-lg font-semibold text-gray-800">Lärare och skolor</h2>
      <p className="mt-1 text-sm text-gray-600">Lärarkonton, skolor, läsårsbyte och borttagning av elevdata.</p>
      <div role="tablist" aria-label="Lärare och skolor" className="mt-2 flex flex-wrap gap-1">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}
            className={'rounded-lg px-1.5 py-0.5 text-xs font-semibold ' + (activeTab === id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {activeTab === 'teachers' && <TeacherAccountsAdmin teachers={teachers} classes={classes} onRefresh={onRefresh} setStatus={setStatus} />}
        {activeTab === 'schools' && <div className="space-y-3">
          {canManageSchools && <NewSchoolForm directory={directory} />}
          <SchoolYearRollover schools={directory.schools} onCompleted={onRefresh} setStatus={setStatus} />
        </div>}
        {activeTab === 'pupils' && canRetirePupils && <PupilAdministration classes={classes} onRefresh={onRefresh} setStatus={setStatus} />}
        {activeTab === 'testdata' && testDataPanel}
      </div>
    </section>
  )
}
