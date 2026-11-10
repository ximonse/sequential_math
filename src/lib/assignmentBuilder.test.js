import { describe, expect, it } from 'vitest'
import { builderAssignment } from './assignmentBuilder.js'

describe('assignment builder', () => {
  it('adapts to each pupil across all levels', () => {
    expect(builderAssignment({ operation: 'multiplication', count: 8, mode: 'adaptive' })).toMatchObject({
      kind: 'standard', problemTypes: ['multiplication'], minLevel: 1, maxLevel: 12, targetCount: 8,
      title: 'Multiplikation · 8 uppgifter · anpassad nivå' })
    expect(builderAssignment({ operation: 'multiplication', count: 8, mode: 'adaptive' }).levelMode).toBeUndefined()
  })
  it('goes from easy to hard within the chosen levels', () => {
    expect(builderAssignment({ operation: 'division', count: 10, mode: 'staircase', from: 5, to: 2 })).toMatchObject({
      minLevel: 2, maxLevel: 5, levelMode: 'staircase', title: 'Division · 10 uppgifter · från lätt till svår, nivå 2–5' })
  })
  it('locks one fixed level', () => {
    expect(builderAssignment({ operation: 'fractions', count: 6, mode: 'fixed', level: 4 })).toMatchObject({
      minLevel: 4, maxLevel: 4, targetCount: 6, title: 'Bråk · 6 uppgifter · nivå 4' })
  })
})
