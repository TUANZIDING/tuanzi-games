// node tests/sudoku-testv1.0.js
global.window = {};
require('../games/sudokuv1.0.js');
const G = window.TZGAMES.sudoku;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
function validFull(g) {
  for (const U of E.UNITS) { let m = 0; for (const c of U) { if (!g[c]) return false; m |= 1 << g[c]; } if (m !== 0x3FE) return false; }
  return true;
}
function agrees(p, s) { for (let i = 0; i < 81; i++) if (p[i] && p[i] !== s[i]) return false; return true; }
const LV = G.levels;

console.log('注册信息');
ok(G.id === 'sudoku' && G.name === '数独' && G.tagline.length <= 14, 'id/name/tagline');
ok(G.levels.join() === '新手,入门,进阶,大师', '4 个难度');
ok(G.sides.length === 1 && G.sides[0] === '单人', 'sides 单人');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('求解器');
{
  const hard = E.parse('8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..'); // Inkala “最难数独”
  const t = Date.now(), s = E.solve(hard), ms = Date.now() - t;
  ok(s && validFull(s) && agrees(hard, s), '解出 Inkala 难题且合法（' + ms + 'ms）');
  ok(E.countSolutions(hard, 2) === 1, 'Inkala 难题唯一解');
  ok(E.countSolutions(new Int8Array(81), 2) === 2, '空盘多解（计数到 2 停）');
  ok(E.countSolutions(s, 2) === 1, '完整盘 = 1 个解');
  const bad = Int8Array.from(hard); bad[1] = 8; ok(E.countSolutions(bad, 2) === 0, '同行重复 → 0 解');
  const two = Int8Array.from(s); // 去掉一个“死矩形”外的多余线索后多解：挖空整盘到只剩 17 行首……简单造：清空两行
  for (let i = 0; i < 18; i++) two[i] = 0; ok(E.countSolutions(two, 2) === 2, '清空前两行 → 多解');
  let allBank = true;
  E.BANK.forEach(L => L.forEach(x => { const p = E.parse(x), sol = E.solve(p); if (!sol || !validFull(sol) || !agrees(p, sol)) allBank = false; }));
  ok(allBank, '备用题库 40 题全部解出且合法');
}

console.log('备用题库');
E.BANK.forEach((L, lv) => {
  const uniq = L.every(x => E.countSolutions(E.parse(x), 2) === 1);
  const gv = L.every(x => E.countGivens(E.parse(x)) === E.LEVEL_GIVENS[lv]);
  const rt = L.every(x => E.rate(E.parse(x)) === E.LEVEL_PREF[lv][0]);
  ok(L.length === 10 && uniq && gv && rt, LV[lv] + '：10 题，唯一解，给数 ' + E.LEVEL_GIVENS[lv] + '，评级 ' + E.LEVEL_PREF[lv][0]);
});

console.log('生成器（每档 20 题，独立验证唯一解）');
const samples = [[], [], [], []];
for (let lv = 0; lv < 4; lv++) {
  let uniq = true, solOk = true, gvOk = true, prefOk = true, maxMs = 0, sum = 0, bank = 0;
  const rates = {}, gvs = {};
  for (let k = 0; k < 20; k++) {
    const r = E.generate(lv, { rng: E.mulberry32(9000 + lv * 100 + k), budgetMs: 600 });
    maxMs = Math.max(maxMs, r.ms); sum += r.ms; if (r.source === 'bank') bank++;
    if (E.countSolutions(r.puzzle, 2) !== 1) uniq = false;
    const s2 = E.solve(r.puzzle);
    if (!validFull(r.solution) || !agrees(r.puzzle, r.solution) || s2.join() !== r.solution.join()) solOk = false;
    if (r.givens < E.LEVEL_GIVENS[lv] || r.givens > E.LEVEL_GIVENS[lv] + E.LEVEL_TOL[lv]) gvOk = false;
    if (E.LEVEL_PREF[lv].indexOf(r.rating) < 0 || E.rate(r.puzzle) !== r.rating) prefOk = false;
    rates[r.rating] = (rates[r.rating] || 0) + 1; gvs[r.givens] = (gvs[r.givens] || 0) + 1;
    samples[lv].push(r);
  }
  ok(uniq, LV[lv] + '：20/20 唯一解');
  ok(solOk, LV[lv] + '：解与题面一致、合法');
  ok(gvOk, LV[lv] + '：给数 ' + JSON.stringify(gvs));
  ok(prefOk, LV[lv] + '：技巧评级 ' + JSON.stringify(rates) + '（1=显性唯一 2=需隐性唯一 3=更高）');
  ok(maxMs < 200, LV[lv] + '：平均 ' + (sum / 20).toFixed(1) + 'ms，最慢 ' + maxMs.toFixed(1) + 'ms（手机按 ~5× 估算仍 <800ms），备用题库 ' + bank + ' 次');
  if (lv >= 2) ok(samples[lv].every(r => r.rating >= 2), LV[lv] + '：全部需要超过显性唯一的技巧');
}
{
  // 极小预算 → 用备用题库
  const r = E.generate(3, { rng: E.mulberry32(1), budgetMs: 0.0001 });
  ok(r.source === 'bank' && E.countSolutions(r.puzzle, 2) === 1, '预算耗尽时回退到备用题库');
}

