// Starts the robot server and seeds a class, an admin teacher and two pupils,
// so the NCM pilot can be clicked through by hand. The allowlist is left empty
// on purpose: an admin then picks any pupil from the ordinary class roster.
// Same in-memory database as the robots, so nothing here reaches production.
process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = ''

const { startRobotServer } = await import('./robotServer.mjs')

const CLASS_ID = 'ncm-manual'
const PUPILS = ['Robot NCM', 'Testelev Tva']

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
    pupils: PUPILS, operations: ['addition'] })
  const teacher = await post(url, 'teacher', { id: 'ncm-admin', classIds: [CLASS_ID], role: 'super_admin' })
  console.log(`\nAppen: ${url}`)
  console.log(`Klass: ${CLASS_ID} (ingen serverlista satt, alla elever kan väljas)`)
  console.log(`Lärare (super_admin): ${teacher.username} / ${teacher.password}`)
  for (const pupil of seeded.pupils) {
    console.log(`Elev: kodnamn "${pupil.loginCode}", PIN ${pupil.pin}`)
  }
  console.log('\nLogga in som läraren, öppna fliken NCM-diagnostik, välj klassen och')
  console.log('en elev, ge testuppdraget. Logga sedan in som eleven i ett annat')
  console.log('fönster och öppna räknehäftet. Ctrl+C avslutar och tömmer databasen.\n')
} catch (error) {
  console.error(`Kunde inte seeda testkonton: ${error.message}`)
}
