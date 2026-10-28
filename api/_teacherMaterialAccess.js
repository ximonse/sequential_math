import { getLiveTeacherAuthPayload } from './_helpers.js'
import { assertPupilEvidenceAccess, assertEvidenceSourceAccess } from './_pupilEvidenceRead.js'
import { resolveTeacherAudience } from './_teacherAudience.js'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'

export async function assertMaterialDraftAccess(req, state) {
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth || auth.teacherId !== state.teacherId) throw evidenceError(403, 'draft_access_denied', 'Utkastet är inte tillgängligt.')
  // Check every historical version: an older rationale can contain pupil-specific wording.
  for (const version of state.versions) {
    const { audience, basis, kind } = version.material
    await resolveTeacherAudience({ ...req, headers: req.headers, query: { targetType: audience.targetType, targetId: audience.targetId, limit: 1 } })
    for (const pupil of audience.pupils) {
      let accessible = false
      for (const classId of pupil.classIds) {
        try { await assertPupilEvidenceAccess(req, pupil.studentId, classId); accessible = true; break } catch (error) {
          if (![403, 410].includes(error.status)) throw error
        }
      }
      if (!accessible) throw evidenceError(403, 'draft_access_denied', 'Åtkomst till en tidigare mottagare saknas.')
      if (kind === 'screening') assertEvidenceSourceAccess(auth, pupil.studentId, 'screening')
    }
    for (const item of basis) {
      await assertPupilEvidenceAccess(req, item.studentId, item.classId)
      assertEvidenceSourceAccess(auth, item.studentId, item.source)
    }
  }
  const live = await getLiveTeacherAuthPayload(req)
  if (!live || evidenceHash(live) !== evidenceHash(auth)) throw evidenceError(403, 'draft_access_denied', 'Lärarsessionen har ändrats.')
}
