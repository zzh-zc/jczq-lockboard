(function (global) {
  /**
   * 读盘闸门。口径来自：
   * - jc-daily-report：欧/亚/大小三通道，打架不碰，低赔不出手，信号不明不进
   * - football-engine：市场去水是基准；压缩比=初盘/即时；<1.8 热门区长期不赚钱
   * 走势用示意 ticks，概率按竞彩即时 SP 去水。不猜庄、不拿伤停故事压盘。
   */
  function parseSp(sp) {
    const nums = String(sp || "").match(/(\d+\.\d+)/g);
    if (!nums || nums.length < 3) return null;
    return { h: +nums[0], d: +nums[1], a: +nums[2] };
  }

  function deVig(o) {
    const ih = 1 / o.h;
    const id = 1 / o.d;
    const ia = 1 / o.a;
    const s = ih + id + ia;
    return { h: ih / s, d: id / s, a: ia / s, vig: s - 1 };
  }

  function pct(x) {
    return Math.round(x * 100);
  }

  function layerOf(odds) {
    if (odds == null || odds <= 1) return { code: "?", label: "未知" };
    if (odds < 1.5) return { code: "L1", label: "大热，赔太低" };
    if (odds < 1.8) return { code: "L2", label: "热门，长期不赚钱" };
    if (odds < 2.2) return { code: "L3", label: "中赔" };
    if (odds < 3.0) return { code: "L4", label: "稍冷" };
    return { code: "L5", label: "深冷" };
  }

  function hottest(o) {
    if (Math.abs(o.h - o.a) < 0.4 && o.d > Math.min(o.h, o.a)) return "even";
    const min = Math.min(o.h, o.d, o.a);
    if (min === o.h) return "home";
    if (min === o.a) return "away";
    return "draw";
  }

  function ahSide(tick) {
    if (!tick || !tick.ah) return "even";
    const gap = tick.ah.away - tick.ah.home;
    if (Math.abs(gap) < 0.06) return "even";
    return gap > 0 ? "home" : "away";
  }

  function ouSide(tick) {
    if (!tick || !tick.ou) return "even";
    const gap = tick.ou.under - tick.ou.over;
    if (Math.abs(gap) < 0.06) return "even";
    return gap > 0 ? "over" : "under";
  }

  function sideLabel(side, kind) {
    if (kind === "ou") {
      if (side === "over") return "偏大";
      if (side === "under") return "偏小";
      return "差不多";
    }
    if (side === "home") return "偏主";
    if (side === "away") return "偏客";
    if (side === "draw") return "偏平";
    return "差不多";
  }

  function pickKeys(pick) {
    const p = String(pick || "");
    const keys = [];
    if (/主|让胜/.test(p) || /(^|\/)胜(\/|$)/.test(p) || /(^|[\/])3([\/]|$)/.test(p)) keys.push("h");
    if (/平|让平/.test(p) || /(^|[\/])1([\/]|$)/.test(p)) keys.push("d");
    if (/客|让负/.test(p) || /(^|\/)负(\/|$)/.test(p) || /(^|[\/])0([\/]|$)/.test(p)) keys.push("a");
    return [...new Set(keys)];
  }

  function comboOdds(o, keys) {
    if (!o || !keys.length) return null;
    const inv = keys.reduce((s, k) => s + 1 / o[k], 0);
    return 1 / inv;
  }

  function moneyFlow(open, now) {
    if (!open || !now) return { home: 1, draw: 1, away: 1 };
    return {
      home: open.h / now.h,
      draw: open.d / now.d,
      away: open.a / now.a,
    };
  }

  function flowLabel(c) {
    if (c > 1.05) return "钱进来了";
    if (c < 0.95) return "钱撤了";
    return "没怎么动";
  }

  function read(m) {
    const o = parseSp(m.sp) || { h: 2.1, d: 3.3, a: 3.2 };
    const fair = deVig(o);
    const ticks = m.ticks || [];
    const open = ticks[0];
    const last = ticks[ticks.length - 1] || { h: o.h, d: o.d, a: o.a, ah: null, ou: null };
    const flow = moneyFlow(open, last);
    const eu = hottest({ h: last.h, d: last.d, a: last.a });
    const ah = ahSide(last);
    const ou = ouSide(last);
    const fight = (eu === "home" && ah === "away") || (eu === "away" && ah === "home");
    const keys = pickKeys(m.pick);
    const cover = comboOdds(o, keys);
    const mainOdds = keys.length === 1 ? o[keys[0]] : cover;
    const layer = layerOf(mainOdds);
    const reasons = [];
    let gate = "可以看";

    if (fight) {
      gate = "别碰";
      reasons.push("欧赔和亚盘指向两边，线人自己在吵。");
    } else if (eu === "even" && ah === "even") {
      gate = "路过";
      reasons.push("两边差不多，信号不明，先路过。");
    } else if (m.env === "掺局区" && !((eu === "home" && ah === "home") || (eu === "away" && ah === "away"))) {
      gate = "路过";
      reasons.push("掺局区没有欧亚同向，先路过。");
    }

    if (keys.length === 1 && mainOdds < 1.5) {
      gate = gate === "别碰" ? "别碰" : "不出手";
      reasons.push("单选赔不到 1.5，赢了也赚不到。");
    } else if (keys.length >= 2 && cover != null && cover < 1.3) {
      gate = gate === "别碰" ? "别碰" : "不出手";
      reasons.push("买两边折下来不到 1.3，等于低赔。");
    } else if (keys.length === 1 && mainOdds < 1.8) {
      if (gate === "可以看") gate = "不出手";
      reasons.push("赔率低于 1.8 的热门，长期不赚钱。");
    }

    if (!reasons.length) {
      reasons.push(eu === ah || ah === "even" ? "欧亚没打架，可以看。" : "欧亚大体同向，可以看。");
    }

    const moneySide = fair.h >= fair.a && fair.h >= fair.d ? "主" : fair.a >= fair.d ? "客" : "平";
    return {
      fair,
      vig: fair.vig,
      flow,
      eu, ah, ou,
      fight,
      cover,
      mainOdds,
      layer,
      gate,
      reasons,
      moneySide,
      note: `去掉抽水后，钱站${moneySide} ${pct(moneySide === "主" ? fair.h : moneySide === "客" ? fair.a : fair.d)}%。抽水 ${(fair.vig * 100).toFixed(1)}%。${reasons[0]}`,
    };
  }

  function attachAll() {
      ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      ((global.CC_DATA && global.CC_DATA[key] && global.CC_DATA[key].matches) || []).forEach((m) => {
        m.engine = read(m);
      });
    });
  }

  global.CC_ENGINE = { parseSp, deVig, layerOf, read, attachAll, pct, sideLabel, flowLabel };
  if (global.CC_DATA) attachAll();
})(window);
