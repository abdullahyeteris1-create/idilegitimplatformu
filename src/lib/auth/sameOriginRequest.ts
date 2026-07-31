function firstHeaderValue(value: string | null): string {
  return value?.split(",", 1)[0]?.trim() ?? "";
}

export function isSameOriginRequest(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return false;
  }

  let origin: URL;
  let requestUrl: URL;
  try {
    origin = new URL(originHeader);
    requestUrl = new URL(request.url);
  } catch {
    return false;
  }

  const allowedOrigins = new Set([requestUrl.origin]);
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  if (forwardedHost) {
    const forwardedProtocol =
      firstHeaderValue(request.headers.get("x-forwarded-proto")) ||
      requestUrl.protocol.replace(/:$/, "");
    if (forwardedProtocol === "http" || forwardedProtocol === "https") {
      allowedOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
    }
  }

  return allowedOrigins.has(origin.origin);
}
