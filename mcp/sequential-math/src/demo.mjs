import { fork } from 'node:child_process'
import { once } from 'node:events'
import { BridgeError } from './api-client.mjs'

export function demoDescription() {
  const now = new Date()
  const day = timestamp => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp)
  return { classId: 'mcp-demo', codeNames: ['MCP Demo One', 'MCP Demo Two'],
    from: day(now.getTime() - 14 * 86400000), to: day(now), storage: 'memory' }
}

export function launchDemo() {
  const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERPROFILE', 'HOME', 'APPDATA', 'LOCALAPPDATA']
    .filter(key => process.env[key]).map(key => [key, process.env[key]]))
  const child = fork(new URL('./demo-api.mjs', import.meta.url), [], { env,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true })
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new BridgeError('demo_start_failed', 'The synthetic app did not start in time. Check the local Node dependencies.')) }, 45000)
    child.once('message', message => {
      clearTimeout(timeout)
      if (!message?.baseUrl || !message.username || !message.password) reject(new BridgeError('demo_start_failed', 'Invalid synthetic app startup response.'))
      else resolve(message)
    })
    child.once('error', () => { clearTimeout(timeout); reject(new BridgeError('demo_start_failed', 'The synthetic app could not be started.')) })
    child.once('exit', () => { clearTimeout(timeout); reject(new BridgeError('demo_start_failed', 'The synthetic app stopped before becoming ready.')) })
  })
  return { ready, async close() {
    if (child.exitCode !== null) return
    if (child.connected) child.disconnect()
    const exited = once(child, 'exit').catch(() => {})
    const timer = setTimeout(() => child.kill(), 3000)
    await exited
    clearTimeout(timer)
  } }
}
