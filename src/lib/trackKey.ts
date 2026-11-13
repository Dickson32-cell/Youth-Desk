import { randomBytes } from "crypto";

// Private tracking key for confidential case access (given only to the
// reporter via SMS/slip). Unambiguous alphabet: no 0/O/1/I/L.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newTrackKey(): string {
  const bytes = randomBytes(10);
  let key = "";
  for (const b of bytes) key += ALPHABET[b % ALPHABET.length];
  return key; // 10 chars from a 31-symbol alphabet ~ 50 bits of entropy
}