console.log('提示');
{
  let steps = 0, wrong = 0, logicBad = 0, reveals = 0, kinds = {};
  for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 5; k++) {
    const r = samples[lv][k], g = Int8Array.from(r.puzzle);
    let guard = 0;
    while (g.some(v => !v) && guard++ < 81) {
      const h = E.findHint(g, r.solution); steps++;
      kinds[h.kind] = (kinds[h.kind] || 0) + 1;
      if (h.digit !== r.solution[h.cell] || g[h.cell]) wrong++;
      const bit = 1 << h.digit, mk = E.candMask(g, h.cell);
      if (h.kind === 'naked' && E.POP[mk] !== 1) logicBad++;
      if (h.kind === 'full' && E.UNITS[h.unit].filter(c => !g[c]).length !== 1) logicBad++;
      if (h.kind === 'hidden' && E.UNITS[h.unit].filter(c => E.candMask(g, c) & bit).length !== 1) logicBad++;
      if (h.kind === 'reveal') reveals++;
      if (!h.reason || h.reason.length > 34) logicBad++;
      g[h.cell] = h.digit;
    }
    if (g.join() !== r.solution.join()) wrong++;
  }
  ok(wrong === 0, '连续提示 ' + steps + ' 步全部正确，并能解完 20 题');
  ok(logicBad === 0, '单一技巧理由与盘面相符 ' + JSON.stringify(kinds));
  const r0 = samples[0][0], g0 = Int8Array.from(r0.puzzle);
  const h0 = E.findHint(g0, r0.solution);
  ok(h0.kind !== 'reveal', '新手题第一步提示是单一技巧：「' + h0.reason + '」');
  // 构造“第 5 行只剩 7”
  const s = r0.solution, g1 = Int8Array.from(s); g1[4 * 9 + 3] = 0; const want = s[4 * 9 + 3];
  const h1 = E.findHint(g1, s);
  ok(h1.cell === 39 && h1.kind === 'full' && /只剩/.test(h1.reason), '只剩一格时理由：「' + h1.reason + '」(应为 ' + want + ')');
  const g2 = Int8Array.from(s); g2[0] = 0; g2[1] = 0;
  ok(/已经有|无解/.test(E.mistakeReason(g2, 0, s[1])), '错填理由：「' + E.mistakeReason(g2, 0, s[1]) + '」');
}

