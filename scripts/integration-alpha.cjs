const { spawn } = require("child_process");
const path = require("path");
const electron = require("electron");

const root = path.join(__dirname, "..");
const main = path.join(root, "electron", "alpha-integration-main.cjs");

const child = spawn(electron, [main], {
  cwd: root,
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: "1",
    THE_DAW_ALPHA_INTEGRATION: "1",
  },
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", error => {
  console.error(error);
  process.exit(1);
});

child.on("exit", code => {
  process.exit(code ?? 1);
});
