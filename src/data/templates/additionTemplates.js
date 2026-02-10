/**
 * Addition Templates - Organiserade per svårighetsgrad
 *
 * Conceptual levels (12 nivåer):
 * 1  = 1+1 siffrig utan tiövergang (3+4=7)
 * 2  = 1+1 siffrig med tiövergang (7+8=15)
 * 3  = 1+2 siffrig utan tiövergang (5+23=28)
 * 4  = 1+2 siffrig med tiövergang (8+47=55)
 * 5  = 2+2 siffrig utan tiövergang (23+14=37)
 * 6  = 2+2 siffrig med tiövergang (47+38=85)
 * 7  = 1+3 siffrig utan tiövergang (4+123=127)
 * 8  = 1+3 siffrig med tiövergang (8+456=464)
 * 9  = 2+3 siffrig utan tiövergang (23+145=168)
 * 10 = 2+3 siffrig med tiövergang (67+258=325)
 * 11 = 3+3 siffrig utan tiövergang (234+145=379)
 * 12 = 3+3 siffrig med tiövergang (456+378=834)
 *
 * Metadata per problem:
 * - termOrder: "bigFirst" | "smallFirst" (slumpas, loggas för analys)
 * - carryCount: antal tiövergångar (för adaption inom nivå)
 */

