// A pupil and a teacher often share one browser. Keeping the choice per role
// stops a pupil's theme from turning up in the teacher dashboard.
export function themeRoleForPath(pathname) {
  return String(pathname || '').startsWith('/teacher') ? 'teacher' : 'student'
}
