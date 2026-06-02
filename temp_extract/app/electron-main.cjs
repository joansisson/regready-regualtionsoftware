const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { fork } = require("child_process");
const http = require("http");
const { pathToFileURL } = require("url");

(function logOnModuleLoad() {
  try {
    const file = path.join(os.tmpdir(), "regready-module-load.log");
    const lines = [
      `ts=${new Date().toISOString()}`,
      `process.execPath=${process.execPath}`,
      `PORTABLE_EXECUTABLE_DIR=${process.env.PORTABLE_EXECUTABLE_DIR ?? ""}`,
      `PORTABLE_EXECUTABLE_APP_FILENAME=${process.env.PORTABLE_EXECUTABLE_APP_FILENAME ?? ""}`,
      `app.isPackaged=${app.isPackaged}`,
    ].join("\n");
    fs.appendFileSync(file, lines + "\n---\n", "utf8");
  } catch {
    // ignore
  }
})();

function appendPackagedDebugLine(line) {
  try {
    // Use a deterministic temp path so we can read it after a crash.
    const debugPath = path.join(app.getPath("temp"), "regready-packaged-debug.log");
    fs.appendFileSync(debugPath, `${new Date().toISOString()} ${line}\n`, { encoding: "utf8" });
  } catch {
    // ignore debug failures
  }
}

let mainWindow;
let serverProcess;

const PORT = parseInt(process.env.PORT || "5000", 10);
const SERVER_URL = `http://localhost:${PORT}`;

function waitForServerReady(timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      const req = http.request(
        SERVER_URL,
        { method: "HEAD", timeout: 1000 },
        (res) => {
          resolve(true);
          res.resume();
        },
      );

      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Server not reachable after ${timeoutMs}ms: ${SERVER_URL}`));
          return;
        }
        setTimeout(tick, 200);
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Server not reachable after ${timeoutMs}ms: ${SERVER_URL}`));
          return;
        }
        setTimeout(tick, 200);
      });

      req.end();
    };

    tick();
  });
}

async function createWindow() {
  // IMPORTANT:
  // packaged Electron working directory is not guaranteed to be the project root.
  // server/index.ts currently uses process.cwd() to locate dist/public, sqlite files, etc.
  // so we force cwd to the directory containing this electron-main.cjs.
  const startServerInMain =
    app.isPackaged && process.env.START_SERVER_IN_MAIN !== "false";

  const serverEntry = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "dist", "index.js")
    : path.join(__dirname, "dist/index.js");

  if (startServerInMain) {
    // Robust approach: avoid fork/spawn entirely (fixes portable ENOENT spawn path issues).
    appendPackagedDebugLine(`START_SERVER_IN_MAIN=true, importing ${serverEntry}`);

    // Stable base directory for server paths.
    // server/index.ts expects ${baseDir}/dist/public to exist.
    // In packaged mode, dist/public lives under app.asar, so baseDir must be app.getAppPath().
    process.env.REGREADY_BASE_DIR = app.isPackaged ? app.getAppPath() : app.getAppPath();
    appendPackagedDebugLine(`REGREADY_BASE_DIR=${process.env.REGREADY_BASE_DIR}`);

    // Avoid process.chdir(__dirname) in packaged mode:
    // __dirname can point inside app.asar, which isn't a real filesystem directory (your debug log shows ENOENT on chdir).
    if (!app.isPackaged) {
      try {
        process.chdir(__dirname);
        appendPackagedDebugLine(`chdir(__dirname)=${__dirname}`);
      } catch (err) {
        appendPackagedDebugLine(`chdir failed: ${String(err?.message || err)}`);
      }
    }

    // Ensure env is present before the server module boots.
    process.env.PORT = String(PORT);
    process.env.NODE_ENV = process.env.NODE_ENV || "production";
    process.env.ELECTRON_DESKTOP = "true";

    // dist/index.js is ESM (built via esbuild --format=esm), so dynamic import is required.
    try {
      await import(pathToFileURL(serverEntry).href);
      appendPackagedDebugLine(`import(dist/index.js) completed`);
    } catch (err) {
      appendPackagedDebugLine(`import(dist/index.js) FAILED: ${String(err?.stack || err)}`);
      throw err;
    }
  } else {
    // Fallback approach (original behavior).
    const portableExecDir = process.env.PORTABLE_EXECUTABLE_DIR;
    const portableExecAppFilename = process.env.PORTABLE_EXECUTABLE_APP_FILENAME;

    appendPackagedDebugLine(`START_SERVER_IN_MAIN=false; using fork path logic`);
    appendPackagedDebugLine(`app.getAppPath=${app.getAppPath()}`);
    appendPackagedDebugLine(`process.execPath=${process.execPath}`);

    const exeBasename = portableExecAppFilename || path.basename(process.execPath);
    const stableExecDirFallback = path.dirname(app.getAppPath());
    const stableElectronExecPath =
      portableExecDir && portableExecAppFilename
        ? path.join(portableExecDir, portableExecAppFilename)
        : path.join(stableExecDirFallback, exeBasename);

    appendPackagedDebugLine(`computed stableElectronExecPath(fallback)=${stableElectronExecPath}`);

    serverProcess = fork(serverEntry, [], {
      cwd: __dirname,
      execPath: stableElectronExecPath,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: process.env.NODE_ENV || "production",
        ELECTRON_DESKTOP: "true",
      },
      // child_process.fork() requires an IPC channel when stdio is overridden
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });

    serverProcess.stdout?.on("data", (d) =>
      console.log(`[server] ${d.toString("utf8").trimEnd()}`),
    );
    serverProcess.stderr?.on("data", (d) =>
      console.error(`[server] ${d.toString("utf8").trimEnd()}`),
    );
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0f14",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ---- Debug hooks (renderer-side errors will show in the same terminal) ----
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer console] ${level} ${sourceId}:${line} ${message}`);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[renderer load failed] code=${errorCode} desc=${errorDescription} url=${String(validatedURL)}`,
    );
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer gone] ${JSON.stringify(details)}`);
  });

  // If the renderer is blank, devtools will show the runtime exception immediately.
  try {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } catch {
    // ignore
  }

  try {
    await waitForServerReady(15000);
    mainWindow.loadURL(SERVER_URL);
  } catch (err) {
    console.error(`[electron] Server failed to start: ${String(err?.message || err)}`);
    // Load anyway so you can see server error HTML if it exists.
    mainWindow.loadURL(SERVER_URL);
  }

  mainWindow.on("closed", () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
