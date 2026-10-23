# 锁号台

竞彩 / 北单 / 任14 读盘锁号页。只看盘口怎么说话，不猜庄、不拿伤停故事压盘。

在线地址：https://zzh-zc.github.io/jczq-lockboard/

## 怎么看

1. **钱站哪边**：把抽水去掉后的主/平/客占比。这是市场基准。
2. **三通道**：欧赔、亚盘、大小。欧赔和亚盘指向两边 → **别碰**。
3. **低赔不出手**：单选不到 1.5，买两边折下来不到 1.3，热门低于 1.8，都不出手。
4. **锁号**：胜平负。比分和大小只是参考。

口径参考：

- [jc-daily-report](https://github.com/chinjiaqing/jc-daily-report) 三通道交叉验证、低赔不出手、信号不明不进
- [football-engine](https://github.com/wlrwx/football-engine) 市场去水为基准、压缩比、热门区闸门

赔率走势优先用 500 百家平均初盘→即时；拉不到时退回竞彩官方 SP。红灯只警告「热门单边别碰」，锁号仍会给不败。

## 历史锁号（不用自启服务）

和 `jc-cache.js` / `result-cache.js` 一样：**锁号归档挂在 GitHub 仓库**，Pages 只读加载。

| 文件 | 作用 |
|------|------|
| `js/history-lock-cache.js` | 已完赛、已封存的十一点锁号（页面 **不会** 再改） |
| `js/result-cache.js` | 赛果明细 |

比完一场、底稿定稿后，在本机跑一次生成并 push（**不用常驻进程**）：

```bash
node scripts/build-history-lock-cache.mjs
git add js/history-lock-cache.js && git commit -m "归档历史锁号" && git push
```

GitHub Actions 跑在 GitHub 机房，不是你电脑；若要全自动日更，以后可加 workflow，仍无需你启动服务。

**做不到的事（直说）**：纯浏览器 **不能** 安全地往公共数据库写全员可见的历史——没有第三方写入口就得靠 **git push** 更新缓存文件。`server/` 自建 API 仅可选，默认忽略。

## 本地打开

```bash
python -m http.server 8765 --bind 127.0.0.1
```

访问 http://127.0.0.1:8765/

Windows 上必须加 `--bind 127.0.0.1`，否则会只挂 IPv6。

打开后立刻拉竞彩官方即时 SP（胜平负/让球/比分/进球数/半全场，每种两个选择），并尽量读 500 百家。北单拉全部在售场，不只日职。任 9 / 任 14 走当期胜负彩。500 没有 CORS 时用推上去的缓存。之后每小时再跑一轮。

## 免责

仅作数据研究，不构成购买建议。彩票请到线下实体店购买。
