// Server-rendered route smoke test; this does not substitute for browser QA.
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { lessons, labs } = await server.ssrLoadModule("/src/curriculum.ts");
  let count = 0;
  const routes = [
    "",
    "labs",
    "progress",
    ...lessons.map((l) => "learn/" + l.id),
    ...labs.map((l) => "labs/" + l.kind),
  ];
  for (const route of routes) {
    globalThis.location = { hash: "#/" + route };
    const html = renderToString(React.createElement(App));
    assert.ok(html.length > 3000, route);
    assert.ok(!html.includes("页面遇到了一次意外"), route);
    if (route.startsWith("learn/"))
      assert.ok(html.includes("带着问题进入实验"), route);
    count++;
  }
  const output = {
    routes: count,
    result: "passed",
    method:
      "React server rendering; browser layout, events, and Worker execution remain separate checks",
  };
  await fs.mkdir("evidence", { recursive: true });
  await fs.writeFile("evidence/pages.json", JSON.stringify(output, null, 2));
  console.log(output);
} finally {
  await server.close();
}
