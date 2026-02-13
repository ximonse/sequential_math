/**
 * Multiplication Templates - Graderad progression
 *
 * Svårighetsdimensioner i multiplikation:
 * - Tabell-familiaritet (enkla faktorer -> full 2-9)
 * - Talstorlek (1d*1d -> 2d*3d)
 * - Carry i delberäkningar (utan/med)
 * - Place value-hantering (tiotal/hundratal)
 */

export const multiplicationTemplates = [
  // LEVEL 3: 1d * 1d (enkla tabeller)
  {
    id: 'mul_1d_1d_easy',
    type: 'multiplication',
    grade: 4,
    difficulty: {
      conceptual_level: 3,
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
        a: { min: 2, max: 5 },
        b: { min: 2, max: 5 },
        result: { min: 4, max: 25 }
      }
    },
    metadata: {
      estimated_time: 12,
      description: '1d*1d enkla tabeller'
    }
  },

  // LEVEL 4: 1d * 1d (full tabell 2-9)
  {
    id: 'mul_1d_1d_full',
    type: 'multiplication',
    grade: 4,
    difficulty: {
      conceptual_level: 4,
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
        result: { min: 4, max: 81 }
      }
    },
    metadata: {
      estimated_time: 15,
      description: '1d*1d full tabell'
    }
  },

  // LEVEL 5: 1d * 2d (utan carry i entalsdel)
  {
    id: 'mul_1d_2d_no_carry',
    type: 'multiplication',
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
        mixed_digits: true
      },
      magnitude: {
        a_digits: 1,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 2, max: 4 },
        b: { min: 12, max: 39 },
        result: { min: 24, max: 156 }
      }
    },
    metadata: {
      estimated_time: 20,
      description: '1d*2d utan carry i entalsdel'
    }
  },

  // LEVEL 6: 1d * 2d (med carry)
  {
    id: 'mul_1d_2d_with_carry',
    type: 'multiplication',
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
        b: { min: 14, max: 89 },
        result: { min: 42, max: 801 }
      }
    },
    metadata: {
      estimated_time: 25,
      description: '1d*2d med carry'
    }
  },

  // LEVEL 7: 2d * 2d (tiotalsvänligt)
  {
    id: 'mul_2d_2d_tens_friendly',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 7,
      cognitive_load: {
        working_memory: 2,
        steps_required: 2,
        intermediate_values: 1
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
        a: { min: 10, max: 90 },
        b: { min: 10, max: 90 },
        result: { min: 100, max: 8100 }
      }
    },
    metadata: {
      estimated_time: 30,
      description: '2d*2d tiotalsvänligt'
    }
  },

  // LEVEL 8: 2d * 2d (små tvåsiffriga)
  {
    id: 'mul_2d_2d_small',
    type: 'multiplication',
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
        mixed_digits: false
      },
      magnitude: {
        a_digits: 2,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 11, max: 29 },
        b: { min: 11, max: 29 },
        result: { min: 121, max: 841 }
      }
    },
    metadata: {
      estimated_time: 35,
      description: '2d*2d små tal'
    }
  },

  // LEVEL 9: 2d * 2d (full)
  {
    id: 'mul_2d_2d_full',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 9,
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
        a_digits: 2,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 12, max: 99 },
        b: { min: 12, max: 99 },
        result: { min: 144, max: 9801 }
      }
    },
    metadata: {
      estimated_time: 40,
      description: '2d*2d full'
    }
  },

  // LEVEL 10: 1d * 3d
  {
    id: 'mul_1d_3d',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 10,
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
        a: { min: 2, max: 9 },
        b: { min: 111, max: 999 },
        result: { min: 222, max: 8991 }
      }
    },
    metadata: {
      estimated_time: 45,
      description: '1d*3d'
    }
  },

  // LEVEL 11: 2d * 3d (vänligare intervall)
  {
    id: 'mul_2d_3d_guided',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 11,
      cognitive_load: {
        working_memory: 3,
        steps_required: 4,
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
        a: { min: 11, max: 39 },
        b: { min: 120, max: 499 },
        result: { min: 1320, max: 19500 }
      }
    },
    metadata: {
      estimated_time: 55,
      description: '2d*3d guidat'
    }
  },

  // LEVEL 12: 2d * 3d (full)
  {
    id: 'mul_2d_3d_full',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 12,
      cognitive_load: {
        working_memory: 4,
        steps_required: 4,
        intermediate_values: 3
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
        a: { min: 12, max: 99 },
        b: { min: 111, max: 999 },
        result: { min: 1332, max: 98901 }
      }
    },
    metadata: {
      estimated_time: 65,
      description: '2d*3d full'
    }
  },

  // LEVEL 5: decimal (1 decimal) * 1d utan carry
  {
    id: 'mul_dec_1dp_1d_no_carry',
    type: 'multiplication',
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
        mixed_digits: true
      },
      magnitude: {
        a_digits: 2,
        b_digits: 1
      }
    },
    generator: {
      constraints: {
        a: { min: 1.2, max: 4.8, step: 0.1 },
        b: { min: 2, max: 4 },
        result: { min: 2.4, max: 19.2 }
      }
    },
    metadata: {
      estimated_time: 20,
      description: 'Decimal (1 decimal) * 1-siffrigt utan carry'
    }
  },

  // LEVEL 6: decimal (1 decimal) * 1d
  {
    id: 'mul_dec_1dp_1d',
    type: 'multiplication',
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
        mixed_digits: true
      },
      magnitude: {
        a_digits: 2,
        b_digits: 1
      }
    },
    generator: {
      constraints: {
        a: { min: 1.2, max: 9.8, step: 0.1 },
        b: { min: 2, max: 9 },
        result: { min: 2.4, max: 88.2 }
      }
    },
    metadata: {
      estimated_time: 25,
      description: 'Decimal (1 decimal) * 1-siffrigt'
    }
  },

  // LEVEL 7: decimal (1 decimal) * decimal (1 decimal) utan carry
  {
    id: 'mul_dec_1dp_1dp_no_carry',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 7,
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
        a_digits: 2,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 1.1, max: 4.9, step: 0.1 },
        b: { min: 1.1, max: 4.9, step: 0.1 },
        result: { min: 1.21, max: 24.01 }
      }
    },
    metadata: {
      estimated_time: 28,
      description: 'Decimal (1 decimal) * decimal (1 decimal) utan carry'
    }
  },

  // LEVEL 8: decimal (1 decimal) * decimal (1 decimal)
  {
    id: 'mul_dec_1dp_1dp',
    type: 'multiplication',
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
        a_digits: 2,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 1.2, max: 9.9, step: 0.1 },
        b: { min: 1.1, max: 9.9, step: 0.1 },
        result: { min: 1.32, max: 98.01 }
      }
    },
    metadata: {
      estimated_time: 35,
      description: 'Decimal (1 decimal) * decimal (1 decimal)'
    }
  },

  // LEVEL 9: decimal (2 decimaler) * 1d utan carry
  {
    id: 'mul_dec_2dp_1d_no_carry',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 9,
      cognitive_load: {
        working_memory: 3,
        steps_required: 3,
        intermediate_values: 1
      },
      procedural: {
        num_terms: 2,
        requires_carry: false,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 3,
        b_digits: 1
      }
    },
    generator: {
      constraints: {
        a: { min: 1.11, max: 4.44, step: 0.01 },
        b: { min: 2, max: 4 },
        result: { min: 2.22, max: 17.76 }
      }
    },
    metadata: {
      estimated_time: 36,
      description: 'Decimal (2 decimaler) * 1-siffrigt utan carry'
    }
  },

  // LEVEL 10: decimal (2 decimaler) * 1d
  {
    id: 'mul_dec_2dp_1d',
    type: 'multiplication',
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
        a_digits: 3,
        b_digits: 1
      }
    },
    generator: {
      constraints: {
        a: { min: 1.11, max: 9.99, step: 0.01 },
        b: { min: 2, max: 9 },
        result: { min: 2.22, max: 89.91 }
      }
    },
    metadata: {
      estimated_time: 45,
      description: 'Decimal (2 decimaler) * 1-siffrigt'
    }
  },

  // LEVEL 12: decimal (2 decimaler) * decimal (1 decimal)
  {
    id: 'mul_dec_2dp_1dp',
    type: 'multiplication',
    grade: 5,
    difficulty: {
      conceptual_level: 12,
      cognitive_load: {
        working_memory: 4,
        steps_required: 4,
        intermediate_values: 3
      },
      procedural: {
        num_terms: 2,
        requires_carry: true,
        mixed_digits: true
      },
      magnitude: {
        a_digits: 3,
        b_digits: 2
      }
    },
    generator: {
      constraints: {
        a: { min: 1.11, max: 9.99, step: 0.01 },
        b: { min: 1.1, max: 9.9, step: 0.1 },
        result: { min: 1.221, max: 98.901 }
      }
    },
    metadata: {
      estimated_time: 60,
      description: 'Decimal (2 decimaler) * decimal (1 decimal)'
    }
  }
]

export function getMultiplicationTemplateByLevel(level) {
  return multiplicationTemplates.find(t => t.difficulty.conceptual_level === level)
}
