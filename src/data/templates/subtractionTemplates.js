/**
 * Subtraction Templates - Organiserade per svårighetsgrad
 *
 * Conceptual levels (12 nivåer):
 * 1  = 1-1 siffrig utan växling (8-3=5)
 * 2  = 1-1 siffrig med växling (12-7=5-liknande mönster i ental)
 * 3  = 2-1 siffrig utan växling
 * 4  = 2-1 siffrig med växling
 * 5  = 2-2 siffrig utan växling
 * 6  = 2-2 siffrig med växling
 * 7  = 3-1 siffrig utan växling
 * 8  = 3-1 siffrig med växling
 * 9  = 3-2 siffrig utan växling
 * 10 = 3-2 siffrig med växling
 * 11 = 3-3 siffrig utan växling
 * 12 = 3-3 siffrig med växling
 */

export const subtractionTemplates = [
  {
    id: 'sub_1d_1d_no_borrow',
    type: 'subtraction',
    grade: 4,
    difficulty: {
      conceptual_level: 1,
      cognitive_load: { working_memory: 1, steps_required: 1, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_borrow: false, mixed_digits: false },
      magnitude: { a_digits: 1, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 4, max: 9 },
        b: { min: 2, max: 8 },
        result: { min: 1, max: 8 }
      }
    },
    metadata: { estimated_time: 12, description: '1-1 siffrig utan växling' }
  },
  {
    id: 'sub_1d_1d_borrow',
    type: 'subtraction',
    grade: 4,
    difficulty: {
      conceptual_level: 2,
      cognitive_load: { working_memory: 1, steps_required: 1, intermediate_values: 1 },
      procedural: { num_terms: 2, requires_borrow: true, mixed_digits: false },
      magnitude: { a_digits: 1, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 11, max: 18 },
        b: { min: 2, max: 9 },
        result: { min: 2, max: 16 }
      }
    },
    metadata: { estimated_time: 16, description: '1-1 siffrig med växling' }
  },
  {
    id: 'sub_2d_1d_no_borrow',
    type: 'subtraction',
    grade: 4,
    difficulty: {
      conceptual_level: 3,
      cognitive_load: { working_memory: 2, steps_required: 2, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_borrow: false, mixed_digits: false },
      magnitude: { a_digits: 2, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 20, max: 98 },
        b: { min: 2, max: 8 },
        result: { min: 10, max: 96 }
      }
    },
    metadata: { estimated_time: 18, description: '2-1 siffrig utan växling' }
  },
  {
    id: 'sub_2d_1d_borrow',
    type: 'subtraction',
    grade: 4,
    difficulty: {
      conceptual_level: 4,
      cognitive_load: { working_memory: 2, steps_required: 2, intermediate_values: 1 },
      procedural: { num_terms: 2, requires_borrow: true, mixed_digits: false },
      magnitude: { a_digits: 2, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 20, max: 99 },
        b: { min: 2, max: 9 },
        result: { min: 10, max: 97 }
      }
    },
    metadata: { estimated_time: 22, description: '2-1 siffrig med växling' }
  },
  {
    id: 'sub_2d_2d_no_borrow',
    type: 'subtraction',
    grade: 4,
    difficulty: {
      conceptual_level: 5,
      cognitive_load: { working_memory: 2, steps_required: 2, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_borrow: false, mixed_digits: false },
      magnitude: { a_digits: 2, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 25, max: 99 },
        b: { min: 11, max: 88 },
        result: { min: 5, max: 88 }
      }
    },
    metadata: { estimated_time: 24, description: '2-2 siffrig utan växling' }
  },
  {
    id: 'sub_2d_2d_borrow',
    type: 'subtraction',
    grade: 4,
    difficulty: {
      conceptual_level: 6,
      cognitive_load: { working_memory: 2, steps_required: 2, intermediate_values: 1 },
      procedural: { num_terms: 2, requires_borrow: true, mixed_digits: false },
      magnitude: { a_digits: 2, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 30, max: 99 },
        b: { min: 12, max: 89 },
        result: { min: 3, max: 87 }
      }
    },
    metadata: { estimated_time: 28, description: '2-2 siffrig med växling' }
  },
  {
    id: 'sub_3d_1d_no_borrow',
    type: 'subtraction',
    grade: 5,
    difficulty: {
      conceptual_level: 7,
      cognitive_load: { working_memory: 2, steps_required: 3, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_borrow: false, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 120, max: 999 },
        b: { min: 2, max: 8 },
        result: { min: 112, max: 997 }
      }
    },
    metadata: { estimated_time: 26, description: '3-1 siffrig utan växling' }
  },
  {
    id: 'sub_3d_1d_borrow',
    type: 'subtraction',
    grade: 5,
    difficulty: {
      conceptual_level: 8,
      cognitive_load: { working_memory: 3, steps_required: 3, intermediate_values: 1 },
      procedural: { num_terms: 2, requires_borrow: true, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 1 }
    },
    generator: {
      constraints: {
        a: { min: 120, max: 999 },
        b: { min: 2, max: 9 },
        result: { min: 111, max: 997 }
      }
    },
    metadata: { estimated_time: 32, description: '3-1 siffrig med växling' }
  },
  {
    id: 'sub_3d_2d_no_borrow',
    type: 'subtraction',
    grade: 5,
    difficulty: {
      conceptual_level: 9,
      cognitive_load: { working_memory: 3, steps_required: 3, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_borrow: false, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 150, max: 999 },
        b: { min: 11, max: 89 },
        result: { min: 61, max: 988 }
      }
    },
    metadata: { estimated_time: 34, description: '3-2 siffrig utan växling' }
  },
  {
    id: 'sub_3d_2d_borrow',
    type: 'subtraction',
    grade: 5,
    difficulty: {
      conceptual_level: 10,
      cognitive_load: { working_memory: 3, steps_required: 3, intermediate_values: 2 },
      procedural: { num_terms: 2, requires_borrow: true, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 2 }
    },
    generator: {
      constraints: {
        a: { min: 150, max: 999 },
        b: { min: 12, max: 95 },
        result: { min: 55, max: 987 }
      }
    },
    metadata: { estimated_time: 40, description: '3-2 siffrig med växling' }
  },
  {
    id: 'sub_3d_3d_no_borrow',
    type: 'subtraction',
    grade: 5,
    difficulty: {
      conceptual_level: 11,
      cognitive_load: { working_memory: 3, steps_required: 3, intermediate_values: 0 },
      procedural: { num_terms: 2, requires_borrow: false, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 3 }
    },
    generator: {
      constraints: {
        a: { min: 200, max: 999 },
        b: { min: 111, max: 888 },
        result: { min: 5, max: 888 }
      }
    },
    metadata: { estimated_time: 42, description: '3-3 siffrig utan växling' }
  },
  {
    id: 'sub_3d_3d_borrow',
    type: 'subtraction',
    grade: 5,
    difficulty: {
      conceptual_level: 12,
      cognitive_load: { working_memory: 4, steps_required: 3, intermediate_values: 2 },
      procedural: { num_terms: 2, requires_borrow: true, mixed_digits: false },
      magnitude: { a_digits: 3, b_digits: 3 }
    },
    generator: {
      constraints: {
        a: { min: 250, max: 999 },
        b: { min: 111, max: 949 },
        result: { min: 3, max: 888 }
      }
    },
    metadata: { estimated_time: 48, description: '3-3 siffrig med växling' }
  }
]

