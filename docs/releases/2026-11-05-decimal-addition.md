# Production receipt: reviewed decimal addition

Published through [PR #41](https://github.com/ximonse/sequential_math/pull/41)
on 2026-11-05, merged at 18:36:15 UTC. Release head
`7bf29f8f46f9fc75c1373caa9387828d5f465684`; production merge
`3a77fcefa66ae8099eafa07230ca7e2f20f6a6cb` on `master`.

## Integration and release checks

- Latest production `ddea646` was integrated before release, preserving
  **Random issues math** progress-view changes. That worktree was not edited.
- Semantic map check preserved 89 cards and 40 changed fields from both
  branches. No unresolved merge conflicts.
- Integrated snapshot: 231 test files / 1,247 tests and production build passed.
- Fifteen relevant browser integration cases passed together, zero reported
  rule violations: three decimal packages, report/material/results and the
  current class selection, ranking and progress-loading cases.
- The reviewed addition mathematics also passed the 111,375 open-key checks.
  These are deterministic checks, not an external blind test.
- GitHub quality and documentation checks passed before merge. CI reran the
  tests, MCP checks and build. The delayed Vercel preview later passed too.

## Production and queue history

Vercel **sekvens**, deployment `dpl_FAD5Bosn6KzozUoVQhqUSD2csoj2`, was
observed `READY` at 18:45:35 UTC with the exact production merge SHA and alias
`matematik.ximon.se`. It was created from GitHub (`source:git`).

Before completion it remained `INITIALIZING` without build logs. A direct
read of the same deployment confirmed `isInSystemBuildsQueue:true` and
`isInConcurrentBuildsQueue:false`. Vercel's official
[component status](https://www.vercel-status.com/api/v2/components.json)
reported degraded performance for Builds during the wait. The existing job
completed without a duplicate, a manual deployment, a Git-link change or a
resource/plan change. The event-list connector returned 403; its documented
read-only CLI fallback succeeded with the same explicit project/team.

## Domain and authenticated preview

- `https://matematik.ximon.se` returned HTTP 200 and `index-B11X6ayv.js`,
  matching the locally verified build's entry filename. It contains the
  addition package identity and `predictable-errors-v9`.
- `MaterialReview-DhhdLRlZ.js` returned 200 with control-observation handling.
- Unauthenticated reads of the affected material and pupil-analysis API
  entries returned expected HTTP 401 JSON; the new server modules load.
- The connected MCP teacher/owner binding and current audience were checked
  before a read-only preview in an existing authorized test class.
- MCP `math_preview_material` and an independent direct-domain probe using
  the same teacher/recipient both returned all seven exact expected answers:

| Task | Expected answer |
|---|---|
| `decimal-add-source` | 6.15 |
| `decimal-add-contrast-a` | 4.34 |
| `decimal-add-contrast-b` | 6.52 |
| `decimal-add-teaching` | 4.25 |
| `decimal-add-independent_check` | 6.33 |
| `decimal-add-later_check` | 5.44 |
| `decimal-add-negative_control` | 5.37 |

Both previews returned `saved:false`, `assigned:false` and
`approval:not_requested`. Header-authenticated approval/publication requests
using a nonexistent draft returned 403. No pupil answers or private labels
were requested, and no material, assignment, teaching note or mastery record
was changed. Credentials, login tokens and pupil identifiers are not recorded
here. Previewing all roles together was a catalog check, not a teaching
assignment.

The full teaching/assignment/pupil-answer chain passed locally with synthetic
pupils. A complete production pupil pilot and physical iPad verification
remain separate from this authenticated preview. The first two decimal
packages' receipts remain dated evidence of their own releases.
