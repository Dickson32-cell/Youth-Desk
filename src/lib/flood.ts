import { createHash } from "crypto";

// Per-instance flood/brute-force guards (sliding window in memory). On
// serverless each instance holds its own window - not a global rate limit,
// but it raises the attack cost sharply (each cold instance must be refilled).
// Buckets: "purpose:key". All helpers return true when the request may pass.

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of hits) {
    if (v.length === 0 || now - v[v.length - 1] > 3_600_000) hits.delete(k);
  }
}

// Passive check: reads the window without consuming a slot (used for login,
// where real failures are counted separately).
function passable(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  return arr.length < max;
}

function clientKey(suffix: string, ipFwd: string | null): string {
  const ip = ipFwd || "unknown";
  const h = createHash("sha256").update(ip).digest("base64url").slice(0, 24);
  return suffix + ":" + h;
}

export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export function ipOf(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    ""
  );
}

// Officer login: only FAILED attempts are counted (a correct sign-in can
// never lock the officer out). 12 failures per IP and 5 per username in
// 15 minutes.
export function loginAllowed(ip: string, username: string): boolean {
  return (
    passable(clientKey("login-ip", ip), 12, 15 * 60_000) &&
    passable("login-user:" + username.toLowerCase().slice(0, 40), 5, 15 * 60_000)
  );
}

export function loginRecordFailure(ip: string, username: string): void {
  const now = Date.now();
  for (const key of [clientKey("login-ip", ip), "login-user:" + username.toLowerCase().slice(0, 40)]) {
    const arr = (hits.get(key) || []).filter((t) => now - t < 15 * 60_000);
    arr.push(now);
    hits.set(key, arr);
  }
}

// Public report: cap SMS-bearing reports per phone and per IP (wallet drain
// and SMS-bombing control). Reports without a valid phone use the IP bucket.
export function reportAllowed(ip: string, phoneNormalized: string | null): boolean {
  const ipOk = allow(clientKey("report-ip", ip), 8, 60 * 60_000);
  if (!ipOk) return false;
  if (phoneNormalized) {
    const h = createHash("sha256").update(phoneNormalized).digest("base64url").slice(0, 24);
    if (!allow("report-phone:" + h, 3, 15 * 60_000)) return false;
  }
  return true;
}

// Confidential track lookups: per-IP cap. The key space is already ~50 bits,
// this only removes cheap automated hammering.
export function trackAllowed(ip: string): boolean {
  return allow(clientKey("track-ip", ip), 40, 10 * 60_000);
}
