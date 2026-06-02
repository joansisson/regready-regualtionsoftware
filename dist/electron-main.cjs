"use strict";

// electron-main.cjs
var { app, BrowserWindow } = require("electron");
var path = require("path");
var fs = require("fs");
var os = require("os");
var { fork } = require("child_process");
var http = require("http");
var { pathToFileURL } = require("url");
function writeMainCrashLog(line) {
  try {
    const file = path.join(os.tmpdir(), `regready-electron-main-${process.pid}.log`);
    fs.appendFileSync(file, `${(/* @__PURE__ */ new Date()).toISOString()} ${line}
`, { encoding: "utf8" });
  } catch {
  }
}
process.on("uncaughtException", (err) => {
  writeMainCrashLog(`uncaughtException: ${String(err?.stack || err)}`);
});
process.on("unhandledRejection", (reason) => {
  writeMainCrashLog(`unhandledRejection: ${String(reason?.stack || reason)}`);
});
app.on("will-quit", () => {
  writeMainCrashLog("app: will-quit");
});
app.commandLine.appendSwitch("no-proxy-server");
app.commandLine.appendSwitch("disable-http-cache");
if (app.isPackaged || process.env.NODE_ENV === "production") {
  const safeAppDataFolder = path.join(process.env.APPDATA || app.getPath("appData"), "RegReady Local Pro");
  app.setPath("userData", safeAppDataFolder);
}
try {
  if (app.isPackaged) {
    process.chdir(path.dirname(process.execPath));
  } else {
    process.chdir(__dirname);
  }
} catch (err) {
}
(function logOnModuleLoad() {
  try {
    const file = path.join(os.tmpdir(), "regready-module-load.log");
    const lines = [
      `ts=${(/* @__PURE__ */ new Date()).toISOString()}`,
      `process.execPath=${process.execPath}`,
      `PORTABLE_EXECUTABLE_DIR=${process.env.PORTABLE_EXECUTABLE_DIR ?? ""}`,
      `PORTABLE_EXECUTABLE_APP_FILENAME=${process.env.PORTABLE_EXECUTABLE_APP_FILENAME ?? ""}`,
      `app.isPackaged=${app.isPackaged}`
    ].join("\n");
    fs.appendFileSync(file, lines + "\n---\n", "utf8");
  } catch {
  }
})();
function appendPackagedDebugLine(line) {
  try {
    const debugPath = path.join(app.getPath("temp"), "regready-packaged-debug.log");
    fs.appendFileSync(debugPath, `${(/* @__PURE__ */ new Date()).toISOString()} ${line}
`, { encoding: "utf8" });
  } catch {
  }
}
var mainWindow;
var serverProcess;
var PORT = parseInt(process.env.PORT || "5000", 10);
var SERVER_URL = `http://127.0.0.1:${PORT}`;
function waitForServerReady(timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      const req = http.request(
        SERVER_URL,
        { method: "HEAD", timeout: 1e3 },
        (res) => {
          resolve(true);
          res.resume();
        }
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
  const startServerInMain = app.isPackaged && process.env.START_SERVER_IN_MAIN !== "false";
  const serverEntry = app.isPackaged ? path.join(process.resourcesPath, "app.asar", "dist", "index.js") : path.join(__dirname, "index.js");
  if (startServerInMain) {
    appendPackagedDebugLine(`START_SERVER_IN_MAIN=true, importing ${serverEntry}`);
    process.env.REGREADY_BASE_DIR = app.isPackaged ? process.resourcesPath : app.getAppPath();
    appendPackagedDebugLine(`REGREADY_BASE_DIR=${process.env.REGREADY_BASE_DIR}`);
    const appDataFolder = path.join(process.env.APPDATA || "", "RegReady Local Pro");
    if (!fs.existsSync(appDataFolder)) {
      fs.mkdirSync(appDataFolder, { recursive: true });
    }
    process.env.REGREADY_DB_PATH = app.isPackaged ? path.join(appDataFolder, "local.db") : path.join(process.cwd(), "local.db");
    appendPackagedDebugLine(`REGREADY_DB_PATH=${process.env.REGREADY_DB_PATH}`);
    process.env.PORT = String(PORT);
    process.env.NODE_ENV = process.env.NODE_ENV || "production";
    process.env.ELECTRON_DESKTOP = "true";
    try {
      await import(pathToFileURL(serverEntry).href);
      appendPackagedDebugLine(`import(dist/index.js) completed`);
    } catch (err) {
      appendPackagedDebugLine(`import(dist/index.js) FAILED: ${String(err?.stack || err)}`);
    }
  } else {
    const portableExecDir = process.env.PORTABLE_EXECUTABLE_DIR;
    const portableExecAppFilename = process.env.PORTABLE_EXECUTABLE_APP_FILENAME;
    appendPackagedDebugLine(`START_SERVER_IN_MAIN=false; using fork path logic`);
    let stableElectronExecPath = process.execPath;
    if (portableExecDir && portableExecAppFilename) {
      stableElectronExecPath = path.join(portableExecDir, portableExecAppFilename);
    }
    serverProcess = fork(serverEntry, [], {
      cwd: __dirname,
      execPath: stableElectronExecPath,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: process.env.NODE_ENV || "production",
        ELECTRON_DESKTOP: "true"
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"]
    });
    serverProcess.stdout?.on("data", (d) => console.log(`[server] ${d.toString("utf8").trimEnd()}`));
    serverProcess.stderr?.on("data", (d) => console.error(`[server] ${d.toString("utf8").trimEnd()}`));
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0f14",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: app.isPackaged ? path.join(process.resourcesPath, "preload.cjs") : path.join(__dirname, "preload.cjs")
    }
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer console] ${level} ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer load failed] code=${errorCode} desc=${errorDescription} url=${String(validatedURL)}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer gone] ${JSON.stringify(details)}`);
  });
  try {
    await waitForServerReady(15e3);
    mainWindow.loadURL(SERVER_URL);
  } catch (err) {
    console.error(`[electron] Server failed to start: ${String(err?.message || err)}`);
    if (app.isPackaged) {
      mainWindow.loadFile(path.join(process.resourcesPath, "app.asar", "dist", "public", "index.html"));
    } else {
      mainWindow.loadURL(SERVER_URL);
    }
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
