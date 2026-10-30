// node tests/xiangqi-testv1.0.js
global.window = {};
require('../games/xiangqiv1.0.js');
var G = window.TZGAMES.xiangqi, E = G._engine;
var assert = require('assert');
var K = E.K, A = E.A, B = E.B, N = E.N, R = E.R, C = E.C, P = E.P, BLK = 8;
var pass = 0;
function ok(name, fn) { fn(); pass++; console.log('  ✓ ' + name); }
function sq(r, c) { return r * 9 + c; }
function pos(list) { var b = new Int8Array(90); list.forEach(function (x) { b[sq(x[0], x[1])] = x[2]; }); return b; }
function targets(b, side, s) { return E.legalMoves(b, side, s).map(function (m) { return m & 255; }).sort(function (a, b) { return a - b; }); }

console.log('xiangqi engine tests');
ok('registration contract', function () {
  assert.strictEqual(G.id, 'xiangqi'); assert.strictEqual(G.name, '中国象棋');
  assert.deepStrictEqual(G.sides, ['红方', '黑方']); assert.strictEqual(G.levels.length, 4);
  assert.strictEqual(typeof G.mount, 'function'); assert.strictEqual(typeof G.demo, 'function');
});
ok('start position: red 44 legal moves, black 44', function () {
  var b = E.startBoard();
  assert.strictEqual(E.legalMoves(b, 0).length, 44);
  assert.strictEqual(E.legalMoves(b, 1).length, 44);
});
ok('horse moves + 蹩马腿', function () {
  var b = E.startBoard();
  assert.deepStrictEqual(targets(b, 0, sq(9, 1)), [sq(7, 0), sq(7, 2)]);
  var b2 = pos([[0, 3, K | BLK], [9, 4, K], [7, 4, N], [6, 4, P]]);
  var t = targets(b2, 0, sq(7, 4));
  assert.strictEqual(t.length, 6);
  assert(t.indexOf(sq(5, 3)) < 0 && t.indexOf(sq(5, 5)) < 0);
});
ok('elephant: 塞象眼 and cannot cross river', function () {
  var b = pos([[0, 3, K | BLK], [9, 4, K], [5, 2, B], [6, 1, P]]);
  assert.deepStrictEqual(targets(b, 0, sq(5, 2)), [sq(7, 4)]);
  var b2 = pos([[0, 3, K | BLK], [9, 4, K], [4, 2, B | BLK]]);
  assert.deepStrictEqual(targets(b2, 1, sq(4, 2)), [sq(2, 0), sq(2, 4)]);
});
ok('advisor and general stay in palace', function () {
  var b = pos([[0, 3, K | BLK], [9, 4, K], [9, 3, A]]);
  assert.deepStrictEqual(targets(b, 0, sq(9, 3)), [sq(8, 4)]);
  var b2 = pos([[0, 5, K | BLK], [7, 3, K]]);
  assert.deepStrictEqual(targets(b2, 0, sq(7, 3)), [sq(7, 4), sq(8, 3)]);
});
ok('cannon jumps exactly one screen to capture', function () {
  var b = E.startBoard();
  var t = targets(b, 0, sq(7, 1));
  assert(t.indexOf(sq(0, 1)) >= 0, 'cannon should capture horse over cannon screen');
  assert(t.indexOf(sq(2, 1)) < 0, 'cannon cannot capture without a screen');
  assert(t.indexOf(sq(1, 1)) < 0, 'cannon cannot move past screen without capturing');
});
ok('soldier: forward only before river, sideways after', function () {
  var b = pos([[0, 3, K | BLK], [9, 5, K], [6, 4, P], [4, 0, P]]);
  assert.deepStrictEqual(targets(b, 0, sq(6, 4)), [sq(5, 4)]);
  assert.deepStrictEqual(targets(b, 0, sq(4, 0)), [sq(3, 0), sq(4, 1)]);
  var b2 = pos([[0, 3, K | BLK], [9, 5, K], [5, 4, P | BLK]]);
  assert.deepStrictEqual(targets(b2, 1, sq(5, 4)), [sq(5, 3), sq(5, 5), sq(6, 4)]);
});
ok('flying general (将帅照面) is illegal and counts as check', function () {
  var b = pos([[0, 3, K | BLK], [9, 4, K]]);
  assert.deepStrictEqual(targets(b, 0, sq(9, 4)), [sq(8, 4), sq(9, 5)]);
  var b2 = pos([[0, 4, K | BLK], [9, 4, K]]);
  assert(E.inCheck(b2, 0) && E.inCheck(b2, 1));
});
ok('pinned piece cannot leave the line (no self-check)', function () {
  var b = pos([[0, 3, K | BLK], [1, 4, R | BLK], [5, 4, R], [9, 4, K]]);
  var t = targets(b, 0, sq(5, 4));
  assert.strictEqual(t.length, 7);
  t.forEach(function (s) { assert.strictEqual(s % 9, 4); });
});
ok('checkmate detected = loss for side to move', function () {
  var b = pos([[0, 4, K | BLK], [1, 0, R], [0, 8, R], [9, 3, K]]);
  var gs = E.gameStatus(b, 1, []);
  assert(gs.over && gs.loser === 1 && gs.reason === 'mate');
});
ok('stalemate (困毙) detected = loss for side to move', function () {
  var b = pos([[0, 4, K | BLK], [1, 3, P], [1, 5, P], [9, 3, K]]);
  assert(!E.inCheck(b, 1));
  var gs = E.gameStatus(b, 1, []);
  assert(gs.over && gs.loser === 1 && gs.reason === 'stalemate');
});
ok('start position not over', function () { assert(!E.gameStatus(E.startBoard(), 0, []).over); });

