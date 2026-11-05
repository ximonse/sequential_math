// Owns one current scope. Late responses can never publish into a newer scope
// or a refreshed catalog, and incomplete lists never become result data.
export function normalizePupilScope({ classIds = [], studentIds = [] } = {}) {
  return { classIds: [...new Set(classIds.map(String))].sort(),
    studentIds: [...new Set(studentIds.map(id => String(id).toUpperCase()))].sort() }
}
export const pupilScopeKey = scope => JSON.stringify(normalizePupilScope(scope))

export function createTeacherPupilLoader({ loadProfiles, publish, onState }) {
  let catalog = [], catalogReady = false, scope = normalizePupilScope()
  let generation = 0, currentKey = '', pending = null
  let readyKey = '', lastProfiles = []
  const emit = profiles => { lastProfiles = profiles; publish(profiles) }
  const matches = profile => scope.studentIds.includes(profile.studentId)
    || [profile.classId, ...(profile.classIds || [])].some(id => scope.classIds.includes(String(id)))
  const run = () => {
    const requestGeneration = ++generation
    const selected = scope, key = pupilScopeKey(selected)
    currentKey = key
    const previous = new Map(lastProfiles.filter(profile => !profile.catalogOnly).map(profile => [profile.studentId, profile]))
    const hasData = readyKey === key && catalog.filter(matches).every(profile => previous.has(profile.studentId))
    emit(hasData ? catalog.map(profile => {
      const cached = matches(profile) && previous.get(profile.studentId)
      return cached ? { ...cached, ...profile, catalogOnly: false,
        recentProblems: cached.recentProblems, stats: cached.stats, masteryFacts: cached.masteryFacts } : profile
    }) : catalog)
    if (!selected.classIds.length && !selected.studentIds.length) {
      onState({ key, status: 'idle', error: '' })
      return Promise.resolve(true)
    }
    onState({ key, status: 'loading', error: '', hasData })
    if (!catalogReady) return Promise.resolve(true)
    pending = loadProfiles(selected).then(profiles => {
      if (generation !== requestGeneration) return false
      const byId = new Map(profiles.map(profile => [profile.studentId, profile]))
      const expected = catalog.filter(profile => selected.studentIds.includes(profile.studentId)
        || [profile.classId, ...(profile.classIds || [])].some(id => selected.classIds.includes(String(id))))
      if (expected.some(profile => !byId.has(profile.studentId))) {
        throw Error('Elevlistan har ändrats. Hämta från molnet igen för att läsa aktuella elever.')
      }
      const known = new Set(catalog.map(profile => profile.studentId))
      readyKey = key
      emit([...catalog.map(profile => byId.get(profile.studentId) || profile),
        ...profiles.filter(profile => !known.has(profile.studentId))])
      onState({ key, status: 'ready', error: '', count: profiles.length })
      return true
    }).catch(error => {
      if (generation !== requestGeneration) return false
      onState({ key, status: 'error', hasData, error: error?.message || 'Elevresultaten kunde inte hämtas.' })
      return false
    })
    return pending
  }
  return {
    select(next) {
      scope = normalizePupilScope(next)
      if (pupilScopeKey(scope) === currentKey) return pending || Promise.resolve(true)
      return run()
    },
    replaceCatalog(profiles) { catalog = profiles; catalogReady = true; return run() },
    failCatalog(error) {
      generation++; catalog = []; catalogReady = false; pending = null; readyKey = ''
      emit([])
      onState({ key: pupilScopeKey(scope), status: 'error', error: error?.message || 'Elevkatalogen kunde inte hämtas.' })
    },
    reload: run,
    cancel() { generation++; currentKey = ''; pending = null; readyKey = '' },
  }
}
