const VAULT_SCHEMA = 'pilot-student-v1';
const DB_VERSION = 1;
const STORE_NAME = 'records';
const KEY_RECORD_ID = 'vault-key';
const SNAPSHOT_RECORD_ID = 'snapshot';
const EVENT_PREFIX = 'event:';
const FORBIDDEN_FIELD = /(?:^|[_-])(qr|pin|csrf)(?:$|[_-]|token|secret|code)/i;

export class PilotStudentVaultError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'PilotStudentVaultError';
    this.code = code;
    this.cause = cause;
  }
}

function requireCrypto(cryptoApi) {
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') {
    throw new PilotStudentVaultError('CRYPTO_UNAVAILABLE', 'Kryptering stöds inte av den här enheten.');
  }
  return cryptoApi;
}

function requireStudentId(studentId) {
  const normalized = String(studentId || '').trim();
  if (!/^[A-Z0-9ÅÄÖ_]{3,100}$/iu.test(normalized)) {
    throw new PilotStudentVaultError('INVALID_STUDENT_ID', 'Elevidentiteten för den lokala vaulten är ogiltig.');
  }
  return normalized;
}

function assertSafeValue(value, path = 'value') {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeValue(item, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_FIELD.test(key)) {
      throw new PilotStudentVaultError('SENSITIVE_VALUE', `Känslig inloggningsuppgift får inte sparas lokalt (${path}.${key}).`);
    }
    assertSafeValue(nested, `${path}.${key}`);
  }
}

function encodeJson(value) {
  assertSafeValue(value);
  return new TextEncoder().encode(JSON.stringify(value));
}

function decodeJson(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createVaultAad({ studentId, recordType }) {
  studentId = requireStudentId(studentId);
  if (!['snapshot', 'event'].includes(recordType)) {
    throw new PilotStudentVaultError('INVALID_RECORD_TYPE', 'Okänd typ av vaultpost.');
  }
  return new TextEncoder().encode(`${VAULT_SCHEMA}|${studentId}|${recordType}`);
}

export async function encryptVaultValue({ cryptoApi = globalThis.crypto, key, studentId, recordType, value }) {
  const crypto = requireCrypto(cryptoApi);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: createVaultAad({ studentId, recordType }) },
    key,
    encodeJson(value),
  );
  return { iv: iv.buffer, ciphertext };
}

export async function decryptVaultValue({ cryptoApi = globalThis.crypto, key, studentId, recordType, encrypted }) {
  const crypto = requireCrypto(cryptoApi);
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encrypted.iv,
        additionalData: createVaultAad({ studentId, recordType }),
      },
      key,
      encrypted.ciphertext,
    );
    return decodeJson(new Uint8Array(plaintext));
  } catch (error) {
    throw new PilotStudentVaultError('DECRYPT_FAILED', 'Den lokala krypterade elevdatan kan inte läsas.', error);
  }
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionAsPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

function openDatabase(indexedDb, dbName) {
  if (!indexedDb?.open) {
    throw new PilotStudentVaultError('INDEXEDDB_UNAVAILABLE', 'Offline-lagring stöds inte av den här enheten.');
  }
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(dbName, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new PilotStudentVaultError('INDEXEDDB_UNAVAILABLE', 'Offline-lagringen kunde inte öppnas.', request.error));
  });
}

function record(id, type, studentId, encrypted, extra = {}) {
  return {
    id,
    schema: VAULT_SCHEMA,
    type,
    studentId,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    ...extra,
  };
}

