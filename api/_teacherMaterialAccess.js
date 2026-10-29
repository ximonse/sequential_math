import { getLiveTeacherAuthPayload } from './_helpers.js'
import { assertPupilEvidenceAccess, assertEvidenceSourceAccess } from './_pupilEvidenceRead.js'
import { assertTeacherAudienceTargetAccess } from './_teacherAudience.js'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'

async function checkBatch(items, check) {
  for (let start = 0; start < items.length; start += 20) {
    await Promise.all(items.slice(start, start + 20).map(check))
  }
}

export async function assertMaterialDraftAccess(req, state) {
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth || auth.teacherId !== state.teacherId) throw evidenceError(403, 'draft_access_denied', 'Utkastet är inte tillgängligt.')
  // Check every historical version: an older rationale can contain pupil-specific wording.
  for (const version of state.versions) {
    const { audience, basis, kind } = version.material
    await assertTeacherAudienceTargetAccess(req, audience.targetType, audience.targetId, state.teacherId)
    await checkBatch(audience.pupils, async pupil => {
      let accessible = false
      for (const classId of pupil.classIds) {
        try { await assertPupilEvidenceAccess(req, pupil.studentId, classId); accessible = true; break } catch (error) {
          if (![403, 410].includes(error.status)) throw error
        }
      }
      if (!accessible) throw evidenceError(403, 'draft_access_denied', 'Åtkomst till en tidigare mottagare saknas.')
      if (kind === 'screening') assertEvidenceSourceAccess(auth, pupil.studentId, 'screening')
    })
    await checkBatch(basis, async item => {
      await assertPupilEvidenceAccess(req, item.studentId, item.classId)
      assertEvidenceSourceAccess(auth, item.studentId, item.source)
    })
  }
  const live = await getLiveTeacherAuthPayload(req)
  if (!live || evidenceHash(live) !== evidenceHash(auth)) throw evidenceError(403, 'draft_access_denied', 'Lärarsessionen har ändrats.')
}