function legalSet(b, side) { var s = {}; E.legalMoves(b, side).forEach(function (m) { s[m] = 1; }); return s; }
[0, 1, 2, 3].forEach(function (lv) {
  ok('AI level ' + lv + ' returns legal move in time (start, both sides)', function () {
    [0, 1].forEach(function (side) {
      var b = E.startBoard();
      if (side === 1) { b[sq(7, 4)] = b[sq(7, 1)]; b[sq(7, 1)] = 0; } // 当头炮
      var t0 = Date.now(), r = E.bestMove(b, side, lv, []), dt = Date.now() - t0;
      assert(r && legalSet(b, side)[r.move], 'legal');
      assert(dt < 1500, 'took ' + dt + 'ms');
      console.log('      side ' + side + ': ' + dt + 'ms depth ' + r.depth);
    });
  });
});
ok('AI levels 1-3 find mate in one', function () {
  var b = pos([[0, 4, K | BLK], [1, 0, R], [5, 8, R], [9, 3, K], [3, 0, P | BLK]]);
  [1, 2, 3].forEach(function (lv) {
    var r = E.bestMove(b, 0, lv, []);
    var b2 = new Int8Array(b); b2[r.to] = b2[r.from]; b2[r.from] = 0;
    var gs = E.gameStatus(b2, 1, []);
    assert(gs.over && gs.loser === 1, 'level ' + lv + ' missed mate');
  });
});
ok('AI captures a hanging rook (level 2)', function () {
  var b = pos([[0, 3, K | BLK], [4, 6, R | BLK], [7, 6, C], [6, 6, P], [9, 4, K]]);
  var r = E.bestMove(b, 0, 2, []);
  assert.strictEqual(r.to, sq(4, 6));
});
ok('self-play 40 plies (L3 vs L0) stays legal', function () {
  var b = E.startBoard(), side = 0, hs = [E.hashKey(b, 0)];
  for (var i = 0; i < 40; i++) {
    var gs = E.gameStatus(b, side, hs); if (gs.over) break;
    var r = E.bestMove(b, side, side === 0 ? 3 : 0, hs);
    assert(legalSet(b, side)[r.move]);
    b[r.to] = b[r.from]; b[r.from] = 0; side ^= 1; hs.push(E.hashKey(b, side));
  }
  console.log('      final eval (red+): ' + E.evalBoard(b));
});
console.log('\nALL ' + pass + ' TESTS PASSED');
