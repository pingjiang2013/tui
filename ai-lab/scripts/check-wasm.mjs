import { loadPyodide } from "pyodide";
import fs from "node:fs/promises";
import path from "node:path";
const start = performance.now();
await fs.mkdir(".cache/pyodide", { recursive: true });
const lock = JSON.parse(
  await fs.readFile("node_modules/pyodide/pyodide-lock.json", "utf8"),
);
const wheel = lock.packages.numpy.file_name;
const wheelPath = path.resolve(".cache/pyodide", wheel);
try {
  await fs.access(wheelPath);
} catch {
  const r = await fetch(
    "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/" + wheel,
  );
  if (!r.ok) throw Error("NumPy download failed");
  await fs.writeFile(wheelPath, Buffer.from(await r.arrayBuffer()));
}
const py = await loadPyodide({
  indexURL: path.resolve("node_modules/pyodide") + "/",
  packageCacheDir: path.resolve(".cache/pyodide"),
});
await py.loadPackage("numpy");
py.FS.writeFile(
  "/home/pyodide/engine.py",
  await fs.readFile("public/python/engine.py", "utf8"),
);
await py.runPythonAsync("from engine import *");
const loaded = performance.now();
py.FS.writeFile(
  "/home/pyodide/test_engine.py",
  await fs.readFile("tests/test_engine.py", "utf8"),
);
const testsRun = await py.runPythonAsync(
  "import unittest, test_engine\n_result = unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromModule(test_engine))\nassert _result.wasSuccessful()\n_result.testsRun",
);
const basic = JSON.parse(
  await py.runPythonAsync(
    `dispatch(''+__import__('json').dumps({'op':'compute','kind':'linear','settings':{'weight':2,'bias':0}}))`,
  ),
);
if (basic.output !== 6 || Math.abs(basic.loss - 0.4) > 1e-8)
  throw Error("WASM linear calculation mismatch");
const times = [];
for (let i = 0; i < 25; i++) {
  const t = performance.now();
  await py.runPythonAsync("experiment('attention')");
  times.push(performance.now() - t);
}
times.sort((a, b) => a - b);
await py.runPythonAsync("MODEL = TinyTransformer()");
const before = await py.runPythonAsync("MODEL.evaluate()");
const t = performance.now();
for (let i = 0; i < 20; i++) await py.runPythonAsync("MODEL.train_step()");
const trainingMs = performance.now() - t;
const after = await py.runPythonAsync("MODEL.evaluate()");
if (!(after < before))
  throw Error("WASM training did not improve fixed validation loss");
const nodeState = JSON.parse(
  await fs.readFile("public/models/tiny-pretrained.json", "utf8"),
);
py.globals.set("_checkpoint", JSON.stringify(nodeState.model));
await py.runPythonAsync("MODEL.restore(json.loads(_checkpoint))");
const validation = await py.runPythonAsync("MODEL.evaluate()");
if (Math.abs(validation - nodeState.metadata.final_validation) > 1e-6)
  throw Error("Native/WASM checkpoint parity mismatch");
const t2 = performance.now();
await py.runPythonAsync("MODEL.inspect('小猫')");
const report = {
  runtime: "Pyodide 0.27.7 + NumPy",
  mathTests: testsRun,
  environment: "Node WebAssembly; not a browser rendering test",
  coldRuntimeMs: loaded - start,
  attentionP95Ms: times[23],
  training20StepsMs: trainingMs,
  validationBefore: before,
  validationAfter: after,
  checkpointValidation: validation,
  inspectMs: performance.now() - t2,
};
await fs.mkdir("evidence", { recursive: true });
await fs.writeFile("evidence/wasm.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(0);
