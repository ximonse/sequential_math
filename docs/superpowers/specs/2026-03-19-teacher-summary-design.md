# Teacher Summary — Robust Data Flow Design

## Goal

Ensure the teacher dashboard always shows accurate student data regardless of whether `problemLog` (5000 items) is available. Eliminate fragile on-the-fly calculations from potentially incomplete data.

## Problem

The `/api/students` endpoint strips `problemLog` for performance (too large for bulk list). Teacher dashboard panels that need historical data only get `recentProblems` (250 items), causing stale/missing mastery data and inconsistencies between student and teacher views.

## Solution

Compute a lightweight `teacherSummary` object on the student's device (which has full data) after every answer. This syncs to the cloud as part of the profile and is available to the teacher dashboard directly.

## Architecture

### Data Structure

```js
profile.teacherSummary = {
  effectiveLevels: { addition: 2, subtraction: 1, ... },
  operationStats7d: {
    addition: { attempts: 23, correct: 20, accuracy: 0.87 },
    ...
  },
  weeklyActivity: {
    attempts: 45,
    correct: 38,
    activeDays: 4,
    totalSpeedSec: 312,
  },
  errorBreakdown7d: {
    knowledgeErrors: 5,
    inattentionErrors: 2,
  },
  updatedAt: <timestamp>
}
```

### Flow

```
Student answers → addProblemResult()
  → computeTeacherSummary(profile) using full problemLog
  → profile.teacherSummary = result
  → saveProfile() → localStorage + cloud sync

Cloud:
  POST /api/student/{id} → stores full profile incl teacherSummary
  GET /api/students → sanitizeProfileForList keeps teacherSummary (small)

Teacher dashboard:
  → reads teacherSummary directly from student object
  → panels use pre-computed values instead of recalculating
  → fallback: compute from recentProblems for old profiles without teacherSummary
```

### What teacherSummary replaces

| Panel | Current source | New source |
|-------|---------------|------------|
| Nivåöversikt | `effectiveLevels` field (separate) | `teacherSummary.effectiveLevels` |
| Klassöversikt (7d stats) | `buildStudentOperationStats7d()` from raw data | `teacherSummary.operationStats7d` as fallback |
| Stödbehov (activity) | `buildStudentRow()` from raw data | `teacherSummary.weeklyActivity` |

### What continues using recentProblems

Panels needing granular per-level or per-day data continue computing from `recentProblems`. This is fine because they look at most 7-21 days back, which fits within 250 items:

- Svårighetsanalys (per operation+level error breakdown)
- Daglig aktivitet (per-day chart)
- Tabellstatus (table drill completion tracking)
- Träningsprioritet (per-level mastery check)

### Code cleanup

1. Remove `getTableProblemSourceForStudent()` from `dashboardTableStatusUtils.js` — duplicate of `getPreferredProblemSource()` in `masteryCalculation.js`
2. Move `effectiveLevels` into `teacherSummary` (remove separate field)
3. Simplify fallback logic in `buildClassMasteryRows`

### Computation

New function `computeTeacherSummary(profile)` in `masteryCalculation.js`:
- Uses `getPreferredProblemSource(profile)` for full data access
- Computes effectiveLevels (already exists)
- Filters last 7 days for operationStats7d, weeklyActivity, errorBreakdown7d
- Returns the summary object

Called from `addProblemResult()` in `studentProfile.js` after `updateStats()`.

### Backward compatibility

- Old profiles without `teacherSummary`: panels fall back to computing from available data
- `effectiveLevels` field kept during transition, removed in future cleanup
- No API changes needed (teacherSummary passes through existing sync)
