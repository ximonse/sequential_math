const norm = value => String(value || '').trim().toLocaleLowerCase('sv-SE')

export function selectTeacherPupils(profiles, { pupil, pupilName = p => p.studentId, classQuery, classId, classExact, classes = [] }) {
  if ([classQuery, classId, classExact].filter(value => value !== undefined).length > 1) {
    throw new Error('Använd bara ett av --class, --class-id eller --class-exact.')
  }
  let selectedClassId = classId
  if (classExact !== undefined) {
    const candidates = classes.filter(c => norm(c.name) === norm(classExact))
    if (candidates.length !== 1) throw new Error(candidates.length ? 'Flera klasser har detta namn. Välj --class-id från --list-classes.' : 'Ingen klass har exakt detta namn.')
    selectedClassId = candidates[0].classId
  }
  if (selectedClassId !== undefined && (!/^[A-Za-z0-9_-]{1,128}$/u.test(selectedClassId)
    || !classes.some(c => c.classId === selectedClassId))) throw new Error('Klass-ID saknas eller är inte tillgängligt för läraren.')
  const matches = profiles.filter(p => (!pupil || norm(pupilName(p)).includes(norm(pupil)) || norm(p.studentId) === norm(pupil))
    && (selectedClassId ? [p.classId, ...(p.classIds || [])].includes(selectedClassId)
      : !classQuery || [p.classId, p.className].some(value => norm(value).includes(norm(classQuery)))))
  return { matches, selectedClassId }
}
