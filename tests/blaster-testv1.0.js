// node tests/blaster-testv1.0.js
global.window = {};
require('../games/blasterv1.0.js');
const G = window.TZGAMES.blaster;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
function run(g, n, inp) { for (let i = 0; i < n; i++) E.update(g, typeof inp === 'function' ? inp(g, i) : inp); }

console.log('注册信息');
ok(G.id === 'blaster' && G.name === '团子突击队', 'id/name');
ok(G.tagline === '横版闯关射击，八方向开火', 'tagline');
ok(JSON.stringify(G.levels) === JSON.stringify(['新手', '入门', '进阶', '大师']), '4 个难度');
ok(G.sides.length === 1 && G.sides[0] === '单人', 'sides 单人');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('碰撞工具');
ok(E.aabb(0, 0, 10, 10, 5, 5, 10, 10), '矩形重叠');
ok(!E.aabb(0, 0, 10, 10, 10, 0, 5, 5), '矩形相邻不算重叠');
ok(!E.aabb(0, 0, 10, 10, 0, 20, 5, 5), '矩形分离');
ok(E.circleRect(12, 5, 2.5, { x: 0, y: 0, w: 10, h: 10 }), '圆贴边命中');
ok(!E.circleRect(14, 5, 2.5, { x: 0, y: 0, w: 10, h: 10 }), '圆离开不命中');
ok(!E.circleRect(13, 13, 3, { x: 0, y: 0, w: 10, h: 10 }), '圆在角外不命中（3²+3²>3²）');
ok(E.pointIn(5, 5, { x: 0, y: 0, w: 10, h: 10 }) && !E.pointIn(11, 5, { x: 0, y: 0, w: 10, h: 10 }), '点在矩形内');
ok(!E.circleRect(0, 0, 5, null) && !E.rectHit(null, { x: 0, y: 0, w: 1, h: 1 }), '空碰撞盒安全');
{
  // 趴下躲平射：炮台平射高度 = 地面-14
  const g = E.newGame(2); const p = g.player; const by = E.GROUND - 14;
  p.prone = false; ok(E.circleRect(p.x, by, 2.5, E.playerBox(p)), '站着会被平射打中');
  p.prone = true; ok(!E.circleRect(p.x, by, 2.5, E.playerBox(p)), '趴下躲过平射');
  p.prone = false; p.dive = true; ok(E.playerBox(p) === null, '潜水时没有受击盒');
}

console.log('八方向瞄准');
const A = (u, d, h, f, gnd, w) => E.aimVector(u, d, h, f, gnd, w);
const dirs = [
  ['前', A(0, 0, 0, 1, 1, 0), 1, 0, 'fwd'], ['后', A(0, 0, -1, 1, 1, 0), -1, 0, 'fwd'],
  ['上', A(1, 0, 0, 1, 1, 0), 0, -1, 'up'], ['右上', A(1, 0, 1, 1, 1, 0), Math.SQRT1_2, -Math.SQRT1_2, 'diagUp'],
  ['左上', A(1, 0, -1, 1, 1, 0), -Math.SQRT1_2, -Math.SQRT1_2, 'diagUp'], ['右下（跑动）', A(0, 1, 1, 1, 1, 0), Math.SQRT1_2, Math.SQRT1_2, 'diagDown'],
  ['左下（空中）', A(0, 1, -1, 1, 0, 0), -Math.SQRT1_2, Math.SQRT1_2, 'diagDown'], ['正下（空中）', A(0, 1, 0, 1, 0, 0), 0, 1, 'down']
];
for (const [n, v, x, y, pose] of dirs) ok(near(v.x, x) && near(v.y, y) && v.pose === pose, n + ' → ' + pose);
ok(A(0, 1, 0, -1, 1, 0).pose === 'prone' && A(0, 1, 0, -1, 1, 0).x === -1, '地面只按↓ = 趴下向前平射');
ok(A(0, 1, 0, 1, 1, 1).pose === 'dive', '水里按↓ = 潜水');

