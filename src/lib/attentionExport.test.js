import { describe, expect, it } from 'vitest'
import { buildAttentionExport } from './attentionExport'
import { FocusActivitySession } from './focusActivity'
import { MultiActivitySession, multiAnswer } from './multiActivity'
import { ATTENTION_PROTOCOLS } from './attentionProtocols'
import { isValidAttentionResult } from './attentionHistory'
import { createHash } from 'node:crypto'

export function measuredPass(mode = 'discover') {
  let time = 0
  const session = mode === 'multi' ? new MultiActivitySession({ now: () => time, random: () => 0 }) : new FocusActivitySession({ now: () => time, random: () => 0 })
  session.mode = mode; session.start()
  time = session.due; session.tick(); time += 350
  if (mode === 'multi') session.press(multiAnswer(session.trial)); else session.press()
  session.pause(); time += 10000; session.resume(); session.finish()
  const protocolId = mode === 'discover' ? 'focus-targets-1' : mode === 'choose' ? 'control-targets-1' : 'multi-rules-1'
  return { id: mode, version: 3, mode, startedAt: Date.parse('2026-10-18T12:00:00Z'), finishedAt: Date.parse('2026-10-18T12:01:00Z'),
    activeMs: session.elapsed, aborted: true, completionReason: 'ended', summary: session.summary(), trials: session.trace(),
    events: session.events, stimuli: session.stimuli(), protocolId, protocol: structuredClone(ATTENTION_PROTOCOLS[protocolId]) }
}
describe('versioned attention export', () => {
  it('locks published protocol definitions; behavioral changes must use a new ID', () => {
    const hashes = {
      'focus-targets-1': '2d5e1176f219eaaae039eeab7b12b22e5846999af64a9e01e691d15f51974f19',
      'control-targets-1': 'bf78da82bdbf7ff39bc405c9d35f4ede4606918d09c8463241a75ca5d8ccf6fe',
      'multi-rules-1': '866275a73b0bdb99a1ab11d64b9c834fb5dc8b76dd204d02f3056d7e79659131'
    }
    for (const [id, hash] of Object.entries(hashes)) expect(createHash('sha256').update(JSON.stringify(ATTENTION_PROTOCOLS[id])).digest('hex')).toBe(hash)
  })
  it('validates all new protocols, exact stimuli, pauses and timing, and rejects modified definitions', () => {
    for (const mode of ['discover', 'choose', 'multi']) {
      const pass = measuredPass(mode)
      expect(isValidAttentionResult(pass)).toBe(true)
      expect(pass.events.map(e => e.type)).toContain('pause')
      expect(isValidAttentionResult({ ...pass, protocol: { ...pass.protocol, durationMs: 1 } })).toBe(false)
      expect(isValidAttentionResult({ ...pass, stimuli: [] })).toBe(false)
    }
  })
  it('exports unabridged records, self-contained definitions and separate signal/event CSV rows with who/what/date selection', () => {
    const history = ['discover', 'choose', 'multi'].map(measuredPass)
    const rows = [{ studentId: 'A', name: 'Elev A', status: 'ready', history }]
    const output = buildAttentionExport(rows)
    expect(output.json.records.map(entry => entry.result)).toEqual(history)
    expect(output.trials).toHaveLength(3)
    expect(output.events.length).toBeGreaterThan(6)
    expect(Object.keys(output.json.protocols)).toHaveLength(3)
    expect(buildAttentionExport(rows, { studentId: 'A', mode: 'choose', from: '2026-10-18', to: '2026-10-18' }).passes).toHaveLength(1)
    expect(buildAttentionExport(rows, { from: '2026-10-19' }).passes).toHaveLength(0)
    expect(() => buildAttentionExport([{ ...rows[0], status: 'error' }])).toThrow()
  })
})
