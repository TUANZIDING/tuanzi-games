// node tests/junqi-testv1.0.js
global.window = {};
require('../games/junqiv1.0.js');
const G = window.TZGAMES.junqi;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const I = E.idx;
function pos(list) { const st = E.emptyState(); list.forEach(([r, c, side, rank]) => E.addPiece(st, side, I(r, c), rank)); return st; }
function dests(st, r, c) { return E.genMoves(st.grid, E.cSide(st.grid[I(r, c)]), I(r, c)).map(m => m.to).sort((a, b) => a - b); }
const { FLAG, MINE, BOMB, SAPPER, CMDR } = E;

console.log('注册信息');
ok(G.id === 'junqi' && G.name === '军棋', 'id/name');
ok(G.levels.length === 4 && G.sides[0] === '红方' && G.sides[1] === '蓝方', 'levels/sides');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('棋盘');
ok(E.CAMP.filter(Boolean).length === 10 && E.HQ.filter(Boolean).length === 4, '10 个行营、4 个大本营');
ok(E.ADJ[I(5, 1)].indexOf(I(6, 1)) < 0 && E.ADJ[I(5, 3)].indexOf(I(6, 3)) < 0, '山界 2、4 列不通');
ok(E.ADJ[I(5, 0)].indexOf(I(6, 0)) >= 0 && E.ADJ[I(5, 2)].indexOf(I(6, 2)) >= 0, '山界 1、3、5 列相通');
ok(E.ADJ[I(8, 2)].length === 8, '中心行营八方相连');
ok(E.RAIL[I(1, 2)] && !E.RAIL[I(0, 0)] && !E.RAIL[I(3, 2)] && E.RAIL[I(5, 2)], '铁路站点正确');

console.log('布阵合法性（200 次随机）');
{
  const r = rng(7); let bad = 0, smartBad = 0;
  for (let k = 0; k < 200; k++) {
    const st = E.newGame({ rng: r, smart: [k % 2 === 0, k % 2 === 1] });
    if (!E.isLegalDeploy(st.grid, 0) || !E.isLegalDeploy(st.grid, 1)) bad++;
    if (st.pieces.length !== 50) bad++;
    st.pieces.forEach(p => { if (E.CAMP[p.at]) smartBad++; });
  }
  ok(bad === 0, '200 局双方布阵全部合法（军旗大本营、地雷后两排、炸弹不在前排、25 子）');
  ok(smartBad === 0, '开局行营全空');
  const st = E.newGame({ rng: rng(3) });
  const f = st.pieces.find(p => p.side === 0 && p.rank === FLAG);
  const o = st.pieces.find(p => p.side === 0 && p.rank >= 3 && !E.HQ[p.at]);
  ok(!E.swapPieces(st, f.at, o.at), '把军旗换出大本营被拒绝');
  ok(E.isLegalDeploy(st.grid, 0), '拒绝后布阵不变');
  const a = st.pieces.find(p => p.side === 0 && p.rank === 7), b = st.pieces.find(p => p.side === 0 && p.rank === 9);
  const pa = a.at, pb = b.at;
  ok(E.swapPieces(st, pa, pb) && a.at === pb && b.at === pa && E.isLegalDeploy(st.grid, 0), '团长↔师长互换成功');
  const bad2 = E.isLegalDeploy((() => { const g = st.grid.slice(); const m = st.pieces.find(p => p.side === 0 && p.rank === MINE); const fr = st.pieces.find(p => p.side === 0 && E.fromBack(0, E.rowOf(p.at)) === 6); g[m.at] = g[fr.at]; g[fr.at] = E.code(0, MINE); return g; })(), 0);
  ok(!bad2, '地雷放前排判不合法');
  const n0 = E.genMoves(st.grid, 0).length;
  ok(n0 > 5, '开局红方有合法着法：' + n0);
}

