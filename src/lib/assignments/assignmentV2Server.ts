import "server-only";

export function isAssignmentV2Enabled(): boolean {
  return process.env.ASSIGNMENT_V2_ENABLED?.trim().toLowerCase() === "true";
}