console.log('武器');
{
  const s = E.weaponBullets('S', 0, 0, 1, 0);
  ok(s.length === 5, '散弹 5 发');
  const angs = s.map(b => Math.atan2(b.vy, b.vx));
  const want = [-0.32, -0.16, 0, 0.16, 0.32];
  ok(angs.every((a, i) => near(a, want[i], 1e-9)), '散弹角度 = 瞄准 ±0.16/±0.32 rad');
  const up = E.weaponBullets('S', 0, 0, Math.SQRT1_2, -Math.SQRT1_2).map(b => Math.atan2(b.vy, b.vx));
  ok(up.every((a, i) => near(a, -Math.PI / 4 + want[i], 1e-9)), '散弹跟随斜上瞄准旋转');
  ok(s.every(b => near(Math.hypot(b.vx, b.vy), E.WEAPONS.S.speed)), '散弹速度一致');
  const r = E.weaponBullets('R', 0, 0, 1, 0);
  ok(r.length === 2 && near(r[0].vy, 0) && near(r[0].y, -r[1].y) && r[0].y !== 0, '连发：两发平行');
  const l = E.weaponBullets('L', 0, 0, 0, -1)[0];
  ok(l.laser && l.pierce && l.dmg === 3 && near(l.vx, 0, 1e-9) && l.vy < 0, '激光穿透、伤害 3、方向正确');
  const m = E.weaponBullets('M', 0, 0, 1, 0, () => 1)[0];
  ok(near(Math.atan2(m.vy, m.vx), 0.05), '速射抖动不超过 0.05 rad');
  ok(E.WEAPONS.M.cd < E.WEAPONS.N.cd && E.WEAPONS.R.cd < E.WEAPONS.N.cd, '速射/连发冷却更短');
  ok(['S', 'L', 'R', 'M'].map(k => E.WEAPONS[k].icon).join('') === '散激连速', '图标 散/激/连/速');
}

console.log('难度参数');
{
  const L = E.LEVELS;
  ok(L.length === 4 && L.map(l => l.name).join() === '新手,入门,进阶,大师', '4 档名称');
  ok(L[0].lives === 5 && L[0].shield === 1, '新手 5 命 + 护盾');
  ok(L[3].lives === 3 && L[3].shield === 0, '大师 3 命无护盾');
  let mono = true;
  for (let i = 1; i < 4; i++) {
    if (!(L[i].enemyMul > L[i - 1].enemyMul && L[i].fireMul > L[i - 1].fireMul && L[i].bulletSpeed > L[i - 1].bulletSpeed && L[i].lives <= L[i - 1].lives && L[i].coreHp > L[i - 1].coreHp)) mono = false;
  }
  ok(mono, '敌人数量/射速/弹速/Boss 血量逐级上升，命逐级不增');
  for (let i = 0; i < 4; i++) { const g = E.newGame(i); ok(g.lives === L[i].lives && g.player.shield === L[i].shield && g.boss.core.hp === L[i].coreHp, L[i].name + ' 开局数值正确'); }
  // 敌人数量：同样跑 30 秒，大师刷出的小兵更多
  function grunts(lv) { const g = E.newGame(lv, { demo: true, seed: 1 }); let n = 0, seen = new Set(); run(g, 1800, () => ({ right: true })); return g.uid; }
  ok(grunts(3) > grunts(0), '大师刷怪多于新手（' + grunts(0) + ' vs ' + grunts(3) + '）');
}

