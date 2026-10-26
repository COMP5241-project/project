# agents.md — 測試工程師與酒吧（testers-bar.html）

給接手修改本專案的 AI agent／開發者的維護指引。

## 這是什麼

單一檔案的 HTML + 動態 SVG 動畫：23 幕「一個測試工程師走進一家酒吧」經典測試工程師笑話。
零外部依賴（無 CDN、無圖片檔），雙擊以瀏覽器開啟即可播放。

## 檔案

| 檔案 | 說明 |
|---|---|
| `testers-bar.html` | 全部程式：CSS 動畫 + SVG 舞台 + 播放引擎 + 23 幕劇本 |
| `testers-bar-engineer-stays.html` | 變體：與主檔相同，唯第 23 幕**主角工程師不逃出酒吧**（留在原位、在火海裡說完台詞）；其餘 22 幕完全一致 |
| `testers-bar-polyu.html` | 變體：內容與 `testers-bar-engineer-stays.html` 相同，頁面外框改為 **PolyU EduGenAI 品牌風格**（README §1：`#A21942` 主色、`#F8F9FA` 背景、白卡 `#E5E7EB` 邊框、`#10B981` 進度條、max-w-7xl 版面）；SVG 舞台與劇本 untouched |
| `agents.md` | 本文件 |

## 執行 / 預覽

- 直接用 Chrome／Edge 開啟 `testers-bar.html`。
- Bionic 內：用 in-app browser 開啟 `file://` URL，**不要**用 side editor（那會顯示原始碼而非畫面）。
- 操作：空白鍵＝播放／暫停，← →＝上一幕／下一幕，也可點按鈕、調 0.5x–2x 速度。

## 播放引擎（重要觀念）

1. **邏輯時鐘** `clock`：rAF 驅動、可暫停、可調速（dt 上限 100ms，防切離分頁時跳格）。
2. **場景 token** `sceneToken`：每次 `goto()`／跳幕／重播會 `token++`。
   舊場景裡所有 `wait/tween/fade` 都會 `resolve(false)` 並停止——這是跳幕安全的核心機制。
3. **守衛式 await（必須遵守）**：場景內每個「會影響流程」的 await 都要寫成：

   ```js
   if (!(await wait(ms, tok))) return;
   if (!(await tween(el, from, to, dur, delay, ease, tok))) return;
   if (!(await Promise.all([...]).then(a => a.every(Boolean)))) return;
   ```

   未 await 的 `tween/floatText/steam/dustPuff` 只能用於**純裝飾**（fire-and-forget），
   因為跳幕後它們會被中斷，不可當作同步屏障。
4. 所有 `tween/wait/fade` 的 promise 都只 resolve、永不 reject——所以 floatText 內的
   `.then` 鏈不需要 `.catch`（不要「為了安全」亂加 catch，會蓋掉 token 檢查）。

## 姿態（pose）語意

```js
pose(x, y, s, r, cx, cy, o)
// applyPose 寫入：transform="translate(x y) rotate(r cx cy) scale(s)" + style.opacity = o
```

注意：**scale 以 SVG 座標原點為中心**。要讓「某個位置上的元素」放大，請把元素內容畫在
(0,0) 附近、再用 translate 定位（`#fx` 層的 flash/ring/碎塊都是這樣做的）。
`useFx(id, x, y, s)` 建立 `<use>` 時也遵循同一慣例。

## SVG 分層（由後到前）

1. `#bg` 背景（含 `#wallCracks` 牆縫）
2. `#barBack` 後排：窗戶（`#windowGlass`／`#winCracks`）、前後門（`#frontDoorLeaf`／`#backDoorLeaf`）、酒架、`#sign` 招牌、桌椅
3. 角色：`#tester`（含 `#testerHead/#testerMouth/#testerArm/#testerCostume`）、`#customer`、`#bartender`（`#barterHead/#barterMouth`）、`#lizard`
4. `#barFront` 吧台前景（含 `#counterCrack`）
5. `#fx` 動態特效層：**所有 JS 建立的臨時物件都放這**（`resetStage()` 會 `innerHTML=''` 清空）
6. `#bubbleT`（測試工程師，(650,344)）／`#bubbleB`（酒保，(950,240)）
7. `#fire` 火海（`.flameW` 每支火帶 `data-x/data-y/data-s`；`.sparkWrap` 火星）
8. `#endcard` 結局卡

### `<defs>` 可重用物件

`#obj-mug` `#obj-coffee` `#obj-bowl` `#obj-footwash` `#obj-cat` `#obj-club`
`#obj-milktea` `#obj-rice` `#obj-tea` `#obj-glass2` `#obj-broom`

### CSS 動畫類（改動時別漏）

