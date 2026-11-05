# Production receipt: teacher evidence and decimal multiplication pilot

Published through [PR #39](https://github.com/ximonse/sequential_math/pull/39)
on 2026-11-05 at 09:04:34 UTC. Release head
`55850df566cdc9f5e04610a2807b787821917db4`; merge commit
`c26de2cbcc02ff67adbdcbb837347771eeed1d0e` on `master`.

## Verified release

- GitHub quality and documentation checks passed; Vercel preview passed.
- Vercel project **sekvens**, production deployment
  `dpl_3DKMi6mJDyXAM2QhAymE4bRFAcJe`, became `READY` with the exact merge SHA.
- Vercel reports `matematik.ximon.se` as an alias of this deployment.
- Public domain returned HTTP 200, entry `index-BWfxNokF.js` with the decimal
  pilot package identity, and `MaterialReview-Ckv1EogZ.js` with teaching and
  control-observation handling. The latter is a separate lazy-loaded module.
- Unauthenticated GETs to `/api/teacher-material?resource=drafts` and
  `/api/teacher-students/RELEASE-SMOKE?resource=analysis` returned the expected
  HTTP 401 JSON. This verifies module import and authentication handling,
  not authenticated teacher operations or pupil access.

E1–E3 and the approved E4 decimal multiplication pilot are included.
[Local verification and its limits](../E4_DECIMAL_MULTIPLICATION_REVIEW.md)
remain distinct from this production smoke check. No real pupil assignment,
authenticated production pilot or physical iPad verification was performed.
No manual Vercel deployment or project link was created.

## Parallel work protected

Thread `01a1aac6-e94f-73c1-8433-e8fd58200396`, **Random issues math**, uses
`fix/talpar-start-blandning` in its own worktree. At release time its head was
`4057891a65b098dcf3db28bc22d215e21d60c4f6`, descended from release head
`55850df`. Its later commits and working edits were excluded. A merge commit
preserves the common ancestry; no file in that worktree was changed here.

Before its eventual integration, reconcile project-map fields with the latest
`master` and this checkout's subsequent documentation commit. The shared
`plan.json` must not be replaced wholesale with either branch's older copy.
No claim is made that future edits cannot conflict; the protected boundary
here is the exact published commit set and untouched parallel worktree.

## Continued work

The next [decimal subtraction packet](../E4_DECIMAL_SUBTRACTION_REVIEW.md)
is a locally checked proposal requiring teacher review before activation.
It is not part of this production commit. It identifies an overlapping source
answer and a missing decimal rival instead of claiming complete coverage.
