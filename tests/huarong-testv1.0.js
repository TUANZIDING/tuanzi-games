// node tests/huarong-testv1.0.js
global.window = {};
require('../games/huarongv1.0.js');
const G = window.TZGAMES.huarong;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
const now = () => Number(process.hrtime.bigint()) / 1e6;
const keyOf = s => E.keyOfPieces(E.parseLayout(s).pieces);
const HDLM = 'aCCbaCCbcGGdcssds..s';
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

console.log('注册信息');
ok(G.id === 'huarong' && G.name === '华容道' && G.tagline === '把曹操从下面的出口救出去', 'id/name/tagline');
ok(G.levels.join() === '新手,入门,进阶,大师', '4 个难度');
ok(G.sides.length === 1 && G.sides[0] === '单人', 'sides 单人');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('布局合法性');
{
  let allLegal = true, allCover = true, stdSet = true, starterSet = true;
  E.LAYOUTS.forEach((L, lv) => L.forEach(([s]) => {
    const p = E.parseLayout(s);
    if (p.error) { allLegal = false; console.log('    ' + s + ' → ' + p.error); return; }
    const cov = new Array(20).fill(0);
    p.pieces.forEach(pc => E.COVER[pc.shape][pc.cell].forEach(c => cov[c]++));
    if (cov.some(x => x > 1)) allCover = false;
    const cnt = [0, 0, 0, 0, 0]; p.pieces.forEach(pc => cnt[pc.shape]++);
    const empties = cov.filter(x => !x).length;
    if (lv >= 1 && (cnt.join() !== '0,1,1,4,4' || empties !== 2)) stdSet = false;
    if (lv === 0 && (cnt[1] !== 1 || cnt[2] > 1 || cnt[3] > 4 || cnt[4] > 4)) starterSet = false;
    // 名字：曹操 2×2、关羽横 2×1、张赵马黄竖 1×2、卒 1×1
    p.pieces.forEach(pc => { const want = { 曹操: 1, 关羽: 2, 张飞: 3, 赵云: 3, 马超: 3, 黄忠: 3, 卒: 4 }[pc.name]; if (want !== pc.shape) allLegal = false; });
  }));
  ok(allLegal, '全部 ' + E.LAYOUTS.reduce((a, l) => a + l.length, 0) + ' 个布局可解析、名字与形状对应');
  ok(allCover, '无重叠');
  ok(stdSet, '入门/进阶/大师：标准 10 子（1 曹操 1 关羽 4 竖将 4 卒，2 空格）');
  ok(starterSet, '新手：简化开局，子数不超过标准');
  ok(E.LAYOUTS.every(L => L.length >= 6), '每档 ≥ 6 题（' + E.LAYOUTS.map(l => l.length).join('/') + '）');
  ok(E.LAYOUTS[3][0][0] === HDLM && E.layoutName(3, 0) === '横刀立马', '大师第 1 题是经典横刀立马');
  ok(!!E.parseLayout('aCCbaCCbcGGdcssds..').error && !!E.parseLayout('aCCbaCCbcGGdcssds.s.s'.slice(0, 20).replace('G', 's')).error && !!E.parseLayout('aaCbaCCbcGGdcssds..s').error && !!E.parseLayout('.s..................').error, '错误布局能被识别（长度/形状/缺曹操）');
}

console.log('计步口径与走法');
{
  const k = keyOf(HDLM), buf = new Array(64), n = E.expand(k, buf);
  ok(n === 8, '横刀立马开局 8 种走法（4 卒各两种落点，含拐弯）：' + n);
  const g = new E.Game('aCCbaCCbcGGdcs.d...s');
  const r = g.reach(g.pieceAt(13)), L = r.find(x => x.cell === 16);
  ok(L && L.path.join() === '13,17,16', '卒可沿 L 形路线滑到 (5,1)，算 1 步');
  ok(g.move(g.pieceAt(13), 16) && g.moves() === 1, 'L 形滑动后步数 = 1');
  ok(g.move(g.pieceAt(19), 17) && g.moves() === 2, '另一枚卒一次滑两格，步数 = 2');
  ok(g.move(g.pieceAt(0), 4) === null && g.moves() === 2, '撞子/越界是非法走法');
  const caoSame = keyOf('aCCbaCCbcGGdcssds..s') === keyOf('bCCabCCadGGcdsscs..s');
  ok(caoSame, '同形棋子互换视为同一状态（状态哈希）');
}

