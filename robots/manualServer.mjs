// Starts the robot server and seeds two classes, a group and an admin teacher,
// so the teacher view and screening can be clicked through by hand. The
// allowlist is left empty on purpose: any pupil in the class can be picked.
// Same in-memory database as the robots, so nothing here reaches production.
process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = ''

const { startRobotServer } = await import('./robotServer.mjs')

const CLASSES = [
  { classId: 'demo-6a', className: 'Testklass 6A', pupils: ['Testelev Ett', 'Testelev Tva'] },
  { classId: 'demo-6b', className: 'Testklass 6B', pupils: ['Alva Demo', 'Bruno Demo', 'Cleo Demo'] }
]

async function post(url, action, body) {
  const response = await fetch(`${url}/__robot/${action}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!data.ok) throw new Error(`${action} failed: ${JSON.stringify(data)}`)
  return data
}

const port = Number(process.env.ROBOT_PORT || 5288)
const { url } = await startRobotServer({ port })
try {
  const pupils = []
  for (const klass of CLASSES) {
    pupils.push(...(await post(url, 'seed', { ...klass, operations: ['addition'] })).pupils)
  }
  const teacher = await post(url, 'teacher', { id: 'ncm-admin', classIds: CLASSES.map(klass => klass.classId), role: 'super_admin' })
  await post(url, 'group', { id: 'group_demo', name: 'Stödgrupp demo',
    pupilIds: pupils.filter(pupil => pupil.classId === 'demo-6b').slice(0, 2).map(pupil => pupil.studentId),
    teacherIds: [teacher.username] })
  console.log(`\nAppen: ${url}`)
  console.log(`Klasser: ${CLASSES.map(klass => klass.className).join(', ')} och gruppen Stödgrupp demo`)
  console.log(`Lärare (super_admin): ${teacher.username} / ${teacher.password}`)
  for (const pupil of pupils) {
    console.log(`Elev: kodnamn "${pupil.loginCode}", PIN ${pupil.pin}`)
  }
  console.log('\nLogga in som läraren, öppna Screening, välj mottagare och ge en')
  console.log('screening. Logga sedan in som eleven i ett annat fönster.')
  console.log('Ctrl+C avslutar och tömmer databasen.\n')
} catch (error) {
  console.error(`Kunde inte seeda testkonton: ${error.message}`)
}
