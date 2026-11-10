import { OPERATION_LABELS } from './operations'

const MODE_TITLES = { adaptive: 'anpassad nivå', staircase: 'från lätt till svår', fixed: 'nivå' }

// Simon 2026-11-09: choose one kind of question, how many, and how the level is set:
// adapted to each pupil's training, easiest first then harder, or one fixed level.
export function builderAssignment({ operation, count, mode, from, to, level }) {
  const targetCount = Math.max(1, Math.min(200, Math.floor(Number(count) || 0)))
  const range = mode === 'adaptive' ? [1, 12] : mode === 'fixed' ? [level, level] : [Math.min(from, to), Math.max(from, to)]
  const detail = mode === 'fixed' ? `nivå ${level}` : mode === 'staircase' ? `${MODE_TITLES.staircase}, nivå ${range[0]}–${range[1]}` : MODE_TITLES.adaptive
  return { kind: 'standard', problemTypes: [operation], minLevel: range[0], maxLevel: range[1], targetCount,
    ...(mode === 'staircase' ? { levelMode: 'staircase' } : {}),
    title: `${OPERATION_LABELS[operation] || operation} · ${targetCount} uppgifter · ${detail}` }
}

