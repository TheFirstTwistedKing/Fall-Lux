/* ════════════════════════════════════════════════════════════════
   행성 안: 이야기 지도
   - 책 = 이야기, 별 = 전투 · 탐색, 책 위의 별 = 둘 다
   - 노드는 이야기 흐름을 따라 노랑 · 하늘색(민트) 두 가닥의 빛줄기로 이어진다
   - 진행 상황은 행성의 타임라인(세이브)에 저장된다
   ════════════════════════════════════════════════════════════════ */
import { STORY } from "./story-data.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const YELLOW = [255, 216, 74], MINT = [76, 201, 255];
const ICON = {
  book: '<path d="M3 6.2c2.9-1 5.9-.7 9 1.3v11.8c-3.1-2-6.1-2.3-9-1.3zM21 6.2c-2.9-1-5.9-.7-9 1.3v11.8c3.1-2 6.1-2.3 9-1.3z"/>',
  star: '<path d="M12 3.4l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.3 6.9 19.1 8 13.4 3.7 9.4l5.8-.7z"/>',
  both: '<path d="M3 10.4c2.9-1 5.9-.7 9 1.3v8.6c-3.1-2-6.1-2.3-9-1.3zM21 10.4c-2.9-1-5.9-.7-9 1.3v8.6c3.1-2 6.1-2.3 9-1.3z"/><path d="M12 1.6l1.25 2.6 2.85.35-2.1 1.95.55 2.8L12 7.95 9.45 9.3 10 6.5 7.9 4.55l2.85-.35z"/>'
};
export const TYPE_LABEL = { book: "이야기", star: "전투 · 탐색", both: "이야기 + 전투 · 탐색" };