console.log('移动与地形');
{
  const g = E.newGame(1, { noSpawn: true }); const p = g.player;
  run(g, 60, { right: true });
  ok(p.x > 140 && p.onGround && Math.abs(p.y - E.GROUND) < 1e-9, '向右跑并站在地面');
  run(g, 1, { jump: true }); run(g, 3, {});
  ok(!p.onGround && p.spin && p.y < E.GROUND, '起跳并翻跟头');
  run(g, 60, {});
  ok(p.onGround && !p.spin, '落地');
  // 跳上中层平台再穿下去
  const g2 = E.newGame(1, { noSpawn: true }); g2.player.x = 330; g2.cam.x = 200;
  run(g2, 1, { jump: true }); run(g2, 50, { jump: true });
  ok(g2.player.onGround && g2.player.y === 185 && g2.player.onThin, '跳上中层细平台');
  run(g2, 1, { jump: false }); run(g2, 1, { down: true, jump: true }); run(g2, 40, {});
  ok(g2.player.onGround && g2.player.y === E.GROUND, '↓+跳 穿过细平台落回地面');
  // 坑可以跳过
  const g3 = E.newGame(1, { noSpawn: true }); g3.player.x = 860; g3.cam.x = 700;
  run(g3, 8, { right: true }); run(g3, 1, { right: true, jump: true }); run(g3, 60, { right: true });
  ok(g3.player.onGround && g3.player.x > 924 && g3.lives === E.LEVELS[1].lives, '44px 的坑能跳过');
  // 掉坑扣命
  const g4 = E.newGame(1, { noSpawn: true }); g4.player.x = 870; g4.cam.x = 700;
  run(g4, 100, { right: true });
  ok(g4.lives === E.LEVELS[1].lives - 1, '掉坑扣一条命');
  // 水区：下水、潜水、跳上岸
  const g5 = E.newGame(1, { noSpawn: true }); g5.player.x = 4100; g5.player.y = E.WATER_Y; g5.cam.x = 3900;
  run(g5, 5, { right: true });
  ok(g5.player.inWater && g5.player.x <= 4145, '水里走到岸边被挡住');
  run(g5, 2, { down: true }); ok(g5.player.dive, '水里按↓潜水');
  run(g5, 1, {}); run(g5, 1, { jump: true, right: true }); run(g5, 60, { right: true });
  ok(g5.player.onGround && !g5.player.inWater && g5.player.y === E.GROUND && g5.player.x > 4150, '从水里跳上岸');
}

console.log('战斗');
{
  const g = E.newGame(1, { noSpawn: true }); g.cam.x = 0;
  const e = E.addEnemy(g, 'grunt', 200, E.GROUND, { sp: 0 });
  run(g, 40, { fire: true });
  ok(!g.enemies.includes(e) && g.score >= 100, '子弹打倒小兵并加分');
  ok(g.events.includes('kill') && g.events.includes('shot'), '击杀/开火事件（供音效）');
  const g2 = E.newGame(0, { noSpawn: true });
  E.hitPlayer(g2); ok(g2.player.shield === 0 && g2.lives === 5 && !g2.player.dead, '新手护盾先挡一次');
  ok(!E.hitPlayer(g2), '受击后无敌帧内不再受伤');
  g2.player.invT = 0; E.hitPlayer(g2); ok(g2.player.dead && g2.lives === 4, '再中弹扣命');
  run(g2, 80, {}); ok(!g2.player.dead && g2.player.invT > 0, '复活后有无敌帧');
  const g3 = E.newGame(3, { noSpawn: true }); g3.lives = 1; g3.player.invT = 0; E.hitPlayer(g3); run(g3, 90, {});
  ok(g3.status === 'over' && g3.events.includes('over'), '命用完 → 游戏结束');
  // 捡胶囊
  const g4 = E.newGame(1, { noSpawn: true }); const cap = E.addEnemy(g4, 'capsule', 140, 216, { by: 216, w: 'L' });
  run(g4, 120, (gg, i) => ({ fire: gg.enemies.includes(cap) }));
  ok(!g4.enemies.includes(cap), '打掉武器胶囊');
  run(g4, 200, () => ({ right: g4.pickups[0] ? g4.pickups[0].x > g4.player.x : false, left: g4.pickups[0] ? g4.pickups[0].x < g4.player.x - 2 : false }));
  ok(g4.player.weapon === 'L', '吃到「激」字武器');
}

console.log('关底');
{
  const g = E.newGame(2, { noSpawn: true });
  g.cam.x = E.CAM_MAX; g.player.x = 5900; E.update(g, {});
  ok(g.boss.active, '镜头到底，大炮墙启动');
  run(g, 300, {});
  ok(g.eb.length > 0 || g.player.dead || g.lives < E.LEVELS[2].lives, '炮台和核心会开火');
  const g2 = E.newGame(2, { noSpawn: true }); g2.cam.x = E.CAM_MAX; g2.player.x = 5900; E.update(g2, {});
  g2.boss.core.hp = 0;
  E.update(g2, {}); ok(g2.cleared && g2.status === 'play', 'Boss 血量归零 → 关卡清除、开始爆炸');
  run(g2, 130, {}); ok(g2.status === 'won' && g2.events.includes('win'), '爆炸结束后判定胜利');
  ok(g2.score >= 5000, '通关奖励分 ' + g2.score);
  // 用子弹打穿核心
  const g3 = E.newGame(0, { noSpawn: true, demo: true }); g3.cam.x = E.CAM_MAX; g3.player.x = 5900; g3.player.y = 185; E.update(g3, {});
  run(g3, 2000, { fire: true });
  ok(g3.boss.core.hp <= 0 && g3.cleared, '站在平台上平射打爆核心');
  const t = g3.boss.turrets[1].hp;
  const g4 = E.newGame(1, { noSpawn: true }); g4.cam.x = E.CAM_MAX; g4.player.x = 5950; E.update(g4, {});
  run(g4, 120, { fire: true }); ok(g4.boss.turrets[1].hp < E.LEVELS[1].turretHp, '地面平射能打下层炮台');
  const shake = (() => { const gg = E.newGame(1); gg.boss.active = true; E.damagePart(gg, gg.boss.core, 1); return gg.cam.shake; })();
  ok(shake > 0, '打中 Boss 震屏');
}

