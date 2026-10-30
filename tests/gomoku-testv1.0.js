// node tests/gomoku-testv1.0.js
global.window = {};
require('../games/gomokuv1.0.js');
const G = window.TZGAMES.gomoku;
const E = G._engine;
const { I, N } = E;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
function board(list) { const b = E.newBoard(); list.forEach(([x, y, c]) => { b[I(x, y)] = c; }); return b; }
function xy(i) { return '(' + (i % N) + ',' + ((i / N) | 0) + ')'; }
function timed(fn) { const t = Date.now(); const r = fn(); return [r, Date.now() - t]; }

console.log('注册信息');
ok(G.id === 'gomoku' && G.name === '五子棋', 'id/name');
ok(G.levels.length === 4, '4 个难度');
ok(G.sides[0] === '黑方（先手）' && G.sides[1] === '白方', 'sides');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('规则');
ok(E.legalMoves(E.newBoard()).length === 225, '开局 225 个合法点');
const dirs = [['横', [1, 0]], ['竖', [0, 1]], ['斜↘', [1, 1]], ['斜↗', [1, -1]]];
for (const [name, [dx, dy]] of dirs) {
  const b = E.newBoard(); const sx = 5, sy = dy < 0 ? 9 : 3; let last;
  for (let k = 0; k < 5; k++) { last = I(sx + k * dx, sy + k * dy); b[last] = 1; }
  const w = E.checkWin(b, last);
  ok(w && w.length === 5, name + '向连五判胜');
  b[last] = 0; ok(!E.checkWin(b, I(sx, sy)), name + '向四子不判胜');
}
{
  const b = E.newBoard(); for (let k = 0; k < 6; k++) b[I(2 + k, 2)] = 2;
  ok(E.checkWin(b, I(4, 2)).length === 6, '长连（六子）自由规则也算胜');
  const c = board([[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 2], [4, 0, 1]]);
  ok(!E.checkWin(c, I(4, 0)), '被隔断不算');
}
{
  const b = E.newBoard(); for (let i = 0; i < 225; i++) b[i] = ((i % N) + 2 * ((i / N) | 0)) % 4 < 2 ? 1 : 2;
  ok(E.isFull(b), '满盘检测');
}

console.log('AI 战术（每个难度各测）');
let maxT = 0;
for (let lv = 0; lv <= 3; lv++) {
  // 1) 自己有四，直接成五（即使对方也有四）
  let b = board([[3, 7, 2], [4, 7, 2], [5, 7, 2], [6, 7, 2], [2, 7, 1], [3, 5, 1], [4, 5, 1], [5, 5, 1], [6, 5, 1], [9, 9, 1]]);
  let [m, t] = timed(() => E.chooseMove(b, 2, lv)); maxT = Math.max(maxT, t);
  ok(m === I(7, 7), `L${lv} 白有冲四：直接成五 ${xy(m)} ${t}ms`);
  // 2) 堵对方冲四
  b = board([[3, 7, 1], [4, 7, 1], [5, 7, 1], [6, 7, 1], [2, 7, 2], [8, 8, 2], [9, 9, 1]]);
  [m, t] = timed(() => E.chooseMove(b, 2, lv)); maxT = Math.max(maxT, t);
  ok(m === I(7, 7), `L${lv} 黑冲四：必堵 ${xy(m)} ${t}ms`);
  // 3) 对方活四：至少堵一头
  b = board([[4, 7, 1], [5, 7, 1], [6, 7, 1], [7, 7, 1], [5, 8, 2], [6, 8, 2], [9, 10, 1]]);
  [m, t] = timed(() => E.chooseMove(b, 2, lv)); maxT = Math.max(maxT, t);
  ok(m === I(3, 7) || m === I(8, 7), `L${lv} 黑活四：堵一端 ${xy(m)} ${t}ms`);
  // 4) 对方活三（L1–L3 必堵；L0 允许偶尔忽视）
  b = board([[6, 7, 1], [7, 7, 1], [8, 7, 1], [7, 8, 2], [6, 6, 2]]);
  [m, t] = timed(() => E.chooseMove(b, 2, lv)); maxT = Math.max(maxT, t);
  const b2 = b.slice(); b2[m] = 2;
  const blocked = !E.hasThreat(b2, 1, E.S_FOURTHREE);
  if (lv >= 1) ok(blocked, `L${lv} 黑活三：必堵 ${xy(m)} ${t}ms`);
  else console.log(`  · L0 黑活三：${blocked ? '堵了' : '没堵（新手允许）'} ${xy(m)}`);
  // 5) 合法性
  ok(b[m] === 0, `L${lv} 落点为空`);
}

console.log('VCF（大师）');
{
  // 白：横向 (5..7,4) 与竖向 (9,5..7) 交于 (9,4)：一手双冲四
  const b = board([[4, 4, 1], [5, 4, 2], [6, 4, 2], [7, 4, 2], [9, 5, 2], [9, 6, 2], [9, 7, 2], [9, 8, 1], [7, 7, 1], [6, 8, 1], [8, 9, 1], [10, 10, 1]]);
  const ctx = { deadline: Date.now() + 2000, nodes: 0, to: false };
  const seq = E.vcf(b.slice(), 2, 12, ctx);
  ok(!!seq, 'vcf 找到连续冲四胜 ' + (seq ? seq.map(xy).join(' ') : ''));
}

console.log('AI 用时（自对弈 L2 vs L3，每步 < 1.5s）');
{
  const b = E.newBoard(); let color = 1, moves = 0, worst = 0, winner = 0;
  while (moves < 60) {
    const lv = color === 1 ? 2 : 3;
    const [m, t] = timed(() => E.chooseMove(b, color, lv)); worst = Math.max(worst, t);
    if (b[m] !== 0) { ok(false, '非法落子 ' + xy(m)); break; }
    b[m] = color; moves++;
    if (E.checkWin(b, m)) { winner = color; break; }
    color = 3 - color;
  }
  maxT = Math.max(maxT, worst);
  ok(worst < 1500, `自对弈 ${moves} 手，最慢一步 ${worst}ms，胜者 ${winner === 1 ? '黑(L2)' : winner === 2 ? '白(L3)' : '无'}`);
  for (let lv = 0; lv <= 3; lv++) {
    const [m, t] = timed(() => E.chooseMove(E.newBoard(), 1, lv));
    ok(m >= 0 && m < 225, `L${lv} 空盘开局 ${xy(m)} ${t}ms`);
  }
}
ok(maxT < 1500, '所有测试中最大单步用时 ' + maxT + 'ms < 1500ms');

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
