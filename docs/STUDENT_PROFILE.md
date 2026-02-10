# Student Profile Data Model

## Phase 1 - MVP Profile (Minimal but Functional)

```javascript
class StudentProfile {
  constructor(studentId, name, grade) {
    // === BASIC INFO ===
    this.studentId = studentId;  // Unikt ID per elev
    this.name = name;
    this.grade = grade;          // Årskurs (4, 5, 6, etc.)
    this.created_at = Date.now();

    // === CURRENT STATE ===
    this.currentDifficulty = 1;  // Start enkelt

    // === RECENT HISTORY (senaste 50 problem) ===
    this.recentProblems = [];  // Max 50, rullande

    // === AUTO-CALCULATED STATS ===
    this.stats = {
      totalProblems: 0,
      correctAnswers: 0,
      overallSuccessRate: 0,
      avgTimePerProblem: 0,

      // Per typ
      typeStats: {},  // { "addition_2digit": { attempts: 10, success: 8 } }

      // Identifierade svagheter
      weakestTypes: [],
      strongestTypes: []
    };
  }

  /**
   * Lägg till problemresultat
   */
  addProblemResult(result) {
    // Add to history (keep only last 50)
    this.recentProblems.push(result);
    if (this.recentProblems.length > 50) {
      this.recentProblems.shift();
    }

    // Uppdatera stats
    this.updateStats();
  }

  /**
   * Beräkna statistik från historik
   */
  updateStats() {
    const recent = this.recentProblems;

    this.stats.totalProblems = recent.length;
    this.stats.correctAnswers = recent.filter(p => p.correct).length;
    this.stats.overallSuccessRate = this.stats.correctAnswers / this.stats.totalProblems;

    // Genomsnittlig tid
    const times = recent.map(p => p.timeSpent);
    this.stats.avgTimePerProblem = times.reduce((a, b) => a + b, 0) / times.length;

    // Per typ
    this.calculateTypeStats();

    // Identifiera svagheter
    this.identifyWeaknesses();
  }

  /**
   * Stats per problemtyp
   */
  calculateTypeStats() {
    const typeMap = {};

    for (const problem of this.recentProblems) {
      const type = problem.problemType;

      if (!typeMap[type]) {
        typeMap[type] = { attempts: 0, correct: 0, totalTime: 0 };
      }

      typeMap[type].attempts++;
      if (problem.correct) typeMap[type].correct++;
      typeMap[type].totalTime += problem.timeSpent;
    }

    // Beräkna success rate per typ
    for (const [type, stats] of Object.entries(typeMap)) {
      typeMap[type].successRate = stats.correct / stats.attempts;
      typeMap[type].avgTime = stats.totalTime / stats.attempts;
    }

    this.stats.typeStats = typeMap;
  }

  /**
   * Identifiera svagheter
   */
  identifyWeaknesses() {
    const types = Object.entries(this.stats.typeStats);

    // Sortera efter success rate
    types.sort((a, b) => a[1].successRate - b[1].successRate);

    // Bottom 3 = svagheter
    this.stats.weakestTypes = types.slice(0, 3).map(([type]) => type);

    // Top 3 = styrkor
    this.stats.strongestTypes = types.slice(-3).map(([type]) => type);
  }

  /**
   * Success rate senaste N problem
   */
  getRecentSuccessRate(count = 10) {
    const recent = this.recentProblems.slice(-count);
    const correct = recent.filter(p => p.correct).length;
    return correct / recent.length;
  }
}
```

## Phase 2 - Extended Profile

