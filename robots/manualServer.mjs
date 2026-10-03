// Starts the robot server and seeds a class, an admin teacher and the
// diagnostic test pupil, so the NCM pilot can be clicked through by hand.
// Same in-memory database as the robots: nothing here reaches production.
import { NCM_TEST_PUPIL_NAME, startRobotServer } from './robotServer.mjs'

const CLASS_ID = 'ncm-manual'

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
  const seeded = await post(url, 'seed', { classId: CLASS_ID, className: 'NCM manuellt test',
    pupils: [NCM_TEST_PUPIL_NAME], operations: ['addition'] })
  const teacher = await post(url, 'teacher', { id: 'ncm-admin', classIds: [CLASS_ID], role: 'super_admin' })
  const pupil = seeded.pupils[0]
  console.log(`\nAppen: ${url}`)
  console.log(`Klass: ${CLASS_ID}`)
  console.log(`Lärare (super_admin): ${teacher.username} / ${teacher.password}`)
  console.log(`Testelev: kodnamn "${pupil.loginCode}", PIN ${pupil.pin}`)
  console.log(`Elev-id: ${pupil.studentId}`)
  console.log(`Tillåtna testkonton: ${process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS}`)
  console.log('\nLogga in som läraren, öppna fliken NCM-diagnostik, välj klassen och')
  console.log('testkontot, ge testuppdraget. Logga sedan in som eleven i ett annat')
  console.log('fönster och öppna räknehäftet. Ctrl+C avslutar och tömmer databasen.\n')
} catch (error) {
  console.error(`Kunde inte seeda testkonton: ${error.message}`)
}
