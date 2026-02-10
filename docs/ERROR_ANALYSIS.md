# Error Analysis - Feltypsdetektering

## Tre Typer av Fel

### 1. SLARV-FEL (Careless Errors)
**Kännetecken:**
- Eleven KAN konceptet
- Snabbt svar (< 50% av förväntad tid)
- Nära rätt svar (±1-2)
- Har svarat rätt på liknande tidigare
- Enstaka sifferfel, omvänd siffra, glömt skriva ner

**Respons:**
- Samma svårighetsgrad
- "Nästan! Kolla igen, jag tror du kan det här"
- Ge samma problem igen (eller nästan identiskt)

### 2. FÖRSTÅELSE-FEL (Conceptual Errors)
**Kännetecken:**
- Systematiskt fel (samma misstag upprepas)
- Fel metod/operation
- Återkommande felmönster
- Svar som indikerar missuppfattning
- Normal eller långsam tid

**Respons:**
- Backa i svårighetsgrad (-1.5 till -2)
- Ge tutorial/förklaring
- Flera liknande problem för att bygga förståelse
- "Låt oss öva lite mer på grunderna"

### 3. KOGNITIV KAPACITETS-FEL (Cognitive Load Errors)
**Kännetecken:**
- Tar lång tid (> 2× förväntad tid)
- Delvis rätt (rätt början, fel slut)
- Problem med många steg
- Working memory överbelastad (WM > 2-3)
- Prestationsfall sent i session

**Respons:**
- Backa lite i svårighetsgrad (-0.8 till -1)
- Förenkla: färre steg, mindre tal
- Break intermediate steps
- "Bra jobbat! Vi tar lite enklare först"
- Föreslå paus om sent i session

---

## Error Analyzer Implementation

