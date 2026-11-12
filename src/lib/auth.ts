import crypto from "crypto";

export const SESSION_COOKIE = "youthdesk_session";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

export function signSession(username: string): string {
  const payload = JSON.stringify({ u: username, t: Date.now() });
  const b64 = Buffer.from(payload).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(b64).digest("base64url");
  return `${b64}.${mac}`;
}

export function verifySession(token: string | undefined | null): { u: string } | null {
  if (!token || !token.includes(".")) return null;
  const [b64, mac] = token.split(".");
  const expect = crypto.createHmac("sha256", secret()).update(b64).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (!payload?.u) return null;
    // 30 days
    if (Date.now() - payload.t > 30 * 24 * 3600 * 1000) return null;
    return { u: payload.u };
  } catch {
    return null;
  }
}

// Monotonic serial source: atomic Counter row (survives deletions).
// On first use it seeds itself above any already-issued number, so an existing
// register can never be rolled back to reissued numbers.
export async function nextSerialKey(
  p: { $queryRawUnsafe: (q: string, ...args: unknown[]) => Promise<unknown> },
  key: string,
  format: (n: number) => string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const rows = (await p.$queryRawUnsafe(
    `INSERT INTO "Counter" ("key", "n") VALUES ($1, 1) ON CONFLICT ("key") DO UPDATE SET "n" = "Counter"."n" + 1 RETURNING "n"`,
    key,
  )) as { n: number }[];
  let n = Number(rows[0]?.n || 1);
  let candidate = format(n);
  for (let guard = 0; guard < 50 && (await isTaken(candidate)); guard++) {
    n += 1;
    candidate = format(n);
    await p.$queryRawUnsafe(`UPDATE "Counter" SET "n" = $1 WHERE "key" = $2`, n, key);
  }
  return candidate;
}

export function caseFormat(n: number): string {
  return `YD-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
}

export function youthFormat(n: number): string {
  return `YTH-${String(n).padStart(5, "0")}`;
}

// Legacy helpers kept for type compatibility (no longer used for issuance).
export function nextCaseNumber(latest?: string): string {
  const year = new Date().getFullYear();
  let n = 0;
  if (latest) {
    const m = latest.match(/YD-(\d{4})-(\d+)/);
    if (m && Number(m[1]) === year) n = Number(m[2]);
  }
  return `YD-${year}-${String(n + 1).padStart(4, "0")}`;
}

export function nextYouthSerial(latest?: string): string {
  // YTH-00001
  let n = 0;
  if (latest) n = Number(latest.replace(/[^0-9]/g, "")) || 0;
  return `YTH-${String(n + 1).padStart(5, "0")}`;
}
