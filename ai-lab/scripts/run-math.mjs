import { spawnSync } from "node:child_process";
import fs from "node:fs";
const venv =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const python = fs.existsSync(venv) ? venv : "python";
const result = spawnSync(
  python,
  ["-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"],
  { stdio: "inherit", windowsHide: true },
);
if (result.error) throw result.error;
process.exitCode = result.status;
