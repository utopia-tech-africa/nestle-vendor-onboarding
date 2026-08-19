import { randomBytes } from "node:crypto";

import type { UserRole } from "../generated/prisma/client";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BODY_LENGTH = 8;

export const uniqueCodePrefix = (role: UserRole): string => {
  if (role === "promoter") return "P";
  if (role === "client") return "C";
  if (role === "supervisor") return "S";
  return "A";
};

export const normalizeUniqueCode = (value: string): string => value.trim().toUpperCase();

const randomBody = (): string => {
  const bytes = randomBytes(BODY_LENGTH);
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i += 1) {
    const byte = bytes[i];
    if (byte === undefined) {
      throw new Error("Failed to generate unique code");
    }
    const index = byte % ALPHABET.length;
    const char = ALPHABET[index];
    if (char === undefined) {
      throw new Error("Failed to generate unique code");
    }
    body += char;
  }
  if (!/[A-Z]/.test(body) || !/[0-9]/.test(body)) {
    return randomBody();
  }
  return body;
};

/** Role-prefixed access code, e.g. P-K7M2Q9X4 (uppercase letters mixed with digits). */
export const makeUniqueCode = (role: UserRole): string =>
  `${uniqueCodePrefix(role)}-${randomBody()}`;
