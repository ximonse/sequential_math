# Adaptive Logic - Beslutsalgoritmer

## Huvudalgoritm: selectNextProblem()

```javascript
class AdaptiveEngine {

  /**
   * Välj nästa problem baserat på elevprofil och session
   */
  selectNextProblem(studentProfile, currentSession) {

    // PRIORITY 1: Spaced Repetition Review
    const dueReview = this.checkDueReviews(studentProfile);
    if (dueReview) {
      return this.generateReviewProblem(dueReview, studentProfile);
    }

    // PRIORITY 2: Session Fatigue Check
    if (this.shouldTakeBreak(studentProfile, currentSession)) {
      return { type: "BREAK_SUGGESTION", duration: 120 };  // 2 min
    }

    // PRIORITY 3: Momentum Recovery (Easy Win)
    if (this.needsEasyWin(studentProfile, currentSession)) {
      return this.generateEasyProblem(studentProfile);
    }

    // PRIORITY 4: Target Weakness (25% of time)
    if (Math.random() < 0.25 && studentProfile.stats.weakestTypes.length > 0) {
      return this.generateWeaknessProblem(studentProfile);
    }

    // PRIORITY 5: Normal Progression (75% of time)
    return this.generateNormalProblem(studentProfile, currentSession);
  }

  /**
   * PRIORITY 1: Kolla om spaced repetition review behövs
   */
  checkDueReviews(profile) {
    if (!profile.memoryProfile) return null;

    const now = Date.now();
    const dueReviews = profile.memoryProfile.reviewSchedule.filter(r =>
      r.nextReview <= now && r.priority === "high"
    );

    return dueReviews.length > 0 ? dueReviews[0] : null;
  }

  /**
   * PRIORITY 2: Ska eleven ta paus?
   */
  shouldTakeBreak(profile, session) {
    // Om Phase 1: Enkel regel - över 15 problem
    if (session.problemCount >= 15) return true;

    // Om Phase 2+: Använd optimal session length
    if (profile.cognitiveProfile?.focusEndurance?.optimalSessionLength) {
      const estimatedMinutes = session.problemCount * 0.5;
      return estimatedMinutes >= profile.cognitiveProfile.focusEndurance.optimalSessionLength;
    }

    return false;
  }

  /**
   * PRIORITY 3: Behöver eleven "easy win" för momentum?
   */
  needsEasyWin(profile, session) {
    // Inget streak + flera fel i rad
    const noStreak = profile.motivation?.currentMomentum?.streak === 0;
    const recentErrors = session.consecutiveErrors >= 2;

    return noStreak && recentErrors;
  }

  /**
   * PRIORITY 4: Generera problem från svaghet
   */
  generateWeaknessProblem(profile) {
    const weakest = profile.stats.weakestTypes[0];

    // Hitta template för denna typ
    const template = problemTemplates.find(t => t.id === weakest);

    // Generera problem lite LÄTTARE än normalt
    const adjustedTemplate = this.adjustDifficulty(template, -1);

    return problemGenerator.generate(adjustedTemplate);
  }

  /**
   * PRIORITY 5: Normal progression baserat på success rate
   */
  generateNormalProblem(profile, session) {
    const currentDifficulty = profile.currentDifficulty;
    const recentSuccessRate = profile.getRecentSuccessRate(5);

    let targetDifficulty = currentDifficulty;

    // För lätt (>85% success)
    if (recentSuccessRate > 0.85) {
      targetDifficulty = currentDifficulty + 1;
    }

    // För svårt (<70% success)
    else if (recentSuccessRate < 0.70) {
      targetDifficulty = currentDifficulty - 1;
    }

    // Sweet spot (70-85%) - variera runt nuvarande
    else {
      // 20% lättare, 60% samma, 20% svårare
      const rand = Math.random();
      if (rand < 0.2) {
        targetDifficulty = currentDifficulty - 1;
      } else if (rand > 0.8) {
        targetDifficulty = currentDifficulty + 1;
      }
      // else: samma nivå
    }

    // Clamp till valid range
    targetDifficulty = Math.max(1, Math.min(10, targetDifficulty));

    // Hitta template på denna nivå
    const template = this.findTemplateByDifficulty(targetDifficulty, profile.grade);

    return problemGenerator.generate(template);
  }

  /**
   * Generera "easy win" problem
   */
  generateEasyProblem(profile) {
    // Hitta något eleven KAN
    const strongestType = profile.stats.strongestTypes[0];

    if (strongestType) {
      const template = problemTemplates.find(t => t.id === strongestType);
      return problemGenerator.generate(template);
    }

    // Fallback: Enklaste möjliga
    const easyTemplate = problemTemplates.find(t =>
      t.difficulty.conceptual_level === 1 && t.grade === profile.grade
    );

    return problemGenerator.generate(easyTemplate);
  }

  /**
   * Hitta template baserat på konceptuell svårighetsgrad och årskurs
   */
  findTemplateByDifficulty(level, grade) {
    // Hitta templates på denna nivå och årskurs
    const candidates = problemTemplates.filter(t =>
      t.difficulty.conceptual_level === level && t.grade === grade
    );

    if (candidates.length === 0) {
      // Fallback till närmaste nivå
      return problemTemplates.reduce((prev, curr) => {
        if (curr.grade !== grade) return prev;
        const prevDiff = Math.abs(prev.difficulty.conceptual_level - level);
        const currDiff = Math.abs(curr.difficulty.conceptual_level - level);
        return currDiff < prevDiff ? curr : prev;
      });
    }

    // Slumpa bland kandidater
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Justera template svårighetsgrad
   */
  adjustDifficulty(template, adjustment) {
    const adjusted = { ...template };
    adjusted.difficulty = { ...template.difficulty };
    adjusted.difficulty.conceptual_level += adjustment;

    // Kan också justera andra dimensioner
    if (adjustment < 0) {
      // Lättare: Minska cognitive load
      adjusted.difficulty.cognitive_load = {
        ...adjusted.difficulty.cognitive_load,
        working_memory: Math.max(1, adjusted.difficulty.cognitive_load.working_memory - 1)
      };
    }

    return adjusted;
  }
}
```

