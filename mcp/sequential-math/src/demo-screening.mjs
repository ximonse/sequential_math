import { recordDiagnosticGridEvent as record } from '../../../src/domains/arithmetic/diagnosticGridModel.js'

// Synthetic data only, passed through real authenticated assignment/attempt APIs.
// The ordinary demo retains its teacher role and screening denial checks.
export async function seedScreeningDemo(baseUrl, teacher, pupil) {
  async function request(path, body, headers = {}) {
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl, ...headers }, body: JSON.stringify(body) })
    const data = await response.json()
    if (!response.ok) throw new Error(`Synthetic screening setup failed (${response.status})`)
    return { data, response }
  }
  const { data: login } = await request('/api/teacher-login', teacher)
  const { data: created } = await request('/api/teacher-diagnostic-assignments', {
    classId: pupil.classId, studentIds: [pupil.studentId], titleSv: 'Syntetisk subtraktionsgranskning',
    taskIds: ['sub-through-zero-001', 'sub-no-exchange-001']
  }, { 'x-teacher-token': login.token })
  const signedIn = await request('/api/student-session', { loginCode: pupil.loginCode, pin: pupil.pin })
  const headers = { Cookie: signedIn.response.headers.get('set-cookie').split(';')[0], 'x-csrf-token': signedIn.data.csrfToken }
  for (const [index, item] of created.assignment.items.entries()) {
    const { data: opened } = await request('/api/me/diagnostic-attempt', { action: 'open',
      assignmentId: created.assignment.assignmentId, assignmentItemId: item.assignmentItemId }, headers)
    let grid = opened.snapshot
    const write = (row, column, after, layer = 'main') => {
      grid = record(grid, { type: 'write', position: { row, column }, layer,
        before: grid.cells[`${row}:${column}`]?.[layer] || '', after }, Date.now())
    }
    // First original deliberately leaves the answer field empty despite visible work.
    const rows = index === 0 ? ['402', '178', '376'] : ['764', '231', '533']
    rows.forEach((digits, row) => [...digits].forEach((digit, column) => write(row, column + 1, digit)))
    write(1, 0, '−')
    if (index === 0) {
      write(0, 2, '10', 'note')
      grid = record(grid, { type: 'cross_out', position: { row: 0, column: 2 }, before: false, after: true }, Date.now())
    } else grid = record(grid, { type: 'answer_change', before: '', after: '533' }, Date.now())
    grid = record(grid, { type: 'line_add', axis: 'horizontal', placement: 'grid-border',
      from: { row: 1, column: 0 }, to: { row: 1, column: 3 } }, Date.now())
    await request('/api/me/diagnostic-attempt', { action: 'append', attemptId: opened.record.attemptId,
      expectedRevision: opened.record.serverRevision, events: grid.events }, headers)
  }
}