```javascript
class ErrorAnalyzer {

  /**
   * Huvudanalys-funktion
   */
  analyze(problem, studentAnswer, timeSpent, attemptHistory) {
    const correctAnswer = this.calculateCorrectAnswer(problem);

    // Rätt svar → ingen analys behövs
    if (studentAnswer === correctAnswer) {
      return {
        type: 'correct',
        confidence: 1.0
      };
    }

    // FEL - Analysera vilket typ
    const indicators = {
      careless: this.detectCarelessIndicators(problem, studentAnswer, timeSpent, attemptHistory),
      conceptual: this.detectConceptualIndicators(problem, studentAnswer, timeSpent, attemptHistory),
      cognitive: this.detectCognitiveIndicators(problem, studentAnswer, timeSpent, attemptHistory)
    };

    // Räkna poäng för varje typ
    const scores = {
      careless: this.scoreIndicators(indicators.careless),
      conceptual: this.scoreIndicators(indicators.conceptual),
      cognitive: this.scoreIndicators(indicators.cognitive)
    };

    // Högst poäng vinner
    const errorType = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    const confidence = scores[errorType] / Math.max(...Object.values(scores));

    return {
      type: errorType,
      confidence: confidence,
      indicators: indicators[errorType],
      specificError: this.identifySpecificError(problem, studentAnswer),
      intervention: this.recommendIntervention(errorType, problem)
    };
  }

  /**
   * SLARV-INDIKATORER
   */
  detectCarelessIndicators(problem, studentAnswer, timeSpent, history) {
    const correctAnswer = this.calculateCorrectAnswer(problem);
    const expectedTime = problem.metadata?.estimated_time || 30;

    return {
      // 1. Snabbt svar
      fastAnswer: {
        detected: timeSpent < expectedTime * 0.5,
        strength: timeSpent < expectedTime * 0.5 ? 1.0 : 0,
        data: { timeSpent, expectedTime }
      },

      // 2. Nära rätt svar
      closeAnswer: {
        detected: Math.abs(studentAnswer - correctAnswer) <= 2,
        strength: Math.abs(studentAnswer - correctAnswer) <= 2 ? 0.9 : 0,
        data: { diff: Math.abs(studentAnswer - correctAnswer) }
      },

      // 3. Sifferomvändning (t.ex. 47 → 74)
      digitTransposition: {
        detected: this.isDigitTransposition(studentAnswer, correctAnswer),
        strength: this.isDigitTransposition(studentAnswer, correctAnswer) ? 0.8 : 0
      },

      // 4. Har klarat liknande tidigare
      previouslyCorrect: {
        detected: this.hasSolvedSimilarBefore(problem, history),
        strength: this.hasSolvedSimilarBefore(problem, history) ? 0.7 : 0,
        data: { similarSolved: this.countSimilarSolved(problem, history) }
      },

      // 5. Glömt sista siffran
      missedLastDigit: {
        detected: this.isMissingDigit(studentAnswer, correctAnswer),
        strength: this.isMissingDigit(studentAnswer, correctAnswer) ? 0.6 : 0
      }
    };
  }

  /**
   * FÖRSTÅELSE-INDIKATORER
   */
  detectConceptualIndicators(problem, studentAnswer, timeSpent, history) {
    const correctAnswer = this.calculateCorrectAnswer(problem);

    return {
      // 1. Systematiskt fel (samma fel återkommer)
      systematicError: {
        detected: this.detectSystematicPattern(studentAnswer, correctAnswer, history),
        strength: this.detectSystematicPattern(studentAnswer, correctAnswer, history) ? 1.0 : 0,
        data: { pattern: this.getErrorPattern(studentAnswer, correctAnswer) }
      },

      // 2. Fel operation
      wrongOperation: {
        detected: this.usedWrongOperation(problem, studentAnswer),
        strength: this.usedWrongOperation(problem, studentAnswer) ? 0.9 : 0,
        data: {
          expected: problem.type,
          likelyUsed: this.detectUsedOperation(problem, studentAnswer)
        }
      },

      // 3. Återkommande misstag av samma typ
      consistentMistake: {
        detected: this.hasConsistentMistakePattern(problem, history),
        strength: this.hasConsistentMistakePattern(problem, history) ? 0.8 : 0,
        data: { occurrences: this.countSimilarErrors(problem, history) }
      },

      // 4. Visar missuppfattning av koncept
      conceptualMisunderstanding: {
        detected: this.showsConceptualMisunderstanding(problem, studentAnswer),
        strength: this.showsConceptualMisunderstanding(problem, studentAnswer) ? 0.9 : 0,
        data: { misconception: this.identifyMisconception(problem, studentAnswer) }
      },

      // 5. Ignorerar platsvärde
      placeValueError: {
        detected: this.hasPlaceValueError(problem, studentAnswer),
        strength: this.hasPlaceValueError(problem, studentAnswer) ? 0.7 : 0
      }
    };
  }

  /**
   * KOGNITIV KAPACITETS-INDIKATORER
   */
  detectCognitiveIndicators(problem, studentAnswer, timeSpent, history) {
    const expectedTime = problem.metadata?.estimated_time || 30;
    const workingMemoryLoad = problem.difficulty?.cognitive_load?.working_memory || 1;

    return {
      // 1. Timeout - tog för lång tid
      timeout: {
        detected: timeSpent > expectedTime * 2,
        strength: timeSpent > expectedTime * 2 ? 1.0 : 0,
        data: { timeSpent, expectedTime, ratio: timeSpent / expectedTime }
      },

      // 2. Delvis rätt (rätt början, fel slut)
      partiallyCorrect: {
        detected: this.isPartiallyCorrect(problem, studentAnswer),
        strength: this.isPartiallyCorrect(problem, studentAnswer) ? 0.9 : 0,
        data: { correctSteps: this.analyzeSteps(problem, studentAnswer) }
      },

      // 3. Hög working memory-belastning
      highWorkingMemory: {
        detected: workingMemoryLoad >= 3,
        strength: workingMemoryLoad >= 3 ? 0.8 : 0,
        data: { wmLoad: workingMemoryLoad }
      },

      // 4. Struggling pattern (flera fel i rad)
      strugglingPattern: {
        detected: this.isStrugglingRecently(history),
        strength: this.isStrugglingRecently(history) ? 0.7 : 0,
        data: { recentErrors: this.countRecentErrors(history, 5) }
      },

      // 5. Sen i session (fatigue)
      sessionFatigue: {
        detected: this.isLateInSession(history),
        strength: this.isLateInSession(history) ? 0.6 : 0,
        data: { problemNumber: history.length + 1 }
      },

      // 6. Förlorade mellanresultat
      lostIntermediateValues: {
        detected: this.lostIntermediateCalculation(problem, studentAnswer),
        strength: this.lostIntermediateCalculation(problem, studentAnswer) ? 0.8 : 0
      }
    };
  }

  /**
   * Räkna poäng från indikatorer
   */
  scoreIndicators(indicators) {
    let total = 0;
    let count = 0;

    for (const [key, indicator] of Object.entries(indicators)) {
      if (indicator.detected) {
        total += indicator.strength;
        count++;
      }
    }

    return count > 0 ? total / count : 0;
  }

  // =========================================
  // HJÄLPFUNKTIONER - Slarv
  // =========================================

  isDigitTransposition(answer, correct) {
    const answerStr = String(answer);
    const correctStr = String(correct);

    if (answerStr.length !== correctStr.length) return false;

    // Kolla om siffrorna är samma men i annan ordning
    const answerDigits = answerStr.split('').sort().join('');
    const correctDigits = correctStr.split('').sort().join('');

    return answerDigits === correctDigits && answerStr !== correctStr;
  }

  isMissingDigit(answer, correct) {
    const answerStr = String(answer);
    const correctStr = String(correct);

    // T.ex. svarade 12 istället för 120
    return correctStr.startsWith(answerStr) || answerStr.startsWith(correctStr);
  }

  hasSolvedSimilarBefore(problem, history) {
    const similarProblems = history.filter(h =>
      h.problemType === problem.template && h.correct
    );

    return similarProblems.length >= 3;
  }

  countSimilarSolved(problem, history) {
    return history.filter(h =>
      h.problemType === problem.template && h.correct
    ).length;
  }

  // =========================================
  // HJÄLPFUNKTIONER - Förståelse
  // =========================================

  detectSystematicPattern(answer, correct, history) {
    const currentError = answer - correct;

    // Kolla om samma fel upprepas
    const similarErrors = history.filter(h => {
      if (h.correct) return false;
      const historicError = h.studentAnswer - this.calculateCorrectAnswer(h);
      return Math.abs(historicError - currentError) <= 1;
    });

    return similarErrors.length >= 2;
  }

  getErrorPattern(answer, correct) {
    const diff = answer - correct;

    if (diff > 0) return `consistently_adds_${diff}`;
    if (diff < 0) return `consistently_subtracts_${Math.abs(diff)}`;
    return 'unknown';
  }

  usedWrongOperation(problem, studentAnswer) {
    const { values, type } = problem;
    const { a, b } = values;

    // Kolla om eleven adderade när de skulle subtrahera (eller vice versa)
    if (type === 'addition' && studentAnswer === a - b) return true;
    if (type === 'subtraction' && studentAnswer === a + b) return true;
    if (type === 'multiplication' && studentAnswer === a + b) return true;
    if (type === 'division' && studentAnswer === a * b) return true;

    return false;
  }

  detectUsedOperation(problem, studentAnswer) {
    const { values } = problem;
    const { a, b } = values;

    if (studentAnswer === a + b) return 'addition';
    if (studentAnswer === a - b) return 'subtraction';
    if (studentAnswer === a * b) return 'multiplication';
    if (studentAnswer === a / b) return 'division';

    return 'unknown';
  }

  hasConsistentMistakePattern(problem, history) {
    const sameType = history.filter(h => h.problemType === problem.template);
    const errors = sameType.filter(h => !h.correct);

    return errors.length >= 2;
  }

  countSimilarErrors(problem, history) {
    return history.filter(h =>
      h.problemType === problem.template && !h.correct
    ).length;
  }

  showsConceptualMisunderstanding(problem, studentAnswer) {
    // Exempel: 47 - 38 = 11 (reverserat subtrahend/minuend)
    if (problem.type === 'subtraction') {
      const { a, b } = problem.values;
      if (studentAnswer === b - a) return true;  // Bakvänd subtraktion
    }

    // Exempel: Ignorerar tiövergang
    if (problem.type === 'addition') {
      const { a, b } = problem.values;
      const onesSum = (a % 10) + (b % 10);
      if (onesSum >= 10) {
        // Borde ha tiövergang
        const correctOnes = (a + b) % 10;
        const answerOnes = studentAnswer % 10;
        if (answerOnes === onesSum % 10) return false;  // Rätt hanterat
        if (answerOnes === onesSum) return true;  // Glömde tiövergang
      }
    }

    return false;
  }

  identifyMisconception(problem, studentAnswer) {
    if (problem.type === 'subtraction') {
      const { a, b } = problem.values;
      if (studentAnswer === b - a) return 'reverses_subtraction';

      // Kolla borrowing errors
      if (this.hasBorrowingError(problem, studentAnswer)) {
        return 'borrowing_error';
      }
    }

    if (problem.type === 'addition') {
      if (this.forgotCarry(problem, studentAnswer)) {
        return 'forgot_carry';
      }
    }

    return 'unknown';
  }

  hasPlaceValueError(problem, studentAnswer) {
    // T.ex. 47 + 38 = 715 (istället för 85)
    // Eleven adderade 4+3=7 och 7+8=15 separat

    const { values } = problem;
    const { a, b } = values;

    const aStr = String(a);
    const bStr = String(b);
    const answerStr = String(studentAnswer);

    // Simpel check: är svaret för långt?
    const correctLength = String(this.calculateCorrectAnswer(problem)).length;
    if (answerStr.length > correctLength + 1) return true;

    return false;
  }

  // =========================================
  // HJÄLPFUNKTIONER - Kognitiv kapacitet
  // =========================================

  isPartiallyCorrect(problem, studentAnswer) {
    // Kolla om några steg är rätt
    if (problem.type === 'addition') {
      const { a, b } = problem.values;
      const correctAnswer = a + b;

      // Kolla ental
      const onesCorrect = (studentAnswer % 10) === (correctAnswer % 10);
      const tensWrong = Math.floor(studentAnswer / 10) !== Math.floor(correctAnswer / 10);

      return onesCorrect && tensWrong;
    }

    // Liknande för andra operationer...
    return false;
  }

  analyzeSteps(problem, studentAnswer) {
    // Returnera vilka steg som är rätt
    const steps = {
      step1_ones: false,
      step2_tens: false,
      step3_carry: false
    };

    if (problem.type === 'addition') {
      const { a, b } = problem.values;
      const correctAnswer = a + b;

      steps.step1_ones = (studentAnswer % 10) === (correctAnswer % 10);
      steps.step2_tens = Math.floor(studentAnswer / 10) === Math.floor(correctAnswer / 10);
      steps.step3_carry = (a % 10 + b % 10 >= 10) ? steps.step2_tens : true;
    }

    return steps;
  }

  isStrugglingRecently(history) {
    const last5 = history.slice(-5);
    const errors = last5.filter(h => !h.correct).length;

    return errors >= 3;
  }

  countRecentErrors(history, count) {
    const recent = history.slice(-count);
    return recent.filter(h => !h.correct).length;
  }

  isLateInSession(history) {
    return history.length >= 12;  // Efter 12 problem
  }

  lostIntermediateCalculation(problem, studentAnswer) {
    // Svårt att detektera generellt, men kan kolla vissa patterns
    // T.ex. om multi-step problem och svar är helt off

    const wmLoad = problem.difficulty?.cognitive_load?.working_memory || 1;
    const correct = this.calculateCorrectAnswer(problem);

    if (wmLoad >= 3 && Math.abs(studentAnswer - correct) > correct * 0.5) {
      return true;
    }

    return false;
  }

  // =========================================
  // UTILITIES
  // =========================================

  calculateCorrectAnswer(problem) {
    const { values, type } = problem;
    const { a, b } = values;

    switch (type) {
      case 'addition': return a + b;
      case 'subtraction': return a - b;
      case 'multiplication': return a * b;
      case 'division': return Math.floor(a / b);
      default: return null;
    }
  }

  hasBorrowingError(problem, studentAnswer) {
    // Specifik check för borrowing-fel
    const { a, b } = problem.values;

    // T.ex. 52 - 27: Eleven gör 50-20=30, 7-2=5 → 35 (fel!)
    // Istället för korrekt 25

    const aStr = String(a).padStart(2, '0');
    const bStr = String(b).padStart(2, '0');

    const wrongTens = parseInt(aStr[0]) - parseInt(bStr[0]);
    const wrongOnes = Math.abs(parseInt(aStr[1]) - parseInt(bStr[1]));
    const wrongAnswer = wrongTens * 10 + wrongOnes;

    return studentAnswer === wrongAnswer;
  }

  forgotCarry(problem, studentAnswer) {
    const { a, b } = problem.values;

    // T.ex. 47 + 38: Eleven gör 4+3=7, 7+8=15 → 715 (glömde carry)
    // Eller 47 + 38 = 75 (adderade 7+8=15, skrev ner 5, glömde lägga till 1)

    const onesSum = (a % 10) + (b % 10);
    if (onesSum < 10) return false;  // Ingen carry behövs

    const correctAnswer = a + b;
    const answerWithoutCarry = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10 + (onesSum % 10);

    return studentAnswer === answerWithoutCarry;
  }

  /**
   * Identifiera specifikt fel
   */
  identifySpecificError(problem, studentAnswer) {
    const errors = [];

    if (this.usedWrongOperation(problem, studentAnswer)) {
      errors.push({
        type: 'wrong_operation',
        expected: problem.type,
        used: this.detectUsedOperation(problem, studentAnswer)
      });
    }

    if (this.hasBorrowingError(problem, studentAnswer)) {
      errors.push({ type: 'borrowing_error' });
    }

    if (this.forgotCarry(problem, studentAnswer)) {
      errors.push({ type: 'forgot_carry' });
    }

    if (this.hasPlaceValueError(problem, studentAnswer)) {
      errors.push({ type: 'place_value_error' });
    }

    if (this.isDigitTransposition(studentAnswer, this.calculateCorrectAnswer(problem))) {
      errors.push({ type: 'digit_transposition' });
    }

    return errors.length > 0 ? errors[0].type : 'unknown';
  }

  /**
   * Rekommendera intervention
   */
  recommendIntervention(errorType, problem) {
    const interventions = {
      careless: {
        action: 'retry_same',
        feedback: 'Nästan rätt! Kolla igen.',
        difficultyAdjustment: 0
      },

      conceptual: {
        action: 'show_tutorial',
        feedback: 'Låt oss öva lite mer på grunderna.',
        difficultyAdjustment: -2,
        tutorial: this.selectTutorial(problem)
      },

      cognitive_load: {
        action: 'simplify_steps',
        feedback: 'Bra jobbat! Vi tar lite enklare först.',
        difficultyAdjustment: -1,
        showSteps: true
      }
    };

    return interventions[errorType] || interventions.careless;
  }

  selectTutorial(problem) {
    const tutorials = {
      'addition': 'tutorial_addition_basics',
      'subtraction': 'tutorial_subtraction_basics',
      'multiplication': 'tutorial_multiplication_basics',
      'division': 'tutorial_division_basics'
    };

    let tutorial = tutorials[problem.type] || 'tutorial_general';

    // Mer specifik tutorial baserat på procedural complexity
    if (problem.difficulty?.procedural?.requires_carry) {
      tutorial = 'tutorial_addition_with_carry';
    }
    if (problem.difficulty?.procedural?.requires_borrow) {
      tutorial = 'tutorial_subtraction_with_borrow';
    }

    return tutorial;
  }
}
```

