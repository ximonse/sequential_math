# Production receipt: reviewed decimal subtraction

Published through [PR #40](https://github.com/ximonse/sequential_math/pull/40)
on 2026-11-05 at 11:56:08 UTC. Release head
`c088f3702bcd821f8cf24ad671dd26718497ae92`; merge commit
`4012ac461dcdc22d9dfd92f63241e49694e328a8` on `master`.

## Integration and release verification

- Current production `2c99835` was merged before publication. The already
  published number-bond, Talbild, pause-game and progress-view work from
  **Random issues math** is preserved. Its worktree was not edited.
- Semantic project-map check preserved 87 cards and 53 changed fields from
  both branches. The merge had no unresolved conflicts.
- Integrated snapshot: 230 test files / 1,239 tests and production build passed.
- Fifteen browser integration cases passed together with one worker, zero
  reported rule violations: both decimal packages, report/material/results,
  full number-bond progression and restart, class/progress choices, completed
  Pong and aborted Snake with separate authorized statistics.
- GitHub quality/documentation and Vercel preview checks passed before merge.
  CI reran unit tests, MCP checks and build on the release.
- Vercel **sekvens**, deployment `dpl_CYr3U9HWjZZyw6vejUvGiCZeKYSi`, is `READY`
  with the exact merge SHA and alias `matematik.ximon.se`.
- The production domain returned HTTP 200, `index-Ds3u0Tz0.js` contains the
  subtraction package and `predictable-errors-v8`; the live
  `MaterialReview-DQ-cpKip.js` contains control-observation handling.
- Unauthenticated material and pupil-analysis API reads returned expected
  HTTP 401 JSON, confirming that affected server entry modules load.

No manual Vercel deployment or project link was used.

## Next plan step: authenticated, read-only production preview

The connected Sequential Math MCP identified its teacher account and owner
binding. A current authorized audience in an existing test class was resolved.
No pupil answers or private pupil labels were requested.

`math_preview_material` successfully validated the seven approved subtraction
tasks against this current audience. An independent direct-domain API probe
used the same teacher account and test-class recipient, so the check is bound
to `https://matematik.ximon.se` as well as to the connector.

| Task | Verified expected answer |
|---|---|
| `decimal-sub-source` | 4.25 |
| `decimal-sub-contrast-a` | 5.34 |
| `decimal-sub-contrast-b` | 5.17 |
| `decimal-sub-teaching` | 4.14 |
| `decimal-sub-independent_check` | 5.26 |
| `decimal-sub-later_check` | 4.36 |
| `decimal-sub-negative_control` | 5.43 |

Both previews returned `saved:false`, `assigned:false`,
`approval:not_requested`. Header-authenticated approval and publication calls
using a nonexistent draft returned HTTP 403. No material was saved, approved
or assigned. No changes were made to pupil work, teaching notes or mastery.
Credentials, login tokens and pupil identifiers are not recorded here.

This closes the next read-only access/catalog/marking check after publication.
It does not establish the entire authenticated production lifecycle. The full
teaching/check-in/assignment/pupil-answer chain passed locally with synthetic
pupils; an explicitly approved production pilot and physical iPad verification
remain separate. Previewing all seven roles here is a catalog check, not an
instruction to assign source, teaching and control tasks together.
