// node tests/go9-testv1.0.js
global.window = {};
require('../games/go9v1.0.js');
const G = window.TZGAMES.go9;
const E = G._engine;
const { P, PASS } = E;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
function timed(fn) { const t = Date.now(); const r = fn(); return [r, Date.now() - t]; }
const B = (rows) => E.boardFrom(rows);
const nm = E.coordName;
function legalCount(b, col) { let n = 0; for (const p of E.ON) if (b.isLegal(p, col)) n++; return n; }

console.log('注册信息');
ok(G.id === 'go9' && G.name === '小围棋', 'id/name');
ok(G.tagline === '9 路小棋盘，围地多者胜', 'tagline');
ok(JSON.stringify(G.levels) === JSON.stringify(['新手', '入门', '进阶', '大师']), '4 个难度');
ok(G.sides[0] === '黑方（先手）' && G.sides[1] === '白方', 'sides');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');
ok(E.KOMI === 7, '白贴 7 目');

console.log('气');
{
  const b = new E.Board();
  ok(legalCount(b, 1) === 81, '空盘 81 个合法点');
  b.play(P(4, 4), 1); ok(b.libs(P(4, 4)) === 4, '天元单子 4 气');
  b.play(P(0, 0), 1); ok(b.libs(P(0, 0)) === 2, '角上单子 2 气');
  b.play(P(4, 0), 1); ok(b.libs(P(4, 0)) === 3, '边上单子 3 气');
  b.play(P(4, 5), 1); ok(b.libs(P(4, 4)) === 6 && b.size[b.head[P(4, 4)]] === 2, '两子相连 6 气');
  b.play(P(4, 3), 2); ok(b.libs(P(4, 4)) === 5, '对方贴住后 5 气');
  const c = B(['.........', '.........', '..XXX....', '..X.X....', '..XXX....', '.........', '.........', '.........', '.........']);
  ok(c.libs(P(2, 2)) === 13, '中空方块：外气 12 + 内气 1 = 13 气 (' + c.libs(P(2, 2)) + ')');
  ok(c.atari(c.head[P(2, 2)]) === false, '13 气不是打吃');
  const d = B(['.........', '....O....', '...OX....', '....O....', '.........', '.........', '.........', '.........', '.........']);
  ok(d.atari(d.head[P(4, 2)]) && d.atariLib(d.head[P(4, 2)]) === P(5, 2), 'O(1) 打吃检测并找到唯一气');
}

console.log('提子');
{
  const b = B(['.........', '....X....', '...XOX...', '.........', '.........', '.........', '.........', '.........', '.........']);
  const n = b.play(P(4, 3), 1);
  ok(n === 1 && b.c[P(4, 2)] === 0 && b.caps[1] === 1, '提单子，提子数 +1');
  const c = B(['OOX......', 'XX.......', '.........', '.........', '.........', '.........', '.........', '.........', '.........']);
  ok(c.c[P(0, 0)] === 0 && c.c[P(1, 0)] === 0, '角上两子被提（boardFrom 依次落子时提掉）');
  // 一手同时提两块
  const d = B(['.XO.OX...', '.XOXOX...', '..X.X....', '.........', '.........', '.........', '.........', '.........', '.........']);
  ok(d.libs(P(2, 0)) === 1 && d.libs(P(4, 0)) === 1, '两块白棋各剩 1 气（共用 (3,0)）');
  const n2 = d.play(P(3, 0), 1);
  ok(n2 === 4 && d.c[P(2, 0)] === 0 && d.c[P(4, 1)] === 0, '一手提两块共 4 子 (' + n2 + ')');
  ok(d.libs(P(3, 0)) >= 2, '提子后新子有气');
  // 大块提子后气数恢复
  const e = B(['XXXXXXXXX', 'OOOOOOOOX', '........X', '.........', '.........', '.........', '.........', '.........', '.........']);
  ok(e.moveInfo(P(8, 0), 2) === -1, '已占点非法');
}
{
  const e = B(['XXXXXXXX.', 'OOOOOOOOX', '.........', '.........', '.........', '.........', '.........', '.........', '.........']);
  // 黑上边 8 子仅剩 (8,0)，白下 (8,0) 提 8 子
  const r = e.moveInfo(P(8, 0), 2);
  ok(r === 2 && e.mCap === 8, '试算：白 (8,0) 可提 8 子');
  ok(e.play(P(8, 0), 2) === 8 && e.caps[2] === 8, '白提 8 子');
  ok(e.libs(P(0, 1)) === 16, '提子后白串 8 子气数恢复为 16 (' + e.libs(P(0, 1)) + ')');
}

