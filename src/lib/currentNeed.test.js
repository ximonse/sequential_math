import { describe, expect, it } from 'vitest'
import { buildCurrentNeed, recordCurrentNeed } from './currentNeed'
import { resolveScopedSelection } from '../engine/scopedSelection'

function observation(index, correct, level = 3) {
  return {
    observationId: `answer-${index}`,
    problemId: `problem-${index}`,
    correct,
    isPartial: false,
    evidenceSkill: 'addition',
    evidenceLevel: level,
    evidenceClass: 'mastery_eligible',
    evidenceRuleVersion: 1,
    timestamp: 1000 + index
  }
}

function update(profile, answer) {
  profile.recentProblems.push(answer)
  const need = buildCurrentNeed({ profile, observation: answer, masteryFloor: 3 })
  recordCurrentNeed(profile, need)
  return need
}

describe('current training need', () => {
  it('keeps recovery active until two consecutive correct answers', () => {
    const profile = {
      currentDifficulty: 3,
      recentProblems: [],
      problemLog: [],
      adaptive: { skillStates: {}, recentSelections: [] }
    }

    update(profile, observation(1, false))
    update(profile, observation(2, false))
    const entered = update(profile, observation(3, false))
    expect(entered).toMatchObject({ purpose: 'recover', targetLevel: 2 })

    const afterOneCorrect = update(profile, observation(4, true, 2))
    expect(afterOneCorrect).toMatchObject({ purpose: 'recover', targetLevel: 2 })
    expect(resolveScopedSelection(profile, { allowedTypes: ['addition'] })).toMatchObject({
      level: 2,
      decisionId: afterOneCorrect.needId,
      decisionPurpose: 'recover'
    })

    const afterTwoCorrect = update(profile, observation(5, true, 2))
    expect(afterTwoCorrect).toMatchObject({ purpose: 'consolidate', targetLevel: 3 })
  })

  it('clamps recovery inside a teacher level range', () => {
    const profile = {
      recentProblems: [observation(1, false, 3), observation(2, false, 3), observation(3, false, 3)],
      adaptive: { skillStates: {}, recentSelections: [] }
    }
    const need = buildCurrentNeed({
      profile,
      observation: profile.recentProblems.at(-1),
      masteryFloor: 3,
      trainingContext: { frameId: 'assignment', mode: 'teacher_locked', assignmentId: 'a1', levelRange: [3, 3] }
    })
    expect(need).toMatchObject({ purpose: 'recover', targetLevel: 3, frameId: 'assignment' })
  })
})