console.log('走法');
{
  let st = pos([[10, 0, 0, 6]]);
  let d = dests(st, 10, 0);
  ok(d.indexOf(I(1, 0)) >= 0 && d.indexOf(I(10, 4)) >= 0, '营长沿铁路直线到 (1,0) 与 (10,4)');
  ok(d.indexOf(I(6, 2)) < 0 && d.indexOf(I(1, 1)) < 0, '营长不能铁路拐弯');
  st = pos([[10, 0, 0, SAPPER]]);
  d = dests(st, 10, 0);
  ok(d.indexOf(I(6, 2)) >= 0 && d.indexOf(I(1, 3)) >= 0 && d.indexOf(I(5, 2)) >= 0, '工兵铁路拐弯可达 (6,2)(1,3)(5,2)');
  ok(d.length === 31 + 2, '工兵从 (10,0) 可达其余 31 个铁路站 + 公路 (11,0) 与斜进行营 (9,1)：' + d.length);
  st = pos([[10, 0, 0, 6], [7, 0, 0, 4]]);
  ok(dests(st, 10, 0).indexOf(I(6, 0)) < 0 && dests(st, 10, 0).indexOf(I(8, 0)) >= 0, '铁路被己子挡住');
  st = pos([[10, 0, 0, 6], [7, 0, 1, 4]]);
  ok(dests(st, 10, 0).indexOf(I(7, 0)) >= 0 && dests(st, 10, 0).indexOf(I(6, 0)) < 0, '铁路上可吃第一个敌子，不能越过');
  st = pos([[5, 1, 0, 10], [4, 1, 1, 5], [5, 0, 1, 4]]);
  ok(dests(st, 5, 1).indexOf(I(4, 1)) < 0 && dests(st, 5, 1).indexOf(I(5, 0)) >= 0, '行营里的子不能被攻击');
  st = pos([[11, 1, 0, 10]]);
  ok(dests(st, 11, 1).length === 0, '大本营里的子不能走');
  st = pos([[10, 2, 0, MINE], [10, 1, 0, FLAG]]);
  ok(E.genMoves(st.grid, 0).length === 0, '地雷军旗不能走');
  st = pos([[9, 2, 0, 5]]);
  ok(dests(st, 9, 2).indexOf(I(8, 2)) >= 0 && dests(st, 9, 2).indexOf(I(8, 1)) < 0, '非行营不走斜线（只能斜进行营）');
  st = pos([[8, 2, 0, 5]]);
  ok(dests(st, 8, 2).length === 8, '行营内可八方走');
  st = pos([[6, 1, 0, 5]]);
  ok(dests(st, 6, 1).indexOf(I(5, 1)) < 0, '山界 2 列不能直接过');
}

console.log('战斗表');
const C = E.combat;
ok(C(11, 10) === 1 && C(4, 3) === 1 && C(3, 4) === -1 && C(7, 7) === 0, '大吃小、同级同归');
ok(C(BOMB, 11) === 0 && C(11, BOMB) === 0 && C(3, BOMB) === 0, '炸弹同归于尽');
ok(C(11, MINE) === -1 && C(SAPPER, MINE) === 1 && C(BOMB, MINE) === 0, '地雷：工兵挖、炸弹同归、其他阵亡');
ok(C(3, FLAG) === 1 && C(BOMB, FLAG) === 1, '任何子都能夺旗');
{
  const st = pos([[6, 0, 0, BOMB], [5, 0, 1, CMDR], [0, 1, 1, FLAG], [0, 0, 1, 4], [11, 1, 0, FLAG], [10, 4, 0, 5]]);
  const ev = E.applyMove(st, { from: I(6, 0), to: I(5, 0) });
  ok(ev.res === 0 && !st.grid[I(6, 0)] && !st.grid[I(5, 0)], '炸弹炸司令，两子消失');
  ok(st.flagRevealed[1] && st.known[0][st.ids[I(0, 1)]] === FLAG, '司令阵亡 → 军旗位置暴露');
  ok(st.dead[0][0] === BOMB && st.dead[1][0] === CMDR, '阵亡记录');
}

console.log('胜负判定');
{
  let st = pos([[1, 1, 0, 7], [0, 1, 1, FLAG], [0, 0, 1, 5], [11, 1, 0, FLAG]]);
  st.turn = 0;
  E.applyMove(st, { from: I(1, 1), to: I(0, 1) });
  ok(st.over && st.over.winner === 0 && st.over.reason === 'flag', '夺旗判胜');
  st = pos([[1, 0, 0, 7], [0, 0, 1, 4], [0, 1, 1, FLAG], [0, 2, 1, MINE], [11, 1, 0, FLAG]]);
  E.applyMove(st, { from: I(1, 0), to: I(0, 0) });
  ok(st.over && st.over.winner === 0 && st.over.reason === 'nomove', '对方只剩地雷军旗 → 无子可动判胜');
  st = pos([[2, 0, 0, 7], [1, 0, 1, 9], [0, 1, 1, FLAG], [11, 1, 0, FLAG], [10, 2, 0, MINE]]);
  E.applyMove(st, { from: I(2, 0), to: I(1, 0) });
  ok(st.over && st.over.winner === 1, '我方最后一个活子阵亡 → 对方胜');
  st = pos([[1, 0, 0, 7], [0, 1, 1, FLAG], [0, 4, 1, 5], [11, 1, 0, FLAG]]);
  E.applyMove(st, { from: I(1, 0), to: I(2, 0) });
  ok(!st.over, '普通走子不结束');
}