## Difficulty Adjustment After Answer

```javascript
class DifficultyAdapter {

  /**
   * Uppdatera svårighet efter elevens svar
   */
  adjustAfterAnswer(profile, problem, answer, timeSpent) {
    const isCorrect = answer === problem.result;

    // Uppdatera momentum
    profile.updateMomentum(isCorrect);

    if (isCorrect) {
      return this.handleCorrectAnswer(profile, problem, timeSpent);
    } else {
      return this.handleIncorrectAnswer(profile, problem, answer, timeSpent);
    }
  }

  /**
   * Rätt svar - öka svårighet (ibland)
   */
  handleCorrectAnswer(profile, problem, timeSpent) {
    const expectedTime = problem.metadata?.estimated_time || 30;
    const wasFast = timeSpent < expectedTime * 0.7;

    // Snabbt rätt → öka mer
    if (wasFast && profile.motivation.currentMomentum.streak >= 3) {
      profile.currentDifficulty += 0.5;
      return { adjustment: +0.5, reason: "fast_correct_streak" };
    }

    // Normalt rätt → öka lite
    else if (profile.motivation.currentMomentum.streak >= 2) {
      profile.currentDifficulty += 0.3;
      return { adjustment: +0.3, reason: "correct_streak" };
    }

    // Rätt men långsamt → samma nivå
    else {
      return { adjustment: 0, reason: "correct_but_slow" };
    }
  }

  /**
   * Fel svar - analysera och justera
   */
  handleIncorrectAnswer(profile, problem, answer, timeSpent) {
    // Analysera feltyp
    const errorAnalysis = errorAnalyzer.analyze(
      problem,
      answer,
      timeSpent,
      profile.recentProblems
    );

    let adjustment = 0;
    let reason = "";

    switch (errorAnalysis.type) {
      case "careless":
        // Slarv → samma nivå, försök igen
        adjustment = 0;
        reason = "careless_error";
        break;

      case "conceptual":
        // Förståelsefel → backa rejält
        adjustment = -1.5;
        reason = "conceptual_gap";
        break;

      case "cognitive_load":
        // För mycket i working memory → backa lite
        adjustment = -0.8;
        reason = "cognitive_overload";
        break;

      default:
        // Okänt fel → backa måttligt
        adjustment = -1.0;
        reason = "unknown_error";
    }

    profile.currentDifficulty += adjustment;
    profile.currentDifficulty = Math.max(1, profile.currentDifficulty);

    return {
      adjustment,
      reason,
      errorType: errorAnalysis.type
    };
  }
}
```