`.bob`（走路上下顛） `.flame`（火舌） `.steam`（熱氣） `.dust`（灰塵擴散自刪）
`.spark`（火星上升） `.wobble`（搖頭） `.quake`（整幅畫面震動，加在 `#stage`）
`.lizard-anim`（蜥蜴扭動） `.glassflip`（杯子翻轉）

## 常用函式

| 類別 | 函式 |
|---|---|
| 時間 | `tween` `wait` `fade` `easeInOut/easeOut/easeIn` |
| SVG | `E(name, attrs, parent)` `useFx(id,x,y,s)` `floatText(str,x,y,{size,fill,dur,rise,delay,tok})` `steam` `dustPuff` `makeGlass` `rnd(a,b)` `pick(arr)` |
| 對話 | `showBubble('t'\|'b', str, fs, delay, tok)` `hideBubble('t'\|'b')` |
| 角色 | `setMouth('normal'\|'happy'\|'frown'\|'shock')`（工程師的嘴）`setArm` `wobble(el)` `quake(tok)` `testerWalk(from,to,dur,tok,ease)` `openDoor/closeDoor('front'\|'back',dur,tok)` `shake(el,dur,amp,cx,cy,tok)` `miniTester(x,y,s)` |
| 重置 | `resetFire()` `resetStage()` |

## 23 幕內容規格

逐幕列出字幕（`text`，會逐字打出）與實際動作、用到的物件／特效。與 `testers-bar.html` 的 `SCENES` 陣列一一對應。

