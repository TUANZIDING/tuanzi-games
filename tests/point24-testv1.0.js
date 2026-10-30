// node tests/point24-testv1.0.js
global.window = {};
require('../games/point24v1.0.js');
const G = window.TZGAMES.point24;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
const is24 = v => v && v[0] === 24 && v[1] === 1;
// 解法树必须恰好用掉这些数（多重集相同）且算出 24
function usesExactly(tree, nums) {
  const a = E.leavesOf(tree).map(l => E.rstr(l.v)).sort().join(','), b = nums.map(n => E.rstr(Array.isArray(n) ? n : E.R(n))).sort().join(',');
  return a === b && is24(E.evalTree(tree));
}

console.log('注册信息');
ok(G.id === 'point24' && G.name === '24 点' && G.tagline === '四张牌，加减乘除凑出 24', 'id/name/tagline');
ok(G.levels.join() === '新手,入门,进阶,大师', '4 个难度');
ok(G.sides.length === 1 && G.sides[0] === '单人', 'sides 单人');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('有理数');
ok(E.rstr(E.calc('/', E.R(8), E.R(3))) === '8/3', '8÷3 = 8/3');
ok(E.rstr(E.calc('-', E.R(3), E.R(8, 3))) === '1/3', '3 − 8/3 = 1/3');
ok(is24(E.calc('/', E.R(8), E.R(1, 3))), '8 ÷ 1/3 = 24');
ok(E.calc('/', E.R(5), E.R(0)) === null, '除以 0 → null');

console.log('求解器');
{
  [[4, 6, 1, 1], [1, 2, 3, 4], [6, 6, 6, 6], [1, 5, 5, 5], [3, 3, 8, 8], [4, 4, 7, 7], [1, 1, 1, 8], [10, 10, 4, 4], [1, 4, 5, 6], [2, 2, 11, 11]].forEach(h => {
    const a = E.analyze(h);
    ok(a.solvable && usesExactly(a.best, h), h.join(' ') + ' 可解：' + (a.best ? E.fmt(a.best) : '-'));
  });
  [[1, 1, 1, 1], [1, 1, 1, 2], [1, 1, 1, 7], [1, 1, 2, 2], [3, 4, 8, 8], [3, 5, 5, 5], [13, 13, 13, 13], [1, 1, 5, 9]].forEach(h => {
    ok(!E.analyze(h).solvable && !E.solvable(h), h.join(' ') + ' 无解');
  });
  const a3388 = E.analyze([3, 3, 8, 8]);
  ok(a3388.tier === 3 && a3388.best.frac, '3 3 8 8 只能靠分数（tier 3）');
  ok(E.fmt(a3388.best) === '8÷(3−8÷3)', '3 3 8 8 最简解显示为 8÷(3−8÷3)，得到 ' + E.fmt(a3388.best));
  ok(E.analyze([1, 5, 5, 5]).tier === 3 && E.analyze([4, 4, 7, 7]).tier === 3, '1 5 5 5、4 4 7 7 也是 tier 3');
  ok(E.analyze([1, 2, 3, 4]).tier <= 1 && E.analyze([10, 10, 2, 2]).tier === 0, '1 2 3 4 / 10 10 2 2 是简单题');
  // 全表核对：1–13 共 1820 种组合，经典结论 1362 种可解；1–10 共 715 种，566 种可解
  let n13 = 0, s13 = 0, n10 = 0, s10 = 0, t3 = 0, allOk = true; const t3keys = [];
  const t0 = Date.now();
  for (let a = 1; a <= 13; a++) for (let b = a; b <= 13; b++) for (let c = b; c <= 13; c++) for (let d = c; d <= 13; d++) {
    const h = [a, b, c, d], r = E.analyze(h); n13++;
    if (r.solvable) { s13++; if (!usesExactly(r.best, h)) allOk = false; if (r.tier === 3) { t3++; t3keys.push(E.handKey(h)); } if (E.hasPlainSolution(h) !== (r.tier < 3)) allOk = false; }
    if (d <= 10) { n10++; if (r.solvable) s10++; }
  }
  const ms = Date.now() - t0;
  ok(n13 === 1820 && s13 === 1362, '1–13：1820 种中 ' + s13 + ' 种可解（应为 1362）');
  ok(n10 === 715 && s10 === 566, '1–10：715 种中 ' + s10 + ' 种可解（应为 566）');
  ok(allOk, '每个最简解都恰好用四张牌且等于 24');
  console.log('    · 1–13 里 tier 3（必须分数/负数）的手牌 ' + t3 + ' 种；全表分析 ' + ms + 'ms（每手约 ' + (ms / 1820).toFixed(2) + 'ms）');
  ok(t3keys.join('|') === E.FRACTION_ONLY.map(E.handKey).sort().join('|') || t3keys.slice().sort().join('|') === E.FRACTION_ONLY.map(E.handKey).sort().join('|'), '内置「只能走分数」表 = 全表算出的 ' + t3 + ' 手');
  ok(E.FALLBACK.every((L, lv) => L.every(h => E.accepts(lv, E.analyze(h)) && Math.max(...h) <= E.LEVELS[lv].max)), '备用手牌都符合各自难度');
}

