export function createStorageClassApi(deps) {
  const {
    CLASSES_KEY,
    addProfileToClassMembership,
    areClassRecordListsEqual,
    createAndSaveProfile,
    createUniqueStudentId,
    ensureProfileAuth,
    getAllProfiles,
    loadProfile,
    normalizeClassRecords,
    normalizeStudentId,
    parseRosterLines,
    profileHasClass,
    removeProfileFromClassMembership,
    saveProfile
  } = deps

  function saveClasses(classes) {
    const normalized = normalizeClassRecords(classes)
    localStorage.setItem(CLASSES_KEY, JSON.stringify(normalized))
  }

  function getClasses() {
    const data = localStorage.getItem(CLASSES_KEY)
    if (!data) return []

    try {
      const parsed = JSON.parse(data)
      if (!Array.isArray(parsed)) return []
      const normalized = normalizeClassRecords(parsed)
      if (!areClassRecordListsEqual(parsed, normalized)) {
        saveClasses(normalized)
      }
      return normalized
    } catch {
      return []
    }
  }

  async function createClassFromRoster(classNameInput, rosterText, grade = 4) {
    const className = String(classNameInput || '').trim()
    if (!className) {
      return { ok: false, error: 'Ange klassnamn.' }
    }

    const names = parseRosterLines(rosterText)
    if (names.length === 0) {
      return { ok: false, error: 'Klistra in minst ett namn.' }
    }

    const classes = getClasses()
    const allProfiles = getAllProfiles()
    const existingIds = new Set(allProfiles.map(p => p.studentId))

    const classId = `class_${Date.now()}`
    const studentIds = new Set()
    const classRecord = {
      id: classId,
      name: className
    }

    for (const name of names) {
      const base = normalizeStudentId(name)
      if (!base) continue

      let profile = loadProfile(base)
      if (profile) {
        profile.name = name
        ensureProfileAuth(profile)
        addProfileToClassMembership(profile, classRecord)
        saveProfile(profile)
        studentIds.add(profile.studentId)
        continue
      }

      const uniqueId = createUniqueStudentId(base, existingIds)
      const created = await createAndSaveProfile(uniqueId, name, grade, {
        initialPassword: name,
        classId,
        className
      })
      studentIds.add(created.studentId)
    }

    const finalClassRecord = {
      id: classId,
      name: className,
      studentIds: Array.from(studentIds),
      createdAt: Date.now()
    }

    classes.unshift(finalClassRecord)
    saveClasses(classes)

    return {
      ok: true,
      classRecord: finalClassRecord
    }
  }

  async function addStudentsToClass(classId, rosterText, grade = 4) {
    const targetClassId = String(classId || '').trim()
    if (!targetClassId) {
      return { ok: false, error: 'Välj en klass att lägga till elever i.' }
    }

    const classes = getClasses()
    const target = classes.find(item => String(item.id || '').trim() === targetClassId)
    if (!target) {
      return { ok: false, error: 'Välj en klass att lägga till elever i.' }
    }

    const names = parseRosterLines(rosterText)
    if (names.length === 0) {
      return { ok: false, error: 'Klistra in minst ett namn.' }
    }

    const allProfiles = getAllProfiles()
    const existingIds = new Set(allProfiles.map(p => p.studentId))
    const studentIds = new Set(target.studentIds || [])
    let addedCount = 0

    for (const name of names) {
      const base = normalizeStudentId(name)
      if (!base) continue

      let profile = loadProfile(base)
      if (profile) {
        profile.name = name
        ensureProfileAuth(profile)
        const wasInClass = profileHasClass(profile, target.id)
        addProfileToClassMembership(profile, target)
        saveProfile(profile)
        if (!studentIds.has(profile.studentId)) {
          studentIds.add(profile.studentId)
        }
        if (!wasInClass) {
          addedCount += 1
        }
        continue
      }

      const uniqueId = createUniqueStudentId(base, existingIds)
      const created = await createAndSaveProfile(uniqueId, name, grade, {
        initialPassword: name,
        classId: target.id,
        className: target.name
      })

      if (!studentIds.has(created.studentId)) {
        studentIds.add(created.studentId)
        addedCount += 1
      }
    }

    target.studentIds = Array.from(studentIds)
    saveClasses(classes)

    return {
      ok: true,
      classRecord: target,
      addedCount
    }
  }

  function updateClassExtras(classId, extras) {
    const targetId = String(classId || '').trim()
    if (!targetId) return false
    const classes = getClasses()
    const idx = classes.findIndex(c => String(c.id || '').trim() === targetId)
    if (idx < 0) return false
    classes[idx] = { ...classes[idx], enabledExtras: Array.isArray(extras) ? extras : [] }
    saveClasses(classes)
    return true
  }

  function removeClass(classId) {
    const targetClassId = String(classId || '').trim()
    if (!targetClassId) return

    const classes = getClasses().filter(c => String(c.id || '').trim() !== targetClassId)
    saveClasses(classes)

    const classNameById = new Map(classes.map(item => [item.id, item.name]))
    const affectedProfiles = getAllProfiles().filter(profile => profileHasClass(profile, targetClassId))
    for (const profile of affectedProfiles) {
      if (removeProfileFromClassMembership(profile, targetClassId, classNameById)) {
        saveProfile(profile)
      }
    }
  }

  function saveClass(classRecord) {
    if (!classRecord || !classRecord.id) return
    const classes = getClasses()
    const idx = classes.findIndex(c => c.id === classRecord.id)
    if (idx >= 0) {
      classes[idx] = { ...classes[idx], ...classRecord }
    } else {
      classes.unshift({ studentIds: [], enabledExtras: [], ...classRecord })
    }
    saveClasses(classes)
  }

  return {
    addStudentsToClass,
    createClassFromRoster,
    getClasses,
    removeClass,
    saveClass,
    updateClassExtras
  }
}