console.log('整关可通（无敌机器人跑完全程）');
{
  for (let lv = 0; lv < 4; lv++) {
    const g = E.newGame(lv, { demo: true, seed: 3 + lv });
    let lastX = 0, stuck = 0, frames = 0, reached = -1;
    while (g.status === 'play' && frames < 60 * 60 * 6) {
      const p = g.player;
      if (Math.abs(p.x - lastX) < 0.1) stuck++; else stuck = 0; lastX = p.x;
      const inArena = g.cam.x >= E.CAM_MAX - 1;
      if (inArena && reached < 0) reached = frames;
      let inp;
      if (inArena) {
        // 去平台打核心，偶尔斜上打上层炮台
        const onPlat = p.y === 185 && p.x >= 5860 && p.x <= 5960;
        inp = { right: !onPlat && p.x < 5900, left: !onPlat && p.x > 5950, fire: true, jump: !onPlat && p.onGround && p.x > 5880 && frames % 20 < 2 };
      } else {
        inp = { right: true, fire: true, up: frames % 90 < 20, jump: (stuck > 3 || (p.onGround && E.landY(g, p.x + 16, p.y, p.y + 20, false) === null)) && frames % 4 < 2 };
      }
      E.update(g, inp); g.events.length = 0; frames++;
    }
    ok(reached > 0 && g.status === 'won', E.LEVELS[lv].name + '：' + (reached / 60).toFixed(0) + ' 秒到关底，' + (frames / 60).toFixed(0) + ' 秒通关，分数 ' + g.score);
  }
}

console.log('绘制（假 canvas，确保不抛错）');
{
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' ? () => ({ addColorStop: noop }) : noop)), set: (t, k, v) => { t[k] = v; return true; } });
  let err = null;
  try {
    const g = E.newGame(1, { demo: true, seed: 9 });
    for (let i = 0; i < 4000; i++) { E.update(g, { right: true, fire: true, jump: i % 50 < 2, up: i % 120 < 30, down: i % 300 > 280 }); if (i % 7 === 0) E.render(ctx, g); }
    g.cam.x = E.CAM_MAX; g.player.x = 5900; for (let i = 0; i < 200; i++) { E.update(g, { fire: true }); E.render(ctx, g); }
    const steps = E.demoSteps();
    ok(steps.length === 6, '演示 6 步');
    ok(steps.every(s => s.cap.length <= 40), '演示字幕 ≤40 字');
    steps.forEach((s, k) => { const d = E.newGame(0, { demo: true, noSpawn: true, seed: 7 + k }); s.setup(d); for (let f = 0; f < 190; f++) { E.update(d, s.input(d, f)); if (f % 5 === 0) E.render(ctx, d); } });
    const d5 = E.newGame(0, { demo: true, noSpawn: true, seed: 11 }); steps[4].setup(d5); for (let f = 0; f < 190; f++) E.update(d5, steps[4].input(d5, f));
    ok(d5.player.weapon === 'S', '演示第 5 步确实吃到「散」');
  } catch (e) { err = e; console.log(e); }
  ok(!err, '渲染与演示脚本无异常');
  ok(/^第 1 关 · .+ · 命 ×\d · 分数 \d+$/.test(E.statusText(E.newGame(2))), '状态栏格式：' + E.statusText(E.newGame(2)));
}

console.log('\n' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
