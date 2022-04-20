const { initRemix } = require("remix-electron");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { join } = require("node:path");

/** @type {BrowserWindow | undefined} */
let win;

ipcMain.on("ipc-example", async (event, arg) => {
  const msgTemplate = (pingPong) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply("ipc-example", msgTemplate("pong"));
});

/** @param {string} url */
async function createWindow(url) {
  win = new BrowserWindow({ show: false });
  await win.loadURL(url);
  win.show();

  if (process.env.NODE_ENV === "development") {
    win.webContents.openDevTools();
  }
}

app.on("ready", async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      const {
        default: installExtension,
        REACT_DEVELOPER_TOOLS,
      } = require("electron-devtools-installer");

      await installExtension(REACT_DEVELOPER_TOOLS);
    }

    const url = await initRemix({ serverBuild: join(__dirname, "build") });
    await createWindow(url);
  } catch (error) {
    dialog.showErrorBox("Error", getErrorStack(error));
    console.error(error);
  }
});

/** @param {unknown} error */
function getErrorStack(error) {
  return error instanceof Error ? error.stack || error.message : String(error);
}

const platformToExecutables = {
  win32: {
    migrationEngine:
      "node_modules/@prisma/engines/migration-engine-windows.exe",
    queryEngine: "node_modules/@prisma/engines/query_engine-windows.dll.node",
  },
  linux: {
    migrationEngine:
      "node_modules/@prisma/engines/migration-engine-debian-openssl-1.1.x",
    queryEngine:
      "node_modules/@prisma/engines/libquery_engine-debian-openssl-1.1.x.so.node",
  },
  darwin: {
    migrationEngine: "node_modules/@prisma/engines/migration-engine-darwin",
    queryEngine:
      "node_modules/@prisma/engines/libquery_engine-darwin.dylib.node",
  },
  darwinArm64: {
    migrationEngine:
      "node_modules/@prisma/engines/migration-engine-darwin-arm64",
    queryEngine:
      "node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node",
  },
};

function getPlatformName() {
  const isDarwin = process.platform === "darwin";
  if (isDarwin && process.arch === "arm64") {
    return `${process.platform}Arm64`;
  }

  return process.platform;
}

const extraResourcesPath = app.getAppPath().replace("app.asar", ""); // impacted by extraResources setting in electron-builder.yml
const platformName = getPlatformName();

const mePath = path.join(
  extraResourcesPath,
  platformToExecutables[platformName].migrationEngine
);
const qePath = path.join(
  extraResourcesPath,
  platformToExecutables[platformName].queryEngine
);

ipcMain.on("config:get-app-path", (event) => {
  event.returnValue = app.getAppPath();
});

ipcMain.on("config:get-platform-name", (event) => {
  const isDarwin = process.platform === "darwin";
  event.returnValue =
    isDarwin && process.arch === "arm64"
      ? `${process.platform}Arm64`
      : (event.returnValue = process.platform);
});

ipcMain.on("config:get-prisma-db-path", (event) => {
  event.returnValue = dbPath;
});

ipcMain.on("config:get-prisma-me-path", (event) => {
  event.returnValue = mePath;
});

ipcMain.on("config:get-prisma-qe-path", (event) => {
  event.returnValue = qePath;
});
