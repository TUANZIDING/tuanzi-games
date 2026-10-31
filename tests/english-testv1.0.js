// node tests/english-testv1.0.js
global.window = {};
const fs = require('fs');
const path = require('path');
// localStorage 模拟
const LS = {}; window.localStorage = { getItem: k => (k in LS ? LS[k] : null), setItem: (k, v) => { LS[k] = String(v); }, removeItem: k => { delete LS[k]; } };
require('../games/englishv1.0.js');
const G = window.TZGAMES.english;
const E = G._engine;
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }

console.log('注册信息');
ok(G.id === 'english' && G.name === '英语大冒险' && G.tagline.length <= 14, 'id/name/tagline');
ok(G.levels.join() === '新手,入门,进阶,大师', '4 个难度');
ok(G.sides.length === 1 && G.sides[0] === '单人', 'sides 单人');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo 存在');

console.log('内容');
ok(E.SCENES.length === 9, '9 个场景');
E.SCENES.forEach((sc, i) => {
  const enW = sc.words.map(w => w[0].toLowerCase()), pics = sc.words.map(w => w[2]);
  ok(sc.words.length >= 8 && sc.words.length <= 12 && sc.sents.length >= 4 && sc.rally.length >= 4,
    `第${i + 1}站「${sc.zh}」${sc.les}：${sc.words.length} 词 / ${sc.sents.length} 句 / ${sc.rally.length} 组对打`);
  ok(new Set(enW).size === enW.length && new Set(pics).size === pics.length, `第${i + 1}站：单词与图片都不重复`);
  ok(sc.sents.every(s => E.tilesOf(s[0]).join(' ') === s[0] && E.tilesOf(s[0]).length >= 2 && s[1]), `第${i + 1}站：每句都能由单词块拼回原句`);
  ok(sc.rally.every(r => r[1] !== r[2] && r[1] !== r[3] && r[2] !== r[3] && r[4]), `第${i + 1}站：对打错误选项都和正确回答不同`);
});
{
  const src = fs.readFileSync(path.join(__dirname, '../games/englishv1.0.js'), 'utf8');
  const bad = ['pikachu', 'pokémon', 'pokemon', 'poké', 'pokeball', '宝可梦', '皮卡丘', '精灵球', '哈小浪', 'charmander', 'squirtle', 'bulbasaur'];
  const data = JSON.stringify(E.SCENES).toLowerCase() + JSON.stringify(E.MONSTERS).toLowerCase();
  ok(bad.every(b => data.indexOf(b) < 0), '数据里没有受版权保护的名字');
  ok(bad.every(b => src.toLowerCase().indexOf(b) < 0), '整个源文件里也没有');
  // 不照搬课本对话原句
  const nce = ['Is this your handbag?', 'My coat and my umbrella please.', 'Whose shirt is that?', 'What colour is your new dress?', 'Come upstairs and see it.', 'Are your friends Danish too?', 'This is Miss Sophie Dupont.', 'Perhaps it is Tim\'s.'];
  const allEn = [].concat(...E.SCENES.map(s => s.sents.map(x => x[0]).concat(...s.rally.map(r => r.slice(0, 4)))));
  ok(nce.every(l => allEn.indexOf(l) < 0), '没有照搬教材原句（' + allEn.length + ' 条英文全检查）');
  ok(E.MONSTERS.length === 12 && new Set(E.MONSTERS.map(m => m.zh)).size === 12, '12 只原创团团兽：' + E.MONSTERS.map(m => m.zh).join(' '));
}