console.log('出题难度（每档 50 手）');
{
  const rng = E.mulberry32(20261031);
  G.levels.forEach((name, lv) => {
    const L = E.LEVELS[lv], seen = {};
    let good = 0, maxMs = 0, sum = 0, bank = 0, tierCount = [0, 0, 0, 0], dup = 0;
    for (let k = 0; k < 50; k++) {
      if (k % 10 === 0) for (const key in seen) delete seen[key]; // 每局 10 题不重复
      const h = E.generate(lv, { rng, avoid: seen });
      if (seen[h.key]) dup++; seen[h.key] = 1;
      const a = E.analyze(h.nums);
      const inRange = h.nums.length === 4 && h.nums.every(n => n >= 1 && n <= L.max && n === (n | 0));
      if (inRange && a.solvable && L.tiers.indexOf(a.tier) >= 0 && a.tier === h.tier && usesExactly(h.solution, h.nums) && (!L.maxInter || a.best.max <= L.maxInter)) good++;
      tierCount[a.tier]++; maxMs = Math.max(maxMs, h.ms); sum += h.ms; if (h.source === 'bank') bank++;
    }
    ok(good === 50, name + '：50/50 手牌在 1–' + L.max + '、可解、难度 tier∈{' + L.tiers + '}（分布 ' + tierCount.join('/') + '）');
    ok(dup === 0, name + '：同一局内不重复');
    ok(maxMs < 250, name + '：出题平均 ' + (sum / 50).toFixed(1) + 'ms，最慢 ' + maxMs.toFixed(1) + 'ms，用备用题 ' + bank + ' 次');
  });
  ok(E.LEVELS[0].limit === 0 && E.LEVELS[1].limit === 0 && E.LEVELS[2].limit === 60 && E.LEVELS[3].limit === 45, '限时：新手/入门不限，进阶 60s，大师 45s');
  const r3 = E.mulberry32(3); let fr = 0, okFrac = true;
  for (let k = 0; k < 20; k++) { const h = E.generate(3, { rng: r3, needFrac: true }); if (E.analyze(h.nums).tier !== 3) okFrac = false; }
  for (let k = 0; k < 200; k++) { const h = E.generate(3, { rng: r3, budgetMs: 1 }); if (h.tier === 3) fr++; }
  ok(okFrac, '大师 needFrac 题全部必须走分数（3 3 8 8 这类）');
  ok(fr > 90 && fr < 150, '大师约 60% 的题必须走分数，其余必须用除法（200 题中分数题 ' + fr + '）');
  // 新手不能出现需要除法的题
  const r2 = E.mulberry32(7); let noDiv = true;
  for (let k = 0; k < 50; k++) { const h = E.generate(0, { rng: r2 }); if (h.solution.div || h.solution.frac) noDiv = false; }
  ok(noDiv, '新手题的最简解不含除法/分数');
}

