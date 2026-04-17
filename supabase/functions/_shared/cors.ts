import {
  getPrimarySiteUrl,
  getSecurityMode,
  isAllowedOrigin,
  type SecurityMode,
} from "./security.ts";

export type CorsMode = SecurityMode;

export type CorsHeadersOptions = {
  allowMethods?: string;
  allowHeaders?: string;
  allowCredentials?: boolean;
};

const DEFAULT_ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type";
const DEFAULT_ALLOW_METHODS = "GET, POST, OPTIONS";
const MODE_ENV = "SECURITY_CORS_MODE";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getCorsHeaders(
  req: Request,
  options: CorsHeadersOptions = {},
): Record<string, string> {
  const mode = getSecurityMode(MODE_ENV, "observe");
  const requestOrigin = normalizeOrigin(req.headers.get("origin"));

  let allowOrigin = getPrimarySiteUrl();

  if (mode === "off") {
    allowOrigin = "*";
  } else if (requestOrigin) {
    if (isAllowedOrigin(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (mode === "observe") {
      // Observe mode: do not block, just reflect the origin.
      allowOrigin = requestOrigin;
    }
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": options.allowHeaders || DEFAULT_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": options.allowMethods || DEFAULT_ALLOW_METHODS,
    // Prevent caches from mixing responses between origins.
    "Vary": "Origin",
  };

  if (options.allowCredentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function withCors(
  req: Request,
  response: Response,
  options: CorsHeadersOptions = {},
): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = getCorsHeaders(req, options);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsGuard(
  req: Request,
  {
    label = "edge-function",
  }: {
    label?: string;
  } = {},
): Response | null {
  const mode = getSecurityMode(MODE_ENV, "observe");
  if (mode === "off") {
    return null;
  }

  const origin = normalizeOrigin(req.headers.get("origin"));
  if (!origin) {
    // Requests without Origin are not browser CORS requests.
    return null;
  }

  if (isAllowedOrigin(origin)) {
    return null;
  }

  console.warn(`[Security][CORS][${label}] Untrusted origin`, { origin, mode });

  if (mode !== "enforce") {
    return null;
  }

  return new Response(
    JSON.stringify({ error: "Origin not allowed" }),
    {
      status: 403,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
      },
    },
  );
}
