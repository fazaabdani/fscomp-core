import { compare, hash } from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

const BCRYPT_ROUNDS = 12;
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function isPasswordHash(value: string) {
  return BCRYPT_PATTERN.test(value);
}

export function hashPassword(value: string) {
  return hash(value, BCRYPT_ROUNDS);
}

export async function verifyPassword(value: string, storedValue: string) {
  if (isPasswordHash(storedValue)) return compare(value, storedValue);
  const valueBuffer = Buffer.from(value);
  const storedBuffer = Buffer.from(storedValue);
  return valueBuffer.length === storedBuffer.length && timingSafeEqual(valueBuffer, storedBuffer);
}
