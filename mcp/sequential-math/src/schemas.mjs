import * as z from 'zod/v4'

export const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/u)
export const source = z.enum(['practice', 'screening', 'all']).default('practice')
export const scope = { studentId: id.describe('Exact pupil ID from math_find_pupils.'), classId: id.describe('One current class ID returned for that pupil.') }
const boundary = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?:\+0[12]:00)?)?$/u)
export const period = { ...scope, from: boundary.describe('Start inclusive: Stockholm YYYY-MM-DD or YYYY-MM-DDTHH:mm. Ambiguous winter clock times require +02:00 or +01:00.'),
  to: boundary.describe('Stockholm end: date includes the whole day; YYYY-MM-DDTHH:mm is exclusive. Optional +02:00/+01:00 must match Stockholm.'), source }
const ref = z.string().min(1).max(200)
const refs = z.array(ref).max(20)
const text = z.string().min(1).max(1000)
export const report = z.strictObject({ schemaVersion: z.literal(1), snapshotRevision: z.string().regex(/^[a-f0-9]{64}$/u),
  scopeSv: text.max(300), provenance: z.strictObject({ kind: z.literal('ai'), instructionVersion: text.max(80), model: text.max(100).optional() }),
  strengths: z.array(z.strictObject({ id: id.max(80), textSv: text, refs })).max(8),
  hypotheses: z.array(z.strictObject({ id: id.max(80), textSv: text,
    basis: z.enum(['existing_signal', 'rule_candidate', 'ai_interpretation']), signalCode: text.max(120).optional(),
    ruleVersion: text.max(80).optional(),
    supportRefs: refs, counterRefs: refs, alternativesSv: z.array(text.max(500)).min(1).max(5), nextCheckSv: text })).max(8),
  limitationsSv: z.array(text).max(8) })
export const output = z.object({ data: z.record(z.string(), z.unknown()) })
