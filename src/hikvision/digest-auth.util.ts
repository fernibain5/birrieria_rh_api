/**
 * Minimal Digest Authentication (RFC 2617) implementation for Hikvision ISAPI.
 *
 * Why not use @mhoc/axios-digest-auth?
 *   That library strips the query string when computing HA2, e.g. it uses
 *   /ISAPI/AccessControl/AcsEvent  instead of
 *   /ISAPI/AccessControl/AcsEvent?format=json
 *   Hikvision devices compute HA2 with the full URI, so the hashes never
 *   match and every request returns 401.
 */
import * as crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';

function md5(s: string): string {
  return crypto.createHash('md5').update(s).digest('hex');
}

/** Parse key=value and key="value" pairs from a WWW-Authenticate header. */
function parseChallenge(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Match both quoted and unquoted values
  for (const m of header.matchAll(/(\w+)=(?:"([^"]*)"|([^\s,]*))/g)) {
    out[m[1]] = m[2] ?? m[3];
  }
  return out;
}

export interface DigestRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: unknown;
  timeout?: number;
  username: string;
  password: string;
}

/**
 * Make an HTTP request with Digest Authentication.
 * Sends a probe request first, parses the 401 challenge, then retries
 * with the correct Authorization header.
 */
export async function digestRequest(
  opts: DigestRequestOptions,
): Promise<AxiosResponse> {
  const { method, url, data, timeout = 10_000, username, password } = opts;

  const parsed = new URL(url);
  // Use pathname + search (full request URI) — this is what RFC 2617 requires
  const requestUri = parsed.pathname + parsed.search;

  // Step 1: probe request — expect 401 with WWW-Authenticate
  let challenge: Record<string, string>;
  try {
    return await axios.request({
      method,
      url,
      data,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const e = err as { response?: { status: number; headers: Record<string, string> } };
    if (e?.response?.status !== 401) throw err;

    const wwwAuth = e.response.headers['www-authenticate'];
    if (!wwwAuth?.includes('nonce')) throw err;

    challenge = parseChallenge(wwwAuth);
  }

  // Step 2: compute Digest response
  const realm = challenge['realm'] ?? '';
  const nonce = challenge['nonce'] ?? '';
  const qop = challenge['qop'] ?? 'auth';
  const opaque = challenge['opaque'];

  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${requestUri}`);  // full URI including ?format=json
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

  let authHeader =
    `Digest username="${username}", realm="${realm}", ` +
    `nonce="${nonce}", uri="${requestUri}", ` +
    `qop=${qop}, nc=${nc}, cnonce="${cnonce}", ` +
    `response="${response}"`;

  if (opaque) authHeader += `, opaque="${opaque}"`;

  // Step 3: retry with correct Authorization header
  return axios.request({
    method,
    url,
    data,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
  });
}
