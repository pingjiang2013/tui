import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const source = fs.readFileSync(
  new URL("../src/curriculum.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { lessons, parts, labs } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
test("24 complete lessons form seven sections with unique stable identifiers", () => {
  assert.equal(lessons.length, 24);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 24);
  assert.equal(parts.length, 7);
  parts.forEach((p, i) =>
    assert.equal(lessons.filter((l) => l.part === i).length, p.count),
  );
});
test("every lesson has a question, computation, motivation, task, and answer explanation", () => {
  for (const l of lessons) {
    for (const k of [
      "title",
      "question",
      "intro",
      "observe",
      "task",
      "mechanism",
      "formula",
      "why",
      "kind",
      "code",
      "quiz",
      "explanation",
    ])
      assert.ok(l[k]?.length > 1, `${l.id}: ${k}`);
    assert.equal(l.answers.length, 3);
    assert.ok(l.correct >= 0 && l.correct < 3);
  }
});
test("labs resolve to real lessons and reuse their computation kind", () => {
  for (const lab of labs) {
    const l = lessons.find((l) => l.id === lab.lesson);
    assert.ok(l);
    assert.equal(l.kind, lab.kind);
  }
});
