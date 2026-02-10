# Problem Structure & Generation

## Problem Template Definition

Varje problemtyp definieras som en template med multidimensionell svårighetsgrad.

### Template Schema

```javascript
{
  // === IDENTITET ===
  id: "add_2term_1-10_no-carry_001",
  type: "addition",           // addition, subtraction, multiplication, division
  category: "basic_arithmetic",
  grade: 4,                   // Årskurs (4, 5, 6, etc.)

  // === SVÅRIGHETSDIMENSIONER ===
  difficulty: {
    // 1. KONCEPTUELL NIVÅ (1-10)
    // Hur avancerat matematiskt koncept?
    conceptual_level: 2,

    // 2. KOGNITIV BELASTNING
    cognitive_load: {
      working_memory: 1,      // Hur många värden samtidigt? (1-4)
                              // 1 = ett värde (5+3)
                              // 2 = två värden + mellanresultat (27+38 = 20+30 + 7+8)
                              // 3 = flera steg med mellanresultat
                              // 4 = komplex multi-step

      steps_required: 1,      // Antal beräkningssteg
      intermediate_values: 0, // Mellanresultat att hålla i minnet

      focus_duration: "short" // short/medium/long (estimerad tid)
    },

    // 3. PROCEDURELL KOMPLEXITET
    procedural: {
      num_terms: 2,           // Antal tal (2 för binär operation)
      requires_carry: false,  // Tiövergang/minnessiffra
      requires_borrow: false, // Lånesiffra (subtraktion)
      has_decimals: false,
      has_negatives: false,
      has_fractions: false,
      requires_regrouping: false,
      cross_decade: false,    // T.ex. 28 + 5 (kräver tiotalsgräns-förståelse)
      cross_hundred: false
    },

    // 4. TALSTORLEK
    magnitude: {
      min: 1,
      max: 10,
      digits: 1,              // Antal siffror i talen
      range: "single_digit"   // single_digit, double_digit, triple_digit
    },

    // 5. ABSTRAKTION
    abstraction: {
      level: "numeric",       // numeric, word_problem, real_world_context
      context_complexity: 0   // Om word problem, hur komplex kontext?
    }
  },

  // === KUNSKAPSKRAV (kopplat till läroplanen) ===
  knowledge_requirements: [
    "basic_addition",
    "number_sense_0-10",
    "place_value_ones"
  ],

  // === RELATIONER (Dependency Graph) ===
  prerequisites: [
    "add_2term_1-5_no-carry"  // Måste kunna först
  ],

  leads_to: [
    "add_2term_10-20_with-carry",
    "add_3term_1-10_no-carry"
  ],

  similar_difficulty: [
    "sub_2term_1-10_no-borrow"
  ],

  // === VARIATIONSMÖNSTER (Variation Theory) ===
  variation_dimensions: {
    can_vary: ["magnitude", "term_order"],
    must_keep_constant: ["num_terms", "requires_carry"],
    critical_features: ["sum_within_10", "additive_thinking"]
  },

  // === GENERERING ===
  generator: {
    template: "a + b = ?",

    constraints: {
      a: {
        min: 1,
        max: 10,
        type: "integer"
      },
      b: {
        min: 1,
        max: 10,
        type: "integer"
      },
      result: {
        max: 10  // Summan får inte överskrida 10 (ingen tiövergang)
      }
    },

    // Custom constraints (JavaScript function)
    customValidation: `
      (a, b) => {
        const sum = a + b;
        // Ingen tiövergang
        if ((a % 10) + (b % 10) >= 10) return false;
        // Summa max 10
        if (sum > 10) return false;
        // Inte triviala (t.ex. +0, +1)
        if (b <= 1) return false;
        return true;
      }
    `,

    // Varianter av samma problem
    variants: [
      { template: "a + b = ?", unknown: "result" },
      { template: "a + ? = c", unknown: "b" },
      { template: "? + b = c", unknown: "a" }
    ]
  },

  // === PRESENTATION ===
  presentation: {
    default_format: "horizontal",  // horizontal, vertical, word_problem
    allow_calculator: false,
    time_limit: null,              // sekunder, eller null
    show_number_line: false,       // Visuellt stöd
    show_blocks: false
  },

  // === METADATA ===
  metadata: {
    created: "2024-01-30",
    curriculum_alignment: "Lgr22_Ma",
    estimated_time: 15,  // sekunder
    common_errors: [
      {
        pattern: "reverses_operation",
        description: "Subtraherar istället för adderar"
      }
    ],
    tags: ["basic", "addition", "single_digit"]
  }
}
```

## Example Problem Templates