console.log('最少步数（BFS 复核，piece-move 口径：一枚棋子一次连续滑动=1 步）');
const opts = [];
E.LAYOUTS.forEach((L, lv) => {
  const ds = [], bad = [];
  let maxMs = 0;
  L.forEach(([s, opt], i) => {
    const t = now(), r = E.solve(keyOf(s)), ms = now() - t; maxMs = Math.max(maxMs, ms);
    ds.push(r ? r.dist : -1);
    if (!r || r.dist !== opt) bad.push(i + ':' + (r && r.dist) + '≠' + opt);
  });
  opts.push(ds);
  ok(!bad.length, G.levels[lv] + '：全部可解且最少步数正确 [' + ds.join(', ') + ']（最慢 ' + maxMs.toFixed(1) + 'ms）' + (bad.length ? ' 错：' + bad.join(' ') : ''));
});
ok(opts[3][0] === 81, '横刀立马最少 81 步');
ok(Math.max(...opts[0]) <= 20 && Math.min(...opts[1]) >= 20 && Math.max(...opts[1]) <= 40 && Math.min(...opts[2]) >= 40 && Math.max(...opts[2]) <= 80 && Math.min(...opts[3]) >= 81, '难度区间：新手 ≤20、入门 20–40、进阶 40–80、大师 ≥81');
ok(opts.every((d, i) => i === 0 || Math.min(...d) > Math.max(...opts[i - 1])), '难度严格递增，档间不重叠');
ok(opts.every(d => d.every((x, i) => i === 0 || x > d[i - 1])), '每档内题目由易到难');
ok(new Set(E.LAYOUTS.flat().map(x => keyOf(x[0]))).size === E.LAYOUTS.flat().length, '没有重复局面');

console.log('提示 = 最优一步');
{
  let good = true, cnt = 0, maxMs = 0;
  const rng = mulberry32(42);
  E.LAYOUTS.forEach(L => L.forEach(([s]) => {
    for (let trial = 0; trial < 3; trial++) {
      const g = new E.Game(s);
      const walk = (rng() * 25) | 0;
      for (let w = 0; w < walk; w++) {
        const movable = g.pieces.map(p => p.id).filter(id => g.reach(id).length);
        const pid = movable[(rng() * movable.length) | 0], rr = g.reach(pid);
        g.move(pid, rr[(rng() * rr.length) | 0].cell);
      }
      if (g.won()) continue;
      g.cache = null;
      const t = now(), h = g.hint(), ms = now() - t; maxMs = Math.max(maxMs, ms);
      const before = E.solve(g.key()).dist;
      if (!h || h.remaining !== before) { good = false; continue; }
      g.move(h.pid, h.to);
      const after = E.solve(g.key()).dist;
      if (after !== before - 1) good = false;
      cnt++;
    }
  }));
  ok(good, cnt + ' 个随机局面：提示的那步让剩余最少步数恰好减 1，「离最优解还差 K 步」的 K 正确（最慢 ' + maxMs.toFixed(1) + 'ms）');
  const g = new E.Game(HDLM);
  let steps = 0, t0 = now();
  while (!g.won() && steps < 200) { const h = g.hint(); g.move(h.pid, h.to); steps++; }
  ok(g.won() && steps === 81, '一路照提示走，横刀立马 81 步通关（含路径缓存，共 ' + (now() - t0).toFixed(0) + 'ms）');
}

