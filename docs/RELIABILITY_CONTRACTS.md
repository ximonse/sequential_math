# Reliability boundaries

Verified from implementation during the local 2026-09-08 repair. See RELIABILITY_PLAN.md for verification limits and remaining work.

| Boundary | Producers / writers | Consumers | Invariant |
| --- | --- | --- | --- |
| Teacher list DTO | api/students.js, teacherListProfile.js | Dashboard, teacher analytics | Versioned read-only shape, no problemLog or password hash/salt; never pass to saveProfile. |
| Full profile | student GET, loadTeacherProfile | Student state, teacher details | Complete current profile schema. Details fetch this independently of the list. |
| Enrollment | rosterClient -> student-roster | Class UI, student store | Each row is a distinct identity. Same request and row replay the same ID; names never identify existing pupils. Existing group members are explicit IDs with source-class authorization. |
| Pilot enrollment | PilotRosterPanel -> student-roster pilotCount | Class UI, student store | Creates profiles with a random-looking 128-bit ID, a child-safe three/four-word login code, QR secret and separate four-digit PIN. A teacher may later add the pupil's approved name without changing the login code. The request ID makes retries idempotent. The browser persists only retry metadata; raw credentials remain in React memory for immediate copy/print and are returned in a no-store response. Only credential verifiers are persisted server-side. Class membership is indexed in class_students:{classId}. |
| Profile/event persistence | _studentStore CAS | POST profile, POST events, enrollment, deletion | Revision comparison and record/index update share a Lua operation; transforms retry conflicts. New pupil tombstone keys contain a SHA-256 digest instead of a potentially name-bearing legacy ID; reads also respect old tombstones during migration. Tombstones reject resurrection. Class deletion retains the initiating teachers in a narrowly scoped retry marker so cleanup can resume. Not a cross-record transaction. |
| Teacher commands | teacherProfileUpdate -> student PATCH | Tickets | Live ownership, expected server revision, allowlisted ticket fields. Training snapshots cannot change membership, identity or teacher ticket state. |
| Local queued sync | storageCloudSyncQueue, storageCloudSync | Student saves, online/retry/unload | Queue before request; one in-flight queued write per pupil; acknowledge only unchanged sent snapshot; retain newer local work. Events batch at 100 and accept only submitted acknowledgements. |
| Pilot event persistence | pilotStudentStore -> /api/me/events | Pilot profile, teacher evidence | The server accepts bounded batches and per-event payloads. Profile checkpoints can update only adaptive/progress/statistics fields, never identity, membership, auth, teacher ticket instructions or problem logs. Ticket answers are matched to the active server dispatch and graded against its server-held answer; clients submit only dispatch ID, answer and timing. Pilot profile responses remove active-ticket answers, legacy encoded ticket payloads, expected answers and hidden correctness. |
| Pilot runtime and offline vault | pilotStudentRuntime, pilotStudentStore -> /api/me/events | QR+PIN or login-code+PIN pilot login, home and practice | Pilot routes resume the cookie session, verify that the route belongs to that pupil and persist checkpoints/results through a per-pupil IndexedDB vault before attempting network sync. The vault uses a non-exportable AES-GCM key, unique IVs and AAD bound to schema, pupil and record type. Snapshot plus event append share one transaction. QR, PIN and CSRF-shaped fields are rejected and no plaintext fallback exists. Offline login is deliberately unsupported; runtime IndexedDB behavior, CryptoKey persistence and recovery after a hard refresh still require physical iPad QA before offline support is enabled. |
| Evidence periods | teacherEvidencePeriods, computeTeacherSummary | Dashboard day/week totals and 30-day aggregate, mastery boards | Europe/Stockholm independent of server timezone, including DST. Period totals are derived from the preferred full log when available; operation/error detail from the capped list is labelled as a detail sample. |
| Highscores | authenticated highscores, student DELETE | Pause games, teacher highscore view | Lists require a live pupil session assigned to the class or an authorized teacher; public reads are rejected. Responses expose display alias and score, not pupil IDs or timestamps. Pilot writes derive pupil identity from the cookie session and require origin plus CSRF. New scores record their list key per pupil. Deletion removes indexed entries and also checks the pupil's current class groups; a cleanup failure is explicitly returned as pending rather than reported as a failed pupil deletion. |
| Existing-pupil enrollment | ClassManagementPanel -> student-roster | Class membership | Names in the roster box always create new identities. Moving an existing pupil requires an explicit ID-backed checkbox selection and existing source-class authorization. |
| Teacher account session | teacher-login -> signed HttpOnly cookie/header transition -> getLiveTeacherAuthPayload | Every teacher-protected API route | A signed account token must match a live account and its current sessionVersion. The login sets a Secure, SameSite=Strict, HttpOnly cookie. Cookie-authenticated mutations require a trusted Origin. The header token remains temporarily supported during client migration. Password, role or direct account-class changes increment the version; deleted/disabled accounts are rejected immediately. Raw password headers and accountless tokens are rejected. `isPrimaryAdmin` is the root-admin marker: only it may list, create, change or delete teacher accounts; ordinary admins still manage whole-school classes and pupils. The root is set either on the account, through the protected `PRIMARY_ADMIN_USERNAME` environment variable, or by the legacy account ID `admin` during migration. |

Local class caches are projections of the authorized server list, not a source that recreates missing server classes. Class settings/deletion and roster operations show success only after a successful response. A partial roster response preserves the list and request identity for retry.

The tests cover executable boundary behavior rather than trusting this document: api/studentAlias.test.js, api/studentStore.test.js, src/lib/storageReliability.test.js, src/lib/rosterClient.test.js, src/lib/teacherEvidencePeriods.test.js, src/lib/teacherSummary.test.js and dashboardStudentRowHelpers.test.js.

## Schools and pupil login (2026-09-10)

Schools are separate records: `school:{id}` and `schools:index`. Creation uses
the same atomic record/index boundary as classes. A live teacher may list
schools, but only an administrator may create them. School metadata grants no
access to pupils. Class ownership remains the authorization boundary.

Classes have an optional `schoolId`, validated against the school register when
created or changed. A pupil belongs to schools through their current classes and
groups. There is no duplicated school field on the pupil profile. The stable
student ID, password and training history do not change when a class is linked
to a school or a pupil changes groups. Multiple memberships remain supported.

Existing classes are not automatically assigned to an invented school. Missing
school IDs appear as "Skola ej angiven"; administrators can select the correct
school and explicitly save the association. Ordinary teachers can manage their
own roster and rename their classes, but cannot create schools, change a class'
school association or delete a class. New roster submissions include the
selected school in their retry identity. Changing that selection during a
partial retry must not silently reuse an enrollment for a different school.

The `student-login` endpoint accepts only a name or stable student ID and
password. It has no public school/class directory; GET returns 405 and
school/class fields in login requests are rejected. After password verification
it returns only the authenticated pupil's live class/group memberships, including
the associated school name. A pupil without a live assigned group cannot continue.

Explicit IDs take precedence over display names and use a direct record read.
A unique display name resolves to its canonical ID after password verification.
Duplicate names require the pupil's stable ID, including duplicates at different
schools. The browser stores one selected assigned class for the active pupil
session. Class configuration and game score submissions use that class; the
highscore endpoint rejects a class not assigned to the pupil. Login never writes
assignments or training data. Deleted pupils, deleted classes and unsupported
profiles are rejected.

Verification: real API handlers with synthetic KV data cover school creation,
authorization, roster retry, school reassignment without profile mutation,
name/ID login and rejection of pupil-supplied membership. Browser checks use
intercepted synthetic API data; they do not modify live schools or pupil accounts.
