import {
  PROGRESSION_MODE_CHALLENGE,
  PROGRESSION_MODE_STEADY
} from './progressionModes'

const NCM_ROTATION_MAX_SIGNATURES = 24
const KNOWN_OPERATION_TYPES = new Set([
  'addition', 'subtraction', 'multiplication', 'division',
  'algebra_evaluate', 'algebra_simplify',
  'arithmetic_expressions', 'fractions', 'percentage'
])
const BUCKET_CONFIG = {
  [PROGRESSION_MODE_CHALLENGE]: [
    { name: 'very_easy', offset: -2, weight: 0.05 },
    { name: 'easy', offset: -1, weight: 0.25 },
    { name: 'core', offset: 0, weight: 0.5 },
    { name: 'hard', offset: 1, weight: 0.15 },
    { name: 'challenge', offset: 2, weight: 0.05 }
  ],
  [PROGRESSION_MODE_STEADY]: [
    { name: 'very_easy', offset: -2, weight: 0.1 },
    { name: 'easy', offset: -1, weight: 0.35 },
    { name: 'core', offset: 0, weight: 0.45 },
    { name: 'hard', offset: 1, weight: 0.08 },
    { name: 'challenge', offset: 2, weight: 0.02 }
  ]
}

export function chooseProblemType(profile, recentSuccess, errors, progressionMode) {
  const attempts = profile.recentProblems.length
  const difficulty = profile.currentDifficulty

  if (errors >= 2 || recentSuccess < 0.65) return 'addition'
  if (attempts < 10 || difficulty < 3.5) return 'addition'

  const options = [{
    type: 'addition',
    weight: progressionMode === PROGRESSION_MODE_STEADY ? 0.72 : 0.6
  }]

  if (difficulty >= 4 && attempts >= 12) {
    let subWeight = 0.25
    if (difficulty >= 7) subWeight = 0.3
    if (recentSuccess >= 0.85) subWeight += 0.05
    options.push({ type: 'subtraction', weight: subWeight })
    options[0].weight -= 0.15
  }

  if (difficulty >= 5 && attempts >= 16) {
    let mulWeight = 0.15
    if (difficulty >= 8) mulWeight = 0.2
    if (recentSuccess >= 0.85) mulWeight += 0.05
    options.push({ type: 'multiplication', weight: mulWeight })
    options[0].weight -= 0.1
  }

  if (difficulty >= 7 && attempts >= 22) {
    let divWeight = 0.1
    if (difficulty >= 10) divWeight = 0.14
    if (recentSuccess >= 0.88) divWeight += 0.04
    options.push({ type: 'division', weight: divWeight })
    options[0].weight -= 0.08
  }

  const normalized = normalizeWeights(options)
  const rand = Math.random()
  let acc = 0
  for (const item of normalized) {
    acc += item.weight
    if (rand <= acc) return item.type
  }
  return normalized[0].type
}

export function normalizeAllowedTypes(allowedTypes) {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return []
  const unique = []
  for (const type of allowedTypes) {
    const normalized = String(type || '').trim()
    if (!KNOWN_OPERATION_TYPES.has(normalized)) continue
    if (!unique.includes(normalized)) unique.push(normalized)
  }
  return unique
}

export function normalizeTableSet(tableSet) {
  if (!Array.isArray(tableSet) || tableSet.length === 0) return []
  const unique = new Set()
  for (const value of tableSet) {
    const n = Number(value)
    if (Number.isInteger(n) && n >= 2 && n <= 12) {
      unique.add(n)
    }
  }
  return Array.from(unique).sort((a, b) => a - b)
}

