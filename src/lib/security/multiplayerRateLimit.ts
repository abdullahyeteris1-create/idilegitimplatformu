import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function requestKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function allowMultiplayerRequest(request: NextRequest, scope: "create" | "join" | "action"): boolean {
  const limits = { create: 5, join: 20, action: 60 } as const;
  const now = Date.now();
  const key = `${scope}:${requestKey(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    if (buckets.size > 2_000) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    return true;
  }

  if (current.count >= limits[scope]) return false;
  current.count += 1;
  return true;
}
