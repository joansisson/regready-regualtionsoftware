import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import path from "path";
import fs from "fs";
import os from "os";
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

// Safeguard against absolute directory shifts inside the running system context
const baseDir = process.env.REGREADY_BASE_DIR ?? process.cwd();

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

  const dir = path.join(baseDir, "generated-pdfs");

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
    const staticCandidates = [
      path.join(baseDir, "dist", "public"),
      path.join(baseDir, "public"),
      // express.static cannot serve from inside app.asar, so packaged Electron UI must be unpacked
      path.join(baseDir, "app.asar.unpacked", "dist", "public"),
      path.join(baseDir, "app.asar.unpacked", "public"),
    ];

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
      app.use(express.static(staticDir));
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(indexHtmlPath);
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
