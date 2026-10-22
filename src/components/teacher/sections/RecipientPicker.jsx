import { useState } from 'react'

const SEARCH_LIMIT = 8
const BUTTON_BASE = 'rounded-md border px-2.5 py-1 text-sm'
const BUTTON_OFF = 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
const BUTTON_ON = 'bg-indigo-600 text-white border-indigo-600'

const keyOf = (value) => String(value ?? '')
const normalize = (value) => keyOf(value).trim().toLowerCase()

// Counts distinct pupils covered by the selection: members of selected classes,
// pupils in selected groups and individually selected pupils (deduplicated).
export function countRecipientPupils(recipients = [], { groups = [], students = [] } = {}) {
  const selectedClassIds = new Set()
  const selectedGroupIds = new Set()
  const selectedStudentIds = new Set()
  for (const recipient of recipients) {
    if (recipient.type === 'class') selectedClassIds.add(keyOf(recipient.id))
    else if (recipient.type === 'group') selectedGroupIds.add(keyOf(recipient.id))
    else if (recipient.type === 'student') selectedStudentIds.add(normalize(recipient.id))
  }

  const covered = new Set()
  if (selectedClassIds.size > 0) {
    for (const student of students) {
      const inClass =
        selectedClassIds.has(keyOf(student.classId)) ||
        (student.classIds ?? []).some((classId) => selectedClassIds.has(keyOf(classId)))
      if (inClass) covered.add(normalize(student.studentId))
    }
  }
  for (const group of groups) {
    if (!selectedGroupIds.has(keyOf(group.id))) continue
    for (const pupilId of group.pupilIds ?? []) covered.add(normalize(pupilId))
  }
  for (const studentId of selectedStudentIds) covered.add(studentId)

  return covered.size
}

export default function RecipientPicker({
  classes = [],
  groups = [],
  students = [],
  recipients = [],
  onChange,
  followsFilter = false,
}) {
  const [query, setQuery] = useState('')

  const isSelected = (type, id) =>
    recipients.some((recipient) => recipient.type === type && keyOf(recipient.id) === keyOf(id))

  const toggle = (type, id) => {
    const next = isSelected(type, id)
      ? recipients.filter((recipient) => !(recipient.type === type && keyOf(recipient.id) === keyOf(id)))
      : [...recipients, { type, id: keyOf(id) }]
    onChange(next)
  }

  const addStudent = (student) => {
    onChange([...recipients, { type: 'student', id: keyOf(student.studentId) }])
    setQuery('')
  }

  const trimmedQuery = normalize(query)
  const results =
    trimmedQuery.length >= 1
      ? students
          .filter((student) => normalize(student.name).includes(trimmedQuery) && !isSelected('student', student.studentId))
          .slice(0, SEARCH_LIMIT)
      : []

  const studentNameById = new Map(students.map((student) => [keyOf(student.studentId), student.name]))
  const selectedStudents = recipients.filter((recipient) => recipient.type === 'student')

  const pupilCount = countRecipientPupils(recipients, { groups, students })
  let summary
  if (recipients.length === 0) summary = 'Ingen mottagare vald.'
  else if (pupilCount === 1) summary = '1 elev totalt'
  else summary = `${pupilCount} elever totalt`

  return (
    <section
      data-recipient-picker
      aria-labelledby="recipient-picker-title"
      className="bg-white rounded-lg shadow p-3 mb-3"
    >
      <h3 id="recipient-picker-title" className="text-sm font-semibold text-slate-800">
        Mottagare
      </h3>
      {followsFilter ? (
        <p className="text-xs text-slate-500 mt-0.5">
          Följer klassfiltret ovan. Välj här för att dela ut till andra.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {classes.map((cls) => {
          const selected = isSelected('class', cls.id)
          return (
            <button
              key={`class-${cls.id}`}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle('class', cls.id)}
              className={`${BUTTON_BASE} ${selected ? BUTTON_ON : BUTTON_OFF}`}
            >
              {cls.name}
            </button>
          )
        })}
        {groups.map((group) => {
          const selected = isSelected('group', group.id)
          return (
            <button
              key={`group-${group.id}`}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle('group', group.id)}
              className={`${BUTTON_BASE} ${selected ? BUTTON_ON : BUTTON_OFF}`}
            >
              {`Grupp: ${group.name}`}
            </button>
          )
        })}
      </div>

      <div className="mt-2">
        <input
          type="search"
          aria-label="Sök elev"
          placeholder="Sök elev …"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-sm"
        />
        {results.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {results.map((student) => (
              <button
                key={`result-${student.studentId}`}
                type="button"
                aria-label={`Lägg till ${student.name}`}
                onClick={() => addStudent(student)}
                className={`${BUTTON_BASE} ${BUTTON_OFF}`}
              >
                {student.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedStudents.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedStudents.map((recipient) => {
            const name = studentNameById.get(keyOf(recipient.id)) ?? keyOf(recipient.id)
            return (
              <span
                key={`chip-${recipient.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-800 px-2.5 py-0.5 text-sm"
              >
                {name}
                <button
                  type="button"
                  aria-label={`Ta bort ${name}`}
                  onClick={() => toggle('student', recipient.id)}
                  className="leading-none text-indigo-600 hover:text-indigo-900"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 mt-2">
        <p data-recipient-summary className="text-xs text-slate-600">
          {summary}
        </p>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={recipients.length === 0}
          className={`${BUTTON_BASE} ${BUTTON_OFF} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Rensa
        </button>
      </div>
    </section>
  )
}
