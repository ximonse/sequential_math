import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import geometryDomain from './index'
import { computeLevelMastery } from '../../lib/masteryCalculation'
import { getOperationMasteryRule } from '../../lib/operations'
import { resetRotationStore } from '../../lib/rotationPicker'

describe('geometry domain', () => {
  it('independently verifies every implemented skill level', () => {
    for (const skill of geometryDomain.skills) {
      for (let level = skill.levels[0]; level <= skill.levels[1]; level += 1) {
        const problem = geometryDomain.generate(skill.id, level)
        expect(geometryDomain.verifyContent(problem), `${skill.id}/${level}`).toEqual({ valid: true, reason: '' })
        expect(geometryDomain.evaluate(problem, problem.answer.correct).correct).toBe(true)
      }
    }
  })

  it('rejects a corrupted stored answer', () => {
    const problem = geometryDomain.generate('geometry_2d_objects', 4)
    problem.answer.correct = problem.answer.correct === 'yes' ? 'no' : 'yes'
    expect(geometryDomain.verifyContent(problem).valid).toBe(false)
  })

  it('maps a distractor to an explicit error hypothesis', () => {
    const problem = geometryDomain.generate('geometry_2d_objects', 1)
    const distractor = problem.values.options.find(item => item.id !== problem.answer.correct)
    expect(geometryDomain.analyzeError(problem, distractor.id)).toMatchObject({ category: 'misconception' })
  })

  it('can reach mastery with real templates and representations at every level', () => {
    for (const skill of geometryDomain.skills) {
      for (let level = skill.levels[0]; level <= skill.levels[1]; level += 1) {
        resetRotationStore()
        const problems = Array.from({ length: 15 }, () => geometryDomain.generate(skill.id, level))
        const entries = problems.map(problem => ({ varietyTemplate: problem.metadata.varietyTemplate, representation: problem.metadata.representation }))
        const result = computeLevelMastery(problems.map(() => true), { ...getOperationMasteryRule(skill.id), evidenceEntries: entries })
        expect(result.isMastered, `${skill.id}/${level}: ${JSON.stringify(result)}`).toBe(true)
      }
    }
  })

  it('renders two visibly different representations per level', () => {
    for (const skill of geometryDomain.skills) {
      for (let level = skill.levels[0]; level <= skill.levels[1]; level += 1) {
        resetRotationStore()
        const problems = Array.from({ length: 16 }, () => geometryDomain.generate(skill.id, level))
        const byRepresentation = new Map(problems.map(problem => [problem.values.representation, problem]))
        expect(byRepresentation.size, `${skill.id}/${level}`).toBeGreaterThanOrEqual(2)
        const html = [...byRepresentation.values()].map(problem => renderToStaticMarkup(createElement(geometryDomain.Display, { problem, inputValue: '', onInputChange() {}, onSubmit() {}, onNext() {} })))
        expect(html[0], `${skill.id}/${level}`).not.toBe(html[1])
      }
    }
  })

  it('draws two endpoints for a segment and never an arrow', () => {
    resetRotationStore()
    const problem = Array.from({ length: 12 }, () => geometryDomain.generate('geometry_2d_objects', 1))
      .find(item => item.values.subject.kind === 'segment')
    expect(problem).toBeDefined()
    problem.values.representation = 'diagram'
    const html = renderToStaticMarkup(createElement(geometryDomain.Display, { problem, inputValue: '', onInputChange() {}, onSubmit() {}, onNext() {} }))
    expect(html).toContain('cx="45"')
    expect(html).toContain('cx="195"')
    expect(html).not.toContain('l-18-11v22z')
  })

  it('rejects mismatched subjects, prompts, and representation claims', () => {
    const line = geometryDomain.generate('geometry_2d_objects', 1)
    line.values.subject.kind = 'hexagon'
    expect(geometryDomain.verifyContent(line).valid).toBe(false)

    const relation = geometryDomain.generate('geometry_2d_objects', 4)
    relation.display.text = 'Är varje kvadrat också en kvadrat?'
    expect(geometryDomain.verifyContent(relation).valid).toBe(false)

    resetRotationStore()
    const quadrilateral = Array.from({ length: 12 }, () => geometryDomain.generate('geometry_2d_objects', 6))
      .find(item => item.values.questionKind === 'quadrilateral_properties')
    quadrilateral.values.subject.equalSides = !quadrilateral.values.subject.equalSides
    expect(geometryDomain.verifyContent(quadrilateral).valid).toBe(false)

    const solid = geometryDomain.generate('geometry_3d_objects', 5)
    solid.values.subject.vertices += 1
    expect(geometryDomain.verifyContent(solid).valid).toBe(false)

    const format = geometryDomain.generate('geometry_3d_objects', 2)
    format.values.representation = 'silhouette'
    expect(geometryDomain.verifyContent(format).valid).toBe(false)

    const visibleAnswer = geometryDomain.generate('geometry_2d_objects', 6)
    visibleAnswer.values.options.find(item => item.id === visibleAnswer.answer.correct).label = 'triangel'
    expect(geometryDomain.verifyContent(visibleAnswer).valid).toBe(false)
  })

  it('uses a finite level-six bank with three distinct reasoning tasks and no repeated card in a cycle', () => {
    resetRotationStore()
    const problems = Array.from({ length: 20 }, () => geometryDomain.generate('geometry_2d_objects', 6))
    expect(new Set(problems.map(item => `${item.metadata.varietyTemplate}:${item.values.representation}`)).size).toBe(20)
    expect(new Set(problems.map(item => item.values.questionKind))).toEqual(new Set(['quadrilateral_properties', 'quadrilateral_extension', 'quadrilateral_names']))
    for (const problem of problems) expect(geometryDomain.verifyContent(problem).valid).toBe(true)
  })

  it('asks clear circle questions and visually highlights the named part', () => {
    resetRotationStore()
    const problems = Array.from({ length: 12 }, () => geometryDomain.generate('geometry_2d_objects', 5))
    for (const problem of problems) {
      expect(geometryDomain.verifyContent(problem).valid).toBe(true)
      expect(problem.display.text).toContain('Vad heter')
      if (problem.values.representation !== 'marked_diagram') continue
      const html = renderToStaticMarkup(createElement(geometryDomain.Display, { problem, inputValue: '', onInputChange() {}, onSubmit() {}, onNext() {} }))
      expect(html).toContain('markerad i lila')
      expect(html).toContain('#7c3aed')
    }
  })

  it.each([
    ['geometry_2d_objects', 1, 6], ['geometry_2d_objects', 2, 8],
    ['geometry_2d_objects', 3, 10], ['geometry_2d_objects', 4, 16],
    ['geometry_2d_objects', 5, 6], ['geometry_2d_objects', 6, 20],
    ['geometry_3d_objects', 1, 12], ['geometry_3d_objects', 2, 4],
    ['geometry_3d_objects', 3, 18], ['geometry_3d_objects', 4, 12],
    ['geometry_3d_objects', 5, 12]
  ])('rotates a complete finite bank for %s level %i', (skill, level, size) => {
    resetRotationStore()
    const problems = Array.from({ length: size }, () => geometryDomain.generate(skill, level))
    const cards = problems.map(item => `${item.metadata.varietyTemplate}:${item.values.representation}`)
    expect(new Set(cards).size).toBe(size)
    expect(problems.every(item => geometryDomain.verifyContent(item).valid)).toBe(true)
  })
})
