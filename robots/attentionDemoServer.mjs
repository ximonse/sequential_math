// Local synthetic data only. Keep this process alive while exploring the demo.
import { startRobotServer } from './robotServer.mjs'
const { url } = await startRobotServer({ port: Number(process.env.ROBOT_PORT || 5294) })
const response = await fetch(`${url}/__robot/attention-demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
const demo = await response.json()
if (!demo.ok) throw new Error(JSON.stringify(demo))
console.log(`Focus demo ready: ${url}/teacher/focus — ${demo.pupils.length} synthetic pupils, ${demo.count} passes.`)
console.log(`Local demo account: ${demo.teacher.username} / ${demo.teacher.password}`)
