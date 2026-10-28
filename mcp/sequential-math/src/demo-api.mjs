import { createServer as createNetServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { startRobotServer } from '../../../robots/robotServer.mjs'
import { seedScreeningDemo } from './demo-screening.mjs'

let app, closing = false
async function close() {
  if (closing) return
  closing = true
  await app?.close()
  if (process.connected) process.disconnect()
  process.exitCode = 0
}
if (!process.connected) process.exit(0)
process.on('disconnect', () => { if (!app) process.exit(0); else close().catch(() => {}) })
process.on('SIGTERM', () => close().finally(() => process.exit(0)))
process.on('SIGINT', () => close().finally(() => process.exit(0)))

// This process has no real credentials and uses the robot server's KV memory alias.
process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS = ''
const root = fileURLToPath(new URL('../../../', import.meta.url))
process.chdir(root)
const reservation = createNetServer()
await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, 'localhost', resolve) })
const port = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
app = await startRobotServer({ port, production: false })
async function control(action, body) {
  const response = await fetch(`${app.url}/__robot/${action}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok || !data.ok) throw new Error('Synthetic fixture setup failed')
  return data
}
const seeded = await control('seed', { classId: 'mcp-demo', className: 'MCP-demoklass', pupils: ['MCP Demo One', 'MCP Demo Two'] })
await control('seed', { classId: 'mcp-other', className: 'Annan demoklass', pupils: ['MCP Demo Other'] })
const pupilId = name => Buffer.from(name).toString('hex').toUpperCase().padEnd(32, '0').slice(0, 32)
await control('seed-table-progress', { students: [
  { studentId: pupilId('MCP Demo One'), currentAttempts: 4, currentCorrect: 2, previousAttempts: 0, noiseAttempts: 0 },
  { studentId: pupilId('MCP Demo Two'), currentAttempts: 6, currentCorrect: 5, previousAttempts: 0, noiseAttempts: 0 }
] })
const screening = process.argv.includes('--screening')
const teacher = await control('teacher', { id: 'mcp-demo-teacher', classIds: ['mcp-demo'], ...(screening ? { role: 'super_admin' } : {}) })
await control('group', { id: 'mcp-demo-group', name: 'MCP-demogrupp',
  pupilIds: [seeded.pupils[0].studentId], teacherIds: ['mcp-demo-teacher'] })
if (screening) await seedScreeningDemo(app.url, teacher, seeded.pupils[0])
process.send?.({ baseUrl: app.url, username: teacher.username, password: teacher.password })
