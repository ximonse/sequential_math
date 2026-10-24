import { useRef, useState } from 'react'
import { isTeacherAdmin, isTeacherSuperAdmin } from '../../../lib/teacherAuth'
import { apiFetch } from './adminApi'
import AdminDirectorySection from './AdminDirectorySection'
import ClassDangerZone from './ClassDangerZone'
import ClassLoginTab from './ClassLoginTab'
import ClassPupilsTab from './ClassPupilsTab'
import ClassSettingsForm from './ClassSettingsForm'
import StudentCredentialCards from './StudentCredentialCards'
import GroupEditor from './GroupEditor'
import { useTeacherGroups } from './useTeacherGroups'
import { SchoolSelect, useSchools } from './SchoolControls'
import { useAdminDirectory } from './useAdminDirectory'

// Dense teacher workspace: compact controls, separate modules with a clear shadow.
const MODULE = 'rounded-md bg-white px-[21px] py-[19px] shadow-[0_8px_13px_-2px_rgba(15,23,42,0.32)]'
const TAB = 'rounded-md px-1.5 py-0.5 text-sm font-semibold'
const ITEM = 'rounded-md border px-1.5 py-0.5 text-left text-sm'
const ITEM_OFF = 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
const ITEM_ON = 'border-indigo-600 bg-indigo-600 text-white'

function byName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
}

