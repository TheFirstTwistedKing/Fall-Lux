// Windows(exe)용 Electron 진입점
const { app, BrowserWindow, Menu } = require("electron");
const path = require("node:path");

function create() {
  const win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 360, minHeight: 560,
    backgroundColor: "#120b06", autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.once("ready-to-show", () => win.show());
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}
app.whenReady().then(create);
app.on("window-all-closed", () => app.quit());
