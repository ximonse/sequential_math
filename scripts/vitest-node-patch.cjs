const { EventEmitter } = require('node:events')
const childProcess = require('node:child_process')

function createNoopChildProcess() {
  const proc = new EventEmitter()
  proc.pid = 0
  proc.stdin = null
  proc.stdout = null
  proc.stderr = null
  proc.kill = () => false
  proc.unref = () => proc
  return proc
}

const originalExec = childProcess.exec

childProcess.exec = function patchedExec(command, options, callback) {
  let nextOptions = options
  let nextCallback = callback

  if (typeof nextOptions === 'function') {
    nextCallback = nextOptions
    nextOptions = undefined
  }

  const commandText = String(command || '').trim().toLowerCase()

  // Vite probes "net use" on Windows; this environment blocks child spawns.
  if (commandText === 'net use') {
    const error = new Error('net use disabled for test process')
    error.code = 'EPERM'
    if (typeof nextCallback === 'function') {
      process.nextTick(() => nextCallback(error, '', ''))
    }
    return createNoopChildProcess()
  }

  try {
    return originalExec.call(this, command, nextOptions, nextCallback)
  } catch (error) {
    if (error?.code === 'EPERM') {
      if (typeof nextCallback === 'function') {
        process.nextTick(() => nextCallback(error, '', ''))
      }
      return createNoopChildProcess()
    }
    throw error
  }
}
