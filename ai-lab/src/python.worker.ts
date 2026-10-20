/// <reference lib="webworker" />
// Runtime is version-pinned. Only Python/NumPy calculate model outputs.
const runtimeURL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
let py: any;
let queue = Promise.resolve();
async function boot() {
  const { loadPyodide } = await import(
    /* @vite-ignore */ `${runtimeURL}pyodide.mjs`
  );
  py = await loadPyodide({ indexURL: runtimeURL });
  await py.loadPackage("numpy");
  const response = await fetch(
    new URL("../public/python/engine.py", import.meta.url),
  );
  if (!response.ok) throw new Error("计算源码加载失败");
  py.FS.writeFile("/home/pyodide/engine.py", await response.text());
  await py.runPythonAsync("from engine import *");
  self.postMessage({ type: "ready" });
}
const ready = boot().catch((e) => {
  self.postMessage({ type: "init-error", error: String(e) });
  throw e;
});
self.onmessage = ({ data }) => {
  queue = queue
    .catch(() => {})
    .then(async () => {
      try {
        await ready;
        const { payload, id } = data;
        if (payload.op === "code") {
          let stdout = "",
            stderr = "";
          py.setStdout({ batched: (s: string) => (stdout += s + "\n") });
          py.setStderr({ batched: (s: string) => (stderr += s + "\n") });
          const globals = py.toPy({ __name__: "__main__" });
          try {
            const result = await py.runPythonAsync(payload.code, { globals });
            self.postMessage({
              id,
              result: { stdout, stderr, result: result?.toString?.() || "" },
            });
            result?.destroy?.();
          } finally {
            globals.destroy();
          }
        } else {
          py.globals.set("_request", JSON.stringify(payload));
          const result = await py.runPythonAsync("dispatch(_request)");
          self.postMessage({ id, result: JSON.parse(result) });
        }
      } catch (e) {
        self.postMessage({
          id: data.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
};