/* ---------- 轻量 DOM 模拟：跑一遍 mount / demo ---------- */
function mkEl(tag) {
  const e = {
    tagName: tag.toUpperCase(), children: [], parent: null, attrs: {}, listeners: {}, style: {}, _cls: '', _text: '', isConnected: true,
    get className() { return this._cls; }, set className(v) { this._cls = v; },
    classList: null,
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); },
    set textContent(v) { this._text = String(v); this.children = []; },
    set innerHTML(v) { this.children = []; this._text = String(v).replace(/<[^>]+>/g, ''); },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); },
    closest(sel) { const c = sel.slice(1); let n = this; while (n) { if ((' ' + n._cls + ' ').includes(' ' + c + ' ')) return n; n = n.parent; } return null; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
  };
  e.classList = {
    has: c => (' ' + e._cls + ' ').includes(' ' + c + ' '),
    add(c) { if (!this.has(c)) e._cls = (e._cls + ' ' + c).trim(); },
    remove(c) { e._cls = e._cls.split(' ').filter(x => x && x !== c).join(' '); },
    toggle(c, on) { if (on === undefined) on = !this.has(c); on ? this.add(c) : this.remove(c); return on; },
    contains(c) { return this.has(c); }
  };
  return e;
}
function all(e, pred, out = []) { if (pred(e)) out.push(e); e.children.forEach(c => all(c, pred, out)); return out; }
const docListeners = {};
global.document = {
  hidden: false, head: mkEl('head'), createElement: mkEl, querySelector: () => null,
  addEventListener(t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
  removeEventListener(t, f) { docListeners[t] = (docListeners[t] || []).filter(x => x !== f); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
function fire(el, type, ev = {}) { ev.target = el; ev.preventDefault = () => {}; let n = el; while (n) { (n.listeners[type] || []).forEach(f => f(ev)); n = n.parent; } }

(async () => {
  console.log('界面冒烟（模拟 DOM）');
  const root = mkEl('div'); const statuses = [], sounds = []; let ended = null;
  const ctl = G.mount(root, { level: 3, side: 0, onStatus: t => statuses.push(t), onEnd: r => { ended = r; }, sound: n => sounds.push(n) });
  await sleep(80);
  const cells = all(root, e => e.classList.has('sudoku-cell'));
  const keys = all(root, e => e.classList.has('sudoku-key'));
  const readGrid = () => Int8Array.from(cells.slice().sort((a, b) => a.attrs['data-i'] - b.attrs['data-i']).map(c => +c.children[0]._text || 0));
  ok(cells.length === 81 && keys.length === 11, '81 格 + 9 数字键 + 擦除 + 笔记');
  const g = readGrid(), givens = E.countGivens(g), sol = E.solve(g);
  ok(givens >= 24 && givens <= 26 && sol, '大师题已渲染（给数 ' + givens + '）');
  const byI = i => cells.find(c => +c.attrs['data-i'] === i);
  const key = k => keys.find(b => b.attrs['data-k'] === String(k));
  const e0 = [...g].findIndex(v => !v);
  fire(byI(e0), 'pointerdown');
  ok(byI(e0).classList.has('sudoku-sel'), '点格子 → 选中高亮');
  const wrongD = sol[e0] % 9 + 1;
  fire(key(wrongD), 'click');
  ok(byI(e0).classList.has('sudoku-bad') && sounds.includes('illegal') && /错误 1 次/.test(statuses[statuses.length - 1]), '错数 → 红色抖动 + illegal + 错误 1 次');
  await sleep(800);
  ok(!byI(e0).classList.has('sudoku-bad') && !readGrid()[e0], '错数 0.75 秒后自动清除');
  fire(key('notes'), 'click'); fire(key(sol[e0]), 'click'); fire(key(wrongD), 'click');
  const notesTxt = byI(e0).children[1].textContent;
  ok(notesTxt.includes(String(sol[e0])) && notesTxt.includes(String(wrongD)), '笔记模式写入候选「' + notesTxt + '」');
  fire(key('notes'), 'click');
  // 在同行另一空格填正确数 → 该笔记自动移除
  const peer = E.PEERS[e0].find(p => !g[p] && sol[p] === wrongD);
  if (peer !== undefined) {
    fire(byI(peer), 'pointerdown'); fire(key(wrongD), 'click');
    ok(!byI(e0).children[1].textContent.includes(String(wrongD)) && sounds[sounds.length - 1] === 'move', '填正确数 → move 音，同伴笔记自动划掉');
    ctl.undo();
    ok(!readGrid()[peer] && byI(e0).children[1].textContent.includes(String(wrongD)), '撤销 → 数字和被划掉的笔记都恢复');
  } else ok(true, '（本题无合适同伴格，跳过笔记联动）');
  docListeners.keydown.forEach(f => f({ key: 'ArrowRight', target: {}, preventDefault() {} }));
  ok(cells.some(c => c.classList.has('sudoku-sel')), '方向键移动选中');
  ctl.hint();
  ok(/^💡 /.test(statuses[statuses.length - 1]) && cells.some(c => c.classList.has('sudoku-flash')), '提示：填一格 + 闪烁 + 理由「' + statuses[statuses.length - 1] + '」');
  let n = 0; while (!ended && n++ < 90) ctl.hint();
  await sleep(400);
  ok(ended && ended.winner === 'player' && /^用时 \d\d:\d\d · 错误 1 次$/.test(ended.reason), 'onEnd：' + JSON.stringify(ended));
  ok(readGrid().join() === sol.join(), '终盘等于唯一解');
  ctl.restart(); await sleep(80);
  const g3 = readGrid(); ok(E.countGivens(g3) >= 24 && g3.join() !== sol.join(), 'restart → 同难度新题');
  ctl.destroy();
  ok(root.children.length === 0 && (docListeners.keydown || []).length === 0, 'destroy 清理 DOM 与键盘监听');

  const d = mkEl('div'), caps = []; let doneAt = 0; const t0 = Date.now();
  const origST = global.setTimeout; // 加速演示：时间缩到 1/50
  global.setTimeout = (f, ms) => origST(f, (ms || 0) / 50);
  const dc = G.demo(d, { onCaption: t => caps.push(t), onDone: () => { doneAt = Date.now(); } });
  global.setTimeout = origST;
  await sleep(600);
  ok(doneAt > 0 && caps.length === 6, '演示跑完 ' + caps.length + ' 条字幕');
  ok(caps.every(c => c.length <= 40), '字幕都 ≤40 字');
  console.log('    ' + caps.join(' | '));
  dc.stop();

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
