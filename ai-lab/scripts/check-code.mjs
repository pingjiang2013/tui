// Extract the exact editable code shown by the UI, then execute it in Python.
import ts from "typescript";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
const text = await fs.readFile("src/CodeEditor.tsx", "utf8");
const ast = ts.createSourceFile(
  "CodeEditor.tsx",
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const fn = ast.statements.find(
  (s) => ts.isFunctionDeclaration(s) && s.name?.text === "exampleCode",
);
if (!fn) throw Error("Editable example function not found");
const js = ts.transpileModule(fn.getText(ast), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { exampleCode } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const settings = {
  weight: 1.7,
  bias: -0.2,
  rate: 0.03,
  input: 0.6,
  sample: 2,
  text: "小猫",
  temperature: 0.8,
  causal: true,
  heads: 1,
  head: 0,
  position: false,
};
const kinds = [
  "linear",
  "gradient",
  "network",
  "tokens",
  "embedding",
  "probability",
  "attention",
  "transformer",
  "language",
];
const fixtures = kinds.map((kind) => ({
  kind,
  settings,
  code: exampleCode(kind, settings),
}));
fixtures.push({
  kind: "attention",
  settings: { ...settings, heads: 2, position: true, head: 1 },
  code: exampleCode("attention", {
    ...settings,
    heads: 2,
    position: true,
    head: 1,
  }),
});
await fs.mkdir(".cache", { recursive: true });
await fs.writeFile(".cache/code-fixtures.json", JSON.stringify(fixtures));
const executable =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const result = spawnSync(executable, ["scripts/check_code.py"], {
  encoding: "utf8",
  windowsHide: true,
});
if (result.error) throw result.error;
console.log(result.stdout);
if (result.stderr) console.error(result.stderr);
process.exitCode = result.status;
