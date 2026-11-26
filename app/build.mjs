// src/index.html 을 글꼴까지 모두 들어간 단일 HTML(dist/index.html)로 묶는다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
let html = readFileSync(join(root, "src/index.html"), "utf8");
html = html.replace(/url\("fonts\/([^"]+\.woff2)"\)/g, (_, f) =>
  `url("data:font/woff2;base64,${readFileSync(join(root, "src/fonts", f)).toString("base64")}")`);
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist/index.html"), html);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + " KB");