console.log('题目');
{
  const rng = E.mulberry32(42);
  let wordOk = true, picOk = true, sentOk = true, distOk = true, rallyOk = true, shuffled = 0, sentTotal = 0;
  for (let lv = 0; lv < 4; lv++) {
    const L = E.LEVELS[lv];
    E.SCENES.forEach((sc, si) => {
      sc.words.forEach((w, k) => {
        const q = E.wordQuestion(E.getItem(E.itemId('w', si, k)), lv, rng);
        if (q.options.length !== L.wordOpts || q.options[q.answer].en !== w[0]) wordOk = false;
        const ens = q.options.map(o => o.en), ps = q.options.map(o => o.pic);
        if (new Set(ens).size !== ens.length || new Set(ps).size !== ps.length) picOk = false;
      });
      sc.sents.forEach((s, k) => {
        const q = E.sentenceQuestion(E.getItem(E.itemId('s', si, k)), lv, rng);
        sentTotal++;
        const real = q.pool.filter(p => !p.d).map(p => p.t).sort().join('|'), ans = E.tilesOf(s[0]).slice().sort().join('|');
        if (real !== ans) sentOk = false;
        const dis = q.pool.filter(p => p.d);
        if (dis.length !== L.distract) distOk = false;
        const ansN = E.tilesOf(s[0]).map(E.norm);
        if (dis.some(d => ansN.indexOf(E.norm(d.t)) >= 0)) distOk = false;
        if (q.pool.map(p => p.t).join(' ') !== s[0]) shuffled++;
      });
      sc.rally.forEach((r, k) => {
        const q = E.rallyQuestion(E.getItem(E.itemId('r', si, k)), lv, rng);
        if (q.options.length !== L.rallyOpts || q.options[q.answer] !== r[1] || q.options.filter(o => o === r[1]).length !== 1) rallyOk = false;
      });
    });
  }
  ok(wordOk, '单词捕捉：选项数 新手 3 / 入门 3→4 / 进阶 4 / 大师 4，正确答案在里面');
  ok(E.LEVELS.map(l => l.wordOpts).join() === '3,4,4,4' && E.LEVELS.map(l => l.rallyOpts).join() === '2,3,3,3', '各档选项数：单词 3,4,4,4；对打 2,3,3,3');
  ok(picOk, '同一题里的选项单词、图片都不重复');
  ok(sentOk, '句子块（去掉干扰块）正好是原句的单词');
  ok(distOk, '只有大师有 2 个干扰块，且干扰块和答案里的词都不同');
  ok(shuffled === sentTotal, '单词块一定被打乱（' + shuffled + '/' + sentTotal + '）');
  ok(rallyOk, '对打：正确回答只出现一次');
  ok(E.LEVELS[0].shuttle > E.LEVELS[1].shuttle && E.LEVELS[1].shuttle > E.LEVELS[2].shuttle && E.LEVELS[2].shuttle > E.LEVELS[3].shuttle && E.LEVELS[0].shuttle === 6000, '羽毛球速度：' + E.LEVELS.map(l => l.shuttle / 1000 + 's').join(' > '));
  ok(E.LEVELS[0].zhWord && E.LEVELS[0].zhBuild && !E.LEVELS[2].zhBuild && !E.LEVELS[3].zhWord, '新手总有中文提示，进阶/大师减少');
  const types = [0, 1, 2, 3].map(lv => { const c = {}; for (let i = 0; i < 400; i++) { const t = E.pickType(lv, rng); c[t] = (c[t] || 0) + 1; } return c; });
  ok(types[0].pic > types[0].word && types[1].word > types[1].pic && !types[2].pic && types[2].listen > types[2].word && !types[3].pic && types[3].listen > 0,
    '题型分布 ' + JSON.stringify(types));
}

console.log('进度 / 解锁 / 星星');
{
  const p = E.defaultProgress();
  ok(E.isUnlocked(p, 0) && !E.isUnlocked(p, 1) && E.unlockedList(p).length === 1, '开始只开放第 1 站');
  let r = E.recordScene(p, 0, 2);
  ok(r.newCatch && p.stars[0] === 2 && E.isUnlocked(p, 1) && !E.isUnlocked(p, 2) && E.isCaught(p, 0), '第 1 站过关 → 抓到包包兔，开放第 2 站');
  r = E.recordScene(p, 0, 1);
  ok(!r.newCatch && p.stars[0] === 2, '重玩分数低不会降星');
  r = E.recordScene(p, 0, 3); ok(r.improved && p.stars[0] === 3, '重玩分数高会升星');
  ok(E.nextScene(p) === 1, '下一站 = 第 2 站');
  p.all = true; ok(E.unlockedList(p).length === 9, '家长「全部解锁」');
  p.all = false;
  for (let i = 1; i < 9; i++) E.recordScene(p, i, 1);
  ok(E.totalStars(p) === 11 && p.bonus[9] && !p.bonus[10], '总星 11 → 解锁星星鲸（需 10⭐）');
  for (let i = 0; i < 9; i++) r = E.recordScene(p, i, 3);
  ok(p.bonus[10] && p.bonus[11] && E.MONSTERS.every((m, k) => E.isCaught(p, k)), '27⭐ 全部抓齐 12 只');
  ok(E.starsFor(9, 10) === 3 && E.starsFor(8, 10) === 2 && E.starsFor(7, 10) === 2 && E.starsFor(6, 10) === 1 && E.starsFor(0, 10) === 1 && E.starsFor(0, 0) === 3, '星星：≥90% 3 星，≥70% 2 星，否则 1 星（永不 0 星）');
  const n = E.normalizeProgress({ stars: [5, -1, 'x'], box: { 'w|0|1': { b: 2, n: 3 }, 'w|99|0': { b: 1, n: 0 }, 'w|0|2': { b: 9, n: 1 } }, bonus: { 9: 1, 3: 1 } });
  ok(n.stars[0] === 3 && n.stars[1] === 0 && n.stars[2] === 0 && Object.keys(n.box).join() === 'w|0|1' && n.bonus[9] && !n.bonus[3], '读档容错：坏数据被清理');
  ok(E.normalizeProgress(null).stars.length === 9, '空存档 → 默认进度');
  E.saveProgress(p); ok(JSON.parse(LS[E.STORE]).stars.join() === '3,3,3,3,3,3,3,3,3' && E.loadProgress().stars[8] === 3, '存档 key = tz-eng-v1，可读回');
  delete LS[E.STORE];
}

