export function generateMathPracticeProblem(assignment, seed = Math.random()) {
  if (!assignment || assignment.kind !== 'math_practice') return null

  const { operations, numberRange, targetCount } = assignment
  if (!operations || operations.length === 0) return null

  const operation = operations[Math.floor(seed * operations.length)]
  const first = generateNumberInRange(numberRange.first, seed * 0.3)
  const second = generateNumberInRange(numberRange.second, seed * 0.7)

  const problem = buildProblem(operation, first, second)
  if (!problem) return null

  return {
    ...problem,
    operation,
    metadata: {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title
    }
  }
}

function generateNumberInRange(rangeConfig, seed) {
  const { min, max, filter } = rangeConfig
  let candidates = []

  for (let i = min; i <= max; i++) {
    if (matchesFilter(i, filter)) {
      candidates.push(i)
    }
  }

  if (candidates.length === 0) {
    candidates = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }

  return candidates[Math.floor(seed * candidates.length)]
}

function matchesFilter(num, filter) {
  switch (filter) {
    case 'even':
      return num % 2 === 0
    case 'odd':
      return num % 2 !== 0
    case 'ten':
      return num % 10 === 0
    case 'five':
      return num % 5 === 0
    case 'all':
    default:
      return true
  }
}

function buildProblem(operation, first, second) {
  switch (operation) {
    case 'addition':
      return {
        type: 'arithmetic',
        format: `${first} + ${second}`,
        answer: first + second,
        correctAnswer: String(first + second)
      }
    case 'subtraction':
      return {
        type: 'arithmetic',
        format: `${first} - ${second}`,
        answer: first - second,
        correctAnswer: String(first - second)
      }
    case 'multiplication':
      return {
        type: 'arithmetic',
        format: `${first} × ${second}`,
        answer: first * second,
        correctAnswer: String(first * second)
      }
    case 'division':
      if (second === 0) return null
      const quotient = Math.floor(first / second)
      const remainder = first % second
      if (remainder !== 0) return null
      return {
        type: 'arithmetic',
        format: `${first} ÷ ${second}`,
        answer: quotient,
        correctAnswer: String(quotient)
      }
    default:
      return null
  }
}

export function validateMathPracticeAssignment(assignment) {
  if (!assignment || assignment.kind !== 'math_practice') return false

  const { operations, numberRange, targetCount } = assignment
  if (!Array.isArray(operations) || operations.length === 0) return false
  if (!numberRange || !numberRange.first || !numberRange.second) return false
  if (!Number.isFinite(targetCount) || targetCount <= 0) return false

  return true
}
