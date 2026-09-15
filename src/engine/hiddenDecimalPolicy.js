const DECIMAL_STAGE_BY_ARITHMETIC_LEVEL = {
  4: 1,
  5: 2,
  7: 3,
  8: 4,
  10: 5,
  12: 6
}

export function chooseHiddenDecimalEvidence({ skill, level, forcedLevel, decimalFloor, roll = Math.random() } = {}) {
  if (Number.isFinite(Number(forcedLevel))) return null
  if (!['addition', 'subtraction'].includes(String(skill || ''))) return null

  const expectedStage = DECIMAL_STAGE_BY_ARITHMETIC_LEVEL[Number(level)]
  if (!expectedStage) return null

  const behind = Number(decimalFloor) < expectedStage
  const probability = behind ? 0.5 : 0.25
  return Number(roll) < probability ? 'positions_decimal' : null
}