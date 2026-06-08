import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { ensureAppSecrets } from "./services/appSecrets";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimit, authRateLimit } from "./middleware/rateLimit";
import {
  securityMiddleware,
  securityHeaders,
  requestSizeLimit,
  sensitiveDataProtection,
  contentSecurityPolicy,
  csrfProtection,
} from "./middleware/security";
import { sqlite } from "./db";

const app = express();

const APP_NAME = "RegReady Local Pro";
const isProd = process.env.NODE_ENV === "production" || !fs.existsSync(path.join(process.cwd(), "src"));

const appRootDefault = (() => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, "..");
})();

// Safeguard against absolute directory shifts inside the running system context
const baseDir = process.env.REGREADY_BASE_DIR ?? (isProd ? appRootDefault : process.cwd());

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString();
  console.log(`${formattedTime} [${APP_NAME}] ${message}`);
}

// Use compression for snappier local UI performance
app.use(compression());

// SECURITY HARDENING
const corsOrigin = isProd ? (process.env.CORS_ORIGIN || false) : true;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: corsOrigin,
    credentials: Boolean(corsOrigin),
  }),
);

// Body parsing with standard limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// API operational/security middleware (fail closed)
app.use(securityHeaders);
app.use(contentSecurityPolicy);
app.use("/api/auth/login", authRateLimit);
app.use("/api", apiRateLimit);
app.use("/api", requestSizeLimit(10 * 1024 * 1024)); // 10MB
app.use("/api", csrfProtection);
app.use("/api", sensitiveDataProtection);

// CLEAN REQUEST TRACKING
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// LOCAL BOOTSTRAP ENGINE
async function validateDbSchemaOrThrow() {
  const requiredTables = [
    "users",
    "app_secrets",
    "policies",
    "compliance_frameworks",
    "compliance_checks",
    "vendors",
    "risk_assessments",
    "audit_reports",
    "document_versions",
    "verified_links",
    "team_members",
    "workspace_settings",
  ];

  for (const tableName of requiredTables) {
    const row = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(tableName);
    if (!row) {
      throw new Error(
        `Database schema validation failed: missing table '${tableName}'. Run 'npm run db:push' (or reset local.db) to initialize schema.`,
      );
    }
  }

  const verifiedCols = sqlite.prepare("PRAGMA table_info(verified_links)").all() as Array<{ name: string }>;
  const hasOrgCol = verifiedCols.some((c) => c.name === "organization_id");
  if (!hasOrgCol) {
    throw new Error(
      "Database schema validation failed: verified_links.organization_id is missing. Run 'npm run db:push' (or reset local.db) and retry.",
    );
  }
}

function scheduleGeneratedPdfCleanup() {
  const retentionHours = parseInt(process.env.PDF_RETENTION_HOURS || "24", 10);
  const cutoffMs = Date.now() - retentionHours * 60 * 60 * 1000;

  // Use the same path resolution as the PDF generator service, so cleanup
  // targets the correct directory in both dev and packaged modes.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const isPackaged = moduleDir.includes('app.asar') || moduleDir.includes('win-unpacked');
  const dir = isPackaged
    ? path.join(process.env.APPDATA || '', 'RegReady Local Pro', 'generated-pdfs')
    : path.join(process.cwd(), 'generated-pdfs');

  const cleanupOnce = () => {
    try {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir);
      for (const name of entries) {
        const filepath = path.join(dir, name);
        try {
          const stat = fs.statSync(filepath);
          if (stat.isFile() && stat.mtimeMs < cutoffMs) fs.unlinkSync(filepath);
        } catch {
          // ignore per-file failures
        }
      }
    } catch {
      // ignore directory-level cleanup failures
    }
  };

  cleanupOnce();
  setInterval(cleanupOnce, 60 * 60 * 1000).unref();
}