console.log('撤销');
{
  const g = new E.Game(HDLM), k0 = g.key();
  const s1 = g.pieceAt(16); g.move(s1, 17);
  const k1 = g.key();
  const s2 = g.pieceAt(19); g.move(s2, 18);
  ok(g.moves() === 2, '走两步计 2');
  let u = g.undo(); ok(u && g.key() === k1 && g.moves() === 1, '撤销一步回到上一局面');
  u = g.undo(); ok(u && g.key() === k0 && g.moves() === 0, '再撤销回到开局');
  ok(g.undo() === null, '无步可撤时返回 null');
  g.move(s1, 17); g.move(s1, 18);
  ok(g.moves() === 1, '同一枚棋子连着滑合并为 1 步');
  g.move(s1, 16);
  ok(g.moves() === 0 && g.key() === k0, '滑回原处等于没走（0 步）');
  g.move(s1, 18); g.move(g.pieceAt(13), 17);
  const kb = g.key(); g.move(g.pieceAt(14), 13);
  u = g.undo(); ok(u && g.key() === kb && u.path[0] === u.from && u.path[u.path.length - 1] === u.to, '撤销返回可动画的路径');
}

console.log('胜负判定');
{
  const g = new E.Game('aGGbassbcCCdcCCd.ss.');
  ok(!g.won(), '曹操未到出口不算赢');
  g.move(g.pieceAt(17), 16); ok(!g.won(), '挪开一个卒仍未赢');
  g.move(g.pieceAt(18), 19); g.move(g.pieceAt(9), 13);
  ok(g.won() && g.moves() === 3, '曹操占据底部中间 2×2 → 胜利（3 步）');
  ok(!E.isGoal(keyOf('.CC..CC......GG..ss.')) && !E.isGoal(keyOf('.CC..CC......s......')), '其它棋子在出口不算赢');
  ok(E.isGoal(keyOf('....GG...ss..CC..CC.')), '只有曹操在 (4,2)-(5,3) 才算到达');
  ok(E.solve(keyOf('....GG...ss..CC..CC.')).dist === 0, '已在出口：最少 0 步');
}

console.log('求解速度（手机目标 < 300ms；Node 上应远低于此）');
{
  let worst = 0, worstName = '', worstStates = 0;
  E.LAYOUTS.forEach((L, lv) => L.forEach(([s], i) => {
    const t = now(), n = E.componentSize(keyOf(s)), ms = now() - t;
    if (ms > worst) { worst = ms; worstName = G.levels[lv] + ' ' + E.layoutName(lv, i); worstStates = n; }
  }));
  ok(worst < 120, '最坏情况（搜完整个连通图）' + worst.toFixed(1) + 'ms · ' + worstStates + ' 个状态 · ' + worstName);
  const t = now(); for (let i = 0; i < 5; i++) E.solve(keyOf(HDLM)); const avg = (now() - t) / 5;
  ok(avg < 60, '横刀立马从开局求解平均 ' + avg.toFixed(1) + 'ms（' + E.solve(keyOf(HDLM)).states + ' 个状态）');
  ok(E.componentSize(keyOf(HDLM)) === 25955, '横刀立马连通图 25955 个状态（与文献一致）');
}