export function createStoryMap(root, hooks) {
  const cv = document.createElement("canvas"); cv.className = "story-canvas"; cv.setAttribute("aria-hidden", "true");
  const layer = document.createElement("div"); layer.className = "story-nodes";
  root.append(cv, layer);
  const ctx = cv.getContext("2d");
  const bg = document.createElement("canvas"), bctx = bg.getContext("2d");
  let W = 0, H = 0, dpr = 1, portrait = false, data = null, state = null, nodes = [], edges = [], raf = 0, running = false, last = 0, T = 0;
  const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.4, s: 0.004 + Math.random() * 0.01, ph: Math.random() * 6.28 }));

  function paintBg() {
    /* 행성 안: 남보랏빛 하늘, 멀리 솟은 보랏빛 결정의 실루엣. 작게 그려 늘려서 흐릿하게 */
    const w = Math.max(80, Math.round(W * 0.3)), h = Math.max(80, Math.round(H * 0.3));
    bg.width = w; bg.height = h;
    const g = bctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0b0a18"); g.addColorStop(0.55, "#17153a"); g.addColorStop(1, "#262352");
    bctx.fillStyle = g; bctx.fillRect(0, 0, w, h);
    const glow = (x, y, r, c, a) => { const rg = bctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h));
      rg.addColorStop(0, `rgba(${c},${a})`); rg.addColorStop(1, `rgba(${c},0)`); bctx.fillStyle = rg; bctx.fillRect(0, 0, w, h); };
    glow(0.72, 0.95, 0.7, "140,90,240", 0.28); glow(0.2, 0.1, 0.6, "76,201,255", 0.08); glow(0.9, 0.05, 0.5, "255,216,74", 0.06);
    /* 결정 실루엣 */
    const shard = (x, base, hgt, wid, lean, a) => {
      bctx.beginPath(); bctx.moveTo((x - wid) * w, base * h); bctx.lineTo((x + lean) * w, (base - hgt) * h); bctx.lineTo((x + wid) * w, base * h); bctx.closePath();
      const sg = bctx.createLinearGradient(0, (base - hgt) * h, 0, base * h);
      sg.addColorStop(0, `rgba(205,170,255,${a})`); sg.addColorStop(1, `rgba(90,50,170,${a * 0.4})`);
      bctx.fillStyle = sg; bctx.fill();
    };
    shard(0.78, 1.02, 0.62, 0.035, 0.06, 0.35); shard(0.86, 1.02, 0.4, 0.025, -0.03, 0.28); shard(0.14, 1.02, 0.35, 0.03, 0.04, 0.22); shard(0.6, 1.02, 0.22, 0.02, 0.02, 0.2);
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    const tc = tmp.getContext("2d"); tc.filter = "blur(2.5px)"; tc.drawImage(bg, 0, 0); bctx.drawImage(tmp, 0, 0);
  }

  const P = n => portrait ? { x: (0.16 + n.y * 0.68) * W, y: (0.1 + n.x * 0.78) * H } : { x: (0.06 + n.x * 0.88) * W, y: (0.12 + n.y * 0.74) * H };

  function status(n) {
    if (state.done.includes(n.id)) return "done";
    const preds = data.nodes.filter(p => p.next.includes(n.id));
    if (!preds.length) return "open";
    const ok = preds.some(p => state.done.includes(p.id) && (p.next.length < 2 || state.chosen[p.id] === n.id));
    return ok ? "open" : "locked";
  }
  function build() {
    layer.innerHTML = ""; nodes = []; edges = [];
    data.nodes.forEach((n, i) => {
      const st = status(n);
      const b = document.createElement("button");
      b.type = "button"; b.className = `node ${n.type} ${st}`;
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n.type]}</svg>`;
      b.setAttribute("aria-label", `${i + 1}번째 갈림목, ${TYPE_LABEL[n.type]}, ${st === "done" ? "완료" : st === "open" ? "열림" : "잠김"}`);
      if (st === "locked") b.setAttribute("aria-disabled", "true");
      b.onclick = () => { if (st !== "locked") hooks.onOpen && hooks.onOpen(n, st, data); };
      layer.appendChild(b); nodes.push({ n, el: b, st });
    });
    data.nodes.forEach(a => a.next.forEach(id => {
      const b = data.nodes.find(x => x.id === id);
      const lit = state.done.includes(a.id) && (a.next.length < 2 || state.chosen[a.id] === id);
      const near = status(a) !== "locked" && (a.next.length < 2 || !state.done.includes(a.id) || state.chosen[a.id] === id);   // 고르지 않은 갈래는 어둡게
      edges.push({ a, b, lit, near, seed: Math.random() * 6.28 });
    }));
    place();
  }
  function place() { for (const o of nodes) { const p = P(o.n); o.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,-50%)`; } }

  function bez(a, b) {
    const p0 = P(a), p3 = P(b), d = portrait ? (p3.y - p0.y) * 0.5 : (p3.x - p0.x) * 0.5;
    const p1 = portrait ? { x: p0.x, y: p0.y + d } : { x: p0.x + d, y: p0.y };
    const p2 = portrait ? { x: p3.x, y: p3.y - d } : { x: p3.x - d, y: p3.y };
    return t => { const u = 1 - t;
      return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
               y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }; };
  }
  function strand(f, phase, rgb, alpha, amp) {
    const N = 48, pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = f(t), q = f(Math.min(1, t + 0.01)), r0 = f(Math.max(0, t - 0.01));
      let nx = -(q.y - r0.y), ny = q.x - r0.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const o = Math.sin(t * Math.PI * 3 + phase) * amp * Math.sin(t * Math.PI);
      pts.push([p.x + nx * o, p.y + ny * o]);
    }
    const line = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
    [[14, 0.05], [6, 0.14], [2.2, 0.55], [1, 0.9]].forEach(([w, a]) => {
      line(); ctx.lineWidth = w; ctx.strokeStyle = `rgba(${rgb},${a * alpha})`; ctx.stroke();
    });
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += REDUCED ? 0 : dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const m of motes) {                         // 떠다니는 빛 먼지
      const y = ((m.y - T * m.s) % 1 + 1) % 1, x = m.x + Math.sin(T * 0.3 + m.ph) * 0.01;
      ctx.fillStyle = `rgba(220,200,255,${0.25 + 0.2 * Math.sin(T + m.ph)})`;
      ctx.beginPath(); ctx.arc(x * W, y * H, m.r, 0, 6.283); ctx.fill();
    }
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const e of edges) {
      const f = bez(e.a, e.b), alpha = e.lit ? 1 : e.near ? 0.55 : 0.16, amp = 5 + (e.lit ? 2 : 0);
      strand(f, T * 1.4 + e.seed, YELLOW.join(","), alpha, amp);
      strand(f, T * 1.4 + e.seed + Math.PI, MINT.join(","), alpha, amp);
      if (e.lit || e.near) {                          // 이야기 흐름 방향으로 흐르는 빛
        for (let k = 0; k < 7; k++) {
          const t = ((T * 0.18 + k / 7 + e.seed) % 1), p = f(t), rgb = k % 2 ? MINT : YELLOW;
          const r = 7 * Math.sin(t * Math.PI) + 1, g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
          g.addColorStop(0, `rgba(255,255,255,${0.85 * alpha})`); g.addColorStop(0.3, `rgba(${rgb},${0.45 * alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.4, 0, 6.283); ctx.fill();
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function resize() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    portrait = W / H < 0.95;
    paintBg(); place();
  }
  addEventListener("resize", () => { if (running) resize(); });

  return {
    open(planetId, saved) {
      data = STORY[planetId] || { nodes: [] };
      state = Object.assign({ done: [], chosen: {} }, saved || {});
      resize(); build();
      if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    close() { running = false; cancelAnimationFrame(raf); },
    complete(nodeId, choice) {
      if (!state.done.includes(nodeId)) state.done.push(nodeId);
      if (choice) state.chosen[nodeId] = choice;
      hooks.onSave && hooks.onSave(state); build();
    },
    state: () => state
  };
}
