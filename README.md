<h1 align="center">团子棋馆 · Tuanzi Game Hall</h1>

<p align="center"><strong>11 款点开就能玩的网页小游戏：棋类对弈、益智解谜、英语大冒险、横版闯关。</strong><br>
纯浏览器运行，不装 App、不注册、不收集任何数据。电脑、iPad、iPhone 都能玩。</p>

<p align="center"><a href="https://games.aiai-academy.com"><strong>▶ games.aiai-academy.com · 马上开玩</strong></a><br>
<sub>备用 <a href="https://tuanzi-games.pages.dev">tuanzi-games.pages.dev</a> · 出品 <a href="https://aiai-academy.com">团子 AI 学院 aiai-academy.com</a></sub></p>

<p align="center"><img src="assets/hall-herov2.0.webp" alt="团子和小机器人的游戏室" width="860"></p>

## 四个游戏区

<table>
<tr>
<td width="50%"><img src="assets/art/zone-boardv1.0.webp" alt="棋类对弈"></td>
<td width="50%">

### ♟️ 棋类对弈 · 5 款
**中国象棋 · 国际象棋 · 五子棋 · 9 路小围棋 · 军棋（暗棋）**

- 和电脑对弈，四档难度：新手 / 入门 / 进阶 / 大师
- 第一次玩先看 30 秒棋盘动画讲规则
- 团子教练「苏格拉底式」提示：先问你一个问题，再按一次才给推荐着法
- 悔棋、重开、战绩记录

</td>
</tr>
<tr>
<td>

### 🧩 益智解谜 · 4 款
**数独 · 华容道 · 24 点 · 数织**

- 数独四档难度，自动标冲突
- 华容道含「横刀立马」，卡住可以看下一步
- 24 点四张牌加减乘除，保证有解
- 数织 37 幅小图，按数字线索涂出一幅画

</td>
<td><img src="assets/art/zone-puzzlesv1.0.webp" alt="益智解谜"></td>
</tr>
<tr>
<td><img src="assets/art/zone-englishv1.0.webp" alt="英语大冒险"></td>
<td>

### 🔤 英语大冒险 · 7 岁起
跟着地图一站站闯关，覆盖入门英语前 18 课的日常场景：

- **单词捕捉**：听音选词，97 个单词，各配一句原创短例句
- **句子拼拼乐**：把单词拖成一句话
- **羽毛球对打**：一问一答，像打球一样接对话
- 361 段英式发音原声朗读，收集原创「团团兽」伙伴

</td>
</tr>
<tr>
<td>

### 🚀 闯关冒险 · 团子突击队
原创横版跑跳射击：

- 八方向开火，武器胶囊升级
- 跳跃有缓冲和「土狼时间」，小朋友也跳得过水坑
- 手机有虚拟摇杆和「跳 / 射」按钮

</td>
<td><img src="assets/art/zone-blasterv1.0.webp" alt="团子突击队"></td>
</tr>
</table>

## 给开发者

```
index.html                 大厅 + 设置 + 演示 + 游戏界面
assets/hubv1.0.css|js      大厅分区、通用交互（声音、撒花、战绩、教练提问）
assets/art/                分区插画
assets/eng-audio/          英语朗读音频
games/<id>v1.0.js          每款游戏一个模块，接口见 SPECv1.0.md
tests/<id>-testv1.0.js     规则与 AI 自测：node tests/xiangqi-testv1.0.js
scripts/gen-eng-audiov1.0.py  生成英语音频
```

纯静态、零依赖，由 Cloudflare Pages 发布。插画为 AI 生成；所有游戏角色、关卡与英语例句均为原创。