/* —— 极简 DOM 桩：只为跑通 mount/demo/destroy 和点按走子 —— */
function makeDom() {
  function El(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.style = {}; this.listeners = {}; this._cls = []; this.textContent = ''; this._html = '';
    const self = this;
    this.classList = {
      add: (...c) => c.forEach(x => { if (!self._cls.includes(x)) self._cls.push(x); }),
      remove: (...c) => { self._cls = self._cls.filter(x => !c.includes(x)); },
      contains: c => self._cls.includes(c),
      toggle: (c, on) => { if (on === undefined) on = !self._cls.includes(c); on ? self.classList.add(c) : self.classList.remove(c); return on; }
    };
  }
  El.prototype = {
    get className() { return this._cls.join(' '); }, set className(v) { this._cls = String(v).split(/\s+/).filter(Boolean); },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; if (v === '') this.children.forEach(c => c.parentNode = null), this.children = []; },
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; }, getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); },
    fire(t, ev) { ev.target = ev.target || this; ev.preventDefault = () => {}; (this.listeners[t] || []).slice().forEach(f => f(ev)); },
    closest(sel) { const c = sel.slice(1); let e = this; while (e) { if (e._cls && e._cls.includes(c)) return e; e = e.parentNode; } return null; },
    querySelector() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 500 }; },
    setPointerCapture() {}, releasePointerCapture() {},
    get offsetWidth() { return 1; }
  };
  const head = new El('head');
  global.document = { head, createElement: t => new El(t), createElementNS: (ns, t) => new El(t), querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  return El;
}
function find(root, cls, out = []) { if (root._cls && root._cls.includes(cls)) out.push(root); root.children.forEach(c => find(c, cls, out)); return out; }
function tapCell(g, h) {
  return E.COVER[g.pieces[h.pid].shape][h.to].find(c => {
    if (g.pieceAt(c) >= 0) return false;
    let best = null; g.reach(h.pid).forEach(x => { if (x.cover.includes(c) && (!best || x.path.length < best.path.length)) best = x; });
    return best && best.cell === h.to;
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('界面冒烟（DOM 桩）');
  const El = makeDom();
  const el = new El('div'), log = { status: [], sounds: [], end: null };
  const ctrl = G.mount(el, { level: 0, onStatus: t => log.status.push(t), onEnd: r => { log.end = r; }, sound: n => log.sounds.push(n) });
  const board = find(el, 'huarong-board')[0];
  const wrap = find(el, 'huarong-wrap')[0];
  ok(!!board && find(el, 'huarong-piece').length === 3 && find(el, 'huarong-gate').length === 1 && find(el, 'huarong-next').length === 1, '渲染出棋盘、3 枚棋子、出口、换一题按钮');
  ok(document.head.children.some(s => (s.textContent || '').includes('calc(var(--bw,min(92vw,560px)) * .8)')), '宽度 calc(var(--bw,min(92vw,560px)) * .8)，样式由 JS 注入');
  ok(/最少 3 步/.test(log.status[0]), '开局提示最少步数：' + log.status[0]);
  // 用点按（先点棋子、再点空格）照最优解走完新手第 1 题
  const twin = new E.Game(E.LAYOUTS[0][0][0]);
  const pieceEl = id => find(el, 'huarong-piece').find(p => p.getAttribute('data-p') === String(id));
  const center = cell => ({ x: (cell % 4) * 100 + 50, y: ((cell / 4) | 0) * 100 + 50 });
  let pid = 1;
  function tapAt(target, x, y) { board.fire('pointerdown', { target, pointerId: pid, clientX: x, clientY: y }); board.fire('pointerup', { target, pointerId: pid++, clientX: x, clientY: y }); }
  ctrl.hint();
  ok(/离最优解还差 3 步/.test(log.status[log.status.length - 1]) && find(el, 'huarong-arrow').length === 1 && find(el, 'huarong-ghost').length === 1, '提示：箭头 + 目标虚框 + 「离最优解还差 3 步」');
  // 先走一步再撤销
  {
    const h = twin.hint(), cover = tapCell(twin, h);
    tapAt(pieceEl(h.pid), 0, 0); tapAt(board, center(cover).x, center(cover).y);
    await sleep(500);
    ok(log.sounds.includes('move') && /已走 1 步/.test(log.status[log.status.length - 1]), '点棋子再点空格走子，步数 +1，播放 move 音');
    ctrl.undo(); await sleep(500);
    ok(/已撤销 · 已走 0 步/.test(log.status[log.status.length - 1]), 'undo() 撤回');
  }
  // 选一个能唯一指向目标位置的空格（点空格时按最短路径挑落点）
  while (!twin.won()) {
    const h = twin.hint(), cover = tapCell(twin, h);
    if (cover === undefined) { console.log('    (无法用单击唯一指定，跳过)'); break; }
    tapAt(pieceEl(h.pid), 0, 0); tapAt(board, center(cover).x, center(cover).y);
    twin.move(h.pid, h.to);
    await sleep(450);
  }
  await sleep(2500);
  ok(log.end && log.end.winner === 'player' && log.end.reason === '用了 3 步（最少 3 步）', '通关 → onEnd ' + JSON.stringify(log.end));
  ctrl.restart();
  ok(/最少 3 步/.test(log.status[log.status.length - 1]), 'restart() 重置本题');
  // 拖动：把曹操之外的卒拖一格
  {
    const g2 = new E.Game(E.LAYOUTS[0][0][0]), s = g2.pieces.find(p => p.shape === 4 && g2.reach(p.id).length), dest = g2.reach(s.id)[0].cell;
    const a = center(s.cell), b = center(dest), t = pieceEl(s.id);
    board.fire('pointerdown', { target: t, pointerId: 99, clientX: a.x, clientY: a.y });
    board.fire('pointermove', { target: board, pointerId: 99, clientX: (a.x + b.x) / 2 + (b.x - a.x) * .2, clientY: (a.y + b.y) / 2 + (b.y - a.y) * .2 });
    board.fire('pointermove', { target: board, pointerId: 99, clientX: b.x, clientY: b.y });
    board.fire('pointerup', { target: board, pointerId: 99, clientX: b.x, clientY: b.y });
    ok(/已走 1 步/.test(log.status[log.status.length - 1]), '拖动走子（一次拖动 = 1 步）');
  }
  const before = find(el, 'huarong-chip')[0].innerHTML;
  find(el, 'huarong-next')[0].fire('click', {});
  ok(find(el, 'huarong-chip')[0].innerHTML !== before && /最少 4 步/.test(log.status[log.status.length - 1]), '换一题 → 下一题（' + find(el, 'huarong-chip')[0].innerHTML.replace(/<\/?b>/g, '') + '）');
  ctrl.destroy();
  ok(el.children.length === 0 && (board.listeners.pointerdown || []).length === 0, 'destroy() 清空并解绑');
  for (let lv = 1; lv < 4; lv++) {
    const e2 = new El('div'), snd = [], st = [], c2 = G.mount(e2, { level: lv, sound: n => snd.push(n), onStatus: t => st.push(t) });
    if (lv === 3) { // 横刀立马开局曹操被围住：点它 → illegal
      const b2 = find(e2, 'huarong-board')[0], cao = find(e2, 'huarong-t1')[0];
      b2.fire('pointerdown', { target: cao, pointerId: 7, clientX: 150, clientY: 100 }); b2.fire('pointerup', { target: cao, pointerId: 7, clientX: 150, clientY: 100 });
      ok(snd[snd.length - 1] === 'illegal' && /四周没空格/.test(st[st.length - 1]), '点被围住的曹操：illegal 音 + 提示「' + st[st.length - 1] + '」');
    }
    c2.hint(); c2.destroy();
  }
  ok(true, '四个难度都能 mount/hint/destroy');

  const del = new El('div'), caps = []; let doneFired = false;
  const d = G.demo(del, { onCaption: c => caps.push(c), onDone: () => { doneFired = true; } });
  await sleep(20000);
  ok(doneFired && caps.length === 6 && caps.every(c => c.length <= 40), '演示 6 步并结束：' + caps.join(' / '));
  d.stop();
  const del2 = new El('div'), d2 = G.demo(del2, { onCaption() {}, onDone() { doneFired = 'again'; } });
  d2.stop(); await sleep(200);
  ok(doneFired !== 'again', 'stop() 清掉全部定时器');

  console.log('\n' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