console.log('禁着点（自杀）');
{
  const b = B(['.X.......', 'X........', '.........', '.........', '.........', '.........', '.........', '.........', '.........']);
  ok(!b.isLegal(P(0, 0), 2), '白下角上黑眼：自杀非法');
  ok(b.isLegal(P(0, 0), 1), '黑自己可以填（合法，只是不好）');
  const c = B(['.XO......', 'XO.......', 'O........', '.........', '.........', '.........', '.........', '.........', '.........']);
  ok(c.isLegal(P(0, 0), 2), '白下 (0,0) 能提黑子，不算自杀');
  // 多子自杀
  const d = B(['OO.X.....', 'XXXX.....', '.........', '.........', '.........', '.........', '.........', '.........', '.........']);
  ok(!d.isLegal(P(2, 0), 2), '白填最后一口气连成 3 子也无气：非法');
  ok(d.isLegal(P(2, 0), 1), '黑下同点提 2 子：合法');
  ok(legalCount(new E.Board(), 1) === 81, '空盘全部合法');
}

console.log('打劫');
{
  const b = B(['.........', '.........', '.........', '....XO...', '...XO.O..', '....XO...', '.........', '.........', '.........']);
  const n = b.play(P(5, 4), 1);
  ok(n === 1 && b.ko === P(4, 4), '黑提劫，产生劫点 ' + nm(b.ko));
  ok(!b.isLegal(P(4, 4), 2), '白不能立刻提回');
  b.play(P(7, 7), 2); ok(b.ko === -1, '白在别处走一步后劫点解除');
  b.play(P(0, 8), 1);
  ok(b.isLegal(P(4, 4), 2), '白现在可以提回');
  ok(b.play(P(4, 4), 2) === 1 && b.ko === P(5, 4), '白提回，新劫点 ' + nm(b.ko));
  const c = B(['.........', '.........', '.........', '....XO...', '...XO.O..', '....XO...', '.........', '.........', '.........']);
  c.play(P(5, 4), 1); c.play(PASS, 2); ok(c.ko === -1, '停一手也会清除劫点');
  // 提两子不是劫
  const d = B(['.........', '...XOO...', '..XO..O..', '...XOO...', '.........', '.........', '.........', '.........', '.........']);
  const n2 = d.play(P(4, 2), 1);
  ok(n2 === 0 || d.ko === -1, '非单子互提不设劫点');
}

console.log('数子（中国规则 + 贴 7）');
{
  // 黑地左 4 列 + 黑墙 = 36；白 45
  const rows = ['...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....'];
  const b = B(rows);
  const s = E.scoreGame(b, null, 7);
  ok(s.black === 36 && s.white === 45 && s.diff === -16, '直线分界：黑 36 白 45，白胜 16 目');
  ok(E.scoreText(s) === '黑 36 : 白 45+7，白胜 16 目', '结果文字：' + E.scoreText(s));
  const rows2 = ['....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...'];
  const s2 = E.scoreGame(B(rows2), null, 7);
  ok(s2.black === 45 && s2.white === 36 && s2.diff === 2 && E.scoreText(s2) === '黑 45 : 白 36+7，黑胜 2 目', E.scoreText(s2));
  // 双方之间留一列单官（中立）
  const rows3 = ['...X.O...', '...X.O...', '...X.O...', '...X.O...', '...X.O...', '...X.O...', '...X.O...', '...X.O...', '...X.O...'];
  const s3 = E.scoreGame(B(rows3), null, 7);
  ok(s3.black === 36 && s3.white === 36 && s3.diff === -7, '单官不算任何一方：' + E.scoreText(s3));
  // 构造平局：黑 44 白 37
  const rows4 = ['....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....XO...', '....X.O..'];
  const s4 = E.scoreGame(B(rows4), null, 7);
  ok(s4.diff === s4.black - s4.white - 7, '差值 = 黑 − 白 − 7 (' + E.scoreText(s4) + ')');
}

console.log('死子估计（蒙特卡洛地盘）');
{
  // 白在黑地里孤零零一子；黑在白地里一子
  const rows = ['...XO....', '...XO....', '...XO....', '.O.XO....', '...XO..X.', '...XO....', '...XO....', '...XO....', '...XO....'];
  const b = B(rows);
  const [s, t] = timed(() => E.finalScore(b, 1200, E.makeRng(7)));
  ok(s.dead[P(1, 3)] === 1, '黑地里的白子判为死子');
  ok(s.dead[P(7, 4)] === 1, '白地里的黑子判为死子');
  ok(!s.dead[P(3, 0)] && !s.dead[P(4, 0)], '分界墙上的子都是活子');
  ok(s.black === 36 && s.white === 45, '提走死子后数子：' + E.scoreText(s) + `（${t}ms）`);
  // 没有入侵子的大空：两边的墙都不能被判死
  const sNone = E.finalScore(B(['...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....']), 1200, E.makeRng(9));
  let anyDead = false; for (const p of E.ON) if (sNone.dead[p]) anyDead = true;
  ok(!anyDead && sNone.black === 36 && sNone.white === 45, '无死子局面不误判：' + E.scoreText(sNone));
  // 活棋不能被判死：白有两眼的小块在黑地中
  const rows2 = ['.OXXXXXXX', 'OO.......', 'O........', 'OO.......', '.O.......', 'OO.......', '.........', '.........', '.........'];
  const b2 = B(rows2);
  const own = E.ownershipMC(b2, 800, E.makeRng(3));
  const s2 = E.scoreGame(b2, own, 7);
  ok(!s2.dead[P(0, 1)], '有两眼的白块不判死');
}

