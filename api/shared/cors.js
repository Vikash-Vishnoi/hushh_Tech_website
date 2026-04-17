const DEFAULT_SITE_URL = 'https://hushhtech.com';

const DEFAULT_ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type';
const DEFAULT_ALLOW_METHODS = 'GET, POST, OPTIONS';
const MODE_ENV = 'SECURITY_CORS_MODE';

function splitCsv(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getSecurityMode(envName, fallback = 'observe') {
  const raw = String(process.env[envName] || fallback).trim().toLowerCase();
  if (raw === 'off' || raw === 'observe' || raw === 'enforce') {
    return raw;
  }
  return fallback;
}

function getPrimarySiteUrl() {
  const configured =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  return normalizeOrigin(configured) || DEFAULT_SITE_URL;
}

function getAllowedOrigins() {
  const configured = splitCsv(process.env.SECURITY_ALLOWED_ORIGINS);
  const siteUrl = getPrimarySiteUrl();
  const defaults = [siteUrl, 'https://www.hushhtech.com'];

  const normalized = [...configured, ...defaults]
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function isAllowedOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return getAllowedOrigins().includes(normalized);
}

export function getCorsHeaders(req, options = {}) {
  const mode = getSecurityMode(MODE_ENV, 'observe');
  const requestOrigin = normalizeOrigin(req?.headers?.origin);

  let allowOrigin = getPrimarySiteUrl();

  if (mode === 'off') {
    allowOrigin = '*';
  } else if (requestOrigin) {
    if (isAllowedOrigin(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (mode === 'observe') {
      // Observe mode: do not block, just reflect the origin.
      allowOrigin = requestOrigin;
    }
  }

  const headers = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': options.allowHeaders || DEFAULT_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': options.allowMethods || DEFAULT_ALLOW_METHODS,
    // Prevent caches from mixing responses between origins.
    'Vary': 'Origin',
  };

  if (options.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export function setCorsHeaders(req, res, options = {}) {
  const headers = getCorsHeaders(req, options);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  return headers;
}

export function corsGuard(req, res, { label = 'api-route', options = {} } = {}) {
  const mode = getSecurityMode(MODE_ENV, 'observe');
  if (mode === 'off') {
    return false;
  }

  const origin = normalizeOrigin(req?.headers?.origin);
  if (!origin) {
    // Requests without Origin are not browser CORS requests.
    return false;
  }

  if (isAllowedOrigin(origin)) {
    return false;
  }

  console.warn(`[Security][CORS][${label}] Untrusted origin`, { origin, mode });

  if (mode !== 'enforce') {
    return false;
  }

  setCorsHeaders(req, res, options);
  res.status(403).json({ error: 'Origin not allowed' });
  return true;
}
