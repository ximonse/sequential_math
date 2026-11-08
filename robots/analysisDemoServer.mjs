// Local demo of the pupil analysis: one class with constructed practice answers.
// Same in-memory database as the robots, so nothing here reaches production.
process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = ''
const { startRobotServer } = await import('./robotServer.mjs')

const add = (a, b, answer, level = 4) => ({ operation: 'addition', domain: 'arithmetic', skill: 'addition', problemType: 'addition_A',
  level, values: { a, b }, promptText: `${a} + ${b}`, studentAnswer: answer, correctAnswer: a + b })
const sub = (a, b, answer, level = 4) => ({ operation: 'subtraction', domain: 'arithmetic', skill: 'subtraction', problemType: 'subtraction_A',
  level, values: { a, b }, promptText: `${a} − ${b}`, studentAnswer: answer, correctAnswer: a - b })
const mul = (a, b, answer, level = 2) => ({ operation: 'multiplication', domain: 'arithmetic', skill: 'multiplication', problemType: 'multiplication_A',
  level, values: { a, b }, promptText: `${a} · ${b}`, studentAnswer: answer, correctAnswer: a * b })
const frac = (text, answer, key, level = 7) => ({ operation: 'fractions', domain: 'fractions', skill: 'fractions', problemType: 'fractions',
  level, promptText: text, studentAnswer: answer, correctAnswer: key })

const PUPILS = {
  'Testelev A': [
    add(4, 88, 82), add(9, 69, 68), add(27, 35, 62), add(3, 58, 51), add(45, 6, 41), add(48, 7, 55),
    add(9, 54, 53), add(6, 89, 85), add(69, 8, 67), add(23, 14, 37, 2), add(43, 21, 6, 2), add(22, 17, 3, 2),
    add(357, 268, 525, 6), add(27, 58, 58), mul(7, 8, 48), mul(6, 7, 42),
    frac('1/3 + 1/4', '2/7', '7/12'), frac('2/5 + 1/3', '3/8', '11/15'), frac('3/4 − 1/3', '2/1', '5/12'),
    frac('1/2 + 1/3', '5/6', '5/6'), frac('2/3 × 6', '12/18', '4', 9)
  ],
  'Testelev B': [
    sub(72, 38, 46), sub(53, 27, 34), sub(81, 45, 44), sub(64, 29, 45), sub(90, 46, 56), sub(75, 23, 52, 2),
    sub(62, 18, 44), add(34, 25, 59, 2), add(46, 37, 83), mul(4, 6, 24)
  ],
  'Testelev C': [
    add(46, 37, 83), add(58, 27, 85), sub(72, 38, 34), sub(64, 29, 35), mul(7, 8, 56), mul(6, 9, 54),
    frac('1/3 + 1/4', '7/12', '7/12'), add(39, 45, 84)
  ]
}

async function post(url, action, body) {
  const response = await fetch(`${url}/__robot/${action}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!data.ok) throw new Error(`${action} failed: ${JSON.stringify(data)}`)
  return data
}

const port = Number(process.env.ROBOT_PORT || 5288)
const { url } = await startRobotServer({ port })
const names = Object.keys(PUPILS)
const { pupils } = await post(url, 'seed', { classId: 'demo-6b', className: 'Testklass 6B', pupils: names,
  operations: ['addition', 'subtraction', 'multiplication', 'fractions'] })
for (const [index, pupil] of pupils.entries()) await post(url, 'seed-practice-log', { studentId: pupil.studentId, rows: PUPILS[names[index]] })
const teacher = await post(url, 'teacher', { id: 'demo-admin', classIds: ['demo-6b'], role: 'super_admin' })
console.log(`\nAppen: ${url}/teacher`)
console.log(`Lärare: ${teacher.username} / ${teacher.password}`)
for (const [index, pupil] of pupils.entries()) {
  console.log(`${names[index]}: elevprofil ${url}/teacher/student/${pupil.studentId} · elevinloggning "${pupil.loginCode}", PIN ${pupil.pin}`)
}
console.log('Ctrl+C avslutar och tömmer databasen.\n')
