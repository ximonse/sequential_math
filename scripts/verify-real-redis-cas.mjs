import { execFileSync } from 'node:child_process'
import { STUDENT_CAS_SCRIPT } from '../api/_studentStore.js'

const container = process.env.REDIS_CHECK_CONTAINER || 'sequential-math-redis-check'

function redis(args, input) {
  return execFileSync('docker', ['exec', '-i', container, 'redis-cli', '--raw', ...args], {
    encoding: 'utf8',
    input
  }).trim()
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

function runCas({ key, deletedKey, indexKey, expectedRevision, operation, payload, id }) {
  return redis([
    'EVALSHA', scriptSha, '3', key, deletedKey, indexKey,
    String(expectedRevision), operation, payload, id
  ])
}

redis(['FLUSHDB'])
const scriptSha = redis(['-x', 'SCRIPT', 'LOAD'], STUDENT_CAS_SCRIPT)
if (!/^[a-f0-9]{40}$/i.test(scriptSha)) throw new Error('Redis did not return a Lua script SHA')

const first = JSON.stringify({ studentId: 'PUPIL', classIds: ['4A'], serverRevision: 0 })
const staleSecond = JSON.stringify({ studentId: 'PUPIL', classIds: ['4A'], serverRevision: 0, marker: 'stale' })
const retriedSecond = JSON.stringify({ studentId: 'PUPIL', classIds: ['4A'], serverRevision: 1, marker: 'retry' })
const concurrent = await Promise.all([
  Promise.resolve().then(() => runCas({ key: 'student:PUPIL', deletedKey: 'student_deleted:PUPIL', indexKey: 'students:index', expectedRevision: -1, operation: 'write', payload: first, id: 'PUPIL' })),
  Promise.resolve().then(() => runCas({ key: 'student:PUPIL', deletedKey: 'student_deleted:PUPIL', indexKey: 'students:index', expectedRevision: -1, operation: 'write', payload: staleSecond, id: 'PUPIL' }))
])
if (concurrent.filter(result => result === '1').length !== 1 || concurrent.filter(result => result === '0').length !== 1) {
  throw new Error(`Expected one successful concurrent write and one conflict, got ${concurrent.join(', ')}`)
}

expectEqual(runCas({ key: 'student:PUPIL', deletedKey: 'student_deleted:PUPIL', indexKey: 'students:index', expectedRevision: 0, operation: 'write', payload: retriedSecond, id: 'PUPIL' }), '1', 'retry after conflict')
expectEqual(redis(['SET', 'class_deleted:4B', '1']), 'OK', 'class tombstone setup')
const blocked = JSON.stringify({ studentId: 'NEW', classIds: ['4B'], serverRevision: 0 })
expectEqual(runCas({ key: 'student:NEW', deletedKey: 'student_deleted:NEW', indexKey: 'students:index', expectedRevision: -1, operation: 'write', payload: blocked, id: 'NEW' }), '-3', 'enrollment into deleted class')
expectEqual(redis(['EXISTS', 'student:NEW']), '0', 'blocked student absent')
expectEqual(runCas({ key: 'student:PUPIL', deletedKey: 'student_deleted:PUPIL', indexKey: 'students:index', expectedRevision: 1, operation: 'delete', payload: String(Date.now()), id: 'PUPIL' }), '1', 'student delete')
expectEqual(redis(['EXISTS', 'student:PUPIL']), '0', 'deleted student absent')
expectEqual(redis(['EXISTS', 'student_deleted:PUPIL']), '1', 'student tombstone present')
expectEqual(redis(['SISMEMBER', 'students:index', 'PUPIL']), '0', 'deleted student absent from index')

console.log('Real Redis CAS Lua verification passed.')