console.log('Leitner 复习盒');
{
  const box = {};
  E.leitnerMiss(box, 'w|0|1', 5);
  ok(box['w|0|1'].b === 1 && E.leitnerDue(box, 5).length === 0 && E.leitnerDue(box, 6)[0] === 'w|0|1', '答错 → 进 1 号盒，下次冒险复习');
  E.leitnerHit(box, 'w|0|1', 6); ok(box['w|0|1'].b === 2 && E.leitnerDue(box, 7).length === 0 && E.leitnerDue(box, 8).length === 1, '答对 → 2 号盒，隔 2 次再复习');
  E.leitnerHit(box, 'w|0|1', 8); E.leitnerHit(box, 'w|0|1', 12); ok(box['w|0|1'].b === 4, '升到 4 号盒');
  E.leitnerHit(box, 'w|0|1', 20); ok(!box['w|0|1'], '4 号盒再答对 → 毕业移出');
  E.leitnerMiss(box, 'w|0|2', 3); E.leitnerHit(box, 'w|0|3', 3);
  ok(!box['w|0|3'], '没进过盒子的答对不加入');
  E.leitnerMiss(box, 's|0|0', 1); E.leitnerHit(box, 's|0|0', 1); E.leitnerMiss(box, 'w|0|4', 2); E.leitnerMiss(box, 'r|1|0', 1); E.leitnerMiss(box, 'w|0|2', 4);
  const due = E.leitnerDue(box, 10);
  ok(due[0] === 'r|1|0' && due[due.length - 1] === 's|0|0', '到期顺序：低盒子、旧的在前 ' + JSON.stringify(due));
  // 复习题混进后面的冒险
  const p = E.defaultProgress(); p.stars[0] = 2; p.session = 10;
  p.box = { 'w|0|1': { b: 1, n: 9 }, 'w|0|3': { b: 1, n: 9 }, 'w|0|5': { b: 1, n: 9 }, 's|0|2': { b: 1, n: 8 }, 'r|0|1': { b: 2, n: 5 }, 'w|5|0': { b: 1, n: 1 } };
  const plan = E.buildPlan(1, 0, p, E.mulberry32(3));
  ok(plan[0].filter(id => id.startsWith('w|0|')).length === 2 && plan[0].length === 6 + 2, '第 2 站新手：6 个新词 + 2 个复习词');
  ok(plan[1].indexOf('s|0|2') >= 0 && plan[2].indexOf('r|0|1') >= 0, '复习句子、对打也混进来');
  ok(plan[0].indexOf('w|5|0') < 0, '还没解锁的站的复习不出现');
  ok(plan[0][0].startsWith('w|1|'), '复习题插在中间，不打头');
  const s = new E.Session(1, 0, p, E.mulberry32(9));
  // 答错的题本局稍后再来一次
  const first = s.q.item.id; s.pick((s.q.answer + 1) % s.q.options.length);
  ok(s.queue[s.queue.length - 1] === first && p.box[first] && p.box[first].b === 1 && p.box[first].n === 10, '本局答错：排到队尾再来，并进 1 号盒');
  s.next(); while (s.q.item.id !== first) { s.pick(s.q.answer); s.next(); }
  ok(!s.q.first && s.pick(s.q.answer).ok && s.total === 8 && s.correct === 7, '再来一次答对不重复计分（8 题对 7）');
}

