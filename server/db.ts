import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * LOCAL PRO CONFIGURATION
 * Safe write-paths are enforced for packaged production builds to prevent
 * silent crashes caused by Windows read-only directory permissions.
 */
function getDatabasePath(): string {
  if (process.env.REGREADY_DB_PATH) {
    return process.env.REGREADY_DB_PATH;
  }

  // ESM-safe: __dirname is not defined in production esbuild ESM output.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const isPackagedFolder = moduleDir.includes("win-unpacked") || moduleDir.includes("app.asar");

  if (isPackagedFolder) {
    // Force the path out of the installation directory and into safe Windows AppData Roaming
    const appDataFolder = path.join(process.env.APPDATA || '', "RegReady Local Pro");

    if (!fs.existsSync(appDataFolder)) {
      fs.mkdirSync(appDataFolder, { recursive: true });
    }

    return path.join(appDataFolder, "local.db");
  }

  // Standard local development environment fallback
  return path.join(process.cwd(), "local.db");
}

const sqlitePath = getDatabasePath();

export const sqlite = new Database(sqlitePath);

// CRITICAL PRODUCTION SETTINGS:
//
// 1. WAL (Write-Ahead Logging) mode — dramatically improves concurrency.
//    Readers do not block writers and writers do not block readers.
//    This is essential for a single-connection desktop app serving concurrent
//    HTTP requests via Express.
//
// 2. busy_timeout = 5000 — If a writer conflict occurs (rare with WAL,
//    but possible during VACUUM, checkpoint, or schema changes), SQLite
//    will wait up to 5 seconds before throwing SQLITE_BUSY, rather than
//    failing immediately.
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });

console.log(`[RegReady Local Pro] Database initialized at: ${sqlitePath} (WAL mode, busy_timeout=5000ms)`);
