# 团子棋馆 · module contract (v1.0)

Static site, no build step, no external libraries, no network. Vanilla ES2017 JS, works on iPhone Safari (touch) and desktop (mouse). Mobile-first: board must fit a 360–430px wide screen (use width:min(92vw, 560px) square/aspect boards, sized with CSS; use pointer events).

Each game is ONE file `games/<id>v1.0.js` (+ optional `games/<id>v1.0.css`), and registers itself:

```js
window.TZGAMES = window.TZGAMES || {};
window.TZGAMES['<id>'] = {
  id:'<id>', name:'中文名', tagline:'一句话卖点',
  levels:['新手','入门','进阶','大师'],          // exactly 4, index 0..3
  sides:['红方','黑方'],                          // display names; player picks side index 0 or 1
  mount(el, opts) { ... return controller; },
  demo(el, opts) { ... return { stop(){} }; }
};
```

## mount(el, opts)
- `el`: empty div; module owns everything inside (board + small move-list/captured area optional).
- `opts = { level:0..3, side:0|1, onStatus(text), onEnd({winner:'player'|'ai'|'draw', reason:'中文原因'}), sound(name) }`
  - sound names: 'move','capture','check','win','lose','select','illegal'. Call them; hub plays them.
  - onStatus: short Chinese line, e.g. "轮到你走 · 红方", "电脑思考中…", "将军！".
- If player side is the second mover, AI moves first automatically.
- AI must run without freezing the UI for long: hard cap ~1.2 s per move on a phone (use iterative deepening with a time budget, or setTimeout(…,30) before searching so the "思考中" status paints). Level 0 should make obvious mistakes sometimes (beginner friendly); level 3 should be genuinely strong for its game.
- Returns controller: `{ undo(), restart(), hint(), destroy() }`
  - undo: takes back the player's last move AND the AI reply (no-op while AI is thinking).
  - hint: highlight a good move for the player for ~2 s (use the search at level 2 strength).
  - destroy: remove listeners/timers.
- UX must-haves (expert-player view): selected piece highlight, legal-move dots/markers, last-move highlight (both from and to), check warning (where applicable), smooth piece movement (CSS transition ~180ms), captured pieces or move count shown, illegal tap just reselects/clears quietly (sound 'illegal'), game end detected correctly.

## demo(el, opts)
- `opts = { onCaption(text), onDone() }`
- Plays an auto-running rules tutorial ON THE SAME BOARD RENDERING: 5–8 steps, each step sets up a small position, shows caption (Chinese, ≤40 chars, friendly), highlights squares/arrows, animates 1–3 moves. ~2.5–3.5 s per step, then onDone(). Cover: goal (how to win), how each key piece/rule moves, one special rule. Loop not needed. `stop()` must clear all timers.

## Visual tokens (use these CSS vars; hub defines them on :root)
--bg:#fff7ec; --ink:#2b2340; --muted:#7a6f86; --card:#ffffff; --line:#e9dcc8;
--red:#e5484d; --blue:#3b82f6; --green:#22a06b; --yellow:#ffc53d; --purple:#8b5cf6; --orange:#ff8a3d;
--radius:18px; font-family inherited.
Boards should look warm, toy-like, cheerful (soft wood / pastel), pieces chunky with soft shadow, highlight colors: selection var(--yellow), legal dots rgba(34,160,107,.55), last move rgba(255,197,61,.35), check var(--red) pulse.

All class names prefixed with the game id (e.g. `.xq-…`) to avoid collisions. No element ids. Text in Simplified Chinese.

Self-test: include at the bottom of the file nothing extra; but before finishing, write `tests/<id>-testv1.0.js` runnable with `node tests/<id>-testv1.0.js` that loads the pure engine logic (export engine functions also as `window.TZGAMES['<id>']._engine` and guard DOM use so the file can be `require`d in node with a tiny `global.window={}` shim) and asserts key rules (legal move counts from start, checkmate/win detection, AI returns a legal move within time at every level).