export const additionTemplates = [
  // LEVEL 1: 1+1 siffrig utan tiövergang
  {
    id: 'add_1d_1d_no_carry',
    type: 'addition',
    grade: 4,
    difficulty: {
      conceptual_level: 1,
      cognitive_load: {
        working_memory: 1,
        steps_required: 1,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 1,
        b_digits: 1
      }
    },
    generator: {
      constraints: {
        a: { min: 2, max: 8 },
        b: { min: 2, max: 8 },
        result: { max: 9 }
      }
    },
    metadata: {
      estimated_time: 10,
      description: '1+1 siffrig utan tiövergang'
    }
  },

  // LEVEL 2: 1+1 siffrig med tiövergang
  {
    id: 'add_1d_1d_carry',
    type: 'addition',
    grade: 4,
    difficulty: {
      conceptual_level: 2,
      cognitive_load: {
        working_memory: 1,
        steps_required: 1,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 1,
        b_digits: 1
      }
    },
    generator: {
      constraints: {
        a: { min: 2, max: 9 },
        b: { min: 2, max: 9 },
        result: { min: 10, max: 18 }
      }
    },
    metadata: {
      estimated_time: 15,
      description: '1+1 siffrig med tiövergang'
    }
  },

  // LEVEL 3: 1+2 siffrig utan tiövergang
  {
    id: 'add_1d_2d_no_carry',
    type: 'addition',
    grade: 4,
    difficulty: {
      conceptual_level: 3,
      cognitive_load: {
        working_memory: 2,
        steps_required: 2,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 1,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 2, max: 7 },
        b: { min: 11, max: 92 },
        result: { max: 99 }
      }
    },
    metadata: {
      estimated_time: 15,
      description: '1+2 siffrig utan tiövergang'
    }
  },

  // LEVEL 4: 1+2 siffrig med tiövergang
  {
    id: 'add_1d_2d_carry',
    type: 'addition',
    grade: 4,
    difficulty: {
      conceptual_level: 4,
      cognitive_load: {
        working_memory: 2,
        steps_required: 2,
        intermediate_values: 1
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 1,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 3, max: 9 },
        b: { min: 15, max: 95 },
        result: { min: 20, max: 104 }
      }
    },
    metadata: {
      estimated_time: 20,
      description: '1+2 siffrig med tiövergang'
    }
  },

  // LEVEL 5: 2+2 siffrig utan tiövergang
  {
    id: 'add_2d_2d_no_carry',
    type: 'addition',
    grade: 4,
    difficulty: {
      conceptual_level: 5,
      cognitive_load: {
        working_memory: 2,
        steps_required: 2,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 2,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 11, max: 54 },
        b: { min: 11, max: 44 },
        result: { max: 99 }
      }
    },
    metadata: {
      estimated_time: 20,
      description: '2+2 siffrig utan tiövergang'
    }
  },

  // LEVEL 6: 2+2 siffrig med tiövergang
  {
    id: 'add_2d_2d_carry',
    type: 'addition',
    grade: 4,
    difficulty: {
      conceptual_level: 6,
      cognitive_load: {
        working_memory: 2,
        steps_required: 2,
        intermediate_values: 1
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 2,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 15, max: 89 },
        b: { min: 15, max: 89 },
        result: { min: 30, max: 178 }
      }
    },
    metadata: {
      estimated_time: 30,
      description: '2+2 siffrig med tiövergang'
    }
  },

  // LEVEL 7: 1+3 siffrig utan tiövergang
  {
    id: 'add_1d_3d_no_carry',
    type: 'addition',
    grade: 5,
    difficulty: {
      conceptual_level: 7,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 1,
        b_digits: 3
      }
    },
    generator: {
      constraints: {
        a: { min: 2, max: 7 },
        b: { min: 111, max: 892 },
        result: { max: 899 }
      }
    },
    metadata: {
      estimated_time: 25,
      description: '1+3 siffrig utan tiövergang'
    }
  },

  // LEVEL 8: 1+3 siffrig med tiövergang
  {
    id: 'add_1d_3d_carry',
    type: 'addition',
    grade: 5,
    difficulty: {
      conceptual_level: 8,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 1
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 1,
        b_digits: 3
      }
    },
    generator: {
      constraints: {
        a: { min: 3, max: 9 },
        b: { min: 115, max: 995 },
        result: { min: 120, max: 1004 }
      }
    },
    metadata: {
      estimated_time: 30,
      description: '1+3 siffrig med tiövergang'
    }
  },

  // LEVEL 9: 2+3 siffrig utan tiövergang
  {
    id: 'add_2d_3d_no_carry',
    type: 'addition',
    grade: 5,
    difficulty: {
      conceptual_level: 9,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 2,
        b_digits: 3
      }
    },
    generator: {
      constraints: {
        a: { min: 11, max: 54 },
        b: { min: 111, max: 444 },
        result: { max: 498 }
      }
    },
    metadata: {
      estimated_time: 30,
      description: '2+3 siffrig utan tiövergang'
    }
  },

  // LEVEL 10: 2+3 siffrig med tiövergang
  {
    id: 'add_2d_3d_carry',
    type: 'addition',
    grade: 5,
    difficulty: {
      conceptual_level: 10,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 2
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 2,
        b_digits: 3
      }
    },
    generator: {
      constraints: {
        a: { min: 25, max: 89 },
        b: { min: 150, max: 850 },
        result: { min: 180, max: 939 }
      }
    },
    metadata: {
      estimated_time: 35,
      description: '2+3 siffrig med tiövergang'
    }
  },

  // LEVEL 11: 3+3 siffrig utan tiövergang
  {
    id: 'add_3d_3d_no_carry',
    type: 'addition',
    grade: 5,
    difficulty: {
      conceptual_level: 11,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 0
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 3,
        b_digits: 3
      }
    },
    generator: {
      constraints: {
        a: { min: 111, max: 444 },
        b: { min: 111, max: 444 },
        result: { max: 888 }
      }
    },
    metadata: {
      estimated_time: 35,
      description: '3+3 siffrig utan tiövergang'
    }
  },

  // LEVEL 12: 3+3 siffrig med tiövergang
  {
    id: 'add_3d_3d_carry',
    type: 'addition',
    grade: 5,
    difficulty: {
      conceptual_level: 12,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 2
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: false
      },
      magnitude: {
        a_digits: 3,
        b_digits: 3
      }
    },
    generator: {
      constraints: {
        a: { min: 150, max: 850 },
        b: { min: 150, max: 850 },
        result: { min: 300, max: 1700 }
      }
    },
    metadata: {
      estimated_time: 45,
      description: '3+3 siffrig med tiövergang'
    }
  }
]

/**
 * Hämta template baserat på svårighetsgrad
 */
export function getTemplateByLevel(level) {
  return additionTemplates.find(t => t.difficulty.conceptual_level === level)
}

/**
 * Hämta templates för en specifik årskurs
 */
export function getTemplatesByGrade(grade) {
  return additionTemplates.filter(t => t.grade === grade)
}
