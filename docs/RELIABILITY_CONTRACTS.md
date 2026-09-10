# Reliability boundaries

Verified from implementation during the local 2026-09-08 repair. See RELIABILITY_PLAN.md for verification limits and remaining work.

| Boundary | Producers / writers | Consumers | Invariant |
| --- | --- | --- | --- |
| Teacher list DTO | api/students.js, teacherListProfile.js | Dashboard, teacher analytics | Versioned read-only shape, no problemLog or password hash/salt; never pass to saveProfile. |
| Full profile | student GET, loadTeacherProfile | Student state, teacher details | Complete current profile schema. Details fetch this independently of the list. |
| Enrollment | rosterClient -> student-roster | Class UI, student store | Each row is a distinct identity. Same request and row replay the same ID; names never identify existing pupils. Existing group members are explicit IDs with source-class authorization. |
| Profile/event persistence | _studentStore CAS | POST profile, POST events, enrollment, deletion | Revision comparison and record/index update share a Lua operation; transforms retry conflicts. Tombstones reject resurrection. Class deletion retains the initiating teachers in a narrowly scoped retry marker so cleanup can resume. Not a cross-record transaction. |
| Teacher commands | teacherProfileUpdate -> student PATCH | Tickets | Live ownership, expected server revision, allowlisted ticket fields. Training snapshots cannot change membership, identity or teacher ticket state. |
| Local queued sync | storageCloudSyncQueue, storageCloudSync | Student saves, online/retry/unload | Queue before request; one in-flight queued write per pupil; acknowledge only unchanged sent snapshot; retain newer local work. Events batch at 100 and accept only submitted acknowledgements. |
| Evidence periods | teacherEvidencePeriods, computeTeacherSummary | Dashboard day/week totals and 30-day aggregate, mastery boards | Europe/Stockholm independent of server timezone, including DST. Period totals are derived from the preferred full log when available; operation/error detail from the capped list is labelled as a detail sample. |
| Highscores | highscores, student DELETE | Pause games, teacher highscore view | New scores record their list key per pupil. Deletion removes indexed entries and also checks the pupil's current class groups; a cleanup failure is explicitly returned as pending rather than reported as a failed pupil deletion. |
| Existing-pupil enrollment | ClassManagementPanel -> student-roster | Class membership | Names in the roster box always create new identities. Moving an existing pupil requires an explicit ID-backed checkbox selection and existing source-class authorization. |
| Teacher account session | teacher-login -> signed token -> getLiveTeacherAuthPayload | Every teacher-protected API route | A signed account token must match a live account and its current sessionVersion. Password, role or direct account-class changes increment that version; deleted/disabled accounts are rejected immediately. Raw password headers and accountless tokens are rejected. |

Local class caches are projections of the authorized server list, not a source that recreates missing server classes. Class settings/deletion and roster operations show success only after a successful response. A partial roster response preserves the list and request identity for retry.

The tests cover executable boundary behavior rather than trusting this document: api/studentStore.test.js, src/lib/storageReliability.test.js, src/lib/rosterClient.test.js, src/lib/teacherEvidencePeriods.test.js, src/lib/teacherSummary.test.js and dashboardStudentRowHelpers.test.js.

## Schools and pupil login (2026-09-10)

Schools are separate records: `school:{id}` and `schools:index`. Creation uses
the same atomic record/index boundary as classes. A live teacher may list and
create schools through `teacher-schools`; school metadata grants no access to
pupils. Class ownership remains the authorization boundary.

Classes have an optional `schoolId`, validated against the school register when
created or changed. A pupil belongs to schools through their current classes and
groups. There is no duplicated school field on the pupil profile. The stable
student ID, password and training history do not change when a class is linked
to a school or a pupil changes groups. Multiple memberships remain supported.

Existing classes are not automatically assigned to an invented school. Missing
school IDs appear as "Skola ej angiven"; teachers can select the correct school
and explicitly save the association. New roster submissions include the selected
school in their retry identity. Changing that selection during a partial retry
must not silently reuse an enrollment for a different school.

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