// BOOTSTRAP INITIALIZATION LOOP
(async () => {
  try {
    // ---- AUTOMATED PRODUCTION DATABASE INITIALIZATION ----
    if (isProd) {
      log("Production runtime detected. Running database migration engine...");
      try {
        const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
        const { db } = await import("./db");

        // Normalizing paths for windows executables running out of process.resourcesPath
        const resourcesRoot = isProd && baseDir.includes("app.asar") ? path.dirname(baseDir) : baseDir;

        const migrationCandidates = [
          path.join(resourcesRoot, "app.asar.unpacked", "migrations"),
          path.join(resourcesRoot, "app.asar.unpacked", "migrations", "migrations"),
          path.join(resourcesRoot, "app.asar.unpacked", "migrations", "sql"),
          path.join(baseDir, "migrations"),
          path.join(baseDir, "app.asar.unpacked", "migrations"),
        ];

        const migrationsFolder = migrationCandidates.find((p) => fs.existsSync(p));
        if (!migrationsFolder) {
          throw new Error(
            `[${APP_NAME}] Migrations folder not found. Looked in: ${migrationCandidates.join(" | ")}`
          );
        }

        await migrate(db, { migrationsFolder });
        log(`Database tables built/verified successfully via migrations. folder=${migrationsFolder}`);
      } catch (migrationError) {
        console.error("⚠️ Automated database table generation failed:", migrationError);
      }
    }
    // -----------------------------------------------------

    await ensureAppSecrets();
    await validateDbSchemaOrThrow();
    scheduleGeneratedPdfCleanup();

    const { registerRoutes } = await import("./routes");
    const server = await registerRoutes(app);

    // --- BROAD SEARCH TARGET MAP FOR STATIC PRODUCTION FRONTEND UI ---
    // In packaged Electron, REGREADY_BASE_DIR might be set inconsistently.
    // To be bulletproof, infer the unpacked app root from the current server module path.
    const serverModulePath = fileURLToPath(import.meta.url);
    // IMPORTANT: fileURLToPath(import.meta.url) returns POSIX-style forward slashes
    // on all platforms (including Windows). Never use path.sep for matching against it.
    const inferredUnpackedAppRoot = (() => {
      const asarSegment = "/app.asar/";
      const unpackedSegment = "/app.asar.unpacked/";
      if (!serverModulePath.includes(asarSegment)) return null;

      const unpackedIndexPath = serverModulePath.replace(asarSegment, unpackedSegment);
      // serverModulePath: .../app.asar.unpacked/dist/index.js -> app root is one level above /dist
      return path.resolve(path.dirname(unpackedIndexPath), "..");
    })();

    const staticCandidates = (() => {
      const unpackedCandidates: string[] = [];
      const asarCandidates: string[] = [];

      // Prefer unpacked paths so index.html and /assets/*.css+js come from the same location.
      // This avoids serving index.html from app.asar while assets are only present in app.asar.unpacked.
      unpackedCandidates.push(
        path.join(baseDir, "app.asar.unpacked", "dist", "public"),
        path.join(baseDir, "app.asar.unpacked", "public"),
      );

      if (inferredUnpackedAppRoot) {
        unpackedCandidates.push(
          path.join(inferredUnpackedAppRoot, "dist", "public"),
          path.join(inferredUnpackedAppRoot, "public"),
        );
      }

      // Fallbacks (less preferred)
      asarCandidates.push(path.join(baseDir, "dist", "public"), path.join(baseDir, "public"));

      return [...unpackedCandidates, ...asarCandidates];
    })();

    // Safe fallback to check if index layout exists inside the bundle locations
    const staticDir = staticCandidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) || staticCandidates[0];
    const indexHtmlPath = path.join(staticDir, "index.html");

    let canServeStatic = false;
    try {
      fs.accessSync(indexHtmlPath, fs.constants.R_OK);
      canServeStatic = true;
    } catch {
      canServeStatic = false;
    }

    if (canServeStatic) {
      log(`Serving static client interface from: ${staticDir}`);
      
      // PRODUCTION FIX: Serve assets with proper caching headers for asset files
      app.use(express.static(staticDir, {
        maxAge: isProd ? "1y" : "0",
        etag: false,
      }));

      // SPA fallback: only serve index.html for HTML navigation requests.
      // This prevents accidental HTML responses for CSS/JS/image fetches when assets are missing.
      app.get("*", (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith("/api")) return next();
        if (req.method !== "GET") return next();

        // If the request looks like a static asset (has an extension), don't hijack it.
        if (path.extname(req.path)) return next();

        const acceptsHtml = req.accepts("html");
        if (acceptsHtml !== "html") return next();

        return res.sendFile(indexHtmlPath);
      });
    } else {
      // If we are strictly in production, do not try to load Vite configuration modules
      if (isProd) {
        console.error(`[${APP_NAME}] Critical Error: Production static UI assets could not be located. Looked in: ${staticCandidates.join(" | ")}`);
      } else {
        console.warn(`[${APP_NAME}] Static client not found. Falling back to dev Vite middleware.`);
        const { setupVite } = await import("./vite");
        await setupVite(app, server);
      }
    }

    // 404 + JSON error handling for API routes
    app.use(notFoundHandler);
    app.use(errorHandler as any);

    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "127.0.0.1", () => {
      log(`🚀 Local Pro Engine active at http://127.0.0.1:${port}`);
    });

    // =================================================================
    // GRACEFUL SHUTDOWN
    // =================================================================
    // When the user closes the app (SIGTERM from Electron, Ctrl+C from
    // terminal, or Windows system shutdown), we need to:
    //
    // 1. Stop accepting new HTTP connections
    // 2. Close the SQLite database safely (flush WAL, release locks)
    // 3. Clean up any in-progress operations
    //
    // Without this, the SQLite WAL file may not be checkpointed back to
    // the main database file, potentially causing data loss on next start.
    //
    let shuttingDown = false;

    function gracefulShutdown(signal: string) {
      if (shuttingDown) return; // prevent double-invocation
      shuttingDown = true;

      const startMs = Date.now();
      log(`Received ${signal}. Starting graceful shutdown...`);

      // Force a WAL checkpoint to flush pending writes
      try {
        sqlite.pragma('wal_checkpoint(TRUNCATE)');
        log('WAL checkpoint completed.');
      } catch (e) {
        console.warn(`[${APP_NAME}] WAL checkpoint failed during shutdown:`, e);
      }

      // Close the HTTP server (stops accepting new connections)
      // but allows existing in-flight requests to complete.
      server.close((err) => {
        if (err) {
          console.error(`[${APP_NAME}] HTTP server close error:`, err);
        } else {
          log('HTTP server closed.');
        }

        // Close the SQLite database connection
        try {
          sqlite.close();
          log('SQLite database connection closed.');
        } catch (e) {
          console.warn(`[${APP_NAME}] SQLite close error:`, e);
        }

        const elapsed = Date.now() - startMs;
        log(`Graceful shutdown complete in ${elapsed}ms.`);

        // In Electron, the main process manages process exit.
        // When running standalone, signal the process to exit.
        if (process.env.ELECTRON_DESKTOP !== 'true') {
          process.exit(0);
        }
      });

      // Safety net: force exit after 10 seconds regardless
      setTimeout(() => {
        console.warn(`[${APP_NAME}] Forced shutdown after timeout (10s).`);
        try { sqlite.close(); } catch { /* ignore */ }
        if (process.env.ELECTRON_DESKTOP !== 'true') {
          process.exit(1);
        }
      }, 10_000).unref();
    }

    // Register signal handlers for all supported platforms
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Windows-specific: handle console close events and app exit
    process.on('exit', (code) => {
      // 'exit' is called after the event loop stops, so we can only do
      // synchronous cleanup here. The real work happens in the signal handlers.
      try { sqlite.close(); } catch { /* ignore */ }
      log(`Process exiting with code ${code}.`);
    });

    // Unhandled rejections should at least be logged, even in production
    process.on('unhandledRejection', (reason) => {
      console.error(`[${APP_NAME}] Unhandled rejection:`, reason);
    });

    process.on('uncaughtException', (err) => {
      console.error(`[${APP_NAME}] Uncaught exception:`, err);
      // Attempt a quick safety close of the DB before crashing
      try { sqlite.close(); } catch { /* ignore */ }
      // Let the process crash naturally (not calling process.exit)
    });
  } catch (error) {
    const crashLogPath = path.join(os.tmpdir(), `regready-startup-crash-${Date.now()}.log`);
    const message = error instanceof Error ? error.stack || error.message : String(error);

    try {
      fs.writeFileSync(crashLogPath, `${new Date().toISOString()}\n${message}\n`, { encoding: "utf8" });
      console.error(`[${APP_NAME}] Wrote crash log: ${crashLogPath}`);
    } catch {
      // ignore
    }

    console.error("❌ Failed to start Local Engine:", error);

    if (process.env.ELECTRON_DESKTOP === "true") {
      return;
    }
    process.exit(1);
  }
})();
