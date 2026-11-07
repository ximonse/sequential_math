// Who a screening went to, in words (Simon 2026-11-07): name the pupils instead of
// "1 elev". The assignment stores only pupil ids, so a class counts as whole when
// every pupil on its current roster received the screening.
const SHOWN_NAMES = 3

export function describeRecipients(collection, { students = [], classNames = new Map() } = {}) {
  const parts = collection.members.map(member => {
    const classId = String(member.classId)
    const className = classNames.get(classId) || 'Klass'
    const ids = member.studentIds || []
    const roster = students.filter(student => [student.classId, ...(student.classIds || [])].map(String).includes(classId))
    const whole = !member.studentIds || (roster.length > 0 && roster.every(student => ids.includes(student.studentId)))
    const names = ids.map(id => {
      const pupil = students.find(student => student.studentId === id)
      return pupil?.name || pupil?.displayAlias || 'Elev som inte längre finns'
    })
    return { className, whole, names }
  })
  const short = parts.map(({ className, whole, names }) => {
    if (whole) return `Hela ${className}`
    const shown = names.slice(0, SHOWN_NAMES).join(', ')
    return `${names.length > SHOWN_NAMES ? `${shown} +${names.length - SHOWN_NAMES} till` : shown} (${className})`
  }).join(' · ')
  const full = parts.map(({ className, whole, names }) => `${className}${whole ? ' (hela klassen)' : ''}: ${names.join(', ')}`).join('\n')
  return { short, full }
}
