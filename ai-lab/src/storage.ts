import type { Progress } from "./types";
const empty = (): Progress => ({
  version: 1,
  stages: {},
  tasks: {},
  passed: {},
  visited: {},
});
export function readProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem("inside-ai:progress") || "null");
    return validProgress(p) ? p : empty();
  } catch {
    return empty();
  }
}
export function validProgress(p: any): p is Progress {
  return (
    p?.version === 1 &&
    ["stages", "tasks", "passed", "visited"].every(
      (k) => p[k] && typeof p[k] === "object" && !Array.isArray(p[k]),
    ) &&
    Object.values(p.stages).every(
      (v) => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 6,
    ) &&
    ["tasks", "passed", "visited"].every((k) =>
      Object.values(p[k]).every((v) => typeof v === "boolean"),
    )
  );
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem("inside-ai:progress", JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function db(
  action: "get" | "set" | "delete",
  key: string,
  value?: unknown,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("inside-ai", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("records");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const tx = database.transaction(
        "records",
        action === "get" ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("records");
      const result =
        action === "get"
          ? store.get(key)
          : action === "set"
            ? store.put(value, key)
            : store.delete(key);
      let data: any;
      result.onsuccess = () => (data = result.result);
      tx.oncomplete = () => {
        database.close();
        resolve(data);
      };
      tx.onerror = () => {
        database.close();
        reject(tx.error);
      };
    };
  });
}
