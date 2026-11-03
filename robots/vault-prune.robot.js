import { test, expect } from '@playwright/test'
import { answerText, createPupil, fillAnswer, login, next, readState, submit } from './lib/app.js'

// A device that kept every server-confirmed event got very slow to log in
// (Chrome, 2026-11-02). Day-old confirmed events are removed at login; answers the
// server has not confirmed stay.
const vaultName = id => `sequential-math-pilot-vault-${id.toUpperCase()}`

async function eventRecords(page, name) {
  return page.evaluate(dbName => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const request = db.transaction(db.objectStoreNames[0], 'readonly').objectStore(db.objectStoreNames[0]).getAll()
      request.onsuccess = () => { db.close(); resolve(request.result.filter(item => item.type === 'event')
        .map(item => ({ id: item.id, acknowledged: Boolean(item.acknowledgedAt) }))) }
      request.onerror = () => reject(request.error)
    }
  }), name)
}

async function ageAcknowledged(page, name, keepPendingId) {
  await page.evaluate(([dbName, pendingId]) => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName)
    open.onsuccess = () => {
      const db = open.result
      const transaction = db.transaction(db.objectStoreNames[0], 'readwrite')
      const store = transaction.objectStore(db.objectStoreNames[0])
      const request = store.getAll()
      request.onsuccess = () => {
        for (const item of request.result) {
          if (item.type !== 'event') continue
          // One event is made to look unsent; the others look confirmed two days ago.
          if (item.id === pendingId) { const { acknowledgedAt: _drop, ...rest } = item; store.put(rest) }
          else if (item.acknowledgedAt) store.put({ ...item, acknowledgedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 })
        }
      }
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onerror = () => reject(transaction.error)
    }
    open.onerror = () => reject(open.error)
  }), [name, keepPendingId])
}

test('Login removes day-old confirmed events from the device and keeps unsent ones', async ({ page, request }) => {
  const pupil = await createPupil(request, { operations: ['addition'] })
  await login(page, pupil)
  await page.goto(`/student/${pupil.studentId}/practice?mode=addition&level=1`)
  for (let index = 0; index < 3; index += 1) {
    await expect.poll(async () => (await readState(page)).phase).toBe('answering')
    const { problem } = await readState(page)
    await fillAnswer(page, answerText(problem))
    await submit(page)
    if (index < 2) await next(page)
  }
  const name = vaultName(pupil.studentId)
  await expect.poll(async () => (await eventRecords(page, name)).filter(e => e.acknowledged).length).toBeGreaterThan(2)
  const before = await eventRecords(page, name)
  const keep = before[0].id
  await page.goto('/')
  await ageAcknowledged(page, name, keep)
  await page.goto(`/student/${pupil.studentId}`)
  // The aged confirmations are gone; the unsent event is kept (and sent). New events
  // the start page records are fresh and stay.
  const aged = before.map(e => e.id).filter(id => id !== keep)
  await expect.poll(async () => (await eventRecords(page, name)).map(e => e.id).filter(id => aged.includes(id))).toEqual([])
  expect((await eventRecords(page, name)).map(e => e.id)).toContain(keep)
})
