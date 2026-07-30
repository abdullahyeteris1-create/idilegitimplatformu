import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const SCRYPT_ALGORITHM = "scrypt";
const SCRYPT_VERSION = 1;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 64;
const MAX_PASSWORD_LENGTH = 128;
const SCRYPT_MAX_MEMORY = 32 * 1024 * 1024;

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

type ParsedStudentPasswordHash = {
  salt: Buffer;
  derivedKey: Buffer;
};

function assertPasswordInput(password: string): void {
  if (typeof password !== "string") {
    throw new TypeError("Student password must be a string");
  }

  if (password.length === 0) {
    throw new TypeError("Student password must not be empty");
  }

  if (Array.from(password).length > MAX_PASSWORD_LENGTH) {
    throw new TypeError("Student password is too long");
  }
}

function toBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function parseStudentPasswordHash(value: unknown): ParsedStudentPasswordHash | null {
  if (typeof value !== "string") {
    return null;
  }

  const segments = value.split("$");
  if (segments.length !== 7) {
    return null;
  }

  const [algorithm, version, cost, blockSize, parallelization, encodedSalt, encodedKey] = segments;
  if (
    algorithm !== SCRYPT_ALGORITHM ||
    version !== `v=${SCRYPT_VERSION}` ||
    cost !== `N=${SCRYPT_COST}` ||
    blockSize !== `r=${SCRYPT_BLOCK_SIZE}` ||
    parallelization !== `p=${SCRYPT_PARALLELIZATION}`
  ) {
    return null;
  }

  const salt = decodeBase64Url(encodedSalt);
  const derivedKey = decodeBase64Url(encodedKey);
  if (!salt || !derivedKey || salt.length !== SALT_BYTES || derivedKey.length !== DERIVED_KEY_BYTES) {
    return null;
  }

  return { salt, derivedKey };
}

export async function hashStudentPassword(password: string): Promise<string> {
  assertPasswordInput(password);

  const salt = randomBytes(SALT_BYTES);
  const derivedKey = (await scryptAsync(password, salt, DERIVED_KEY_BYTES, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
    maxmem: SCRYPT_MAX_MEMORY,
  })) as Buffer;

  return [
    SCRYPT_ALGORITHM,
    `v=${SCRYPT_VERSION}`,
    `N=${SCRYPT_COST}`,
    `r=${SCRYPT_BLOCK_SIZE}`,
    `p=${SCRYPT_PARALLELIZATION}`,
    toBase64Url(salt),
    toBase64Url(derivedKey),
  ].join("$");
}

export async function verifyStudentPassword(password: string, storedHash: string): Promise<boolean> {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  try {
    assertPasswordInput(password);
    const parsed = parseStudentPasswordHash(storedHash);
    if (!parsed) {
      return false;
    }

    const derivedKey = (await scryptAsync(password, parsed.salt, DERIVED_KEY_BYTES, {
      cost: SCRYPT_COST,
      blockSize: SCRYPT_BLOCK_SIZE,
      parallelization: SCRYPT_PARALLELIZATION,
      maxmem: SCRYPT_MAX_MEMORY,
    })) as Buffer;

    return derivedKey.length === parsed.derivedKey.length && timingSafeEqual(derivedKey, parsed.derivedKey);
  } catch {
    return false;
  }
}

export function isStudentPasswordHash(value: unknown): boolean {
  return parseStudentPasswordHash(value) !== null;
}