## Variation Pattern Selection

```javascript
class VariationSelector {

  /**
   * Välj variation baserat på vad eleven behöver
   */
  selectVariation(profile, baseTemplate) {
    if (!profile.variationDimensions) {
      // Phase 1: Ingen variation än
      return baseTemplate;
    }

    const needs = profile.variationDimensions.needsPracticeWith;

    // Hitta dimension som behöver mest övning
    const mostNeeded = Object.entries(needs)
      .filter(([dim, data]) => data.needsMore)
      .sort((a, b) => a[1].comfort - b[1].comfort)[0];

    if (!mostNeeded) return baseTemplate;

    const [dimension, data] = mostNeeded;

    // Applicera variation
    return this.applyVariation(baseTemplate, dimension);
  }

  /**
   * Applicera specifik variation
   */
  applyVariation(template, dimension) {
    switch (dimension) {
      case "varying_magnitude":
        // Samma operation, olika talstorlek
        return this.varyMagnitude(template);

      case "varying_position":
        // Byt position på obekant
        return this.varyUnknownPosition(template);

      case "varying_representation":
        // Byt format (horisontell/vertikal/ord)
        return this.varyRepresentation(template);

      default:
        return template;
    }
  }

  varyMagnitude(template) {
    const magnitudes = [
      { min: 1, max: 10, digits: 1 },
      { min: 10, max: 100, digits: 2 },
      { min: 100, max: 1000, digits: 3 }
    ];

    const varied = { ...template };
    varied.difficulty.magnitude = magnitudes[Math.floor(Math.random() * magnitudes.length)];

    return varied;
  }

  varyUnknownPosition(template) {
    const variants = template.generator.variants || [
      { template: "a + b = ?", unknown: "result" },
      { template: "a + ? = c", unknown: "b" },
      { template: "? + b = c", unknown: "a" }
    ];

    const varied = { ...template };
    varied.generator.template = variants[Math.floor(Math.random() * variants.length)].template;

    return varied;
  }
}
```

## 80% Success Rate Target

```javascript
class SuccessRateController {

  /**
   * Kontrollera om vi håller 80% target
   */
  checkTargetRate(profile) {
    const last10 = profile.getRecentSuccessRate(10);
    const last20 = profile.getRecentSuccessRate(20);

    const target = 0.80;
    const tolerance = 0.10;

    // För lågt (<70%)
    if (last10 < target - tolerance) {
      return {
        status: "too_low",
        current: last10,
        action: "decrease_difficulty"
      };
    }

    // För högt (>90%)
    else if (last10 > target + tolerance) {
      return {
        status: "too_high",
        current: last10,
        action: "increase_difficulty"
      };
    }

    // Perfect zone (70-90%)
    else {
      return {
        status: "optimal",
        current: last10,
        action: "maintain_variation"
      };
    }
  }

  /**
   * Generera 10-problem sekvens som ger ~80% success
   */
  generateOptimalSequence(profile) {
    const currentLevel = profile.currentDifficulty;

    // Exempel: 8 rätt, 2 fel = 80%
    // Variation: 2 lätta, 5 samma nivå, 2 svårare, 1 lätt (recovery)

    return [
      currentLevel - 1,  // Lätt (bekräftelse)
      currentLevel - 1,  // Lätt
      currentLevel,      // Samma
      currentLevel,      // Samma
      currentLevel + 1,  // Svårare (utmaning!)
      currentLevel,      // Samma
      currentLevel + 1,  // Svårare
      currentLevel,      // Samma
      currentLevel - 1,  // Lätt (återhämtning)
      currentLevel       // Samma
    ];
    // Förväntad success: ~80%
  }
}
```
