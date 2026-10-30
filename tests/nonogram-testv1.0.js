// node tests/nonogram-testv1.0.js
global.window = {};
require('../games/nonogramv1.0.js');
const G = window.TZGAMES.nonogram;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
const LV = G.levels;

/* ---------- 独立的参照实现（不依赖引擎）：线索 + 穷举摆法的行求解 ---------- */
function refClues(bits) { const c = []; let r = 0; for (const b of bits) { if (b) r++; else if (r) { c.push(r); r = 0; } } if (r) c.push(r); return c; }
function placements(clue, n) { // 所有合法摆法（0/1 数组）
  const out = [];
  (function rec(j, pos, arr) {
    if (j === clue.length) { out.push(arr.concat(new Array(n - arr.length).fill(0))); return; }
    let rest = 0; for (let t = j; t < clue.length; t++) rest += clue[t] + (t > j ? 1 : 0);
    for (let s = pos; s + rest <= n; s++) {
      const a = arr.concat(new Array(s - arr.length).fill(0), new Array(clue[j]).fill(1));
      if (j < clue.length - 1) a.push(0);
      rec(j + 1, a.length, a);
    }
  })(0, 0, []);
  return out;
}
const placeCache = {};
function refLine(clue, cells) { // cells 0 未知 1 涂 2 叉
  const key = clue.join(',') + '/' + cells.length;
  const all = placeCache[key] || (placeCache[key] = placements(clue, cells.length));
  const ok2 = all.filter(p => p.every((v, i) => !cells[i] || (cells[i] === 1) === (v === 1)));
  if (!ok2.length) return null;
  return cells.map((v, i) => v ? v : ok2.every(p => p[i]) ? 1 : ok2.every(p => !p[i]) ? 2 : 0);
}
function refSolve(rows) {
  const H = rows.length, W = rows[0].length, bits = [];
  rows.forEach(s => { for (const ch of s) bits.push(ch !== '.' ? 1 : 0); });
  const rc = [], cc = [];
  for (let r = 0; r < H; r++) rc.push(refClues(bits.slice(r * W, r * W + W)));
  for (let c = 0; c < W; c++) cc.push(refClues(bits.filter((_, i) => i % W === c)));
  const g = new Array(W * H).fill(0);
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < H; r++) { const l = g.slice(r * W, r * W + W), o = refLine(rc[r], l); if (!o) return null; o.forEach((v, c) => { if (v !== l[c]) { g[r * W + c] = v; changed = true; } }); }
    for (let c = 0; c < W; c++) { const l = []; for (let r = 0; r < H; r++) l.push(g[r * W + c]); const o = refLine(cc[c], l); if (!o) return null; o.forEach((v, r) => { if (v !== l[r]) { g[r * W + c] = v; changed = true; } }); }
  }
  return { g, bits, rc, cc, W, H };
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

