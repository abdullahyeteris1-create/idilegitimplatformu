import { isStudentPasswordHash, verifyStudentPassword } from "./studentPassword";

export type StudentPasswordLoginInput = {
  password: string;
  passwordHash: unknown;
  passwordHashVersion: unknown;
  legacyPassword: unknown;
};

export type StudentPasswordLoginResult = {
  authenticated: boolean;
  shouldUpgradeLegacy: boolean;
};

export async function verifyStudentLoginPassword(
  input: StudentPasswordLoginInput,
): Promise<StudentPasswordLoginResult> {
  const passwordHash = typeof input.passwordHash === "string" && input.passwordHash.length > 0 ? input.passwordHash : null;

  if (passwordHash !== null) {
    if (
      !isStudentPasswordHash(passwordHash) ||
      (input.passwordHashVersion !== null && input.passwordHashVersion !== undefined && input.passwordHashVersion !== 1)
    ) {
      return { authenticated: false, shouldUpgradeLegacy: false };
    }

    return {
      authenticated: await verifyStudentPassword(input.password, passwordHash),
      shouldUpgradeLegacy: false,
    };
  }

  const authenticated = String(input.legacyPassword ?? "").trim() === input.password;
  return { authenticated, shouldUpgradeLegacy: authenticated };
}