## Specific Error Patterns Library

```javascript
// Bibliotek av kända felmönster
const ERROR_PATTERNS = {

  // ADDITION
  'forgot_carry': {
    description: 'Glömde minnessiffra vid tiövergang',
    example: '47 + 38 = 75 (istället för 85)',
    detection: (problem, answer) => {
      const { a, b } = problem.values;
      const onesSum = (a % 10) + (b % 10);
      if (onesSum < 10) return false;

      const wrongAnswer = Math.floor(a/10)*10 + Math.floor(b/10)*10 + (onesSum % 10);
      return answer === wrongAnswer;
    },
    intervention: 'show_carry_animation',
    relatedConcept: 'place_value_tens'
  },

  'added_digits_separately': {
    description: 'Adderade varje position separat utan att kombinera',
    example: '47 + 38 = 715 (4+3=7, 7+8=15)',
    detection: (problem, answer) => {
      const { a, b } = problem.values;
      const aStr = String(a);
      const bStr = String(b);

      let combined = '';
      for (let i = 0; i < Math.max(aStr.length, bStr.length); i++) {
        const digitA = parseInt(aStr[i] || 0);
        const digitB = parseInt(bStr[i] || 0);
        combined += (digitA + digitB);
      }

      return parseInt(combined) === answer;
    },
    intervention: 'explain_place_value',
    relatedConcept: 'place_value_understanding'
  },

  // SUBTRACTION
  'reverses_subtraction': {
    description: 'Subtraherar mindre från större (omvänd ordning)',
    example: '52 - 27 = 25 men eleven gör 7-2 och 5-2',
    detection: (problem, answer) => {
      if (problem.type !== 'subtraction') return false;

      const { a, b } = problem.values;
      const aStr = String(a).padStart(2, '0');
      const bStr = String(b).padStart(2, '0');

      let wrongAnswer = '';
      for (let i = 0; i < aStr.length; i++) {
        const digitA = parseInt(aStr[i]);
        const digitB = parseInt(bStr[i]);
        wrongAnswer += Math.abs(digitA - digitB);
      }

      return parseInt(wrongAnswer) === answer;
    },
    intervention: 'explain_subtraction_order',
    relatedConcept: 'subtraction_meaning'
  },

  'borrowing_from_wrong_place': {
    description: 'Lånar från fel position',
    example: '432 - 178: Lånar från 4 istället för 3',
    detection: (problem, answer) => {
      // Komplex detection - kräver steg-för-steg analys
      // Implementeras senare
      return false;
    },
    intervention: 'tutorial_borrowing_step_by_step',
    relatedConcept: 'borrowing_across_places'
  },

  // MULTIPLICATION
  'forgot_to_add_zeros': {
    description: 'Glömde lägga till nollor vid flersiffrig multiplikation',
    example: '23 × 14 = 92 + 23 = 115 (istället för 92 + 230 = 322)',
    detection: (problem, answer) => {
      // Komplex - implementeras vid behov
      return false;
    },
    intervention: 'explain_place_value_multiplication',
    relatedConcept: 'multiplication_algorithm'
  }
};
```

