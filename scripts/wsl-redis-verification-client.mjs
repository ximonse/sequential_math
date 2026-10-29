import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)

// Explicit local Unix socket only; no shell interpolation or remote Redis URL.
export function localWslRedisClient(binary, socket) {
  assert.match(binary, /^\/[A-Za-z0-9_./-]+\/redis-cli$/u)
  assert.match(socket, /^\/[A-Za-z0-9_./-]+\.sock$/u)
  async function command(...args) {
    const { stdout } = await exec('wsl.exe', ['--exec', binary, '-s', socket, '--json', ...args.map(String)],
      { timeout: 15000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
    const result = JSON.parse(stdout.trim())
    return result
  }
  return {
    async get(key) { const raw = await command('GET', key); return raw === null ? null : JSON.parse(raw) },
    set: (key, value, { ex }) => command('SET', key, JSON.stringify(value), 'EX', ex),
    sadd: (key, ...values) => command('SADD', key, ...values),
    exists: key => command('EXISTS', key),
    expire: (key, seconds) => command('EXPIRE', key, seconds),
    del: (...keys) => command('DEL', ...keys),
    eval: (script, keys, args) => command('EVAL', script, keys.length, ...keys, ...args)
  }
}
