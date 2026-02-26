function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const TEMPLATES = [
  // Level 1: 50% av X
  () => {
    const x = 2 * rand(10, 100)
    return { text: `Vad är 50% av ${x}?`, answer: x / 2 }
  },
  // Level 2: 25% av X
  () => {
    const x = 4 * rand(10, 50)
    return { text: `Vad är 25% av ${x}?`, answer: x / 4 }
  },
  // Level 3: 10% av X
  () => {
    const x = 10 * rand(10, 50)
    return { text: `Vad är 10% av ${x}?`, answer: x / 10 }
  },
  // Level 4: 75% av X
  () => {
    const x = 4 * rand(10, 50)
    return { text: `Vad är 75% av ${x}?`, answer: 3 * x / 4 }
  },
  // Level 5: 20% av X
  () => {
    const x = 5 * rand(10, 60)
    return { text: `Vad är 20% av ${x}?`, answer: x / 5 }
  },
  // Level 6: 5% av X
  () => {
    const x = 20 * rand(5, 25)
    return { text: `Vad är 5% av ${x}?`, answer: x / 20 }
  },
  // Level 7: p% av 100
  () => {
    const p = pick([10, 20, 25, 30, 40, 50, 60, 70, 75, 80])
    return { text: `Vad är ${p}% av 100?`, answer: p }
  },
  // Level 8: p% av X (p ∈ {10,25,50}, integer result)
  () => {
    const p = pick([10, 25, 50])
    const x = (100 / p) * rand(2, 20)
    return { text: `Vad är ${p}% av ${x}?`, answer: p * x / 100 }
  },
  // Level 9: p% av X (p ∈ {5,10,20,25,50}, larger X)
  () => {
    const p = pick([5, 10, 20, 25, 50])
    const x = (100 / p) * rand(5, 40)
    return { text: `Beräkna ${p}% av ${x}.`, answer: p * x / 100 }
  },
  // Level 10: Rabatt — vad kostar X efter p% rabatt?
  () => {
    const p = pick([10, 20, 25, 50])
    const x = (100 / p) * rand(5, 40)
    const discount = p * x / 100
    return {
      text: `En vara kostar ${x} kr. Det är ${p}% rabatt. Vad kostar varan nu?`,
      answer: x - discount
    }
  },
  // Level 11: p% ökning
  () => {
    const p = pick([10, 20, 25, 50])
    const x = (100 / p) * rand(4, 20)
    const increase = p * x / 100
    return {
      text: `Ett pris är ${x} kr och höjs med ${p}%. Vad är det nya priset?`,
      answer: x + increase
    }
  },
  // Level 12: Hur många procent är X av Y?
  () => {
    const p = pick([10, 20, 25, 40, 50, 75, 80])
    const y = (100 / p) * rand(2, 10)
    const x = y * p / 100
    return {
      text: `Hur många procent är ${x} av ${y}?`,
      answer: p
    }
  }
]

export function generatePercentageProblem(skill, level) {
  const idx = Math.max(0, Math.min(11, Math.round(Number(level || 1)) - 1))
  const tpl = TEMPLATES[idx]()
  return {
    domain: 'percentage',
    skill: 'percentage',
    type: 'percentage',
    level: idx + 1,
    difficulty: { conceptual_level: idx + 1 },
    display: { type: 'expression', text: tpl.text },
    values: { text: tpl.text },
    answer: { type: 'number', correct: tpl.answer },
    result: tpl.answer,
    generated_at: Date.now()
  }
}
