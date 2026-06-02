import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import path from "path";
import { app } from "electron";
import fs from "fs";

/**
 * LOCAL PRO CONFIGURATION
 * Safe write-paths are enforced for packaged production builds to prevent 
 * silent crashes caused by Windows read-only directory permissions.
 */
function getDatabasePath(): string {
  if (process.env.REGREADY_DB_PATH) {
    return process.env.REGREADY_DB_PATH;
  }

  // Look directly at the physical path location to bypass any flag confusion
  const isPackagedFolder = __dirname.includes('win-unpacked') || __dirname.includes('app.asar');

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

export const db = drizzle(sqlite, { schema });

console.log(`[RegReady Local Pro] Database initialized at: ${sqlitePath}`);