console.log('注册信息');
ok(G.id === 'nonogram' && G.name === '数织' && G.tagline === '按数字线索涂格子，涂出一幅画', 'id/name/tagline');
ok(G.levels.join() === '新手,入门,进阶,大师', '4 个难度');
ok(G.sides.length === 1 && G.sides[0] === '单人', 'sides 单人');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('题库');
const PUZ = E.BANK.map(L => L.map(p => E.parsePuzzle(p)));
E.BANK.forEach((L, lv) => {
  const n = E.SIZES[lv];
  const shape = L.every(p => p.r.length === n && p.r.every(s => s.length === n && /^[.a-z]+$/.test(s)));
  const titles = new Set(L.map(p => p.t));
  const colors = L.every(p => p.r.join('').replace(/\./g, '').split('').every(ch => /^#[0-9a-f]{6}$/i.test(E.PAL[ch] || '')));
  ok(L.length >= 8 && shape && titles.size === L.length && colors, LV[lv] + '：' + L.length + ' 幅 ' + n + '×' + n + '，标题不重复，颜色合法（' + L.map(p => p.t).join('、') + '）');
  let clueOk = true, sumOk = true, notTrivial = true;
  L.forEach((p, i) => {
    const P = PUZ[lv][i], ref = refSolve(p.r);
    if (JSON.stringify(P.rc) !== JSON.stringify(ref.rc) || JSON.stringify(P.cc) !== JSON.stringify(ref.cc)) clueOk = false;
    const s1 = P.rc.flat().reduce((a, b) => a + b, 0), s2 = P.cc.flat().reduce((a, b) => a + b, 0);
    if (s1 !== s2 || s1 !== P.total || P.total === 0 || P.total === P.n) sumOk = false;
    if (P.rc.every(c => c.reduce((a, b) => a + b, 0) + c.length - 1 === n || !c.length)) notTrivial = false;
  });
  ok(clueOk, LV[lv] + '：行/列线索与参照实现一致');
  ok(sumOk && notTrivial, LV[lv] + '：行列线索总和相等、非空非满、不是每行都“满行直接涂”');
});

console.log('行列逻辑唯一解（参照求解器独立验证，不允许猜）');
E.BANK.forEach((L, lv) => {
  const bad = [];
  L.forEach((p, i) => {
    const ref = refSolve(p.r);
    const solved = ref && ref.g.every((v, k) => v === (ref.bits[k] ? 1 : 2));
    const mine = E.isLineSolvable(PUZ[lv][i]);
    if (!solved || !mine) bad.push(p.t);
  });
  ok(!bad.length, LV[lv] + '：' + (L.length - bad.length) + '/' + L.length + ' 幅只靠行列推理即可唯一解出' + (bad.length ? '（失败：' + bad.join('、') + '）' : ''));
});

console.log('单行推理');
{
  ok(JSON.stringify(E.solveLine([4], [0, 0, 0, 0, 0])) === '[0,1,1,1,0]', '[4] 放 5 格 → 中间 3 格必涂');
  ok(JSON.stringify(E.solveLine([3, 1], [0, 0, 0, 0, 0])) === '[1,1,1,2,1]', '[3 1] 放 5 格 → 正好占满');
  ok(JSON.stringify(E.solveLine([], [0, 0, 0])) === '[2,2,2]', '线索 0 → 全叉');
  ok(E.solveLine([2], [1, 2, 1, 0]) === null, '矛盾 → null');
  ok(JSON.stringify(E.solveLine([2], [0, 0, 1, 0, 0])) === '[2,0,1,0,2]', '[2] 已涂中间一格 → 两头打叉');
  const rng = mulberry32(7); let agree = 0, total = 0;
  for (let t = 0; t < 4000; t++) {
    const n = 1 + (rng() * 12 | 0), bits = []; for (let i = 0; i < n; i++) bits.push(rng() < 0.55 ? 1 : 0);
    const clue = refClues(bits), cells = bits.map(b => { const x = rng(); return x < 0.6 ? 0 : (b ? 1 : 2); });
    if (rng() < 0.15) { const k = rng() * n | 0; cells[k] = cells[k] === 1 ? 2 : 1; } // 偶尔造矛盾
    total++;
    if (JSON.stringify(E.solveLine(clue, cells)) === JSON.stringify(refLine(clue, cells))) agree++;
  }
  ok(agree === total, '随机 ' + total + ' 条线与穷举参照完全一致（含矛盾情况）');
}

console.log('提示（从空盘一路提示到完成，每一步都要正确且可推出）');
{
  let steps = 0, wrong = 0, nonLogic = 0, badReason = 0, unsolved = 0, longest = '';
  PUZ.forEach(L => L.forEach(P => {
    const bd = new E.Board(P); let guard = 0;
    while (!bd.won() && guard++ < P.n + 5) {
      const before = Array.from(bd.st), h = bd.hint(); steps++;
      if (!h || h.kind !== 'logic') { nonLogic++; break; }
      h.cells.forEach(i => { if (before[i] !== 0 || (h.v === 1) !== (P.sol[i] === 1)) wrong++; });
      // 推理必须来自那一条线本身
      const line = E.getLine(before, P, h.line), o = refLine(E.lineClue(P, h.line), line);
      h.cells.forEach(i => { const k = h.line < P.h ? i % P.w : (i / P.w | 0); if (o[k] !== h.v) wrong++; });
      if (!h.reason || h.reason.length > 40) badReason++;
      if (h.reason.length > longest.length) longest = h.reason;
    }
    if (!bd.won()) unsolved++;
  }));
  ok(wrong === 0 && nonLogic === 0 && unsolved === 0, '37 幅全部靠提示解完，共 ' + steps + ' 次提示，每格都对且都由该行/列推出');
  ok(badReason === 0, '理由都在 40 字内，最长：「' + longest + '」');
  // 随机打了一些正确标记后再提示
  const rng = mulberry32(42); let ok2 = true;
  PUZ.forEach(L => L.forEach(P => {
    const bd = new E.Board(P);
    for (let i = 0; i < P.n; i++) if (rng() < 0.3) bd.st[i] = P.sol[i] ? 1 : 2;
    let g = 0; while (!bd.won() && g++ < P.n + 5) { const h = bd.hint(); if (!h || h.kind !== 'logic' || h.cells.some(i => (h.v === 1) !== !!P.sol[i])) { ok2 = false; break; } }
    if (!bd.won()) ok2 = false;
  }));
  ok(ok2, '随机已有 30% 正确标记时，提示同样一路正确');
  // 具体理由
  const T = E.parsePuzzle({ t: '测试', r: ['.####', '#.#.#', '#####', '.....', '##.##'] });
  const h1 = E.findHint(new Uint8Array(25), T);
  ok(h1.reason.indexOf('满') >= 0 && h1.v === 1 && h1.cells.length === 5, '满行：「' + h1.reason + '」');
  const st = new Uint8Array(25); [10, 11, 12, 13, 14].forEach(i => st[i] = 1); for (let c = 0; c < 5; c++) { st[c * 5 + 0] = st[c * 5 + 0] || 0; }
  const d1 = E.describe(T, 0, [0, 0, 0, 0, 0], [1, 2, 3], 1);
  ok(d1 === '第 1 行的 4 在 5 格里，中间 3 格一定要涂', '重叠法：「' + d1 + '」');
  const d2 = E.describe(T, 3, [0, 0, 0, 0, 0], [0, 1, 2, 3, 4], 2);
  ok(/是 0/.test(d2), '空行：「' + d2 + '」');
  const d3 = E.describe(T, 1, [1, 0, 1, 0, 1], [1, 3], 2);
  ok(/涂齐/.test(d3), '涂齐后打叉：「' + d3 + '」');
  const wrongX = new Uint8Array(25); wrongX[1] = 2;
  const h2 = E.findHint(wrongX, T);
  ok(h2.kind === 'fix' && h2.cells[0] === 1 && h2.v === 1, '打错的叉先纠正：「' + h2.reason + '」');
}

console.log('棋盘：填错、撤销、胜负');
{
  const P = PUZ[0].find(p => p.t === '团子'); // .ppp./ppppp/p.p.p/ppppp/.ppp.
  const bd = new E.Board(P);
  bd.begin(); ok(bd.fill(1) === 'ok' && bd.st[1] === 1, '涂对 → 涂上');
  ok(bd.fill(0) === 'bad' && bd.st[0] === 2 && bd.mistakes === 1, '涂错 → 记 1 次错误并自动变 ×');
  ok(bd.fill(0) === 'skip', '已有 × 的格子不会被涂色笔画覆盖');
  bd.end();
  bd.begin(); [5, 6, 7, 8, 9].forEach(i => bd.fill(i)); bd.end();
  ok(bd.filled() === 6, '一笔拖动涂 5 格');
  const u = bd.undo(); ok(u && u.length === 5 && bd.filled() === 1, '撤销 = 整笔撤销（5 格一起退回）');
  const u2 = bd.undo(); ok(u2.length === 2 && bd.st[0] === 0 && bd.st[1] === 0 && bd.mistakes === 1, '再撤销：错格的 × 也退回，错误次数保留');
  ok(bd.undo() === null, '空栈撤销返回 null');
  bd.begin(); bd.cross(0); bd.cross(4); bd.end(); bd.begin(); bd.clear(4, 2); bd.end();
  ok(bd.st[0] === 2 && bd.st[4] === 0, '打叉 / 擦叉');
  ok(!bd.won(), '未完成不算赢');
  for (let i = 0; i < P.n; i++) if (P.sol[i]) { bd.begin(); bd.fill(i); bd.end(); }
  ok(bd.won(), '所有该涂的格子涂满 → 胜利（叉不必打全）');
  ok(Array.from({ length: 10 }, (_, L) => bd.lineDone(L)).every(Boolean), '完成后所有行列线索变灰');
  const b2 = new E.Board(P); b2.st[5] = 1; b2.st[6] = 1;
  ok(!b2.lineDone(1) && b2.lineDone(0) === false, '未满足的行不变灰');
  E.NEXT[1] = -1; const seen = []; for (let k = 0; k < E.BANK[1].length + 1; k++) seen.push(E.pickIndex(1, () => 0.5));
  ok(seen[0] === (E.BANK[1].length * 0.5 | 0) && seen[E.BANK[1].length] === seen[0] && new Set(seen).size === E.BANK[1].length, '换一幅：随机起点后按顺序循环');
}

/* ---------- 轻量 DOM 模拟：跑一遍 mount / demo ---------- */
function mkEl(tag) {
  const e = {
    tagName: tag.toUpperCase(), children: [], parent: null, attrs: {}, listeners: {}, _cls: '', _text: '', isConnected: true,
    style: { setProperty(k, v) { this[k] = v; } },
    get className() { return this._cls; }, set className(v) { this._cls = v; },
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); },
    set textContent(v) { this._text = String(v); this.children = []; },
    set innerHTML(v) { this.children = []; this._text = String(v).replace(/<[^>]+>/g, ''); },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); },
    closest(sel) { const c = sel.slice(1); let n = this; while (n) { if ((' ' + n._cls + ' ').includes(' ' + c + ' ')) return n; n = n.parent; } return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 300, right: 300, bottom: 300 }; },
    setPointerCapture() {}
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
const realST = setTimeout;
global.setTimeout = (f, ms) => realST(f, Math.max(0, (ms || 0) / 40)); // 动画计时加速 40×
const sleep = ms => new Promise(r => realST(r, ms));
function fire(el, type, ev = {}) { ev.target = ev.target || el; ev.preventDefault = () => {}; let n = el; while (n) { (n.listeners[type] || []).forEach(f => f(ev)); n = n.parent; } }