console.log('AI 不偷看 + 各难度合法且快速');
{
  // 同一局面，改变对方暗子真实身份，AI 的选择分布不应依赖真实身份（固定随机种子 → 完全相同的着法）
  const st = E.newGame({ rng: rng(11), smart: [false, true] });
  const m1 = E.chooseMove(st, 1, 2, { rng: rng(5) });
  const st2 = E.cloneState(st);
  const reds = st2.pieces.filter(p => p.side === 0 && p.rank >= 3 && p.rank !== FLAG);
  const a = reds[0], b = reds[reds.length - 1];
  const t = a.rank; a.rank = b.rank; b.rank = t; st2.grid[a.at] = E.code(0, a.rank); st2.grid[b.at] = E.code(0, b.rank);
  const m2 = E.chooseMove(st2, 1, 2, { rng: rng(5) });
  ok(m1.from === m2.from && m1.to === m2.to, 'AI 着法不随对方暗子真实身份变化（无偷看）');
  const m3 = E.chooseMove(st, 1, 3, { rng: rng(5) });
  const m4 = E.chooseMove(st2, 1, 3, { rng: rng(5) });
  ok(m3.from === m4.from && m3.to === m4.to, '大师级同样不偷看');

  // 显见夺旗：已知军旗（司令阵亡后暴露）
  const s3 = pos([[1, 1, 0, 4], [0, 1, 1, FLAG], [0, 3, 1, 5], [2, 4, 1, 6], [11, 1, 0, FLAG], [10, 0, 0, 7]]);
  s3.known[0][s3.ids[I(0, 1)]] = FLAG;
  for (let lv = 1; lv <= 3; lv++) { const m = E.chooseMove(s3, 0, lv); ok(m.from === I(1, 1) && m.to === I(0, 1), '难度 ' + lv + ' 看到暴露军旗立即夺旗'); }
  // 已知比自己大的敌子：不送死（难度 2/3）
  const s4 = pos([[7, 0, 0, 4], [6, 0, 1, 10], [11, 1, 0, FLAG], [10, 3, 0, 5], [0, 1, 1, FLAG], [0, 0, 1, 5]]);
  s4.known[0][s4.ids[I(6, 0)]] = 10;
  for (let lv = 2; lv <= 3; lv++) { const m = E.chooseMove(s4, 0, lv); ok(!(m.from === I(7, 0) && m.to === I(6, 0)), '难度 ' + lv + ' 不拿排长撞已知军长'); }

  for (let lv = 0; lv <= 3; lv++) {
    let worst = 0, legal = true, games = 0;
    const r = rng(100 + lv);
    for (let g = 0; g < 3; g++) {
      const st = E.newGame({ rng: r, smart: [true, true] });
      for (let ply = 0; ply < 40 && !st.over; ply++) {
        const side = st.turn, t0 = Date.now();
        const m = E.chooseMove(st, side, lv, { rng: r });
        const dt = Date.now() - t0; if (dt > worst) worst = dt;
        const lm = E.genMoves(st.grid, side);
        if (!m || !lm.some(x => x.from === m.from && x.to === m.to)) { legal = false; break; }
        E.applyMove(st, m);
      }
      games++;
    }
    ok(legal, '难度 ' + lv + '：' + games + ' 局 × 40 手全部合法');
    ok(worst < 500, '难度 ' + lv + '：最长思考 ' + worst + 'ms (<500ms)');
  }
}

console.log('自对弈（大师 vs 新手，4 局）');
{
  let strongWins = 0, done = 0;
  const r = rng(999);
  for (let g = 0; g < 4; g++) {
    const st = E.newGame({ rng: r, smart: [true, true] });
    const strong = g % 2;
    let n = 0;
    while (!st.over && n < 600) { const lv = st.turn === strong ? 3 : 0; E.applyMove(st, E.chooseMove(st, st.turn, lv, { rng: r })); n++; }
    if (st.over) done++;
    if (st.over && st.over.winner === strong) strongWins++;
  }
  console.log('    大师胜 ' + strongWins + '/4，分出结果 ' + done + '/4');
  ok(strongWins >= 3, '大师明显强于新手');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
