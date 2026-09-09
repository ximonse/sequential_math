# Reliability work plan

## Goals and boundaries

- Separate pupil identity from display names.
- Show server pupils on a new teacher device; list summaries are never writable profiles.
- Acknowledge writes before reporting success; retries must be safe.
- Preserve answers during concurrent writes, offline recovery and delayed responses.
- Enforce class authorization and prevent deleted records/memberships from reappearing.
- Use consistent statistical periods and evidence; distinguish no evidence from difficulty.
- Preserve real 4a and 4b pupils and unrelated local files.
- Verify with synthetic data. No production writes, push or deploy in this repair round without release authorization.

## Sequence

1. Implemented locally: list/full-profile separation, unique pupil creation, retry IDs, roster preview and acknowledged save results. Terra stopped at the account usage limit; the parent completed its partial work.
2. Implemented locally: compare-and-set profile/event writes, 100-event batches, serialized queued writes, delayed-response guards, teacher PATCH, deletion tombstones and live class ownership checks. Real Redis integration and interrupted deletion cleanup remain release gates.
3. Implemented locally: shared Stockholm day/week boundaries; day, current-week and rolling-30-day aggregate summaries from the preferred history source; conservative capped-history labeling; neutral presence and no-answer labels in the class overview. The remaining detailed statistics and instructional UX work is listed below.
4. Implemented locally: pupil highscore-list indexing and deletion cleanup, plus an explicit existing-pupil selector in class management. The roster textarea remains new-pupil only.
5. Implemented locally: live teacher-account session validation. Account tokens now require a matching KV account and session version; account password, role and direct class changes revoke older tokens.

## Acceptance scenarios

- New teacher browser sees server pupils and opens full details.
- Same-name pupils remain separate; repeated clicks/retries do not duplicate pupils.
- Partial failures stay retryable and never appear fully saved.
- Concurrent profile/event writes preserve new answers exactly once.
- More than 100 offline events recover; delayed responses do not replace newer local work.
- Stale clients cannot restore deleted pupils/classes or removed memberships.
- Teachers cannot access pupils outside their classes.
- Summary and detail agree for the same period and disclose incomplete evidence.

## Verification record

For each coherent change inspect the scoped diff, run meaningful tests and required npm run test/build, then make a scoped local commit. Browser verification is separate and uses synthetic data. The initial review inspected local code only; production API storage of 4a/4b was verified previously, not their display in the UI. Record completed work and actual checks below.

### 2026-09-08 local checkpoint

- 143 tests passed across 35 files. Includes same-name pupils, concurrent/retried enrollment, explicit group membership, read-only list DTOs, PATCH revisions, concurrent profile/event updates, tombstones, highscore cleanup, immediate account-token revocation, 205 queued events, delayed responses, partial/lost roster acknowledgements, Stockholm DST boundaries and complete day/week period totals alongside a capped detail sample.
- The persistence tests use an atomic in-memory Redis simulation. They execute real handlers but do not execute the Lua script in Redis.
- Production build passed, with bundle-size and outdated Browserslist-data warnings. These warnings were not suppressed.
- Browser skills `agent-browser` and `agent-browser-verify`: isolated localhost session, synthetic pupil and mocked API responses. Visually inspected login and roster form. Four names with mixed separators render as four preview rows; a simulated 503 retains input and reports failure. Presence/no-answer labels rendered; no Vite overlay or browser errors were reported during the checked flow. This was not a real API enrollment test or physical tablet QA.
- No production data, push or deployment in this round. New 4a/4b pupils are outside the test data.

## Remaining work / release gates

- Execute CAS Lua against an isolated real Redis, including simultaneous class deletion and enrollment. A non-admin teacher now receives a narrowly scoped deletion-retry marker before tombstoning, so interrupted cleanup can resume; this remains unverified against real Redis and is not a multi-record transaction.
- Reconcile remaining detailed breakdowns and exports: operation, skill, assignment and reasonable-error detail can still come from the capped recent list, even when the aggregate day/week total is complete. Do not infer a complete per-skill history from the aggregate tests above.
- Test full teacher detail, tickets, password changes, successful enrollment and student practice end-to-end against a local API plus synthetic database; exercise touch on a tablet.
- Retire the legacy environment-password auth path after confirming that every intended teacher has an account. It deliberately bypasses per-account session revocation for backwards compatibility.
- Historical highscore lists created before the per-pupil index can only be checked through the pupil's current classes; full historical key discovery would require a separate migration/indexing job.
- Evaluate a minimal optional worked-example flow within existing domain capabilities; do not add unsupported explanations.
- Remove the old development backup-import route and button only as a separately inspected cleanup; they were not used in QA.
