// Remove Python bytecode copied from public/ into the dedicated Pages build.
import { readdir, realpath, unlink, rmdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative, isAbsolute } from "node:path";

const output = await realpath(new URL("../../ai-lab-preview/", import.meta.url));
const expected = fileURLToPath(new URL("../../ai-lab-preview/", import.meta.url));
if (relative(expected, output) !== "") throw new Error("Unexpected Pages output directory");

async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const inside = relative(output, path);
    if (inside.startsWith("..") || isAbsolute(inside) || entry.isSymbolicLink()) {
      throw new Error("Unexpected path in Pages output");
    }
    if (entry.isDirectory()) {
      await clean(path);
      if (entry.name === "__pycache__" && (await readdir(path)).length === 0) await rmdir(path);
    } else if (entry.isFile() && /\.py[co]$/.test(entry.name)) {
      await unlink(path);
    }
  }
}

await clean(output);
console.log("Pages output prepared: ai-lab-preview/");
