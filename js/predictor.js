(function (global) {
  const MIX = /日职|日乙|J2|韩K|K联|澳超|芬超|瑞超|挪超|美职|中甲/;

  function n(x) {
    return global.CC_LIVE ? CC_LIVE.n(x) : parseFloat(x);
  }

  function hottest(o) {
    if (Math.abs(o.h - o.a) < 0.4 && o.d > Math.min(o.h, o.a)) return "even";
    const m = Math.min(o.h, o.d, o.a);
    if (m === o.h) return "home";
    if (m === o.a) return "away";
    return "draw";
  }

  function ahFav(line) {
    if (line < -0.1) return "home";
    if (line > 0.1) return "away";
    return "even";
  }

  function ouPair(ttg) {
    if (!ttg) return ["小2.5", "小3.5"];
    let under = 0;
    let over = 0;
    for (let i = 0; i <= 7; i += 1) {
      const odds = n(ttg["s" + i]);
      if (!odds) continue;
      if (i <= 2) under += 1 / odds;
      else over += 1 / odds;
    }
    return over > under ? ["大2.5", "大3.5"] : ["小2.5", "小3.5"];
  }

  function quake(had) {
    const h = String(had.hf || "0");
    const a = String(had.af || "0");
    if (h === "-1" && a !== "-1") return "主胜在降，钱往主走";
    if (a === "-1" && h !== "-1") return "客胜在降，钱往客走";
    if (h === "1" && a === "-1") return "主升温、客降水";
    if (a === "1" && h === "-1") return "客升温、主降水";
    return "暂时没变";
  }

  function lockOne(raw) {
    const o = { h: n(raw.had.h), d: n(raw.had.d), a: n(raw.had.a) };
    const line = n(raw.hhad.goalLineValue || raw.hhad.goalLine) || 0;
    const eu = hottest(o);
    const ah = ahFav(line);
    const fight = (eu === "home" && ah === "away") || (eu === "away" && ah === "home");
    const env = MIX.test(raw.league) ? "掺局区" : "高可信";
    const sp = `${o.h.toFixed(2)} / ${o.d.toFixed(2)} / ${o.a.toFixed(2)}`;
    const books = raw.books500 || null;
    const shake = (books && books.quake) || quake(raw.had);
    const veto = !!(books && books.veto);
    const locked = decide(eu, fight || veto, env, o);
    locked.sp = sp;
    locked.handicap = line ? (line > 0 ? "+" + line : String(line)) : "";
    locked.league = raw.league;
    locked.home = raw.home;
    locked.away = raw.away;
    locked.date = raw.date;
    locked.kickoff = raw.kickoff;
    locked.code = raw.code;
    locked.env = env;
    locked.source = "live";
    locked.slot = raw.slot;
    locked.books500 = books;
    locked.safe = false;
    locked.ftOu = ouPair(raw.ttg);
    locked.ticks = ticksOf(o, ah, books);
    locked.summary = summarize(locked, eu, ah, fight, veto, sp, shake, books);
    locked.market = marketOf(locked, eu, ah, fight, veto, shake, books);
    locked.factors = [
      { name: "SP", text: `${sp}。让球 ${locked.handicap || "0"}。欧 ${eu} 亚 ${ah}。` },
      { name: "伤停轮换", text: "未知。算法不拿空伤停改号。" },
      { name: "发布会", text: "未知。" },
    ];
    return locked;
  }

  function ticksOf(o, ah, books) {
    const open = books && books.avgOpen ? books.avgOpen : o;
    const now = books && books.avgNow ? books.avgNow : o;
    return [
      { t: "初盘", h: open.h, d: open.d, a: open.a, ah: { home: ah === "home" ? 0.90 : 1.00, away: ah === "away" ? 0.90 : 1.00 }, ou: { over: 1.92, under: 1.92 }, vol: 8 },
      { t: "即时", h: now.h, d: now.d, a: now.a, ah: { home: ah === "home" ? 0.86 : 1.04, away: ah === "away" ? 0.86 : 1.04 }, ou: { over: 1.90, under: 1.90 }, vol: 12 },
    ];
  }

  function undefeated(eu) {
    if (eu === "away") return { pick: "平/客", dual: true };
    if (eu === "even") return { pick: "主/客", dual: true };
    return { pick: "主/平", dual: true };
  }

  function decide(eu, red, env, o) {
    let out;
    if (env === "掺局区" || eu === "even") {
      out = {
        pick: eu === "even" ? "主/客" : eu === "away" ? "平/客" : "主/平",
        dual: true, paperOppose: false, tag: eu === "even" ? "对开" : "胶着", light: "yellow",
      };
    } else if (eu === "draw") {
      out = { pick: "主/平", dual: true, paperOppose: false, tag: "偏平", light: "yellow" };
    } else {
      const side = eu === "away" ? o.a : o.h;
      out = side < 1.8
        ? { pick: eu === "away" ? "平/客" : "主/平", dual: true, paperOppose: false, tag: "低赔不单", light: "yellow" }
        : { pick: eu === "away" ? "客" : "主", dual: false, paperOppose: false, tag: "跟一边", light: "green" };
    }
    if (!red) return out;
    if (!out.dual) {
      const cover = undefeated(eu);
      out.pick = cover.pick;
      out.dual = true;
    }
    out.light = "red";
    out.paperOppose = true;
    out.tag = "别碰热门";
    return out;
  }

  function marketOf(m, eu, ah, fight, veto, shake, books) {
    const drift = eu === "even" ? "两边差不多" : ("偏" + (eu === "away" ? "客" : eu === "draw" ? "平" : "主"));
    if (m.light === "red") {
      const why = [];
      if (fight) why.push("欧亚打架");
      if (veto) why.push("平博和平均盘拧着");
      return {
        light: "red", drift: drift, veto: why.join(" · ") || "公司吵架", quake: shake,
        note: "市场标红：热门单边不可信。本场锁号仍给 " + m.pick + "。",
      };
    }
    const pin = books && global.CC_BOOKS ? CC_BOOKS.label(books.pinSide) : "";
    const avg = books && global.CC_BOOKS ? CC_BOOKS.label(books.avgSide) : "";
    const vetoTxt = pin && avg ? ("平博" + pin + " / 平均" + avg) : (eu === "even" ? "对开" : "没一边倒");
    if (m.light === "yellow") {
      return { light: "yellow", drift: drift, veto: vetoTxt, quake: shake, note: m.env === "掺局区" ? "日职少买，不进长串。" : "买两边，或者路过。" };
    }
    return { light: "green", drift: drift, veto: "欧亚同向" + (pin ? " · 平博" + pin : ""), quake: shake, note: "可以跟一边。1.3 以下别梭哈。" };
  }

  function summarize(m, eu, ah, fight, veto, sp, shake, books) {
    const bits = [sp, "锁 " + m.pick, shake];
    if (books && books.avgOpen && books.avgNow) {
      bits.push("平均初盘 " + books.avgOpen.h.toFixed(2) + " → 即时 " + books.avgNow.h.toFixed(2));
    }
    if (fight) bits.push("欧亚打架");
    if (veto) bits.push("百家背离");
    if (m.light === "red") bits.push("红灯只警告热门单边，锁号仍给");
    return bits.join("。") + "。";
  }

  function capDual(list) {
    const keep = { 别碰热门: 0, 别碰: 0, 对开: 1, 低赔不单: 2, 偏平: 3, 胶着: 4 };
    const groups = {};
    list.forEach((m) => {
      groups[m.date] = groups[m.date] || [];
      groups[m.date].push(m);
    });
    Object.keys(groups).forEach((day) => capDualDay(groups[day], keep));
  }

  function capDualDay(list, keep) {
    const limit = Math.floor(list.length * 0.5);
    const extras = list.filter((m) => m.dual).sort((a, b) => (keep[a.tag] != null ? keep[a.tag] : 9) - (keep[b.tag] != null ? keep[b.tag] : 9));
    while (list.filter((m) => m.dual).length > limit && extras.length) {
      const m = extras.pop();
      if ((keep[m.tag] != null ? keep[m.tag] : 9) <= 2) break;
      m.dual = false;
      m.pick = /客/.test(m.pick) && !/主/.test(m.pick) ? "客" : "主";
      m.tag = "名额满才单";
    }
  }

  function buyLines(list) {
    const dual = list.filter((m) => m.dual).length;
    const stop = list.filter((m) => m.light === "red").map((m) => m.code + m.pick);
    const green = list.filter((m) => m.light === "green").map((m) => m.code + m.pick);
    return [
      `算法 ${list.length} 场，双选 ${dual}/${list.length}（上限 50%）`,
      green.length ? "跟一边：" + green.join("、") : "这一轮没有清楚的单边",
      stop.length ? "红灯仍锁：" + stop.join("、") : "没有红灯场",
      "伤停发布会未知。点名不上才允许改号。",
    ];
  }

  function overlayNotes(live, olds) {
    const hit = olds.find((o) => o.home === live.home && o.away === live.away && o.date === live.date);
    if (!hit) return;
    const text = ((hit.factors || []).find((f) => f.name === "伤停轮换") || {}).text || "";
    if (/点名|不上|B\s*队|官宣|确认轮换/.test(text)) {
      live.factors[1] = { name: "伤停轮换", text };
      live.summary += " 有未定价伤停，单独看。";
    }
  }

  function apply(pack) {
    const locked = pack.matches.map(lockOne);
    capDual(locked);
    const old = (global.CC_DATA.jczq && global.CC_DATA.jczq.matches) || [];
    locked.forEach((m) => overlayNotes(m, old));
    const settled = old.filter((m) => m.result);
    global.CC_DATA.jczq.matches = settled.concat(locked);
    global.CC_DATA.jczq.title = "竞彩足球 · 即时算法 " + locked.length + " 场";
    global.CC_DATA.jczq.version = (pack.booksOk ? "竞彩+500百家 " : "竞彩官方 SP ") + (pack.updatedAt || "");
    global.CC_DATA.jczq.date = locked[0] ? locked[0].date : global.CC_DATA.jczq.date;
    global.CC_DATA.jczq.buy = buyLines(locked);
    global.CC_DATA.jczq.env = locked.some((m) => m.env === "掺局区") ? "含掺局区，日职少买" : "高可信为主";
    global.CC_DATA._liveAt = pack.updatedAt;
    if (global.CC_EXTRAS) global.CC_EXTRAS.attach();
    else if (global.CC_ENGINE) global.CC_ENGINE.attachAll();
    return locked;
  }

  global.CC_PRED = { lockOne, apply, capDual };
})(window);