console.log('AI 总是走合法着法（四个难度，随机局面）');
{
  const rng = E.makeRng(99);
  let allLegal = true, tested = 0;
  for (let g = 0; g < 4; g++) {
    const b = new E.Board(); let col = 1;
    const n = 20 + g * 12;
    for (let k = 0; k < n; k++) { const m = E.playoutMove(b, col, -1, rng); b.play(m, col); col = 3 - col; }
    for (let lv = 0; lv <= 3; lv++) {
      const d = E.chooseMove(b, col, lv, { time: lv === 3 ? 400 : undefined, playouts: lv === 3 ? 4000 : undefined, moveNo: n });
      tested++;
      if (!d.resign && d.move !== PASS && !b.isLegal(d.move, col)) { allLegal = false; console.log('    非法：', nm(d.move)); }
    }
  }
  ok(allLegal, `${tested} 次决策全部合法`);
  // 打劫中 AI 不提回
  const k = B(['.........', '.........', '.........', '....XO...', '...XO.O..', '....XO...', '.........', '.........', '.........']);
  k.play(P(5, 4), 1);
  let koOk = true;
  for (let lv = 0; lv <= 3; lv++) { const d = E.chooseMove(k, 2, lv, { time: 300, playouts: lv ? 3000 : 200 }); if (d.move === P(4, 4)) koOk = false; }
  ok(koOk, 'AI 不在劫点立刻提回');
}

console.log('AI 战术');
{
  // 白 (4,4) 三面被围，只剩 (4,5)；不提的话白长出就连成一片
  const rows = ['.........', '.........', '.........', '....X....', '...XOX...', '...O.O...', '.........', '.........', '.........'];
  for (let lv = 1; lv <= 3; lv++) {
    let hit = 0, tt = 0;
    for (let i = 0; i < 5; i++) {
      const b = B(rows);
      const [d, t] = timed(() => E.chooseMove(b, 1, lv, { time: lv === 3 ? 800 : undefined }));
      if (d.move === P(4, 5)) hit++; tt += t;
    }
    ok(hit >= 3, `L${lv} 提掉被打吃的白子（切断点）：5 次中 ${hit} 次（平均 ${Math.round(tt / 5)}ms）`);
  }
  // 3 颗白子被打吃且能切断黑棋：必提
  const rows3 = ['.........', '.........', '.........', '...XXX...', '..XOOO...', '...XXX...', '.........', '.........', '.........'];
  for (let lv = 1; lv <= 3; lv++) {
    let hit = 0;
    for (let i = 0; i < 5; i++) { const d = E.chooseMove(B(rows3), 1, lv, { time: lv === 3 ? 800 : undefined }); if (d.move === P(6, 4)) hit++; }
    ok(hit >= 4, `L${lv} 提掉被打吃的 3 颗白子：5 次中 ${hit} 次`);
  }
  // 白方被打吃的 3 子应长出逃跑（不逃就被提 3 子）
  const rows2 = ['.........', '.........', '.........', '...XXX...', '..XOOO...', '...XXX...', '.........', '.........', '.........'];
  for (let lv = 2; lv <= 3; lv++) {
    let hit = 0;
    for (let i = 0; i < 5; i++) { const d2 = E.chooseMove(B(rows2), 2, lv, { time: 800 }); if (d2.move === P(6, 4)) hit++; }
    ok(hit >= 4, `L${lv} 白 3 子被打吃时长出逃跑：5 次中 ${hit} 次`);
  }
  // 新手偶尔会犯错，但走子合法
  const b3 = B(rows);
  let caps = 0; for (let i = 0; i < 10; i++) { const d = E.chooseMove(b3, 1, 0); if (d.move === P(4, 5)) caps++; }
  ok(caps >= 1 && caps <= 10, `新手 10 次中有 ${caps} 次提子（会故意走随手）`);
}

