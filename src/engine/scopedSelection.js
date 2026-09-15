import { getDomainForSkill } from '../domains/registry'
import { getLowestUnmasteredLevel } from '../lib/studentProfile'
import { resolveProblemOperation } from '../lib/mathUtils'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeScope(allowedTypes) {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return []
  const skills = []
  for (const value of allowedTypes) {
    const skill = String(value || '').trim()
    if (!skill || skills.includes(skill)) continue
    if (!getDomainForSkill(skill)) {
      throw new Error(`Unknown training skill: ${skill}`)
    }
    skills.push(skill)
  }
  if (skills.length === 0) throw new Error('Training scope contains no registered skills')
  return skills
}

function resolveSkill(profile, skills, forcedType) {
  const forced = String(forcedType || '').trim()
  if (forced) {
    if (!skills.includes(forced)) throw new Error(`Forced skill is outside training scope: ${forced}`)
    return forced
  }
  if (skills.length === 1) return skills[0]

  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const previous = String(recent[index]?.skill || '').trim()
      || resolveProblemOperation(recent[index], { fallback: '', allowUnknownPrefix: false })
    const previousIndex = skills.indexOf(previous)
    if (previousIndex >= 0) return skills[(previousIndex + 1) % skills.length]
  }
  return skills[0]
}

function resolveLevelRange(skillDefinition, levelRange) {
  const [skillMin, skillMax] = skillDefinition.levels.map(Number)
  if (!Array.isArray(levelRange) || levelRange.length !== 2) {
    return [skillMin, skillMax]
  }
  const requestedMin = Number(levelRange[0])
  const requestedMax = Number(levelRange[1])
  if (!Number.isFinite(requestedMin) || !Number.isFinite(requestedMax)) {
    throw new Error('Training level range must contain finite levels')
  }
  const min = Math.max(skillMin, Math.round(requestedMin))
  const max = Math.min(skillMax, Math.round(requestedMax))
  if (min > max) throw new Error(`Training level range is outside skill bounds: ${skillDefinition.id}`)
  return [min, max]
}

export function resolveScopedSelection(profile, options = {}) {
  const skills = normalizeScope(options.allowedTypes)
  if (skills.length === 0) return null

  const skill = resolveSkill(profile, skills, options.forcedType)
  const domain = getDomainForSkill(skill)
  const skillDefinition = domain.skills.find(item => item.id === skill)
  const levelRange = resolveLevelRange(skillDefinition, options.levelRange)

  const forcedLevel = Number(options.forcedLevel)
  if (Number.isFinite(forcedLevel)) {
    return { domain, skill, level: clamp(Math.round(forcedLevel), ...levelRange), levelRange }
  }

  const floor = clamp(getLowestUnmasteredLevel(profile, skill, levelRange[1]), ...levelRange)
  return { domain, skill, level: floor, levelRange }
}