(async function () {
  console.log('界面（模拟 DOM）');
  const host = mkEl('div'), sounds = [], status = [], ends = [];
  E.NEXT[0] = 2; // 团子
  const ctl = G.mount(host, { level: 0, onStatus: s => status.push(s), onEnd: r => ends.push(r), sound: n => sounds.push(n) });
  let S = ctl._state(); const P = S.P, area = S.view.area, W = P.w, cs = 300 / W;
  const at = (r, c) => ({ clientX: (c + 0.5) * cs, clientY: (r + 0.5) * cs, pointerId: 1, button: 0, pointerType: 'touch', target: area });
  ok(P.t === '团子' && S.view.cells.length === 25 && S.view.rowEls.length === 5 && S.view.colEls.length === 5, '画出 5×5 格子 + 行/列线索');
  ok(/nono-c/.test(S.view.cells[0].className) && S.view.board.style['--nono-cs'].indexOf('var(--nono-w)') >= 0, '格宽按 --nono-w（= var(--bw,…)）计算');
  // 拖动第 2 行（全涂）：起点 (1,0) 横向拖到 (1,4)，中途手指偏到下一行也锁定在本行
  fire(area, 'pointerdown', at(1, 0));
  fire(area, 'pointermove', at(1, 2));
  fire(area, 'pointermove', Object.assign(at(2, 4)));
  fire(area, 'pointerup', at(2, 4));
  S = ctl._state();
  ok([5, 6, 7, 8, 9].every(i => S.board.st[i] === 1) && S.board.st[14] === 0, '横向拖动涂满一行，锁定起始方向');
  ok(sounds.filter(s => s === 'move').length >= 1 && sounds.filter(s => s === 'move').length <= 5, '涂对有 move 音效（拖动时节流）');
  ok(S.view.rowEls[1].classList.has('nono-done'), '该行线索变灰');
  ok(S.view.rowEls[2].classList.has('nono-cur') || S.view.rowEls[1].classList.has('nono-cur'), '指针所在行高亮');
  // 竖向拖第 1 列从 (0,0)：第一格就错 → 红、变 ×、本笔停止
  fire(area, 'pointerdown', at(0, 0)); fire(area, 'pointermove', at(1, 0)); fire(area, 'pointermove', at(3, 0)); fire(area, 'pointerup', at(3, 0));
  S = ctl._state();
  ok(S.board.st[0] === 2 && S.board.mistakes === 1 && S.board.st[15] === 0 && sounds.indexOf('illegal') >= 0, '涂错：记错 1 次、自动打叉、illegal 音效、本笔停止');
  ok(S.view.cells[0].className.indexOf('nono-bad') >= 0, '错格先显示红色');
  await sleep(40);
  ok(S.view.cells[0].className.indexOf('nono-x') >= 0, '片刻后变成 ×');
  // 右键 = 打叉
  fire(area, 'pointerdown', Object.assign(at(0, 4), { button: 2, pointerType: 'mouse' })); fire(area, 'pointerup', at(0, 4));
  ok(ctl._state().board.st[4] === 2, '电脑右键直接打叉');
  // 打叉模式 + 横向拖动擦叉
  const crossKey = all(host, e => e.attrs['data-k'] === 'cross')[0];
  fire(crossKey, 'click');
  ok(ctl._state().mode === 2 && crossKey.classList.has('nono-on'), '切换到打叉模式');
  fire(area, 'pointerdown', at(0, 0)); fire(area, 'pointermove', at(0, 4)); fire(area, 'pointerup', at(0, 4));
  ok(ctl._state().board.st[0] === 0 && ctl._state().board.st[4] === 0, '从 × 开始拖动 = 擦掉沿途的 ×');
  ctl.undo();
  ok(ctl._state().board.st[0] === 2 && ctl._state().board.st[4] === 2, '撤销整笔');
  fire(all(host, e => e.attrs['data-k'] === 'fill')[0], 'click');
  // 提示
  const before = Array.from(ctl._state().board.st);
  ctl.hint();
  S = ctl._state();
  const changed = before.map((v, i) => v !== S.board.st[i] ? i : -1).filter(i => i >= 0);
  ok(changed.length > 0 && changed.every(i => (S.board.st[i] === 1) === !!P.sol[i]) && /^💡/.test(status[status.length - 1]), '提示：涂上推得出的格子并说明「' + status[status.length - 1] + '」');
  ok(changed.some(i => S.view.cells[i].className.indexOf('nono-flash') >= 0), '提示格闪烁');
  // 提示到完成
  let g = 0; while (!ctl._state().ended && g++ < 40) ctl.hint();
  S = ctl._state();
  ok(S.ended && S.view.area.classList.has('nono-reveal'), '解完：格子变成彩色图画');
  ok(S.view.cells[1].style['--nono-pc'] === E.PAL.p, '揭晓时每格用自己的颜色');
  await sleep(120);
  ok(ends.length === 1 && ends[0].winner === 'player' && /^《团子》 · 用时 \d\d:\d\d · 错误 1 次$/.test(ends[0].reason), 'onEnd：' + JSON.stringify(ends[0]));
  ok(sounds.indexOf('win') >= 0 && S.view.wrap.classList.has('nono-won'), 'win 音效 + 标题横幅');
  const n0 = S.index; ctl.restart(); S = ctl._state();
  ok(S.index === (n0 + 1) % E.BANK[0].length && !S.ended && S.board.filled() === 0, '换一局 = 本档下一幅：《' + S.P.t + '》');
  ctl.destroy();
  ok(host.children.length === 0 && (host.listeners.pointerdown || []).length === 0 && (docListeners.keydown || []).length === 0, 'destroy 清理 DOM 与监听');

  // 15×15 尺寸
  E.NEXT[3] = 0;
  const h3 = mkEl('div'), c3 = G.mount(h3, { level: 3 }); const S3 = c3._state();
  ok(S3.view.cells.length === 225 && /- 8px\) \/ /.test(S3.view.board.style['--nono-cs']), '15×15 格宽公式含线索区与内边距');
  const px = E.BANK[3].map(p => E.cellPx(E.parsePuzzle(p), 360 * 0.92)), px94 = E.BANK[3].map(p => E.cellPx(E.parsePuzzle(p), 360 * 0.94));
  ok(Math.min(...px) >= 17.5, '大师档 15×15 在 360px 宽 iPhone（92vw）上格宽 ' + Math.min(...px).toFixed(1) + '–' + Math.max(...px).toFixed(1) + 'px（hub 94vw：' + Math.min(...px94).toFixed(1) + '–' + Math.max(...px94).toFixed(1) + 'px）');
  ok(E.cellPx(E.parsePuzzle(E.BANK[3][0]), 760) > 40 && E.cellPx(E.parsePuzzle(E.BANK[0][0]), 900) === 72, '平板/电脑上格子放大（760px 宽 15×15 > 40px；5×5 封顶 72px）');
  c3.destroy();

  // demo
  const dh = mkEl('div'), caps = []; let doneFlag = false;
  const d = G.demo(dh, { onCaption: c => caps.push(c), onDone: () => { doneFlag = true; } });
  await sleep(700);
  ok(doneFlag && caps.length >= 6 && caps.every(c => c.length <= 40), 'demo ' + caps.length + ' 步说明，都 ≤40 字');
  caps.forEach(c => console.log('      · ' + c));
  const dc = all(dh, e => /nono-c /.test(e._cls + ' ') && e.attrs['data-i'] !== undefined);
  ok(dc.length === 25 && dc.filter(e => /nono-f/.test(e._cls)).length === 19, 'demo 结束时涂出完整的团子（19 格）');
  const d2 = G.demo(mkEl('div'), {}); d2.stop(); let late = false; const d3 = G.demo(mkEl('div'), { onDone: () => { late = true; } }); d3.stop(); await sleep(700);
  ok(!late, 'stop() 清除全部计时器');

  console.log('\n' + pass + ' 通过, ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