## Error Tracking in Student Profile

```javascript
class ErrorTracker {

  /**
   * Lägg till fel i elevprofil
   */
  trackError(profile, problem, errorAnalysis) {
    if (!profile.errorPatterns) {
      profile.errorPatterns = {};
    }

    const errorType = errorAnalysis.specificError;

    if (!profile.errorPatterns[errorType]) {
      profile.errorPatterns[errorType] = {
        occurrences: 0,
        firstSeen: Date.now(),
        lastSeen: null,
        severity: 'low',
        problems: []
      };
    }

    const pattern = profile.errorPatterns[errorType];
    pattern.occurrences++;
    pattern.lastSeen = Date.now();
    pattern.problems.push({
      problemId: problem.id,
      timestamp: Date.now()
    });

    // Uppdatera severity
    if (pattern.occurrences >= 5) pattern.severity = 'high';
    else if (pattern.occurrences >= 3) pattern.severity = 'medium';

    // Begränsa historik
    if (pattern.problems.length > 10) {
      pattern.problems.shift();
    }
  }

  /**
   * Får mest kritiska fel
   */
  getMostCriticalErrors(profile, limit = 3) {
    if (!profile.errorPatterns) return [];

    const errors = Object.entries(profile.errorPatterns)
      .map(([type, data]) => ({
        type,
        ...data,
        score: this.calculateErrorScore(data)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return errors;
  }

  /**
   * Beräkna hur kritiskt ett fel är
   */
  calculateErrorScore(errorData) {
    const { occurrences, lastSeen, severity } = errorData;

    const recencyScore = this.getRecencyScore(lastSeen);
    const frequencyScore = Math.min(occurrences / 10, 1);
    const severityScore = { low: 0.3, medium: 0.6, high: 1.0 }[severity];

    return (recencyScore * 0.3) + (frequencyScore * 0.4) + (severityScore * 0.3);
  }

  getRecencyScore(timestamp) {
    const daysSince = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

    if (daysSince <= 1) return 1.0;
    if (daysSince <= 3) return 0.8;
    if (daysSince <= 7) return 0.6;
    return 0.3;
  }
}
```