export function normalizeNcmFilter(raw) {
  if (!raw || typeof raw !== 'object') return null

  const codes = Array.isArray(raw.codes)
    ? raw.codes
      .map(item => String(item || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim())
      .filter(Boolean)
    : []
  const abilityTags = Array.isArray(raw.abilityTags)
    ? raw.abilityTags
      .map(item => String(item || '').trim())
      .filter(Boolean)
    : []

  if (codes.length === 0 && abilityTags.length === 0) return null

  return {
    codes: Array.from(new Set(codes)),
    abilityTags: Array.from(new Set(abilityTags))
  }
}

export function pickNextNcmSkillTag(profile, filter, candidates) {
  const signature = buildNcmFilterSignature(filter)
  const allSkillTags = Array.from(new Set(
    (Array.isArray(candidates) ? candidates : [])
      .map(item => String(item?.skillTag || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'sv'))
  if (allSkillTags.length === 0) return ''

  const store = profile.adaptive.ncmRotation
  const current = store[signature]
  let bucket = isValidNcmRotationBucket(current, allSkillTags)
    ? current
    : {
      skillTags: allSkillTags,
      queue: [],
      lastSkillTag: '',
      updatedAt: 0
    }

  if (!Array.isArray(bucket.queue) || bucket.queue.length === 0) {
    bucket.queue = shuffleStrings(allSkillTags)
    if (bucket.queue.length > 1 && bucket.lastSkillTag && bucket.queue[0] === bucket.lastSkillTag) {
      const replacementIndex = bucket.queue.findIndex(item => item !== bucket.lastSkillTag)
      if (replacementIndex > 0) {
        const first = bucket.queue[0]
        bucket.queue[0] = bucket.queue[replacementIndex]
        bucket.queue[replacementIndex] = first
      }
    }
  }

  const nextSkillTag = String(bucket.queue.shift() || '').trim()
  if (nextSkillTag) {
    bucket.lastSkillTag = nextSkillTag
  }
  bucket.updatedAt = Date.now()
  bucket.skillTags = allSkillTags
  store[signature] = bucket
  pruneNcmRotationStore(store)
  return nextSkillTag
}

export function getRecentNcmSkillTags(profile, count = 6) {
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  const skillTags = recent
    .slice(-Math.max(1, count * 2))
    .map(item => String(item?.skillTag || '').trim())
    .filter(tag => tag.startsWith('ncm_'))

  return Array.from(new Set(skillTags.slice(-count)))
}

export function clampLevelToRange(level, levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return level
  const minLevel = Math.max(1, Math.min(12, Number(levelRange[0]) || 1))
  const maxLevel = Math.max(minLevel, Math.min(12, Number(levelRange[1]) || 12))
  return Math.max(minLevel, Math.min(maxLevel, level))
}

export function selectDifficultyBucket(profile, recentSuccess, errors, progressionMode) {
  const baseConfig = BUCKET_CONFIG[progressionMode] || BUCKET_CONFIG[PROGRESSION_MODE_CHALLENGE]
  let adjusted = baseConfig.map(item => ({ ...item }))

  if (errors >= 2 || recentSuccess < 0.7) {
    adjusted = adjusted.map(item => {
      if (item.name === 'very_easy') return { ...item, weight: item.weight * 1.7 }
      if (item.name === 'easy') return { ...item, weight: item.weight * 1.5 }
      if (item.name === 'hard') return { ...item, weight: item.weight * 0.65 }
      if (item.name === 'challenge') return { ...item, weight: item.weight * 0.4 }
      return item
    })
  } else if (recentSuccess > 0.86) {
    adjusted = adjusted.map(item => {
      if (item.name === 'hard') return { ...item, weight: item.weight * 1.35 }
      if (item.name === 'challenge') return { ...item, weight: item.weight * 1.45 }
      if (item.name === 'very_easy') return { ...item, weight: item.weight * 0.8 }
      return item
    })
  }

  const normalized = normalizeWeights(adjusted)
  const rand = Math.random()
  let acc = 0
  for (const item of normalized) {
    acc += item.weight
    if (rand <= acc) return item.name
  }
  return 'core'
}

export function getBucketOffset(bucket) {
  const flat = [
    ...BUCKET_CONFIG[PROGRESSION_MODE_CHALLENGE],
    ...BUCKET_CONFIG[PROGRESSION_MODE_STEADY]
  ]
  const found = flat.find(item => item.name === bucket)
  return found ? found.offset : 0
}

function normalizeWeights(items) {
  const cleaned = items.map(item => ({ ...item, weight: Math.max(0.05, item.weight) }))
  const total = cleaned.reduce((sum, item) => sum + item.weight, 0)
  return cleaned.map(item => ({ ...item, weight: item.weight / total }))
}

function buildNcmFilterSignature(filter) {
  const codes = Array.isArray(filter?.codes) ? [...filter.codes].sort() : []
  const abilityTags = Array.isArray(filter?.abilityTags) ? [...filter.abilityTags].sort() : []
  return `codes:${codes.join(',')}|abilities:${abilityTags.join(',')}`
}

function isValidNcmRotationBucket(bucket, allSkillTags) {
  if (!bucket || typeof bucket !== 'object') return false
  if (!Array.isArray(bucket.skillTags)) return false
  if (bucket.skillTags.length !== allSkillTags.length) return false
  const existing = [...bucket.skillTags].sort((a, b) => a.localeCompare(b, 'sv'))
  for (let i = 0; i < allSkillTags.length; i += 1) {
    if (existing[i] !== allSkillTags[i]) return false
  }
  if (!Array.isArray(bucket.queue)) return false
  return true
}

function shuffleStrings(values) {
  const arr = [...values]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function pruneNcmRotationStore(store) {
  const entries = Object.entries(store || {})
  if (entries.length <= NCM_ROTATION_MAX_SIGNATURES) return

  entries.sort((a, b) => Number(a[1]?.updatedAt || 0) - Number(b[1]?.updatedAt || 0))
  const removeCount = entries.length - NCM_ROTATION_MAX_SIGNATURES
  for (let i = 0; i < removeCount; i += 1) {
    delete store[entries[i][0]]
  }
}
