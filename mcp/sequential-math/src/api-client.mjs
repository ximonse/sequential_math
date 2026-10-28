export class BridgeError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

export function validateTarget(base, mode = 'synthetic') {
  let url
  try { url = new URL(base) } catch { throw new BridgeError('configuration_required', 'Set MATH_MCP_BASE_URL to an explicit app origin, or launch --demo.') }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new BridgeError('invalid_target', 'The app target must be an origin without credentials, path, query or fragment.')
  if (!['synthetic', 'approved'].includes(mode) || (mode === 'synthetic' && !local)
    || (!local && url.protocol !== 'https:') || !['http:', 'https:'].includes(url.protocol)) {
    throw new BridgeError('invalid_target', 'Synthetic mode requires loopback. An explicitly approved data environment is required for a remote HTTPS app.')
  }
  return url.origin
}

const messages = {
  400: ['invalid_request', 'Check the dates, report format and source references.'],
  401: ['authentication_required', 'The configured teacher account could not be authenticated. Check its local configuration.'],
  403: ['access_denied', 'This teacher cannot access the requested pupil, class or screening source.'],
  404: ['not_found', 'The item or API is unavailable. Check the identifiers and whether this feature is deployed on the selected app.'],
  409: ['revision_conflict', 'The source or saved history changed. Read the latest revision and compare; keep the existing request ID if retrying an uncertain write.'],
  410: ['unavailable', 'The pupil, class or source is no longer available.'],
  413: ['response_limit', 'Narrow the period or request a smaller page. Existing history was not removed.']
}

export class TeacherApiClient {
  constructor({ baseUrl, mode = 'synthetic', expectedTeacherId, getCredentials, fetchImpl = fetch, timeoutMs = 15000 }) {
    this.baseUrl = validateTarget(baseUrl, mode)
    this.mode = mode
    if (expectedTeacherId !== undefined && (typeof expectedTeacherId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(expectedTeacherId))) {
      throw new BridgeError('configuration_required', 'Configure an exact teacher ID locally, without credentials or a display name.')
    }
    this.expectedTeacherId = expectedTeacherId
    this.getCredentials = getCredentials
    this.fetch = fetchImpl
    this.timeoutMs = timeoutMs
    this.token = null
    this.teacherIdentity = null
    this.loginPromise = null
  }
  async raw(path, { body, token, signal } = {}) {
    try {
      const response = await this.fetch(this.baseUrl + path, { method: body ? 'POST' : 'GET', redirect: 'error',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)]) : AbortSignal.timeout(this.timeoutMs),
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'x-teacher-token': token } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) })
      const data = await response.json().catch(() => null)
      return { status: response.status, ok: response.ok, data }
    } catch {
      // Never forward fetch errors, login responses, URLs or request bodies to a model/log.
      throw new BridgeError('connection_failed', 'The app could not be reached. Check the configured origin and retry reads. For an uncertain write, read saved history before retrying the same request ID.')
    }
  }
  async authenticate(signal) {
    if (this.token) return this.token
    if (!this.loginPromise) this.loginPromise = (async () => {
      if (this.mode === 'synthetic') {
        const info = await this.raw('/__robot/mcp-info', { signal })
        if (!info.ok || info.data?.synthetic !== true || info.data?.storage !== 'memory'
          || info.data?.service !== 'sequential-math-robots') {
          throw new BridgeError('synthetic_target_required', 'This origin does not identify itself as the isolated in-memory robot app. Use --demo or an explicitly approved environment.')
        }
      }
      const credentials = await this.getCredentials()
      if (!credentials?.username || !credentials?.password) throw new BridgeError('configuration_required', 'Configure the teacher account locally; never pass credentials as tool arguments.')
      const login = await this.raw('/api/teacher-login', { body: credentials, signal })
      if (!login.ok || typeof login.data?.token !== 'string' || !login.data.token) {
        throw new BridgeError('authentication_required', 'The configured teacher account could not be authenticated.')
      }
      if (this.expectedTeacherId && login.data.teacherId !== this.expectedTeacherId) {
        throw new BridgeError('teacher_identity_mismatch', 'The authenticated teacher differs from the configured draft owner. No app write was attempted. Check the local account configuration.')
      }
      this.teacherIdentity = {
        teacherId: typeof login.data.teacherId === 'string' ? login.data.teacherId : null,
        displayName: typeof login.data.displayName === 'string' ? login.data.displayName : '',
        role: ['teacher', 'school_admin', 'super_admin'].includes(login.data.role) ? login.data.role : null
      }
      this.token = login.data.token
      return this.token
    })().finally(() => { this.loginPromise = null })
    return this.loginPromise
  }
  async getIdentity(signal) {
    await this.authenticate(signal)
    if (!this.teacherIdentity?.teacherId) throw new BridgeError('invalid_response', 'The app did not identify the authenticated teacher. No draft owner is confirmed.')
    return { ...this.teacherIdentity }
  }
  async request(path, { body, readOnly = !body, signal } = {}) {
    // Only fixed app routes built by the adapter are accepted; no arbitrary URL/proxy tool.
    if (!/^\/api\/(?:students(?:\?|$)|teacher-material(?:\?|$)|teacher-pupil-labels$|teacher-students\/[A-Za-z0-9_-]+\?)/u.test(path)) {
      throw new BridgeError('unsupported_route', 'This adapter does not expose that app operation.')
    }
    const previewOnly = readOnly && (path === '/api/teacher-material' && body?.action === 'preview'
      || /^\/api\/teacher-students\/[A-Za-z0-9_-]+\?/u.test(path) && body?.action === 'draft')
    if (body && !previewOnly && this.mode === 'approved' && !this.expectedTeacherId) {
      throw new BridgeError('teacher_identity_required', 'Set MATH_MCP_EXPECTED_TEACHER_ID to the intended teacher account before saving private drafts. Read the connection identity and compare it with the teacher review account.')
    }
    let result = await this.raw(path, { body, token: await this.authenticate(signal), signal })
    if (result.status === 401) {
      this.token = null
      this.teacherIdentity = null
      // Only reads are automatically retried. A report write is never replayed behind the caller's back.
      if (readOnly) result = await this.raw(path, { body, token: await this.authenticate(signal), signal })
    }
    if (!result.ok) {
      const [code, message] = messages[result.status] || ['app_unavailable', 'The app returned an error. Retry reads later; verify saved history before retrying an uncertain write.']
      throw new BridgeError(code, message)
    }
    if (!result.data || typeof result.data !== 'object') throw new BridgeError('invalid_response', 'The app returned an invalid response. No result is confirmed.')
    return result.data
  }
}
