// node tests/chess-testv1.0.js
'use strict';
global.window = {};
require('../games/chessv1.0.js');
var G = window.TZGAMES.chess, E = G._engine;
var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } }
function hasUci(P, u) { return E.legalMoves(P).map(E.moveToUci).indexOf(u) >= 0; }

console.log('# module shape');
ok(G.id === 'chess' && G.name === '国际象棋' && G.levels.length === 4 && G.sides[0] === '白方' && G.sides[1] === '黑方', 'registration fields');
ok(typeof G.mount === 'function' && typeof G.demo === 'function', 'mount/demo exist');

console.log('# perft');
var perfts = [
  [E.START_FEN, [20, 400, 8902, 197281]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]], // Kiwipete
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]]
];
perfts.forEach(function (t) {
  var P = E.fromFen(t[0]), fen0 = E.toFen(P);
  t[1].forEach(function (want, i) {
    var t0 = Date.now(), got = E.perft(P, i + 1);
    ok(got === want, 'perft(' + (i + 1) + ')=' + got + ' (want ' + want + ', ' + (Date.now() - t0) + 'ms) ' + t[0].split(' ')[0].slice(0, 20));
  });
  ok(E.toFen(P) === fen0, 'make/unmake restores position');
});

console.log('# special rules');
var P = E.fromFen('3rk3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
ok(hasUci(P, 'e1g1') && !hasUci(P, 'e1c1'), 'castling: O-O ok, O-O-O through attacked d1 forbidden');
P = E.fromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
ok(hasUci(P, 'e1g1') && hasUci(P, 'e1c1'), 'castling both sides allowed when clear');
P = E.fromFen('4k3/4r3/8/8/8/8/8/R3K2R w KQ - 0 1');
ok(!hasUci(P, 'e1g1') && !hasUci(P, 'e1c1'), 'no castling while in check');
P = E.fromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1'); E.make(P, E.moveFromUci(P, 'h1h2')); E.make(P, E.moveFromUci(P, 'e8d8')); E.make(P, E.moveFromUci(P, 'h2h1')); E.make(P, E.moveFromUci(P, 'd8e8'));
ok(!hasUci(P, 'e1g1') && hasUci(P, 'e1c1'), 'rook move loses that castling right');
P = E.fromFen('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1'); E.make(P, E.moveFromUci(P, 'd7d5'));
ok(hasUci(P, 'e5d6'), 'en passant available right after double push');
var m = E.moveFromUci(P, 'e5d6'); E.make(P, m);
ok(P.b[E.sqIdx('d5')] === 0 && P.b[E.sqIdx('d6')] === 1, 'en passant removes captured pawn');
P = E.fromFen('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1'); E.make(P, E.moveFromUci(P, 'd7d5')); E.make(P, E.moveFromUci(P, 'e1d1')); E.make(P, E.moveFromUci(P, 'e8d8'));
ok(!hasUci(P, 'e5d6'), 'en passant expires after one move');
P = E.fromFen('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1');
ok(['b7b8q', 'b7b8r', 'b7b8b', 'b7b8n'].every(function (u) { return hasUci(P, u); }), 'promotion offers 4 pieces');
E.make(P, E.moveFromUci(P, 'b7b8n'));
ok(P.b[E.sqIdx('b8')] === 2, 'under-promotion to knight works');

console.log('# game end detection');
var st = E.status(E.fromFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'));
ok(st.over && st.winner === 1 && st.reason === '将死', "fool's mate = checkmate, black wins");
st = E.status(E.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'));
ok(st.over && st.winner === -1 && /逼和/.test(st.reason), 'stalemate = draw');
st = E.status(E.fromFen('8/8/4k3/8/8/2B5/4K3/8 w - - 0 1'));
ok(st.over && st.winner === -1 && /子力不足/.test(st.reason), 'K+B vs K insufficient material');
st = E.status(E.fromFen('8/8/4k3/8/8/2N5/4K3/8 w - - 0 1'));
ok(st.over && /子力不足/.test(st.reason), 'K+N vs K insufficient material');
st = E.status(E.fromFen('8/8/4k3/8/8/2R5/4K3/8 w - - 0 1'));
ok(!st.over, 'K+R vs K is not a draw');
st = E.status(E.fromFen('8/8/4k3/8/8/2R5/4K3/8 w - - 100 80'));
ok(st.over && /五十/.test(st.reason), '50-move rule');
P = E.fromFen(E.START_FEN);
['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8'].forEach(function (u) { E.make(P, E.moveFromUci(P, u)); });
st = E.status(P);
ok(st.over && /重复三次/.test(st.reason), 'threefold repetition');
P = E.fromFen('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
ok(E.san(P, E.moveFromUci(P, 'd1d8')) === 'Rd8#', 'SAN with mate sign');

console.log('# AI');
var fens = [E.START_FEN, 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'];
for (var lv = 0; lv <= 3; lv++) {
  fens.forEach(function (f, i) {
    var P = E.fromFen(f), fen0 = E.toFen(P), t0 = Date.now();
    var mv = E.think(P, lv), dt = Date.now() - t0;
    var legal = E.legalMoves(P).indexOf(mv) >= 0;
    ok(legal && dt <= 1500 && E.toFen(P) === fen0, 'level ' + lv + ' pos' + i + ': ' + E.moveToUci(mv) + ' legal, ' + dt + 'ms');
    if (i === 2 && lv >= 1) ok(E.moveToUci(mv) === 'd1d8', 'level ' + lv + ' finds mate in 1');
  });
}
P = E.fromFen('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
ok(E.moveToUci(E.think(P, 3)) === 'h5f7', 'level 3 finds scholar mate Qxf7#');
P = E.fromFen('8/8/8/4k3/8/8/8/4K2Q w - - 0 1');
var r = E.bestMove(P, { time: 1200 });
ok(r.score > 500, 'KQ vs K evaluated as winning (score ' + r.score + ', depth ' + r.depth + ')');
// AI plays black against itself a few moves: quick sanity of a game loop
P = E.fromFen(E.START_FEN);
for (var k = 0; k < 16 && !E.status(P).over; k++) E.make(P, E.think(P, 2));
ok(E.legalMoves(P).length >= 0 && P.st.length === k, 'self-play 16 plies at level 2 ok: ' + E.toFen(P));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