console.log('大师：混合已解锁场景');
{
  const p = E.defaultProgress(); p.stars = [2, 2, 1, 0, 0, 0, 0, 0, 0];
  const plan = E.buildPlan(3, 3, p, E.mulberry32(5));
  const sc = plan.map(a => a.map(id => +id.split('|')[1]));
  ok(sc[0].some(x => x !== 3) && sc[0].every(x => x <= 3) && sc[1].some(x => x !== 3) && sc[2].some(x => x !== 3), '大师在第 4 站混入 1–3 站的词、句、对打');
  ok(E.buildPlan(3, 2, p, E.mulberry32(5)).every(a => a.every(id => id.split('|')[1] === '3')), '进阶不混合');
}

console.log('Session：完整一站');
{
  for (let lv = 0; lv < 4; lv++) {
    const p = E.defaultProgress(); p.all = true;
    const s = new E.Session(lv * 2, lv, p, E.mulberry32(100 + lv));
    let guard = 0, missOnce = false, hintW = false, hintS = false, undone = false, landedOnce = false;
    while (!s.done && guard++ < 200) {
      const q = s.q;
      if (q.kind === 'w') {
        if (!hintW) { const d = s.hintWord(); hintW = d >= 0 && d !== q.answer; }
        if (!missOnce) { missOnce = true; const w = q.options.findIndex((o, i) => i !== q.answer && !q.dim[i]); s.pick(w); } else s.pick(q.answer);
      } else if (q.kind === 's') {
        if (!undone) { s.place(q.pool.findIndex(t => !t.used)); undone = s.undoTile() && q.line.length === 0; }
        if (!hintS) { const r = s.hintTile(); hintS = r && q.pool[q.line[0]].t === q.answer[0]; }
        q.answer.forEach((t, i) => { if (q.line.length > i) return; s.place(q.pool.findIndex(x => !x.used && x.t === t)); });
        if (!s.check().ok) throw new Error('builder');
      } else {
        if (s.hits === 1 && !landedOnce) { landedOnce = true; s.land(); } else s.reply(q.answer);
      }
      s.next();
    }
    ok(s.done && s.hits === 5 && s.total > 0, E.LEVELS[lv].name + '：走完三格，对打 5 球，准确率 ' + s.correct + '/' + s.total + ' → ' + s.stars() + '⭐');
    ok(hintW && hintS && undone, E.LEVELS[lv].name + '：提示去掉错项 / 放下一块，撤销拿回一块');
  }
  // 拼错：错误时整句再来
  const s = new E.Session(0, 3, E.defaultProgress(), E.mulberry32(1));
  while (s.q.kind !== 's') { s.pick(s.q.answer); s.next(); }
  const q = s.q, rev = q.answer.slice().reverse();
  let tilesUsed = 0; rev.forEach(t => { const k = q.pool.findIndex(x => !x.used && x.t === t); if (k >= 0) { s.place(k); tilesUsed++; } });
  const wrongWay = q.answer.join(' ') !== rev.join(' ');
  ok(tilesUsed === q.answer.length && (!wrongWay || (s.check().ok === false && s.queue[s.queue.length - 1] === q.item.id)), '句子拼错 → 温柔给出答案，稍后再来');
  // 干扰块放上去也算拼错
  const s2 = new E.Session(0, 3, E.defaultProgress(), E.mulberry32(2));
  while (s2.q.kind !== 's') { s2.pick(s2.q.answer); s2.next(); }
  const q2 = s2.q, dk = q2.pool.findIndex(t => t.d);
  s2.place(dk); for (let i = 1; i < q2.answer.length; i++) s2.place(q2.pool.findIndex(x => !x.used && !x.d));
  ok(dk >= 0 && s2.check().ok === false, '大师：用了干扰块就不对');
  // 对打：点错一次，还能在落地前补救
  const s3 = new E.Session(0, 1, E.defaultProgress(), E.mulberry32(3));
  s3.jump(2); const q3 = s3.q, wrong = (q3.answer + 1) % q3.options.length;
  ok(s3.reply(wrong).ok === false && s3.reply(wrong) === null && s3.reply(q3.answer).ok && s3.hits === 1 && s3.correct === 0, '对打点错不结束这一球，补救成功算一拍但不算首答正确');
  // 对打最多 12 个发球也会结束
  const s4 = new E.Session(0, 0, E.defaultProgress(), E.mulberry32(4)); s4.jump(2);
  let g = 0; while (!s4.done && g++ < 50) { s4.land(); s4.next(); }
  ok(s4.done && s4.serves === E.RALLY_MAX && s4.stars() === 1, '一直没接到也不会卡住：' + E.RALLY_MAX + ' 球后结束，仍给 1 星');
}

