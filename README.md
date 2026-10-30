# 团子棋馆 · Tuanzi Game Hall

点开就能下的四种棋：**中国象棋、国际象棋、五子棋、军棋（陆战棋暗棋）**。

- 和电脑对弈，四档难度：新手 / 入门 / 进阶 / 大师
- 第一次玩先看棋盘动画规则演示（随时可在对局里点「规则」再看）
- 团子教练「苏格拉底式」提示：第一次按「提示」先问你一个问题，第二次才亮出推荐着法
- 悔棋、重开、战绩记录（只存在你自己的浏览器里）
- 纯静态网页，无依赖、无追踪，手机和电脑都能玩

在线试玩：https://games.aiai-academy.com （备用 https://tuanzi-games.pages.dev）

## 结构
- `index.html` 大厅 + 设置 + 演示 + 对局
- `assets/hubv1.0.css|js` 大厅与通用交互（声音、撒花、战绩、教练提问）
- `games/<id>v1.0.js` 每种棋一个模块，接口见 `SPECv1.0.md`
- `tests/<id>-testv1.0.js` 规则与 AI 自测：`node tests/xiangqi-testv1.0.js`

由 [团子 AI 学院](https://aiai-academy.com) 出品，插画为 AI 生成。