| 幕 | 字幕（text） | 內容／動作 | 物件／特效 |
|---|---|---|---|
| 1 | 一個測試工程師走進一家酒吧，要了一杯啤酒 | 進門→氣泡「一杯啤酒 🍺」→`#obj-mug` 自吧台滑入（950→800）→「好嘞」→happy＋👍 | `#obj-mug` |
| 2 | 一個測試工程師走進一家酒吧，要了一杯咖啡 | 同上→咖啡杯滑入＋`steam`→「熱的，小心」→happy＋☕ | `#obj-coffee`、`steam` |
| 3 | 一個測試工程師走進一家酒吧，要了999999999杯啤酒 | 氣泡＋shock→26 個啤酒杯從天降（部分落在吧台）→6×「999999999」＋∞ 漂浮→酒保「……」 | `#obj-mug`×26、∞ |
| 4 | 一個測試工程師走進一家酒吧，要了0杯啤酒 | 氣泡→空杯升起→「好的，0 杯」＋😐 | `makeGlass`（空杯） |
| 5 | 一個測試工程師走進一家酒吧，要了-1杯啤酒 | 空杯→`.glassflip` 翻底朝天→大紅「−」＋「負的啤酒？」→frown→「……記帳」 | `.glassflip`、紅 − |
| 6 | 一個測試工程師走進一家酒吧，要了0.7杯啤酒 | 空杯→「70%」＋📏→「好的，7 成滿」→happy | `makeGlass`、📏 |
| 7 | 一個測試工程師走進一家酒吧，要了-10000杯啤酒 | 14× 紅「−」＋大「-10000」→`shake(barFront)`→shock→「……記在您的帳上」 | 紅 −×14、`shake` |
| 8 | 一個測試工程師走進一家酒吧，要了一杯蜥蜴 | 氣泡「一杯蜥蜴 🦎」→`#lizard` 落下＋`.lizard-anim`→👀→「新鮮現做」→happy | `#lizard`、`.lizard-anim` |
| 9 | 一個測試工程師走進一家酒吧，要了一份Qer@24dg!&*(@ | 18 個亂碼字雨→「????」＋shock→「……這是什麼」 | 亂碼字雨、???? |
| 10 | 一個測試工程師走進一家酒吧，什麽也沒要 | 進門站定→雙方氣泡「……」→⏱、🤔 | 無點單 |
| 11 | 一個測試工程師走進一家酒吧，又走出去又從窗戶進來又從後門出去再從下水道鑽進來 | 前門開合×2→撞窗進來（「哐!」＋`#winCracks`＋灰塵＋「哐噹!」）→後門出（→1280）→下水道鑽入（「咕嚕……」「嘶——」）→「我還沒點東西…」／「……歡迎光臨」 | `#winCracks`、前後門、`dustPuff` |
| 12 | 一個測試工程師走進一家酒吧，又走出去又進來又出去又進來又出去，最後在外面把老闆打了一頓 | 進出×3（每次「砰!」）→雙方走到「外面」（330／440）→出拳×3（rot ±14°、「啪!」💢、`wobble(barterHead)`）→⭐×3→「驗收通過」→各自回位（Promise.all）→「（酒保從容地揉著頭走回吧台）」 | 💢⭐、「外面」標示 |
| 13 | 一個測試工程師走進一家酒吧，要了一杯燙燙燙的錕斤拷 | `#obj-bowl`＋`steam(...,4)`→「燙燙燙」＋2×「錕斤拷」→shock→「剛出爐，請小心」 | `#obj-bowl`、steam |
| 14 | 一個測試工程師走進一家酒吧，要了NaN杯Null | 空杯→「NaN」「null」「undefined」＋🤨→「……沒有這道菜」 | `makeGlass`、代碼字漂浮 |
| 15 | 一個測試工程師沖進一家酒吧，要了500杯啤酒咖啡洗腳水野貓狼牙棒奶茶 | 「呼——」＋快速進門（450ms、easeIn）→長氣泡→30 個物件雨（每個暫存 `m._final`）→`#obj-broom` 掃地（PA↔PB×3）→物件堆疊（130+col·16, 552+row·15）＋灰塵→「小事一樁」 | 6 種 `#obj-*`×30、`#obj-broom` |
| 16 | 一個測試工程師把酒吧拆了 | 「我要拆了它」＋frown→`#wallCracks`→Promise.all：`shake(barBack)`＋`shake(barFront)`→9 個酒瓶飛散（easeIn）→`#sign` 掉落（rot 24°）→`#winCracks`＋`#windowGlass` 落下→`#counterCrack`＋灰塵×2→happy 😎「驗收合格 ✔」 | 裂紋、酒瓶×9、`#sign`、`#windowGlass`、`#counterCrack` |
| 17 | 一個測試工程師化妝成老闆走進一家酒吧，要了500杯啤酒並且不付錢 | `#testerCostume` 上身→「500 杯啤酒（不付錢）」→10 個啤酒杯彈出（2 列）→離開→「好嘞，記您帳上」🤝→脫下裝扮 | `#testerCostume`、`#obj-mug`×10 |
| 18 | 一萬個測試工程師在酒吧門外呼嘯而過 | 46× `miniTester`＋5 條運動線→人潮橫掃（+1550、easeIn）→「呼嘯————」「10,000 人」→酒保擦杯（body 搖擺×3）→「（繼續擦杯子）」 | `miniTester`×46、`#obj-glass2` |
| 19 | 酒保從容應對 | `#obj-tea`＋`steam`→body 搖擺×2→「～」🧘→「從容應對，是基本功」 | `#obj-tea`、steam |
| 20 | 測試工程師很滿意 | happy＋`setArm`→👍→⭐✨❤ 漂浮×6→「完美！沒有 bug！」／「謝謝惠顧」 | ⭐✨❤👍 |
| 21 | 測試工程師們滿意地離開了酒吧 | `openDoor('front')`→3× `miniTester`＋工程師先後走出→👋「歡迎再來！」→`closeDoor` | 前門、`miniTester`×3 |
| 22 | 一名顧客點了一份炒飯 | `#customer`（1280→625）→「一份炒飯，謝謝」→**酒保卡住**：`#bubbleB` 染紅「錯誤 ERROR」＋`#barterMouth` 變平嘴＋`wobble`→靜置 2400ms | 紅色氣泡、平嘴（皆為持久狀態，`resetStage()` 會還原） |
| 23 | 酒吧爆炸，測試工程師們衝出來大喊「NOOOOOOOOO!」 | 閃光＋衝擊波環＋`quake`＋26 碎塊＋6 濃煙（皆在 t=0）→**酒保與爆炸同時消失**（灰塵＋淡出＋「（蒸發了）」）→「💥 轟隆！！」→`#fire` 點燃→開門，工程師／顧客／3× `miniTester` 衝出→「NOOOOOOOOO!」×3→工程師氣泡「**我從來沒想過這種場景**」→結局卡 | 閃光、環、碎塊、濃煙、`#fire`、`#endcard` |

備註：

- 第 10 幕字幕用的是「**什麽**」（非「什麼」），改動時請保留原文。
- 第 15 幕 `m._final` 是暫存在元素上的資料（掃地後堆疊時當起點），屬該幕局部慣例。
- 第 23 幕「酒保消失」的 tween 是 fire-and-forget（未 await），跳幕時由 token 中斷，安全。
- 變體檔 `testers-bar-engineer-stays.html` 僅第 23 幕不同：刪除主角工程師的 `testerWalk` 逃生
  （顧客與 3× `miniTester` 仍衝出、「NOOOOOOOOO!」×3 與工程師台詞保留）；
  改動該檔時同步對照主檔即可。
- 變體檔 `testers-bar-polyu.html` 只改**頁面 chrome**（`<style>` 的 :root 變數與 body 結構：
  `.stage-card`＋`.player` 兩張白卡、播放鍵 `class="primary"`），**JS 與 SVG 內容零改動**；
  品牌色值：`--primary #A21942`（hover `#801333`）、`--ink #262626`、`--bg #F8F9FA`、
  `--line #E5E7EB`、`--green #10B981`；白字在 `#A21942` 上對比約 7.6:1（過 4.5:1）。
  注意：`button`/`select` 的 hover 用到 `--bg`（淺灰），改品牌色時別把 `--bg` 誤調回深色。

## 新增／修改一幕的檢查清單

1. `SCENES` 陣列項目格式：`{ text: '字幕', run: async tok => { ... } }`；`text` 會逐字打出。
2. 所有 await 走「守衛式」寫法；純裝飾的 tween 不用 await。
3. **凡改了持久狀態，`resetStage()` 必須能還原**（顏色、transform、class、dataset…）。
   例：第 22 幕把 `#bubbleB` 氣泡染紅、把 `#barterMouth` 改成平嘴，
   `resetStage()` 就必須把兩者還原（已有）。
4. HUD「第 N / M 幕」與進度條用 `SCENES.length` 自動算；但 **HTML 裡初始的
   `第 1 / 23 幕` 是靜態字串**——增刪幕時要同步改。
5. 角色站位慣例：工程師吧台位 `(680,595)`、顧客桌位 `(625,548)`、酒保 `(890,502)`、
   門外（消失點）`x < -140`、右側門外 `x > 1260`。
6. 新特效一律建立到 `#fx`（`E(..., fx)` / `useFx`），不要寫進靜態 SVG。

## 測試 / QA 流程（已驗證可用）

1. **JS 語法**：把 `<script>` 內容抽成 .js → `node --check`。
2. **ID 交叉檢查**（Python）：
   收集 HTML 所有 `id="…"`；斷言 JS 的 `$('…')`、`useFx('#…')`、SVG 的
   `href="#…"`、`url(#…)` 全部存在、無重複 id。
3. **動態 smoke test**（Node + mock DOM，非瀏覽器）：
   - mock 要支援：`getElementById`（lazy 建立）、`createElementNS`、`setAttribute(NS)`、
     `dataset`（data-x → x）、`classList`、`querySelector(All)`（`.class`／`#id`／tag）、
     `innerHTML=''` 清空、`appendChild/remove()`、`getBoundingClientRect()`、`addEventListener`。
     ⚠️ `addEventListener` 必須 `(obj[k] = obj[k] || []).push(fn)`——
     `(obj[k] || []).push(fn)` 會把 handler 推進暫存陣列丟掉（曾踩坑）。
   - 預先鋪結構：`#lizard` 需有 `.lw` 子節點；`#fire` 需 12×`.flameW`（帶 data-x/y/s）+ 6×`.sparkWrap`。
   - 假時間：fake `performance.now()` + `requestAnimationFrame` 佇列，以 ~16ms 步進 pump；
     每步之間用 `await new Promise(r => setImmediate(r))` 讓 microtask（promise 鏈、
     場景自動推進）跑動。
   - 斷言：23 幕全跑完（`btnPlay` 文字變「↻ 重播」）、最後字幕正確、
     跳幕（下一幕×4 → 第 5 幕）、暫停時字幕凍結、繼續後恢復、跳最後一幕、
     `unhandledRejection` 為 0。
4. **視覺檢查**：抽出 `<svg id="stage">`，把目標幕的狀態靜態化
   （角色 transform/opacity、`#fire` 各 `.flameW` 加 `transform=translate(x y) scale(s)`、
   門 `rotate(-75 66 359)` 等），存成獨立 SVG，用 Bionic 的 `svg.render` tool
   （`bionic_tool(name="svg.render", args=["--source-path", path, "--scale", "1"])`）
   出 PNG 檢視排版、文字重疊、越界。
   曾靠此發現：「ERROR 500」與 BAR 招牌重疊、「轟隆！！」與第二個 NOOOOOOOOO 撞車。

## 改版紀錄

- **2026-10-09** 結局重做：
  - 第 22 幕（顧客點炒飯）：點餐後酒保卡住——紅色「錯誤 ERROR」氣泡、平嘴、搖頭。
  - 第 23 幕（原「酒吧陷入火海」）改為「酒吧爆炸」：閃光＋衝擊波＋碎塊＋濃煙＋`quake` 震動，
    **酒保在爆炸同一刻消失**（「蒸發了」，fire-and-forget，不阻塞流程），
    工程師與顧客衝出大喊「NOOOOOOOOO!」，喊聲結束後接工程師台詞氣泡
    「**我從來沒想過這種場景**」，殘火燃燒，結局卡「一份炒飯，炸掉整間酒吧」。
  - 新增：`.quake` 畫面震動動畫與 `quake(tok)` helper；`resetStage()` 增加
    `#bubbleB` 顏色、`#barterMouth` 嘴型、`.quake` class 的還原。
  - 全量重跑 QA（語法／ID／smoke／視覺）通過。
