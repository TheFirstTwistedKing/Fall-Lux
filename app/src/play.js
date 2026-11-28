/* ════════════════════════════════════════════════════════════════
   빛 노드(전투 · 탐색)의 게임 화면
   - 나 = 작은 불빛. 끌거나(손가락 · 마우스) 방향키 · WASD 로 움직인다
   - 흩어진 빛 조각을 모두 모으면 통과, 떠도는 그림자에 세 번 닿으면 불빛이 꺼진다
   - 노드마다 game: { shards, shadows, speed } 로 난이도를 정한다 (없으면 기본값)
   - 공포증 배려: 조각은 화면에 넓게 띄엄띄엄 놓는다(작은 점이 뭉친 무늬 없음), 번쩍임 없음
   ════════════════════════════════════════════════════════════════ */
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const Y = "255,216,74", M = "76,201,255";

export function createGame(root, hooks) {
  const cv = document.createElement("canvas"); cv.className = "game-canvas"; cv.setAttribute("aria-hidden", "true");
  root.prepend(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, T = 0, running = false, state = "idle";
  let me = null, shards = [], shadows = [], life = 3, hurt = 0, cfg = null, target = null, keys = {}, onEnd = null, endAt = 0;

  /* 미리 그려 둔 빛 덩어리 */
  const glow = (rgb) => { const c = document.createElement("canvas"); c.width = c.height = 96;
    const g = c.getContext("2d"), r = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.18, `rgba(${rgb},.75)`); r.addColorStop(.5, `rgba(${rgb},.18)`); r.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = r; g.fillRect(0, 0, 96, 96); return c; };
  const GY = glow(Y), GM = glow(M);

  function resize() {
    W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  const U = () => Math.min(W, H);            // 화면 크기에 맞춘 길이 단위

  function layout() {
    /* 조각: 화면을 칸으로 나눠 칸마다 하나씩, 서로 멀리 */
    const n = cfg.shards, cols = Math.max(1, Math.round(Math.sqrt(n * W / H))), rows = Math.ceil(n / cols);
    const cells = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
    cells.sort(() => Math.random() - 0.5);
    shards = cells.slice(0, n).map(([c, r]) => ({
      x: W * (0.12 + 0.76 * (c + 0.25 + Math.random() * 0.5) / cols),
      y: H * (0.18 + 0.58 * (r + 0.25 + Math.random() * 0.5) / rows),
      got: 0, ph: Math.random() * 6.28, rgb: Math.random() < 0.5 ? Y : M }));
    me = { x: W * 0.5, y: H * 0.86, vx: 0, vy: 0 };
    shadows = Array.from({ length: cfg.shadows }, (_, i) => {
      const a = Math.random() * 6.28;
      return { x: W * (0.15 + 0.7 * Math.random()), y: H * (0.15 + 0.45 * Math.random()), vx: Math.cos(a), vy: Math.sin(a), ph: i * 2.1, r: U() * 0.07 };
    });
    life = 3; hurt = 0;
  }

  function point(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener("pointerdown", e => { if (state !== "play") return; target = point(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener("pointermove", e => { if (target) target = point(e); });
  const up = () => { target = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  addEventListener("keydown", e => { if (running) keys[e.key.toLowerCase()] = 1; });
  addEventListener("keyup", e => { keys[e.key.toLowerCase()] = 0; });
  addEventListener("resize", () => { if (!running || !me) return; const ox = W, oy = H; resize(); const sx = W / ox, sy = H / oy;
    [me, ...shards, ...shadows].forEach(o => { o.x *= sx; o.y *= sy; }); });

  function step(dt) {
    const u = U(), sp = u * 0.62 * cfg.speed;
    /* 이동: 손가락 쪽으로 부드럽게 따라가거나, 방향키 */
    let ax = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
    let ay = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    if (target) { const dx = target.x - me.x, dy = target.y - me.y, l = Math.hypot(dx, dy), f = Math.min(1, l / (u * 0.15));
      if (l > 4) { ax = dx / l * f; ay = dy / l * f; } }
    const k = 1 - Math.exp(-dt * 9);
    me.vx += (ax * sp - me.vx) * k; me.vy += (ay * sp - me.vy) * k;
    me.x = Math.max(12, Math.min(W - 12, me.x + me.vx * dt)); me.y = Math.max(12, Math.min(H - 12, me.y + me.vy * dt));
    /* 조각 줍기 */
    for (const s of shards) if (!s.got && Math.hypot(s.x - me.x, s.y - me.y) < u * 0.06) {
      s.got = T; const left = shards.filter(q => !q.got).length;
      hooks.say && hooks.say(left ? `빛 조각 ${cfg.shards - left} / ${cfg.shards}` : "모든 빛 조각을 모았다.");
      if (!left) { finish(true); return; }
    }
    /* 그림자: 천천히 떠돌다 가까우면 다가온다 */
    for (const s of shadows) {
      const dx = me.x - s.x, dy = me.y - s.y, l = Math.hypot(dx, dy) || 1;
      if (l < u * 0.4) { s.vx += dx / l * dt * 1.2; s.vy += dy / l * dt * 1.2; }
      const vl = Math.hypot(s.vx, s.vy) || 1; s.vx /= vl; s.vy /= vl;
      const v = u * 0.16 * cfg.speed;
      s.x += s.vx * v * dt; s.y += s.vy * v * dt;
      if (s.x < s.r || s.x > W - s.r) s.vx *= -1;
      if (s.y < s.r || s.y > H - s.r) s.vy *= -1;
      s.x = Math.max(s.r, Math.min(W - s.r, s.x)); s.y = Math.max(s.r, Math.min(H - s.r, s.y));
      if (hurt <= 0 && l < s.r * 0.8 + u * 0.02) {
        life--; hurt = 1.4; me.vx = dx / l * u * 1.4; me.vy = dy / l * u * 1.4;   // 그림자 반대쪽으로 튕겨 난다
        hooks.say && hooks.say(life ? `그림자에 닿았다. 남은 불빛 ${life}` : "불빛이 꺼졌다.");
        if (!life) { finish(false); return; }
      }
    }
    hurt -= dt;
  }
  function finish(win) { state = win ? "win" : "lose"; endAt = T; target = null; setTimeout(() => { if (running && onEnd) onEnd(win); }, 900); }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b0a18"); g.addColorStop(0.6, "#17153a"); g.addColorStop(1, "#262352");
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!me) return;
    const u = U();
    /* 그림자: 빛을 먹는 어둠 (가장자리만 남보라로 번진다) */
    for (const s of shadows) {
      const R = s.r * 1.7 * (1 + 0.08 * Math.sin(T * 1.7 + s.ph));
      const rg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      rg.addColorStop(0, "rgba(4,3,12,.95)"); rg.addColorStop(0.45, "rgba(8,6,22,.85)"); rg.addColorStop(0.75, "rgba(110,70,200,.22)"); rg.addColorStop(1, "rgba(110,70,200,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    /* 빛 조각: 결정 모양 */
    for (const s of shards) {
      const t = s.got ? Math.min(1, (T - s.got) / 0.5) : 0;
      if (t >= 1) continue;
      const sz = u * 0.032 * (1 + t * 1.5), a = 1 - t, bob = Math.sin(T * 1.6 + s.ph) * u * 0.008;
      ctx.globalAlpha = a * (0.75 + 0.25 * Math.sin(T * 2.4 + s.ph));
      ctx.drawImage(s.rgb === Y ? GY : GM, s.x - sz * 2.4, s.y + bob - sz * 2.4, sz * 4.8, sz * 4.8);
      ctx.globalAlpha = a;
      ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(Math.sin(T * 0.7 + s.ph) * 0.3);
      ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.45, 0); ctx.lineTo(0, sz * 0.8); ctx.lineTo(-sz * 0.45, 0); ctx.closePath();
      ctx.fillStyle = `rgba(${s.rgb},.9)`; ctx.fill(); ctx.restore();
    }
    /* 이야기 지도처럼, 나에게서 가장 가까운 조각으로 이어지는 노랑 · 하늘색 두 가닥 (길 안내) */
    let next = null, nd = 1e9;
    for (const s of shards) if (!s.got) { const d = Math.hypot(s.x - me.x, s.y - me.y); if (d < nd) { nd = d; next = s; } }
    if (next && state === "play") {
      ctx.globalAlpha = 1;
      const dx = next.x - me.x, dy = next.y - me.y, l = Math.hypot(dx, dy) || 1;
      [[Y, 0], [M, Math.PI]].forEach(([rgb, ph]) => {
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const t = i / 24, o = Math.sin(t * 9 + T * 3 + ph) * 4 * Math.sin(t * Math.PI);
          const px = me.x + dx * t - dy / l * o, py = me.y + dy * t + dx / l * o; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.strokeStyle = `rgba(${rgb},.2)`; ctx.lineWidth = 1.4; ctx.stroke();
      });
    }
    /* 나: 노란 심 + 하늘색 테두리. 다치면 잠깐 흐려진다 (깜빡이지 않고 부드럽게) */
    const fade = state === "lose" ? Math.max(0, 1 - (T - endAt) * 1.2) : 1;
    const dim = hurt > 0 ? 0.6 + 0.4 * (1 - hurt / 1.4) : 1;
    const r = u * (0.03 + 0.008 * life);
    ctx.globalAlpha = fade * dim;
    ctx.drawImage(GM, me.x - r * 3, me.y - r * 3, r * 6, r * 6);
    ctx.drawImage(GY, me.x - r * 1.6, me.y - r * 1.6, r * 3.2, r * 3.2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    if (state === "play") step(dt);
    draw();
  }

  return {
    start(game, done) {
      cfg = Object.assign({ shards: 4, shadows: 2, speed: 1 }, game || {});
      if (REDUCED) cfg.speed *= 0.75;
      onEnd = done; resize(); layout(); state = "play"; T = 0;
      if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    life: () => life,
    debug: () => ({ me, shards, shadows, state }),
    stop() { running = false; cancelAnimationFrame(raf); state = "idle"; target = null; keys = {}; }
  };
}
