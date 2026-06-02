import crypto from "crypto";
import { db } from "../db";
import { appSecrets } from "@shared/schema";

export type AppSecretKey = "SESSION_SECRET" | "JWT_SECRET" | "ENCRYPTION_KEY";

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function ensure32CharEncryptionKey(): string {
  // encryption.js requires EXACTLY 32 characters (256 bits).
  // We generate 16 bytes => 32 hex chars.
  return randomHex(16);
}

/**
 * Ensures required secrets exist in SQLite and (if missing) mirrors them into process.env.
 * This allows the app to run without the user manually editing .env files.
 */
export async function ensureAppSecrets(): Promise<void> {
  const requiredKeys: AppSecretKey[] = ["SESSION_SECRET", "JWT_SECRET", "ENCRYPTION_KEY"];

  const rows = await db.select({ key: appSecrets.key, value: appSecrets.value }).from(appSecrets);
  const map = new Map<string, string>(rows.map((r) => [r.key, r.value]));

  const updates: Array<{ key: AppSecretKey; value: string }> = [];

  for (const key of requiredKeys) {
    const fromDb = map.get(key);
    const fromEnv = process.env[key];

    // If env is missing but DB has it, mirror into env.
    if (!fromEnv && fromDb) {
      process.env[key] = fromDb;
      continue;
    }

    // If env exists but DB doesn't, persist it.
    if (fromEnv && !fromDb) {
      updates.push({ key, value: fromEnv });
      continue;
    }

    // If both are missing, generate.
    if (!fromEnv && !fromDb) {
      const value =
        key === "ENCRYPTION_KEY"
          ? ensure32CharEncryptionKey()
          : randomHex(32); // 64 hex chars

      updates.push({ key, value });
      process.env[key] = value;
    }
  }

  if (updates.length > 0) {
    await db.insert(appSecrets).values(updates);
  }
}