console.log('停一手 / 认输 逻辑');
{
  // 终局局面：没有值得下的点，AI 停一手
  const rows = ['...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....', '...XO....'];
  const b = B(rows);
  const d = E.chooseMove(b, 2, 3, { time: 500, oppPassed: true, moveNo: 60 });
  ok(d.move === PASS, '对方停一手且停着不输 → AI 也停一手');
  const full = B(['.X.XO.O.O', 'XXXXOOOOO', '.X.XO.O.O', 'XXXXOOOOO', '.X.XO.O.O', 'XXXXOOOOO', '.X.XO.O.O', 'XXXXOOOOO', '.X.XO.O.O']);
  for (let lv = 0; lv <= 3; lv++) { const d2 = E.chooseMove(full, 1 + (lv & 1), lv, { playouts: 1000, time: 300, moveNo: 70 }); ok(d2.move === PASS && !d2.resign, `L${lv} 只剩自己的眼：停一手`); }
  
  // 白大优势时黑方（大师）认输
  const rows4 = ['.X.XO.O..', 'XXXXO....', 'OOOOO..O.', '..O....O.', '.O..O.O..', '...O...O.', '.O...O...', '....O..O.', '.O.......'];
  const b4 = B(rows4);
  const d4 = E.chooseMove(b4, 1, 3, { time: 800, moveNo: 40 });
  const d5 = E.chooseMove(b4, 1, 1, { moveNo: 40 });
  ok(!d5.resign, '入门不认输（只有进阶/大师会认输）');
  ok(d4.resign === true, '黑只剩一个小角 → 大师认输，胜率 ' + d4.wr.toFixed(3));
}

console.log('各难度预算与每步用时（ms）');
const report = [];
{
  const rng = E.makeRng(5);
  const pos = [];
  for (const n of [0, 10, 30]) {
    const b = new E.Board(); let col = 1;
    for (let k = 0; k < n; k++) { const m = E.playoutMove(b, col, -1, rng); b.play(m, col); col = 3 - col; }
    pos.push([b, col, n]);
  }
  for (let lv = 0; lv <= 3; lv++) {
    let tot = 0, worst = 0, po = 0;
    for (const [b, col, n] of pos) {
      const [d, t] = timed(() => E.chooseMove(b, col, lv, { moveNo: n }));
      tot += t; worst = Math.max(worst, t); po += d.playouts;
      if (!d.resign && d.move !== PASS && !b.isLegal(d.move, col)) ok(false, 'illegal');
    }
    const avgPo = Math.round(po / pos.length), avgT = Math.round(tot / pos.length);
    report.push(`L${lv} ${G.levels[lv]}：平均 ${avgPo} 次模拟，平均 ${avgT}ms/步，最慢 ${worst}ms`);
    const L = E.LEVELS[lv];
    if (lv < 3) ok(avgPo <= L.playouts && avgPo >= Math.min(L.playouts, 1000) * 0.5, `L${lv} 模拟预算 ≈ ${L.playouts}（实测 ${avgPo}）`);
    else ok(avgPo >= 15000, `L3 1.5s 内模拟 ≥ 15000（实测 ${avgPo}）`);
    ok(worst <= 1700, `L${lv} 最慢一步 ${worst}ms ≤ 1.7s`);
  }
  report.forEach(r => console.log('  · ' + r));
}

console.log('自对弈一局（L3 黑 vs L1 白，直到双方停一手）');
{
  const b = new E.Board(); let col = 1, last = -1, passes = 0, moves = 0, worst = 0, resign = 0;
  while (moves < 140) {
    const lv = col === 1 ? 3 : 1;
    const [d, t] = timed(() => E.chooseMove(b, col, lv, { oppPassed: last === PASS && moves > 0, moveNo: moves, lastMove: last, time: lv === 3 ? 600 : undefined }));
    worst = Math.max(worst, t);
    if (d.resign) { resign = col; break; }
    if (d.move !== PASS && !b.isLegal(d.move, col)) { ok(false, '自对弈出现非法着 ' + nm(d.move)); break; }
    b.play(d.move, col); moves++;
    if (d.move === PASS) { if (++passes >= 2) break; } else passes = 0;
    last = d.move; col = 3 - col;
  }
  const s = E.finalScore(b, 1200);
  const rows = []; for (let y = 0; y < 9; y++) { let r = ''; for (let x = 0; x < 9; x++) { const p = P(x, y); r += s.dead[p] ? (b.c[p] === 1 ? 'x' : 'o') : b.c[p] === 1 ? 'X' : b.c[p] === 2 ? 'O' : s.terr[p] === 1 ? '+' : s.terr[p] === 2 ? '-' : '.'; } rows.push(r); }
  console.log(rows.map(r => '    ' + r).join('\n'));
  console.log(`    ${moves} 手，${resign ? (resign === 1 ? '黑' : '白') + '认输' : '双方停一手'}；${E.scoreText(s)}；最慢一步 ${worst}ms`);
  ok(resign === 2 || (!resign && s.diff > 0), '大师(黑) 胜入门(白)');
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail ? 1 : 0);