console.log('提示（中途局面）');
{
  // 3 8 8 3：8÷3 后 → [3, 8, 8/3]，提示应能继续通向 24
  const s1 = [{ slot: 0, v: E.R(3) }, { slot: 1, v: E.R(8) }, { slot: 3, v: E.R(8, 3) }];
  const h1 = E.hintFor(s1);
  ok(h1 && (h1.op === '-' && h1.a === 0 && h1.b === 3), '3、8、8/3 → 提示 3 − 8/3（' + (h1 && h1.text) + '）');
  // 3+3=6 → [6, 8, 8] 无解
  const dead = [{ slot: 1, v: E.R(8) }, { slot: 2, v: E.R(8) }, { slot: 3, v: E.R(6) }];
  ok(E.hintFor(dead) === null && !E.solvable([8, 8, 6]), '6、8、8 凑不出 → 提示返回 null（界面提示撤一步）');
  ok(E.hintFor([{ slot: 0, v: E.R(23) }]) === null, '只剩一张 ≠ 24 → null');
  const st = E.hintFor([{ slot: 0, v: E.R(8) }, { slot: 2, v: E.R(1, 3) }]);
  ok(st && st.a === 0 && st.b === 2 && st.op === '/' && st.text === '先算 8 ÷ 1/3 试试', '8 与 1/3 → 先算 8 ÷ 1/3 试试');
  const h0 = E.hintFor([3, 3, 8, 8].map((n, i) => ({ slot: i, v: E.R(n) })));
  ok(h0 && h0.op === '/' && h0.av[0] === 8 && h0.bv[0] === 3, '开局 3 3 8 8 → 提示先算 8 ÷ 3（' + (h0 && h0.text) + '）');

  // 随机：从 200 个随机中途局面出发，提示 ⇔ 可解，且照提示走一步仍可解
  const rng = E.mulberry32(99), ops = ['+', '-', '*', '/'];
  let agree = 0, follow = 0, solvableStates = 0, total = 0;
  while (total < 200) {
    let cards = [0, 1, 2, 3].map(i => ({ slot: i, v: E.R(1 + ((rng() * 13) | 0)) }));
    const steps = 1 + ((rng() * 2) | 0);
    let okm = true;
    for (let s = 0; s < steps; s++) {
      const i = (rng() * cards.length) | 0; let j = (rng() * (cards.length - 1)) | 0; if (j >= i) j++;
      const v = E.calc(ops[(rng() * 4) | 0], cards[i].v, cards[j].v); if (!v) { okm = false; break; }
      const nb = { slot: cards[j].slot, v }; cards = cards.filter((_, k) => k !== i && k !== j); cards.push(nb);
    }
    if (!okm) continue;
    total++;
    const sv = E.solvable(cards.map(c => c.v)), h = E.hintFor(cards);
    if (!!h === sv) agree++;
    if (h) {
      solvableStates++;
      const A = cards.find(c => c.slot === h.a), B = cards.find(c => c.slot === h.b);
      const v = E.calc(h.op, A.v, B.v);
      const next = cards.filter(c => c !== A && c !== B).map(c => c.v).concat([v]);
      if (A && B && h.a !== h.b && E.solvable(next)) follow++;
    }
  }
  ok(agree === 200, '200 个随机中途局面：提示有/无 与可解性一致（其中可解 ' + solvableStates + ' 个）');
  ok(follow === solvableStates, '照提示走第一步后仍然可解（' + follow + '/' + solvableStates + '）');
}

console.log('计时与结算');
{
  let worst = 0;
  for (let k = 0; k < 200; k++) { const r = E.mulberry32(k); const h = [1, 2, 3, 4].map(() => 1 + ((r() * 13) | 0)); const t = process.hrtime.bigint(); E.analyze(h); worst = Math.max(worst, Number(process.hrtime.bigint() - t) / 1e6); }
  ok(worst < 30, '单手完整枚举最慢 ' + worst.toFixed(2) + 'ms');
  let tot = 0; const t0 = Date.now();
  for (let k = 0; k < 10; k++) tot += E.generate(3).ms;
  ok(Date.now() - t0 < 1500, '大师档出一整局 10 题共 ' + (Date.now() - t0) + 'ms');
  ok(E.fmtTime(0) === '00:00' && E.fmtTime(75.9) === '01:15' && E.fmtTime(600) === '10:00', 'fmtTime mm:ss');
  const w = E.endResult(6, 83000), l = E.endResult(5, 61000);
  ok(w.winner === 'player' && w.reason === '答对 6/10 · 用时 01:23', '≥6 题 → player：' + w.reason);
  ok(l.winner === 'ai' && l.reason === '答对 5/10 · 用时 01:01', '<6 题 → ai：' + l.reason);
}

console.log('\n' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
