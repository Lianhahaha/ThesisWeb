import { createPublicKey, verify as verifySignature } from "node:crypto";
import { fetchWithTimeout } from "@/lib/server/http";

/**
 * Who is calling: the Firebase user behind a Bearer ID token, if there is one.
 *
 * The client gets an ID token from the Auth SDK and sends it as
 * `Authorization: Bearer <token>`; here it is checked the way Google says to
 * check it, against the published signing certificates, without the Admin SDK
 * or a service account. Nothing in the app trusts this for authorization —
 * Firestore rules still decide what a user may read or write. Its only job is
 * to give a signed-in person their own rate-limit bucket instead of sharing
 * their school's IP with everyone else.
 *
 * Any failure (no header, wrong audience, expired, unknown key, Google down)
 * answers null: the caller is then treated as anonymous, which is stricter,
 * never more permissive.
 */

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** Tokens are minted on Firebase's clock; allow a minute of drift either way. */
const CLOCK_SKEW_S = 60;

interface CertCache {
  keys: Record<string, string>;
  until: number;
}

let certs: CertCache = { keys: {}, until: 0 };

/** The X.509 certificate for `kid`, refreshed when Google's max-age says so. */
async function certificate(kid: string): Promise<string | null> {
  const now = Date.now();
  if (now >= certs.until || !certs.keys[kid]) {
    // fetchWithTimeout is bounded, but a stalled certificate endpoint must not
    // stall the API route: fall back to whatever is already cached.
    const res = await fetchWithTimeout(CERT_URL, {}, 1500).catch(() => null);
    if (!res?.ok) return certs.keys[kid] ?? null;
    const keys = (await res.json().catch(() => null)) as Record<string, string> | null;
    if (!keys) return certs.keys[kid] ?? null;
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
    certs = { keys, until: now + Math.min(Math.max(maxAge, 60), 6 * 60 * 60) * 1000 };
  }
  return certs.keys[kid] ?? null;
}

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function decode(part: string): unknown {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export interface VerifyOptions {
  /** Firebase project the token must belong to; defaults to this app's. */
  projectId?: string;
  now?: number;
  /** Test seam: the certificate for a key id. */
  getCertificate?: (kid: string) => Promise<string | null>;
}

/**
 * The uid in the request's Firebase ID token, or null when the token is
 * missing, malformed, signed by someone else, for another project, or expired.
 */
export async function verifiedUid(req: Request, opts: VerifyOptions = {}): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decode(parts[0]) as { alg?: unknown; kid?: unknown } | null;
  const claims = decode(parts[1]) as Record<string, unknown> | null;
  if (!header || !claims) return null;
  // Only RS256 is issued; "none" and downgraded algorithms are refused here.
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) return null;

  const projectId = opts.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;
  const now = Math.floor((opts.now ?? Date.now()) / 1000);

  if (claims.aud !== projectId) return null;
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_S < now) return null;
  if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_S > now) return null;

  const pem = await (opts.getCertificate ?? certificate)(header.kid);
  if (!pem) return null;
  try {
    const ok = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey(pem),
      Buffer.from(parts[2], "base64url")
    );
    return ok ? (claims.sub as string) : null;
  } catch {
    return null;
  }
}
