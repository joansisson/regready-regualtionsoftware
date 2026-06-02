import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // The folder where Drizzle stores your "Local Pro" database snapshots
  out: "./migrations",
  
  // Pointing to your newly updated SQLite schema
  schema: "./shared/schema.ts",
  
  // Swapping the engine from postgresql to sqlite
  dialect: "sqlite",
  
  dbCredentials: {
    // This tells Drizzle to look for the 'local.db' file in your root folder
    url: "local.db",
  },
});