console.log('发音');
{
  ok(E.speak('hello') === null, '没有 speechSynthesis 时安全跳过');
  const spoken = []; let cancels = 0;
  window.speechSynthesis = { speak: u => spoken.push(u), cancel: () => { cancels++; }, getVoices: () => [{ lang: 'fr-FR', name: 'Thomas' }, { lang: 'en-GB', name: 'Daniel' }, { lang: 'en-US', name: 'Fred' }, { lang: 'en-US', name: 'Samantha' }] };
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  const u = E.speak('My name is Tuanzi.');
  ok(u && spoken.length === 1 && u.rate === 0.85 && u.voice.name === 'Samantha' && u.lang === 'en-US' && cancels === 1, '用 en-US 声音（Samantha），语速 0.85，先停掉上一句');
  ok(E.pickVoice([{ lang: 'de-DE' }, { lang: 'en-GB', name: 'Kate' }]).lang === 'en-GB' && E.pickVoice([{ lang: 'zh-CN' }]) === null, '没有美音用英音，都没有返回 null');
  delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
}

/* ---------- 轻量 DOM 模拟 ---------- */
function mkEl(tag) {
  const e = {
    tagName: String(tag).toUpperCase(), children: [], parent: null, attrs: {}, listeners: {}, _cls: '', _text: '', isConnected: true,
    style: { setProperty(k, v) { this[k] = v; } },
    get className() { return this._cls; }, set className(v) { this._cls = v; },
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); },
    set textContent(v) { this._text = String(v); this.children = []; },
    set innerHTML(v) { this.children = []; this._text = String(v).replace(/<[^>]+>/g, ''); this._html = String(v); },
    get innerHTML() { return this._html || ''; },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f); },
    closest(sel) { const c = sel.slice(1); let n = this; while (n) { if ((' ' + n._cls + ' ').includes(' ' + c + ' ')) return n; n = n.parent; } return null; }
  };
  return e;
}
function all(e, pred, out = []) { if (pred(e)) out.push(e); e.children.forEach(c => all(c, pred, out)); return out; }
function hasCls(e, c) { return (' ' + e._cls + ' ').includes(' ' + c + ' '); }
global.document = { hidden: false, head: mkEl('head'), createElement: mkEl, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
const realST = setTimeout, realCT = clearTimeout;
const live = new Set();
global.setTimeout = (f, ms) => { const t = realST(() => { live.delete(t); f(); }, Math.max(0, (ms || 0) / 40)); live.add(t); return t; };
global.clearTimeout = t => { live.delete(t); realCT(t); };
const sleep = ms => new Promise(r => realST(r, ms));
function fire(el, type) { const ev = { target: el, preventDefault() {} }; let n = el; while (n) { (n.listeners[type] || []).forEach(f => f(ev)); n = n.parent; } }

(async function () {
  console.log('界面（模拟 DOM）');
  for (let lv = 0; lv < 4; lv++) {
    for (const k in LS) delete LS[k];
    const host = mkEl('div'), sounds = [], status = [], ends = [], said = [];
    const ctl = G.mount(host, { level: lv, onStatus: s => status.push(s), onEnd: r => ends.push(r), sound: n => sounds.push(n), speak: t => said.push(t), rng: E.mulberry32(500 + lv) });
    let st = ctl._state();
    const stops = all(host, e => hasCls(e, 'eng-stop'));
    const wrap = st.view.wrap;
    ok(st.screen === 'map' && stops.length === 9 && stops.filter(s => hasCls(s, 'eng-lock')).length === 8 && /width:var\(--bw,min\(92vw,560px\)\)/.test(document.head.children[0].textContent), E.LEVELS[lv].name + '：地图 9 站，只有第 1 站亮着；尺寸用 var(--bw,…)');
    fire(stops[3], 'click');
    ok(ctl._state().screen === 'map' && sounds[sounds.length - 1] === 'illegal', '点锁着的站：轻轻提示，不进入');
    ctl.undo(); ok(/撤销/.test(status[status.length - 1]), '地图上撤销 → 只给提示');
    const si = lv === 3 ? 2 : 0;
    if (lv === 3) { // 大师：先开家长全部解锁，再进第 3 站
      fire(all(host, e => e.attrs['data-a'] === 'all')[0], 'click');
      ok(ctl._state().prog.all && all(host, e => hasCls(e, 'eng-lock')).length === 0, '家长「全部解锁」生效');
    }
    fire(all(host, e => hasCls(e, 'eng-stop'))[si], 'click');
    st = ctl._state();
    ok(st.screen === 'scene' && st.sub === 'intro' && st.prog.session === 1, '进入第 ' + (si + 1) + ' 站，先看第 1 格标题');
    await sleep(60);
    st = ctl._state();
    ok(st.sub === 'play' && st.q.kind === 'w' && all(host, e => hasCls(e, 'eng-opt')).length === E.LEVELS[lv].wordOpts, '单词捕捉：' + E.LEVELS[lv].wordOpts + ' 个大按钮（' + st.q.type + '）');
    ok(said.length > 0 && said[said.length - 1] === st.q.item.en, '自动读出单词「' + st.q.item.en + '」');
    // 提示：再读一遍 + 去掉一个错误项
    const n0 = said.length; ctl.hint();
    ok(said.length === n0 + 1 && all(host, e => hasCls(e, 'eng-dim')).length === 1, '提示：再读一遍，暗掉一个错的');
    // 第一题故意点错
    const wrongI = st.q.options.findIndex((o, i) => i !== st.q.answer && !st.q.dim[i]);
    fire(all(host, e => e.attrs['data-a'] === 'opt' && e.attrs['data-i'] === String(wrongI))[0], 'click');
    ok(all(host, e => hasCls(e, 'eng-yes')).length === 1 && sounds.indexOf('illegal') >= 0 && !/错|不对/.test(status[status.length - 1]), '点错：亮出正确答案，语气温柔「' + status[status.length - 1] + '」');
    let guard = 0, sawBuilder = false, sawRally = false, usedUndo = false, usedHintB = false, usedHintR = false, landed = false, ballThrown = false;
    while (ctl._state().screen === 'scene' && guard++ < 400) {
      st = ctl._state();
      if (st.sub !== 'play' || st.lock) { await sleep(8); continue; }
      const q = st.q;
      if (q.kind === 'w') {
        ctl._act('opt', q.answer);
        if (!ballThrown) ballThrown = all(host, e => hasCls(e, 'eng-throw')).length === 1 && sounds.indexOf('select') >= 0;
      } else if (q.kind === 's') {
        sawBuilder = true;
        if (!usedUndo) {
          const k = q.pool.findIndex(t => !t.used); ctl._act('tile', k); ctl.undo(); usedUndo = q.line.length === 0;
          ctl._act('tile', k); fire(all(host, e => e.attrs['data-a'] === 'untile')[0], 'click');
          usedUndo = usedUndo && q.line.length === 0;
        }
        if (!usedHintB) { ctl.hint(); usedHintB = q.line.length === 1 && q.pool[q.line[0]].t === q.answer[0]; }
        q.answer.forEach((t, i) => { if (q.line.length > i || q.finished) return; const k = q.pool.findIndex(x => !x.used && x.t === t); fire(all(host, e => e.attrs['data-a'] === 'tile' && e.attrs['data-i'] === String(k))[0], 'click'); });
      } else {
        sawRally = true;
        if (!landed) { await sleep(E.LEVELS[lv].shuttle / 40 + 120); landed = ctl._state().lock && all(host, e => hasCls(e, 'eng-down')).length === 1; continue; }
        if (!usedHintR) { ctl.hint(); usedHintR = all(host, e => hasCls(e, 'eng-hl')).length === 1 && st.rally && st.rally.dur > E.LEVELS[lv].shuttle; }
        ctl._act('reply', q.answer);
      }
      await sleep(5);
    }
    st = ctl._state();
    ok(ballThrown, '答对：扔出团子球');
    ok(sawBuilder && usedUndo && usedHintB, '句子拼拼乐：点块上去 / 点回来 / 撤销 / 提示放下一块');
    ok(sawRally && landed && usedHintR, '羽毛球：球落地显示答案并继续；提示让球变慢并亮出答案');
    ok(st.screen === 'caught' && st.prog.stars[si] >= 1, '完成：抓到 ' + E.MONSTERS[si].zh + '，' + st.prog.stars[si] + '⭐');
    await sleep(80);
    ok(ends.length === 1 && ends[0].winner === 'player' && /^抓到了 .+！⭐{1,3}$/.test(ends[0].reason), 'onEnd：' + JSON.stringify(ends[0]));
    ok(sounds.indexOf('capture') >= 0 && sounds.indexOf('move') >= 0, '音效 select/move/capture/illegal 都用到');
    const saved = JSON.parse(LS['tz-eng-v1']);
    ok(saved.stars[si] === st.prog.stars[si] && Object.keys(saved.box).length >= 1, '存档：星星 + 复习盒（' + Object.keys(saved.box).length + ' 项）');
    // 图鉴
    fire(all(host, e => e.attrs['data-a'] === 'dex')[0], 'click');
    st = ctl._state();
    const cards = all(host, e => hasCls(e, 'eng-mc'));
    ok(st.screen === 'dex' && cards.length === 12 && cards.filter(c => !all(c, e => hasCls(e, 'eng-sil')).length).length === 1 && all(host, e => hasCls(e, 'eng-new')).length === 1, '图鉴：12 格，新抓到的 1 只闪亮，其余是剪影');
    const nameEl = all(host, e => hasCls(e, 'eng-say'))[0];
    fire(nameEl, 'click'); ok(said[said.length - 1] === E.MONSTERS[si].en, '点英文名字会读：' + said[said.length - 1]);
    // restart：在地图上 → 地图；在场景里 → 重开本站
    ctl.restart(); ok(ctl._state().screen === 'map', 'restart（不在场景里）→ 地图');
    const nx = lv === 3 ? 2 : 1;
    ctl._act('scene', nx); await sleep(60);
    ok(ctl._state().screen === 'scene' && ctl._state().session.si === nx, '下一站已解锁，可以进入');
    ctl.restart(); st = ctl._state();
    ok(st.screen === 'scene' && st.sub === 'intro' && st.session.si === nx && st.prog.session === 2, 'restart（场景里）→ 重开本站');
    await sleep(60);
    // 进行中销毁：计时器全部清掉，不再有回调
    const endsBefore = ends.length, sBefore = sounds.length;
    ctl.destroy();
    ok(ctl._state().timers === 0 && host.children.length === 0 && (wrap.listeners.click || []).length === 0, 'destroy：清空 DOM、监听和计时器');
    await sleep(60);
    ok(ends.length === endsBefore && sounds.length === sBefore, 'destroy 之后没有任何回调');
  }
  // 复习：第 1 站答错的词出现在第 2 站
  {
    for (const k in LS) delete LS[k];
    const p = E.defaultProgress(); p.stars[0] = 1; p.session = 3; p.box = { 'w|0|0': { b: 1, n: 3 } }; E.saveProgress(p);
    const host = mkEl('div'), ctl = G.mount(host, { level: 0, speak: () => {}, rng: E.mulberry32(1) });
    ctl._act('scene', 1);
    const plan = ctl._state().session.plan[0];
    ok(plan.indexOf('w|0|0') > 0, '上次答错的 handbag 混进第 2 站复习');
    ctl.destroy();
  }

  console.log('演示');
  {
    for (const k in LS) delete LS[k];
    const dh = mkEl('div'), caps = []; let doneFlag = false;
    G.demo(dh, { onCaption: c => caps.push(c), onDone: () => { doneFlag = true; } });
    await sleep(600);
    ok(doneFlag && caps.length >= 5 && caps.length <= 8 && caps.every(c => c.length <= 40), 'demo ' + caps.length + ' 步，都 ≤40 字');
    caps.forEach(c => console.log('      · ' + c));
    ok(all(dh, e => hasCls(e, 'eng-dex')).length === 1 && all(dh, e => hasCls(e, 'eng-demo')).length === 1, '最后停在图鉴，演示模式不可点');
    const before = live.size;
    let late = false; const d3 = G.demo(mkEl('div'), { onDone: () => { late = true; }, onCaption: () => {} });
    const mid = live.size; d3.stop();
    await sleep(600);
    ok(!late && mid > before && live.size === 0, 'stop() 清除全部计时器（' + (mid - before) + ' 个）');
    ok(!LS['tz-eng-v1'], '演示不写存档');
  }

  console.log('\n' + pass + ' 通过, ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
