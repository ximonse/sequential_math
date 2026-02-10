/**
 * Division Templates - Graderad progression
 *
 * Fokus:
 * - Exakt division utan rest (MVP)
 * - Talstorlek 1d -> 3d
 * - Enkel till mer blandad tabellfakta
 */

export const divisionTemplates = [
  {
    id: 'div_1d_1d_easy',
    type: 'division',
    grade: 4,
    difficulty: {
      conceptual_level: 3,
      cognitive_load: { working_memory: 1, steps_required: 1, intermediate_values: 0 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: false },
      magnitude: { a_digits: 1, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 4, max: 36 },
        b: { min: 2, max: 6 },
        result: { min: 2, max: 9 }
      }
    },
    metadata: { estimated_time: 14, description: 'Enkel exakt division' }
  },
  {
    id: 'div_2d_1d_basic',
    type: 'division',
    grade: 4,
    difficulty: {
      conceptual_level: 4,
      cognitive_load: { working_memory: 2, steps_required: 2, intermediate_values: 0 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: false },
      magnitude: { a_digits: 2, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 12, max: 81 },
        b: { min: 2, max: 9 },
        result: { min: 2, max: 40 }
      }
    },
    metadata: { estimated_time: 18, description: '2-siffrig delat med 1-siffrig' }
  },
  {
    id: 'div_2d_1d_full',
    type: 'division',
    grade: 4,
    difficulty: {
      conceptual_level: 5,
      cognitive_load: { working_memory: 2, steps_required: 2, intermediate_values: 1 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: false },
      magnitude: { a_digits: 2, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 18, max: 99 },
        b: { min: 2, max: 9 },
        result: { min: 2, max: 49 }
      }
    },
    metadata: { estimated_time: 22, description: '2-siffrig division full' }
  },
  {
    id: 'div_3d_1d_easy',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 6,
      cognitive_load: { working_memory: 2, steps_required: 3, intermediate_values: 1 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 100, max: 360 },
        b: { min: 2, max: 6 },
        result: { min: 12, max: 180 }
      }
    },
    metadata: { estimated_time: 24, description: '3-siffrig delat med liten divisor' }
  },
  {
    id: 'div_3d_1d_full',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 7,
      cognitive_load: { working_memory: 3, steps_required: 3, intermediate_values: 1 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 108, max: 999 },
        b: { min: 2, max: 9 },
        result: { min: 12, max: 499 }
      }
    },
    metadata: { estimated_time: 28, description: '3-siffrig delat med 1-siffrig' }
  },
  {
    id: 'div_3d_2d_guided',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 8,
      cognitive_load: { working_memory: 3, steps_required: 3, intermediate_values: 2 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: true },
      magnitude: { a_digits: 3, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 120, max: 980 },
        b: { min: 10, max: 25 },
        result: { min: 4, max: 98 }
      }
    },
    metadata: { estimated_time: 34, description: '3-siffrig delat med 2-siffrig guidad' }
  },
  {
    id: 'div_3d_2d_full',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 9,
      cognitive_load: { working_memory: 3, steps_required: 4, intermediate_values: 2 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: true },
      magnitude: { a_digits: 3, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 144, max: 999 },
        b: { min: 11, max: 49 },
        result: { min: 3, max: 90 }
      }
    },
    metadata: { estimated_time: 40, description: '3-siffrig delat med 2-siffrig' }
  },
  {
    id: 'div_4d_2d_guided',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 10,
      cognitive_load: { working_memory: 4, steps_required: 4, intermediate_values: 2 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: true },
      magnitude: { a_digits: 4, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 1000, max: 4999 },
        b: { min: 12, max: 39 },
        result: { min: 12, max: 299 }
      }
    },
    metadata: { estimated_time: 48, description: '4-siffrig delat med 2-siffrig guidad' }
  },
  {
    id: 'div_4d_2d_full',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 11,
      cognitive_load: { working_memory: 4, steps_required: 4, intermediate_values: 3 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: true },
      magnitude: { a_digits: 4, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 1200, max: 9999 },
        b: { min: 12, max: 79 },
        result: { min: 12, max: 500 }
      }
    },
    metadata: { estimated_time: 55, description: '4-siffrig delat med 2-siffrig full' }
  },
  {
    id: 'div_4d_3d_full',
    type: 'division',
    grade: 5,
    difficulty: {
      conceptual_level: 12,
      cognitive_load: { working_memory: 4, steps_required: 4, intermediate_values: 3 },
      procedural: { num_terms: 2, exact_division: true, mixed_digits: true },
      magnitude: { a_digits: 4, b_digits: 3 }
    },
    generator: {
      constraints: {
        a: { min: 1500, max: 9999 },
        b: { min: 101, max: 399 },
        result: { min: 3, max: 90 }
      }
    },
    metadata: { estimated_time: 65, description: '4-siffrig delat med 3-siffrig' }
  }
]