### Template 1: Basic Addition (No Carry)
```javascript
{
  id: "add_basic_no_carry",
  type: "addition",
  grade: 4,
  difficulty: {
    conceptual_level: 1,
    cognitive_load: { working_memory: 1, steps_required: 1 },
    procedural: { num_terms: 2, requires_carry: false },
    magnitude: { min: 1, max: 9, digits: 1 }
  },
  generator: {
    template: "a + b = ?",
    constraints: {
      a: { min: 1, max: 9 },
      b: { min: 1, max: 9 },
      result: { max: 9 }
    }
  }
}
```

### Template 2: Addition with Carry
```javascript
{
  id: "add_2digit_with_carry",
  type: "addition",
  grade: 4,
  difficulty: {
    conceptual_level: 3,
    cognitive_load: {
      working_memory: 2,      // Hålla kvar "1:an" från tiövergang
      steps_required: 2,      // Ental, sedan tiotal
      intermediate_values: 1  // Minnessiffran
    },
    procedural: {
      num_terms: 2,
      requires_carry: true,
      cross_decade: true
    },
    magnitude: { min: 10, max: 99, digits: 2 }
  },
  prerequisites: ["add_basic_no_carry", "place_value_tens"],
  generator: {
    template: "a + b = ?",
    customValidation: `
      (a, b) => {
        // Måste ha tiövergang
        return (a % 10) + (b % 10) >= 10;
      }
    `
  }
}
```

### Template 3: Subtraction with Borrowing
```javascript
{
  id: "sub_3digit_with_borrow",
  type: "subtraction",
  grade: 5,
  difficulty: {
    conceptual_level: 5,
    cognitive_load: {
      working_memory: 3,      // Hålla flera "lån"
      steps_required: 3,      // Ental, tiotal, hundratal
      intermediate_values: 2
    },
    procedural: {
      num_terms: 2,
      requires_borrow: true,
      cross_hundred: true
    },
    magnitude: { min: 100, max: 999, digits: 3 }
  },
  prerequisites: ["sub_2digit_with_borrow", "place_value_hundreds"],
  generator: {
    template: "a - b = ?",
    customValidation: `
      (a, b) => {
        // Måste ha lånesiffra
        const aStr = String(a).padStart(3, '0');
        const bStr = String(b).padStart(3, '0');

        // Kontrollera om något ställe kräver lån
        let needsBorrow = false;
        for (let i = 2; i >= 0; i--) {
          if (parseInt(aStr[i]) < parseInt(bStr[i])) {
            needsBorrow = true;
            break;
          }
        }

        return needsBorrow && a > b && a - b > 0;
      }
    `
  }
}
```

### Template 4: Word Problem (Context)
```javascript
{
  id: "add_word_problem_basic",
  type: "addition",
  grade: 4,
  difficulty: {
    conceptual_level: 2,
    cognitive_load: { working_memory: 2, steps_required: 1 },
    procedural: { num_terms: 2, requires_carry: false },
    magnitude: { min: 1, max: 20, digits: 1-2 },
    abstraction: {
      level: "word_problem",
      context_complexity: 1
    }
  },
  generator: {
    template: "contexts[random].format(a, b)",
    contexts: [
      "Anna har {a} äpplen. Hon får {b} äpplen till. Hur många äpplen har hon nu?",
      "Det finns {a} elever i klassrum A och {b} elever i klassrum B. Hur många elever totalt?",
      "En buss har {a} passagerare. {b} passagerare kliver på. Hur många är på bussen nu?"
    ]
  }
}
```

## Problem Generation Algorithm