export async function createPilotStudentStore({
  studentId,
  indexedDB = globalThis.indexedDB,
  cryptoApi = globalThis.crypto,
  dbName,
} = {}) {
  studentId = requireStudentId(studentId);
  studentId = studentId.toUpperCase();
  dbName = dbName || `sequential-math-pilot-vault-${studentId}`;
  const crypto = requireCrypto(cryptoApi);
  let db;
  try {
    db = await openDatabase(indexedDB, dbName);
  } catch (error) {
    if (error instanceof PilotStudentVaultError) throw error;
    throw new PilotStudentVaultError('INDEXEDDB_UNAVAILABLE', 'Offline-lagringen kunde inte öppnas.', error);
  }

  async function ensureKey() {
    const readTransaction = db.transaction(STORE_NAME, 'readonly');
    const existing = await requestAsPromise(readTransaction.objectStore(STORE_NAME).get(KEY_RECORD_ID));
    await transactionAsPromise(readTransaction);
    if (existing) {
      if (existing.studentId !== studentId || existing.schema !== VAULT_SCHEMA || !existing.key) {
        throw new PilotStudentVaultError('VAULT_BINDING_MISMATCH', 'Den lokala vaulten tillhör en annan elev.');
      }
      if (existing.key.extractable !== false || existing.key.algorithm?.name !== 'AES-GCM'
        || !existing.key.usages?.includes('encrypt') || !existing.key.usages?.includes('decrypt')) {
        throw new PilotStudentVaultError('CRYPTOKEY_PERSISTENCE_UNAVAILABLE', 'Enheten kan inte använda den säkra krypteringsnyckeln för offline-arbete.');
      }
      return existing.key;
    }

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const writeTransaction = db.transaction(STORE_NAME, 'readwrite');
    try {
      writeTransaction.objectStore(STORE_NAME).add({ id: KEY_RECORD_ID, schema: VAULT_SCHEMA, type: 'key', studentId, key });
      await transactionAsPromise(writeTransaction);
    } catch (error) {
      throw new PilotStudentVaultError('CRYPTOKEY_PERSISTENCE_UNAVAILABLE', 'Enheten kan inte lagra en säker krypteringsnyckel för offline-arbete.', error);
    }
    const verifyTransaction = db.transaction(STORE_NAME, 'readonly');
    const persisted = await requestAsPromise(verifyTransaction.objectStore(STORE_NAME).get(KEY_RECORD_ID));
    await transactionAsPromise(verifyTransaction);
    if (!persisted?.key || persisted.key.extractable !== false
      || persisted.key.algorithm?.name !== 'AES-GCM'
      || !persisted.key.usages?.includes('encrypt') || !persisted.key.usages?.includes('decrypt')) {
      throw new PilotStudentVaultError('CRYPTOKEY_PERSISTENCE_UNAVAILABLE', 'Enheten kan inte återläsa en säker krypteringsnyckel för offline-arbete.');
    }
    return persisted.key;
  }

  const key = await ensureKey();

  async function readRecord(id, recordType) {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const stored = await requestAsPromise(transaction.objectStore(STORE_NAME).get(id));
    await transactionAsPromise(transaction);
    if (!stored) return null;
    if (stored.schema !== VAULT_SCHEMA || stored.studentId !== studentId || stored.type !== recordType) {
      throw new PilotStudentVaultError('VAULT_BINDING_MISMATCH', 'Den lokala vaultposten tillhör inte den inloggade eleven.');
    }
    return stored;
  }

  return {
    async saveSnapshot(snapshot) {
      const encryptedSnapshot = await encryptVaultValue({ cryptoApi: crypto, key, studentId, recordType: 'snapshot', value: snapshot });
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(record(SNAPSHOT_RECORD_ID, 'snapshot', studentId, encryptedSnapshot, { updatedAt: Date.now() }));
      try {
        await transactionAsPromise(transaction);
      } catch (error) {
        throw new PilotStudentVaultError('VAULT_WRITE_FAILED', 'Den lokala elevbilden kunde inte sparas säkert.', error);
      }
    },

    async saveSnapshotAndAppendEvent({ snapshot, event }) {
      if (!event || typeof event.id !== 'string' || event.id.length < 8) {
        throw new PilotStudentVaultError('INVALID_EVENT', 'Offlinehändelsen saknar ett säkert id.');
      }
      const [encryptedSnapshot, encryptedEvent] = await Promise.all([
        encryptVaultValue({ cryptoApi: crypto, key, studentId, recordType: 'snapshot', value: snapshot }),
        encryptVaultValue({ cryptoApi: crypto, key, studentId, recordType: 'event', value: event }),
      ]);
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(record(SNAPSHOT_RECORD_ID, 'snapshot', studentId, encryptedSnapshot, { updatedAt: Date.now() }));
      store.add(record(`${EVENT_PREFIX}${event.id}`, 'event', studentId, encryptedEvent, { eventId: event.id, createdAt: Date.now() }));
      try {
        await transactionAsPromise(transaction);
      } catch (error) {
        throw new PilotStudentVaultError('VAULT_WRITE_FAILED', 'Det lokala arbetet kunde inte sparas säkert.', error);
      }
    },

    async readSnapshot() {
      const stored = await readRecord(SNAPSHOT_RECORD_ID, 'snapshot');
      return stored ? decryptVaultValue({ cryptoApi: crypto, key, studentId, recordType: 'snapshot', encrypted: stored }) : null;
    },

    async listPendingEvents() {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const records = await requestAsPromise(transaction.objectStore(STORE_NAME).getAll());
      await transactionAsPromise(transaction);
      const pending = records.filter((item) => item.type === 'event' && item.studentId === studentId && item.schema === VAULT_SCHEMA && !item.acknowledgedAt);
      return Promise.all(pending.map(async (item) => ({
        event: await decryptVaultValue({ cryptoApi: crypto, key, studentId, recordType: 'event', encrypted: item }),
        createdAt: item.createdAt,
      })));
    },

    async acknowledgeEvents(eventIds) {
      if (!Array.isArray(eventIds)) throw new PilotStudentVaultError('INVALID_EVENT', 'Händelser att bekräfta måste vara en lista.');
      const ids = new Set(eventIds.filter((id) => typeof id === 'string'));
      if (!ids.size) return;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const eventId of ids) {
        const stored = await requestAsPromise(store.get(`${EVENT_PREFIX}${eventId}`));
        if (stored && stored.schema === VAULT_SCHEMA && stored.studentId === studentId && stored.type === 'event' && !stored.acknowledgedAt) {
          store.put({ ...stored, acknowledgedAt: Date.now() });
        }
      }
      try {
        await transactionAsPromise(transaction);
      } catch (error) {
        throw new PilotStudentVaultError('VAULT_WRITE_FAILED', 'Offlinehändelserna kunde inte bekräftas säkert.', error);
      }
    },

    close() { db.close(); },
  };
}