```javascript
class StudentProfileExtended extends StudentProfile {
  constructor(studentId, name, grade) {
    super(studentId, name, grade);

    // === WEAKNESS MAP (detaljerad per typ) ===
    this.weaknessMap = {};
    // Exempel struktur:
    // {
    //   "subtraction_3digit_with_borrow": {
    //     attempts: 15,
    //     successRate: 0.45,
    //     avgTime: 145,
    //     errorTypes: {
    //       cognitive_load: 8,
    //       conceptual: 4,
    //       careless: 3
    //     },
    //     lastPracticed: "2024-01-28",
    //     trend: "improving",  // improving/stable/declining
    //     needsReview: true
    //   }
    // }

    // === KONCEPTUELLA SVÅRIGHETER ===
    this.conceptualStruggles = [];
    // [
    //   {
    //     concept: "borrowing_across_zero",
    //     severity: "high",
    //     firstEncountered: "2024-01-15",
    //     improvementRate: 0.15
    //   }
    // ]

    // === KOGNITIV PROFIL ===
    this.cognitiveProfile = {
      workingMemoryCapacity: null,  // Estimeras över tid

      focusEndurance: {
        optimalSessionLength: null,  // Beräknas
        currentStreak: 0,
        bestStreak: 0
      },

      processingSpeed: {
        simple_arithmetic: 1.0,  // Relativ till medel
        complex_arithmetic: 1.0,
        pattern_recognition: 1.0
      }
    };

    // === TEMPORALA MÖNSTER ===
    this.temporalPatterns = {
      timeOfDay: {
        morning: { problems: 0, correct: 0, successRate: 0 },
        midday: { problems: 0, correct: 0, successRate: 0 },
        afternoon: { problems: 0, correct: 0, successRate: 0 }
      },

      sessionFatigue: {
        // Problem 1-5, 6-10, 11-15, 16+
        ranges: [
          { range: "1-5", successRate: 0 },
          { range: "6-10", successRate: 0 },
          { range: "11-15", successRate: 0 },
          { range: "16+", successRate: 0 }
        ]
      }
    };

    // === ERROR PATTERNS ===
    this.errorPatterns = {};
    // {
    //   "reverses_subtraction": {
    //     occurrences: 12,
    //     lastSeen: "2024-01-29",
    //     severity: "high"
    //   }
    // }

    // === SPACED REPETITION ===
    this.memoryProfile = {
      reviewSchedule: []
      // [
      //   {
      //     concept: "subtraction_borrowing",
      //     nextReview: "2024-01-31",
      //     interval: 2,  // days
      //     priority: "high"
      //   }
      // ]
    };

    // === MOTIVATIONAL PROFILE ===
    this.motivation = {
      currentMomentum: {
        streak: 0,
        confidence: "medium",  // low/medium/high
        engagement: 0.5        // 0-1
      },

      respondsTo: {
        achievements: 0.5,
        encouragement: 0.5,
        challenges: 0.5
      }
    };
  }

  /**
   * Estimera working memory capacity
   */
  estimateWorkingMemory() {
    const problems = this.recentProblems;

    // Hitta högsta WM-nivå där success rate > 70%
    let maxWM = 1;

    for (let wm = 1; wm <= 4; wm++) {
      const wmProblems = problems.filter(p =>
        p.difficulty?.cognitive_load?.working_memory === wm
      );

      if (wmProblems.length < 5) continue;  // Behöver mer data

      const successRate = wmProblems.filter(p => p.correct).length / wmProblems.length;

      if (successRate >= 0.7) {
        maxWM = wm;
      }
    }

    this.cognitiveProfile.workingMemoryCapacity = maxWM;
    return maxWM;
  }

  /**
   * Beräkna optimal session-längd
   */
  calculateOptimalSessionLength() {
    // Analysera när prestation börjar sjunka
    const sessionData = this.temporalPatterns.sessionFatigue.ranges;

    for (let i = 0; i < sessionData.length; i++) {
      if (sessionData[i].successRate < 0.7) {
        // Prestation sjunker här
        const optimalMinutes = (i + 1) * 5;  // Varje range = ~5 min
        this.cognitiveProfile.focusEndurance.optimalSessionLength = optimalMinutes;
        return optimalMinutes;
      }
    }

    return 20;  // Default om ingen drop detekteras
  }

  /**
   * Detektera om elev behöver paus
   */
  needsBreak(currentProblemNumber) {
    const optimal = this.cognitiveProfile.focusEndurance.optimalSessionLength;

    if (!optimal) return false;

    // Om över optimal tid
    const estimatedMinutes = currentProblemNumber * 0.5;  // ~30 sek per problem

    return estimatedMinutes >= optimal;
  }

  /**
   * Uppdatera momentum
   */
  updateMomentum(isCorrect) {
    if (isCorrect) {
      this.motivation.currentMomentum.streak++;

      if (this.motivation.currentMomentum.streak > this.cognitiveProfile.focusEndurance.bestStreak) {
        this.cognitiveProfile.focusEndurance.bestStreak = this.motivation.currentMomentum.streak;
      }

      // Öka confidence
      if (this.motivation.currentMomentum.streak >= 5) {
        this.motivation.currentMomentum.confidence = "high";
      }

    } else {
      this.motivation.currentMomentum.streak = 0;

      // Sänk confidence vid flera fel
      const recentErrors = this.recentProblems.slice(-5).filter(p => !p.correct).length;
      if (recentErrors >= 3) {
        this.motivation.currentMomentum.confidence = "low";
      }
    }
  }
}
```

## Data Storage Format (Vercel KV)

```javascript
// Key: student:{studentId}
// Value: Serialized StudentProfile

{
  studentId: "student_abc123",
  name: "Anna",
  grade: 4,
  created_at: 1706623200000,
  currentDifficulty: 3,

  recentProblems: [
    {
      problemId: "gen_001",
      problemType: "addition_2digit_with_carry",
      generated: { a: 47, b: 38, answer: 85 },
      studentAnswer: 85,
      correct: true,
      timeSpent: 23,
      timestamp: 1706623250000,
      difficulty: {
        conceptual_level: 3,
        cognitive_load: { working_memory: 2, steps: 2 }
      }
    }
    // ... max 50
  ],

  stats: {
    totalProblems: 47,
    correctAnswers: 39,
    overallSuccessRate: 0.83,
    avgTimePerProblem: 34,
    typeStats: { ... },
    weakestTypes: ["subtraction_3digit_with_borrow"],
    strongestTypes: ["addition_1digit_no_carry"]
  },

  // Phase 2+ data
  weaknessMap: { ... },
  cognitiveProfile: { ... },
  errorPatterns: { ... }
}
```

## Hjälpmetoder

```javascript
class StudentProfileHelpers {

  /**
   * Serialisera för lagring
   */
  static serialize(profile) {
    return JSON.stringify(profile);
  }

  /**
   * Deserialisa från lagring
   */
  static deserialize(json) {
    const data = JSON.parse(json);
    const profile = new StudentProfile(data.studentId, data.name, data.grade);
    Object.assign(profile, data);
    return profile;
  }

  /**
   * Exportera för lärare
   */
  static exportForTeacher(profile) {
    return {
      name: profile.name,
      grade: profile.grade,
      totalProblems: profile.stats.totalProblems,
      successRate: profile.stats.overallSuccessRate,
      weaknesses: profile.stats.weakestTypes,
      strengths: profile.stats.strongestTypes,
      lastActive: profile.recentProblems[profile.recentProblems.length - 1]?.timestamp
    };
  }

  /**
   * GDPR export (all data)
   */
  static exportGDPR(profile) {
    return {
      personal_info: {
        studentId: profile.studentId,
        name: profile.name,
        grade: profile.grade
      },
      learning_data: {
        problems_solved: profile.recentProblems,
        statistics: profile.stats
      },
      generated_at: Date.now()
    };
  }

  /**
   * Generera unikt elev-ID
   */
  static generateStudentId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // Undvik förvirrande tecken
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
}
```