```javascript
class ProblemGenerator {

  /**
   * Generera ett konkret problem från template
   */
  generate(template, maxAttempts = 100) {
    let attempts = 0;
    let problem = null;

    while (attempts < maxAttempts) {
      problem = this.createCandidate(template);

      if (this.validate(problem, template)) {
        return problem;
      }

      attempts++;
    }

    throw new Error(`Failed to generate valid problem for template ${template.id}`);
  }

  /**
   * Skapa kandidat-problem
   */
  createCandidate(template) {
    const { generator, difficulty } = template;

    // Generera slumpmässiga värden inom constraints
    const values = {};

    for (const [varName, constraint] of Object.entries(generator.constraints)) {
      if (constraint.type === 'integer') {
        values[varName] = this.randomInt(constraint.min, constraint.max);
      }
      // ... andra typer (decimal, fraction etc)
    }

    // Beräkna resultat
    const result = this.calculateResult(template.type, values);

    return {
      template: template.id,
      type: template.type,
      values,
      result,
      difficulty: difficulty,
      generated_at: Date.now()
    };
  }

  /**
   * Validera genererat problem
   */
  validate(problem, template) {
    const checks = [
      // 1. Matematiskt korrekt
      () => this.isCorrect(problem),

      // 2. Inom magnitude constraints
      () => this.checkMagnitude(problem, template.difficulty.magnitude),

      // 3. Matchar proceduella krav
      () => this.checkProcedural(problem, template.difficulty.procedural),

      // 4. Custom validation (om finns)
      () => this.runCustomValidation(problem, template.generator.customValidation),

      // 5. Inte förvirrande
      () => !this.isConfusing(problem),

      // 6. Inte trivial
      () => !this.isTrivial(problem)
    ];

    return checks.every(check => check());
  }

  /**
   * Kontrollera om problem matchar procedurell komplexitet
   */
  checkProcedural(problem, procedural) {
    const { values, type } = problem;

    if (type === 'addition') {
      const { a, b } = values;
      const hasCarry = (a % 10) + (b % 10) >= 10;

      // Om template kräver tiövergang, måste ha det
      if (procedural.requires_carry && !hasCarry) return false;

      // Om template INTE får ha tiövergang
      if (!procedural.requires_carry && hasCarry) return false;
    }

    // ... liknande för subtraction, multiplication etc

    return true;
  }

  /**
   * Undvik förvirrande kombinationer
   */
  isConfusing(problem) {
    const { values } = problem;
    const nums = Object.values(values);

    // Undvik samma siffror i olika ordning (t.ex. 123 + 132)
    if (nums.length === 2) {
      const [a, b] = nums;
      const aDigits = String(a).split('').sort().join('');
      const bDigits = String(b).split('').sort().join('');
      if (aDigits === bDigits) return true;
    }

    // Undvik alla samma siffror (t.ex. 33 + 33)
    if (nums.every(n => n === nums[0])) return true;

    return false;
  }

  /**
   * Undvik triviala problem
   */
  isTrivial(problem) {
    const { values, type } = problem;

    // Undvik +0, +1, -0, -1, ×0, ×1
    if (type === 'addition' || type === 'subtraction') {
      if (values.b <= 1) return true;
    }

    if (type === 'multiplication') {
      if (values.a <= 1 || values.b <= 1) return true;
    }

    return false;
  }
}
```

## Difficulty Progression Graph

```javascript
// Dependency graph för addition
const additionProgression = {
  "add_1digit_no_carry": {
    level: 1,
    grade: 4,
    next: ["add_1digit_with_carry", "add_2digit_no_carry"]
  },

  "add_1digit_with_carry": {
    level: 2,
    grade: 4,
    prerequisites: ["add_1digit_no_carry"],
    next: ["add_2digit_with_carry"]
  },

  "add_2digit_no_carry": {
    level: 2,
    grade: 4,
    prerequisites: ["add_1digit_no_carry", "place_value_tens"],
    next: ["add_2digit_with_carry", "add_3digit_no_carry"]
  },

  "add_2digit_with_carry": {
    level: 3,
    grade: 4,
    prerequisites: ["add_1digit_with_carry", "add_2digit_no_carry"],
    next: ["add_3digit_with_carry"]
  },

  "add_3digit_no_carry": {
    level: 3,
    grade: 5,
    prerequisites: ["add_2digit_no_carry", "place_value_hundreds"],
    next: ["add_3digit_with_carry"]
  },

  "add_3digit_with_carry": {
    level: 4,
    grade: 5,
    prerequisites: ["add_2digit_with_carry", "add_3digit_no_carry"],
    next: ["add_multi_digit"]
  }
};
```

## Variation Patterns (Variation Theory)

```javascript
// För samma konceptuell nivå, variera representation
const variationPatterns = {
  "vary_magnitude": {
    // Samma operation, olika storlek
    problems: [
      { a: 5, b: 3 },    // Enkel
      { a: 50, b: 30 },  // Tiotal
      { a: 500, b: 300 } // Hundratal
    ],
    critical_feature: "additive_structure",
    constant: "operation_type"
  },

  "vary_unknown_position": {
    // Samma tal, olika obekant
    problems: [
      "8 + 4 = ?",
      "8 + ? = 12",
      "? + 4 = 12"
    ],
    critical_feature: "part_whole_relationship",
    constant: "numbers_involved"
  },

  "vary_representation": {
    // Samma problem, olika format
    problems: [
      { format: "horizontal", text: "47 + 38 = ?" },
      { format: "vertical", text: "  47\n+ 38\n----" },
      { format: "word", text: "Anna har 47 kr. Hon får 38 kr till. Hur mycket har hon?" }
    ],
    critical_feature: "numerical_relationship",
    constant: "mathematical_structure"
  }
};
```