// One place for classes, groups and their pupils. Selecting a class opens its
// tabs; routine work comes first and actions that end or wipe data come last.
export default function ClassesAndPupilsPanel({
  classes,
  students,
  recordMatchesClassFilter,
  onSetAddToClassId,
  rosterInput,
  onSetRosterInput,
  classStatus,
  onAddStudentsToClass,
  onAddExistingStudentsToClass,
  onMoveStudent,
  onOpenStudentDetail,
  onStatusChange,
  onClassesChanged,
  legacyLoginPanel,
  testDataPanel
}) {
  const isAdmin = isTeacherAdmin()
  const isSuperAdmin = isTeacherSuperAdmin()
  const admin = useAdminDirectory(isAdmin)
  const directory = useSchools()
  const groupsState = useTeacherGroups(onStatusChange)
  const [open, setOpen] = useState(null)
  const [tab, setTab] = useState('pupils')
  const [area, setArea] = useState('classes')
  const [showArchived, setShowArchived] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [issuedCredentials, setIssuedCredentials] = useState([])
  const [newClassName, setNewClassName] = useState('')
  const [newClassSchoolId, setNewClassSchoolId] = useState('')
  const busyRef = useRef(false)

  const adminById = new Map(admin.classes.map(record => [String(record.id), record]))
  const listed = [...admin.classes, ...classes.filter(record => !adminById.has(String(record.id)))]
    .filter(record => showArchived || !record.archived)
    .sort(byName)
  const withoutSchool = isAdmin ? listed.filter(record => !record.schoolId) : []
  const withSchool = isAdmin ? listed.filter(record => record.schoolId) : listed
  const schoolName = record => directory.schools.find(school => school.id === record.schoolId)?.name || 'Skola ej angiven'
  const pupilsIn = record => students.filter(student => recordMatchesClassFilter(student, [record.id]))
  const openClass = open?.type === 'class' ? listed.find(record => String(record.id) === open.id) || adminById.get(open.id) : null
  const openGroup = open?.type === 'group' ? groupsState.groups.find(group => String(group.id) === open.id) : null

  const runAction = async action => {
    if (busyRef.current) return undefined
    busyRef.current = true
    setBusy(true)
    try { return await action() } finally { busyRef.current = false; setBusy(false) }
  }
  const showCredentials = credentials => {
    if (Array.isArray(credentials) && credentials.length) setIssuedCredentials(credentials)
  }
  const refreshClasses = async () => {
    await Promise.all([admin.reload(), onClassesChanged?.()])
  }
  const select = (type, id) => {
    setStatus('')
    setOpen({ type, id: String(id) })
    setTab(type === 'class' ? 'pupils' : 'members')
    if (type === 'class') onSetAddToClassId(String(id))
  }

  const createClass = async event => {
    event.preventDefault()
    if (!newClassName.trim()) return
    await runAction(async () => {
      const { ok, data } = await apiFetch('/api/admin/classes', {
        method: 'POST',
        body: JSON.stringify({ name: newClassName.trim(), schoolId: newClassSchoolId })
      })
      if (!ok) { setStatus(data?.error || 'Kunde inte skapa klass'); return }
      setStatus('✓ Klass "' + newClassName.trim() + '" skapad')
      setNewClassName('')
      await refreshClasses()
    })
  }

  const classButton = record => {
    const selected = open?.type === 'class' && open.id === String(record.id)
    return (
      <button key={record.id} type="button" aria-pressed={selected} onClick={() => select('class', record.id)}
        className={`${ITEM} ${selected ? ITEM_ON : ITEM_OFF}`}>
        <span className="font-semibold">{record.name}</span>{' '}
        <span className={`ml-2 text-xs ${selected ? 'text-indigo-100' : 'text-gray-500'}`}>
          {pupilsIn(record).length} elever{isAdmin ? ` · ${schoolName(record)}` : ''}{record.archived ? ' · arkiverad' : ''}
        </span>
      </button>
    )
  }

  const classTabs = [
    ['pupils', 'Elever'],
    ['login', 'Inloggning och kort'],
    ...(isAdmin && openClass && adminById.has(String(openClass.id)) ? [['settings', 'Inställningar']] : []),
    ...(isAdmin || isSuperAdmin ? [['danger', 'Farliga åtgärder']] : [])
  ]
  const groupTabs = [['members', 'Elever och lärare'], ['danger', 'Farliga åtgärder']]
  const tabs = openClass ? classTabs : open?.type === 'group' || open?.type === 'new-group' ? (openGroup ? groupTabs : groupTabs.slice(0, 1)) : []

  return (
    <div className="mb-8 flex flex-col gap-5">
      {isAdmin && <div role="tablist" aria-label="Administration" className="flex flex-wrap gap-1">
        {[['classes', 'Klasser och elever'], ['directory', 'Lärare och skolor']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={area === id} onClick={() => { setArea(id); setStatus('') }}
            className={TAB + ' ' + (area === id ? 'bg-slate-800 text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50')}>
            {label}
          </button>
        ))}
      </div>}
      {(busy || status || (area === 'classes' && classStatus)) && <p role="status" className="-my-2 text-xs text-gray-700">
        {busy ? 'Sparar på servern…' : status || classStatus}</p>}

      {area === 'directory' && isAdmin && <div className={MODULE}><AdminDirectorySection teachers={admin.teachers} classes={admin.classes} directory={directory}
        canManageSchools={isSuperAdmin} canRetirePupils={isSuperAdmin} onRefresh={refreshClasses} setStatus={setStatus} testDataPanel={testDataPanel} /></div>}

      {area === 'classes' && <>
      <section aria-labelledby="class-list-heading" className={MODULE}>
      <h2 id="class-list-heading" className="text-lg font-semibold text-gray-800">Klasser och grupper</h2>

      {withoutSchool.length > 0 && (
        <section data-classes-without-school aria-labelledby="classes-without-school" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <h3 id="classes-without-school" className="text-sm font-semibold text-amber-900">Utan skola ({withoutSchool.length})</h3>
          <p className="text-xs text-amber-900">De här klasserna saknar skola. Öppna klassen och välj skola under Inställningar.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{withoutSchool.map(classButton)}</div>
        </section>
      )}

      <section aria-labelledby="class-list-title" className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="class-list-title" className="text-sm font-semibold text-gray-800">Klasser</h3>
          {isAdmin && <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />
            Visa arkiverade klasser
          </label>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {withSchool.map(classButton)}
          {listed.length === 0 && <p className="text-xs text-gray-500">Inga klasser att visa.</p>}
          {listed.length > 0 && withSchool.length === 0 && <p className="text-xs text-gray-500">Alla klasser ligger under Utan skola ovan.</p>}
        </div>
      </section>

      <section aria-labelledby="group-list-title" className="mt-3">
        <h3 id="group-list-title" className="text-sm font-semibold text-gray-800">Grupper</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {groupsState.groups.map(group => {
            const selected = open?.type === 'group' && open.id === String(group.id)
            return (
              <button key={group.id} type="button" aria-pressed={selected} onClick={() => select('group', group.id)}
                className={`${ITEM} ${selected ? ITEM_ON : ITEM_OFF}`}>
                <span className="font-semibold">{group.name}</span>{' '}
                <span className={`ml-2 text-xs ${selected ? 'text-indigo-100' : 'text-gray-500'}`}>{(group.pupilIds || []).length} elever</span>
              </button>
            )
          })}
          <button type="button" aria-pressed={open?.type === 'new-group'} onClick={() => { setOpen({ type: 'new-group', id: '' }); setTab('members') }}
            className={`${ITEM} ${open?.type === 'new-group' ? ITEM_ON : 'border-dashed border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
            + Ny grupp
          </button>
        </div>
      </section>

      </section>

      {issuedCredentials.length > 0 && <div className={MODULE}><StudentCredentialCards credentials={issuedCredentials} title="Nya elevkort"
        onClear={() => { setIssuedCredentials([]); setStatus('Elevkorten har tagits bort från vyn.') }} /></div>}

      {open && tabs.length > 0 && (
        <section data-open-item aria-labelledby="open-item-title" className={MODULE}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="open-item-title" className="text-lg font-semibold text-gray-900">
              {openClass ? openClass.name : openGroup ? `Grupp: ${openGroup.name}` : 'Ny grupp'}
            </h2>
            <button type="button" onClick={() => setOpen(null)} className="rounded-md border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-50">Stäng</button>
          </div>
          <div role="tablist" aria-label={openClass ? `Klass ${openClass.name}` : 'Grupp'} className="mt-2 flex flex-wrap gap-1 border-b border-gray-200 pb-2">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={TAB + ' ' + (tab === id
                  ? (id === 'danger' ? 'bg-rose-700 text-white' : 'bg-indigo-600 text-white')
                  : (id === 'danger' ? 'ml-auto bg-rose-50 text-rose-800 hover:bg-rose-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'))}>
                {label}
              </button>
            ))}
          </div>
          <fieldset disabled={busy} aria-busy={busy} className="mt-3">
            {openClass && tab === 'pupils' && <ClassPupilsTab classRecord={openClass} classes={listed} students={students}
              classStudents={pupilsIn(openClass)} recordMatchesClassFilter={recordMatchesClassFilter}
              rosterInput={rosterInput} onSetRosterInput={onSetRosterInput} onAddStudentsToClass={onAddStudentsToClass}
              onAddExistingStudentsToClass={onAddExistingStudentsToClass} onMoveStudent={onMoveStudent}
              onOpenStudentDetail={onOpenStudentDetail} onCredentials={showCredentials} runAction={runAction} />}
            {openClass && tab === 'login' && <ClassLoginTab classStudents={pupilsIn(openClass)} />}
            {openClass && tab === 'settings' && adminById.has(String(openClass.id)) && <ClassSettingsForm key={openClass.id}
              classRecord={adminById.get(String(openClass.id))} teachers={admin.teachers} directory={directory}
              onSaved={() => { void refreshClasses() }} setStatus={setStatus} />}
            {openClass && tab === 'danger' && <ClassDangerZone classRecord={adminById.get(String(openClass.id)) || openClass}
              canArchive={isAdmin && adminById.has(String(openClass.id))} canDelete={isSuperAdmin} canResetAccounts={isSuperAdmin}
              onCredentials={showCredentials} setStatus={setStatus} runAction={runAction}
              onChanged={action => { if (action === 'delete') setOpen(null); void refreshClasses() }} />}
            {(open.type === 'group' || open.type === 'new-group') && tab === 'members' && <GroupEditor key={open.id || 'new'}
              group={openGroup} students={students} teachers={groupsState.teachers} busy={groupsState.busy}
              onSave={async payload => {
                const saved = await groupsState.save(openGroup?.id || '', payload)
                if (saved && !openGroup) setOpen(null)
              }} />}
            {openGroup && tab === 'danger' && <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs">
              <p className="font-semibold text-rose-900">Ta bort gruppen</p>
              <p className="mt-1 text-rose-900">Eleverna finns kvar i sina klasser. Uppdrag som bara var aktiva för gruppen slutar gälla.</p>
              <button type="button" disabled={groupsState.busy} onClick={async () => { if (await groupsState.remove(openGroup)) setOpen(null) }}
                className="mt-2 rounded bg-rose-700 px-1.5 py-0.5 font-semibold text-white disabled:opacity-50">Ta bort grupp</button>
            </div>}
          </fieldset>
        </section>
      )}

      {isAdmin && (
        <section data-new-class aria-labelledby="new-class-title" className={MODULE}>
        <h2 id="new-class-title" className="text-lg font-semibold text-gray-800">Skapa ny klass</h2>
        <form onSubmit={createClass} className="mt-2 flex flex-wrap items-end gap-2 text-xs">
          <div className="min-w-40 flex-1">
            <SchoolSelect schools={directory.schools} value={newClassSchoolId} onChange={setNewClassSchoolId}
              disabled={directory.loading || Boolean(directory.error)} label="Skola för ny klass" />
          </div>
          <label className="min-w-40 flex-1 text-sm text-gray-700">
            <span className="mb-1 block">Klassnamn</span>
            <input required placeholder="Klassnamn (t.ex. 4A)" value={newClassName}
              onChange={event => setNewClassName(event.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <button disabled={busy} type="submit" className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-sm font-semibold text-white disabled:opacity-50">Skapa klass</button>
        </form>
        </section>
      )}
      {legacyLoginPanel}
      </>}
    </div>
  )
}
