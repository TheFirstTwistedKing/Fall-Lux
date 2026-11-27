// src/index.html 을 하나의 HTML(dist/index.html)로 묶는다.
// - 글꼴을 base64로 넣는다
// - 3D 지도 · 이야기 지도(src/app3d.js + three.js)를 esbuild로 묶어 <!--APP3D--> 자리에 넣는다
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
let html = readFileSync(join(root, "src/index.html"), "utf8");
html = html.replace(/url\("fonts\/([^"]+\.woff2)"\)/g, (_, f) =>
  `url("data:font/woff2;base64,${readFileSync(join(root, "src/fonts", f)).toString("base64")}")`);
const out = await build({ entryPoints: [join(root, "src/app3d.js")], bundle: true, format: "iife", minify: true,
  target: ["es2020"], write: false, legalComments: "eof", logLevel: "warning" });
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
if (!html.includes("<!--APP3D-->")) throw new Error("<!--APP3D--> 자리가 없습니다");
html = html.replace("<!--APP3D-->", () => `<script>${js}</script>`);
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist/index.html"), html);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + " KB");
