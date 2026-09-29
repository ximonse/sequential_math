// Representative prompts checked against each domain's level generator.
// Keep these static so reading the teacher overview never advances the
// exercise generators' shared rotation state.
const LEVEL_EXAMPLES = {
  addition: [
    '2 + 4', '6 + 5', '72 + 7', '4,2 + 1,4', '6,4 + 5', '46 + 89',
    '833 + 6', '6 + 745', '41 + 324', '34,4 + 30,51', '145 + 140', '709 + 214'
  ],
  subtraction: [
    '8 − 3', '17 − 8', '68 − 6', '4,1 − 3', '8,1 − 7,4', '71 − 22',
    '27,6 − 5,2', '162 − 4', '289 − 21', '69,63 − 41,23', '895 − 624', '703 − 436'
  ],
  multiplication: [
    '4 × 2', '6 × 3', '4 × 4', '7 × 3', '2 × 3', '6,2 × 8',
    '1,3 × 2', '24 × 28', '76 × 39', '8 × 833', '21 × 264', '3,8 × 7,15'
  ],
  division: [
    '6 ÷ 2', '16 ÷ 4', '12 ÷ 2', '80 ÷ 5', '27 ÷ 3', '130 ÷ 2',
    '204 ÷ 6', '621 ÷ 23', '147 ÷ 49', '4030 ÷ 31', '1200 ÷ 60', '7104 ÷ 296'
  ],
  algebra_evaluate: [
    'Beräkna värdet av a + 5 när a = 6', 'Beräkna värdet av 16 − a när a = 8',
    'Beräkna värdet av b + b när b = 7', 'Beräkna värdet av b + b när b = 7',
    'Beräkna värdet av 3x när x = 2', 'Beräkna värdet av 2a + 9 när a = 3',
    'Beräkna värdet av 3x − 6 när x = 5', 'Beräkna värdet av 11 + 7a när a = 9',
    'Beräkna värdet av 3y + 8 − 14 när y = 9', 'Beräkna värdet av 4y + 5x när x = 7, y = 2',
    'Beräkna värdet av 7a + 6 − 5b när a = 9, b = 5',
    'Beräkna värdet av 5 + 6x + 5y när x = 6, y = 7'
  ],
  algebra_simplify: [
    'Förenkla: y + y', 'Förenkla: 2a + a', 'Förenkla: 8a − 7a',
    'Förenkla: y + 11 + y', 'Förenkla: 3a + 9 + 5a',
    'Förenkla: 2a + 10 + 5a + 7', 'Förenkla: 2b + 6a + 3a',
    'Förenkla: 2y + 5x + 2y + 1x', 'Förenkla: 2(2 + y)',
    'Förenkla: 4(y + 5)', 'Förenkla: 2x + 5(x + 6)',
    'Förenkla: 3(b + 5) + 4(b + 2)'
  ],
  arithmetic_expressions: [
    '4 × 5 + 8', '10 − 3 × 2', '10 + 16 ÷ 8', '9 − 24 ÷ 4',
    '5 × 6 + 4 × 2', '(6 + 5) × 6', '(4 − 2) × 2',
    '4 × 6 − 5 × 2', '26 + (5 + 8) × 3 − 26',
    '(2 + 4) × (10 − 5)', '2 × (6 + 2) − 5 × 2', '(3 + 17) ÷ 4 + 6 × 3'
  ],
  fractions: [
    '1/4 + 1/4', '2/7 − 1/7', 'Förenkla: 2/6',
    '16/4 (Förenkla svaret.)', '3/4 + 1/12', '5/8 − 1/4',
    '1/2 + 1/5', '7/8 − 2/3 (Förenkla svaret.)',
    '3/4 × 4', '3/4 × 2/9', '1/8 + 3/8 + 1/2', '11/12 + 1/6 − 1/4'
  ],
  percentage: [
    'Hur mycket är 50 % av 100?', 'Beräkna 50 % av 144.',
    'Vad är 10 % av 220?', 'Hur mycket är 25 % av 168?',
    'Vad är 75 % av 304?', 'Beräkna 20 % av 465.',
    'Vad är 5 % av 440?', 'Beräkna 25 % av 12.',
    'Hur mycket är 25 % av 100?',
    'Du får 30 % rabatt på 100 kr. Vad betalar du?',
    'Ett pris är 100 kr och höjs med 30 %. Vad är det nya priset?',
    'Beräkna procentandelen: 10 av 20.'
  ],
  number_bonds: [
    '3 + ? = 10', '? + 6 = 10', '8 + ? = 10', '? + 9 = 10',
    '4 + ? = 15', '? + 7 = 15', '11 + ? = 15', '? + 13 = 15',
    '6 + ? = 20', '? + 9 = 20', '14 + ? = 20', '? + 17 = 20'
  ],
  doubles: [
    '4 + 4', '8 + 8', '13 + 13', '18 + 18', '22 + 22', '28 + 28',
    '38 + 38', '2 × 14', '19 × 2', '2 × 23',
    '2 × ? = 68', '76 ÷ 2'
  ]
}

export function getLevelExample(operation, level) {
  return Number.isInteger(level) && level >= 1 && level <= 12
    ? LEVEL_EXAMPLES[operation]?.[level - 1] || ''
    : ''
}
