(function (global) {
  const MIX = /日职|日乙|J1|J2|韩K|K联|澳超|芬超|瑞超|挪超|挪甲|美职|中甲/;
  const HF = { hh: "胜胜", hd: "胜平", ha: "胜负", dh: "平胜", dd: "平平", da: "平负", ah: "负胜", ad: "负平", aa: "负负" };

  function n(x) {
    return global.CC_LIVE ? CC_LIVE.n(x) : parseFloat(x);
  }

  function hottest(o) {
    if (!o || !o.h || !o.d || !o.a) return "even";
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

  function top2(odds, labels) {
    const rows = Object.keys(labels).map((k) => ({ label: labels[k], odds: n(odds[k]) })).filter((r) => r.odds > 1);
    rows.sort((a, b) => a.odds - b.odds);
    const pair = rows.slice(0, 2).map((r) => r.label);
    while (pair.length < 2) pair.push(pair[0] || "—");
    return pair;
  }

  function crsPair(crs) {
    const rows = [];
    Object.keys(crs || {}).forEach((k) => {
      const hit = k.match(/^s(\d{2})s(\d{2})$/);
      if (!hit) return;
      const odds = n(crs[k]);
      if (!odds) return;
      rows.push({ label: Number(hit[1]) + "-" + Number(hit[2]), odds: odds });
    });
    rows.sort((a, b) => a.odds - b.odds);
    const pair = rows.slice(0, 2).map((r) => r.label);
    return pair.length === 2 ? pair : null;
  }

  function ttgPair(ttg) {
    const rows = [];
    for (let i = 0; i <= 7; i += 1) {
      const odds = n((ttg || {})["s" + i]);
      if (!odds) continue;
      rows.push({ label: i === 7 ? "7+" : i + "球", odds: odds });
    }
    rows.sort((a, b) => a.odds - b.odds);
    const pair = rows.slice(0, 2).map((r) => r.label);
    return pair.length === 2 ? pair : null;
  }

  function hafuPair(hafu) {
    const rows = Object.keys(HF).map((k) => ({ label: HF[k], odds: n((hafu || {})[k]) })).filter((r) => r.odds > 1);
    rows.sort((a, b) => a.odds - b.odds);
    const pair = rows.slice(0, 2).map((r) => r.label);
    return pair.length === 2 ? pair : null;
  }

  function fallbackScores(pick) {
    if (/客|让负|0/.test(pick) && !/主|让胜|3/.test(pick)) return ["0-1", "1-2"];
    if (/主|让胜|3/.test(pick) && /客|让负|0/.test(pick)) return ["1-0", "0-1"];
    if (/平|让平|1/.test(pick) && /主|让胜|3/.test(pick)) return ["1-0", "1-1"];
    if (/平|让平|1/.test(pick) && /客|让负|0/.test(pick)) return ["0-1", "1-1"];
    if (/平|让平|1/.test(pick)) return ["0-0", "1-1"];
    return ["1-0", "2-1"];
  }

  function fallbackTtg(pick) {
    if (/平/.test(pick)) return ["1球", "2球"];
    if (/客|让负/.test(pick) && !/主|让胜/.test(pick)) return ["2球", "3球"];
    return ["2球", "3球"];
  }

  function fallbackHafu(pick) {
    if (/客|让负|0/.test(pick) && !/主|让胜|3/.test(pick)) return ["负负", "平负"];
    if (/主|让胜|3/.test(pick) && /客|让负|0/.test(pick)) return ["胜胜", "负负"];
    if (/平|让平|1/.test(pick)) return ["胜胜", "平平"];
    return ["胜胜", "平胜"];
  }

  function fillMarkets(locked, raw, hadOdds, line) {
    locked.hadPicks = top2(hadOdds || {}, { h: "主", d: "平", a: "客" });
    const hh = raw.hhad || {};
    const ho = { h: n(hh.h), d: n(hh.d), a: n(hh.a) };
    locked.hhadPicks = ho.h && ho.d && ho.a
      ? top2(ho, { h: "让胜", d: "让平", a: "让负" })
      : locked.hadPicks.map((x) => x.replace("主", "让胜").replace("平", "让平").replace("客", "让负"));
    locked.ftScores = crsPair(raw.crs) || fallbackScores(locked.pick);
    locked.ttgPicks = ttgPair(raw.ttg) || fallbackTtg(locked.pick);
    locked.hafuPicks = hafuPair(raw.hafu) || fallbackHafu(locked.pick);
    locked.ftOu = locked.ttgPicks;
    locked.htScores = locked.hafuPicks;
    locked.htOu = locked.hafuPicks;
    locked.scriptNote = "每种两个选择。锁号看胜平负/让球，比分进球半全场不进稳串。";
    locked.handicap = line ? (line > 0 ? "+" + line : String(line)) : locked.handicap || "";
  }

  function quake(had) {
    const h = String((had && had.hf) || "0");
    const a = String((had && had.af) || "0");
    if (h === "-1" && a !== "-1") return "主胜在降，钱往主走";
    if (a === "-1" && h !== "-1") return "客胜在降，钱往客走";
    if (h === "1" && a === "-1") return "主升温、客降水";
    if (a === "1" && h === "-1") return "客升温、主降水";
    return "暂时没变";
  }

  function lockOne(raw) {
    const o = { h: n(raw.had.h), d: n(raw.had.d), a: n(raw.had.a) };
    const line = n((raw.hhad || {}).goalLineValue || (raw.hhad || {}).goalLine) || 0;
    const eu = hottest(o);
    const ah = ahFav(line);
    const fight = (eu === "home" && ah === "away") || (eu === "away" && ah === "home");
    const env = MIX.test(raw.league) ? "掺局区" : "高可信";
    const sp = fmtSp(o);
    const books = raw.books500 || null;
    const shake = (books && books.quake) || quake(raw.had);
    const veto = !!(books && books.veto);
    const locked = decide(eu, fight || veto, env, o);
    stamp(locked, raw, sp, env);
    fillMarkets(locked, raw, o, line);
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

  function fmtSp(o) {
    if (!o.h || !o.d || !o.a) return "—";
    return `${o.h.toFixed(2)} / ${o.d.toFixed(2)} / ${o.a.toFixed(2)}`;
  }

  function stamp(locked, raw, sp, env) {
    locked.sp = sp;
    locked.league = raw.league;
    locked.home = raw.home;
    locked.away = raw.away;
    locked.date = raw.date;
    locked.kickoff = raw.kickoff;
    locked.code = raw.code;
    locked.env = env;
    locked.source = "live";
    locked.slot = raw.slot;
    locked.books500 = raw.books500 || null;
    locked.safe = false;
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

  function asHandicap(pick) {
    return String(pick)
      .replace(/主\/平/g, "让胜/让平")
      .replace(/平\/客/g, "让平/让负")
      .replace(/主\/客/g, "让胜/让负")
      .replace(/^主$/, "让胜")
      .replace(/^客$/, "让负")
      .replace(/^平$/, "让平");
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
      return { light: "yellow", drift: drift, veto: vetoTxt, quake: shake, note: m.env === "掺局区" ? "掺局区少买，不进长串。" : "买两边，或者路过。" };
    }
    return { light: "green", drift: drift, veto: "欧亚同向" + (pin ? " · 平博" + pin : ""), quake: shake, note: "可以跟一边。1.3 以下别梭哈。" };
  }

  function summarize(m, eu, ah, fight, veto, sp, shake, books) {
    const bits = [sp, "锁 " + m.pick, "胜平负 " + (m.hadPicks || []).join("/"), "让球 " + (m.hhadPicks || []).join("/"), shake];
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

  function collapsePick(m) {
    const p = m.pick || "";
    if (/让/.test(p)) {
      if (/让负/.test(p) && !/让胜/.test(p)) m.pick = "让负";
      else if (/让胜/.test(p) && !/让负/.test(p) && !/让平/.test(p)) m.pick = "让胜";
      else if (/让胜/.test(p)) m.pick = "让胜";
      else m.pick = "让平";
      return;
    }
    m.pick = /客/.test(p) && !/主/.test(p) ? "客" : "主";
  }

  function capDualDay(list, keep) {
    const limit = Math.floor(list.length * 0.5);
    const extras = list.filter((m) => m.dual).sort((a, b) => (keep[a.tag] != null ? keep[a.tag] : 9) - (keep[b.tag] != null ? keep[b.tag] : 9));
    while (list.filter((m) => m.dual).length > limit && extras.length) {
      const m = extras.pop();
      if ((keep[m.tag] != null ? keep[m.tag] : 9) <= 2) break;
      m.dual = false;
      collapsePick(m);
      m.tag = "名额满才单";
    }
  }

  function buyLines(list, extra) {
    const dual = list.filter((m) => m.dual).length;
    const stop = list.filter((m) => m.light === "red").map((m) => m.code + m.pick);
    const green = list.filter((m) => m.light === "green").map((m) => m.code + m.pick);
    return [
      extra || `算法 ${list.length} 场，双选 ${dual}/${list.length}（上限 50%）`,
      green.length ? "跟一边：" + green.join("、") : "这一轮没有清楚的单边",
      stop.length ? "红灯仍锁：" + stop.join("、") : "没有红灯场",
      "每种玩法给两个选择。伤停未知，点名不上才改号。",
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

  function coreName(s) {
    return String(s || "").replace(/FC|RB|AFC|竞技|\s/g, "");
  }

  function sameTeam(a, b) {
    const x = coreName(a);
    const y = coreName(b);
    return x && y && (x === y || x.includes(y) || y.includes(x));
  }

  function twinOf(raw, list) {
    return (list || []).find((m) => sameTeam(m.home, raw.home) && sameTeam(m.away, raw.away));
  }

  function copyScript(locked, twin) {
    if (!twin) return;
    if (twin.ftScores) locked.ftScores = twin.ftScores.slice();
    if (twin.ttgPicks) locked.ttgPicks = twin.ttgPicks.slice();
    if (twin.hafuPicks) locked.hafuPicks = twin.hafuPicks.slice();
    locked.ftOu = locked.ttgPicks;
    locked.htScores = locked.hafuPicks;
  }

  function lockBeidan(raw, jcList) {
    const hh = raw.hhad || {};
    const o = { h: n(hh.h), d: n(hh.d), a: n(hh.a) };
    if (!o.h || !o.d || !o.a) return null;
    const line = n(hh.goalLineValue || hh.goalLine) || 0;
    const eu = hottest(o);
    const ah = ahFav(line);
    const fight = (eu === "home" && ah === "away") || (eu === "away" && ah === "home");
    const env = MIX.test(raw.league) ? "掺局区" : "高可信";
    const locked = decide(eu, fight, env, o);
    locked.pick = asHandicap(locked.pick);
    stamp(locked, raw, fmtSp(o), env);
    const had = { h: n((raw.had || {}).h), d: n((raw.had || {}).d), a: n((raw.had || {}).a) };
    fillMarkets(locked, raw, had.h ? had : o, line);
    copyScript(locked, twinOf(raw, jcList));
    locked.ticks = ticksOf(had.h ? had : o, ah, null);
    locked.summary = summarize(locked, eu, ah, fight, false, locked.sp, "北单让球盘", null);
    locked.market = marketOf(locked, eu, ah, fight, false, "北单让球盘", null);
    locked.factors = [
      { name: "SP", text: `北单让球 ${locked.handicap || "0"} · ${locked.sp}` },
      { name: "伤停轮换", text: "未知。" },
      { name: "发布会", text: "未知。" },
    ];
    return locked;
  }

  function toCombo(pick) {
    const map = { 主: "3", 平: "1", 客: "0" };
    const parts = String(pick || "").split("/").map((p) => map[p] || p).filter(Boolean);
    return parts.join("") || "3";
  }

  function lockSfc(raw, jcList) {
    let o = { h: n((raw.had || {}).h), d: n((raw.had || {}).d), a: n((raw.had || {}).a) };
    const twin = twinOf(raw, jcList);
    if ((!o.h || !o.d || !o.a) && twin && twin.sp) {
      const nums = String(twin.sp).match(/(\d+\.\d+)/g) || [];
      o = { h: n(nums[0]), d: n(nums[1]), a: n(nums[2]) };
    }
    if (!o.h || !o.d || !o.a) o = { h: 2.40, d: 3.30, a: 2.50 };
    const eu = hottest(o);
    const env = MIX.test(raw.league) ? "掺局区" : "高可信";
    const locked = decide(eu, false, env, o);
    if (!locked.dual) {
      const cover = undefeated(eu);
      locked.pick = cover.pick;
      locked.dual = true;
      locked.tag = "任14带平";
      locked.light = "yellow";
    }
    stamp(locked, raw, fmtSp(o), env);
    fillMarkets(locked, twin || raw, o, 0);
    copyScript(locked, twin);
    locked.combo = toCombo(locked.pick);
    locked.ticks = ticksOf(o, "even", null);
    locked.summary = summarize(locked, eu, "even", false, false, locked.sp, "胜负彩", null);
    locked.market = marketOf(locked, eu, "even", false, false, "胜负彩", null);
    locked.factors = [
      { name: "SP", text: locked.sp },
      { name: "伤停轮换", text: "未知。" },
      { name: "发布会", text: "未知。" },
    ];
    return locked;
  }

  function pickNine(list) {
    const rank = (m) => (m.light === "green" ? 0 : m.light === "yellow" ? 1 : 2);
    const real = (m) => /\/ /.test(m.sp || "") && !/^2\.40/.test(m.sp);
    return list.slice().sort((a, b) => rank(a) - rank(b) || Number(real(b)) - Number(real(a))).slice(0, 9);
  }

  function sfcBuy(list, pack, kind) {
    const line = list.map((m) => (m.combo || toCombo(m.pick)).charAt(0)).join(" ");
    const dual = list.map((m) => m.combo || toCombo(m.pick)).join(" ");
    return [
      `${kind} · ${pack.draw || ""} · 截止 ${pack.end || ""}`,
      "主推：" + line,
      "复式：" + dual,
      "任14/任9 比竞彩宽，1.3 禁止死胆。每种仍给两个选择。",
    ];
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
    global.CC_DATA.jczq.env = locked.some((m) => m.env === "掺局区") ? "含掺局区，少买" : "高可信为主";
    global.CC_DATA._liveAt = pack.updatedAt;
    return locked;
  }

  function applyBeidan(pack, jcList) {
    const locked = (pack.matches || []).map((m) => lockBeidan(m, jcList)).filter(Boolean);
    capDual(locked);
    global.CC_DATA.beidan.matches = locked;
    global.CC_DATA.beidan.title = "北单 · 在售 " + locked.length + " 场";
    global.CC_DATA.beidan.version = (pack.live ? "500即时 " : "500缓存 ") + (pack.updatedAt || "");
    global.CC_DATA.beidan.date = locked[0] ? locked[0].date : global.CC_DATA.beidan.date;
    global.CC_DATA.beidan.buy = buyLines(locked, "北单全部在售 " + locked.length + " 场，不只日职");
    global.CC_DATA.beidan.env = "让球胜平负。掺局区少买。";
    return locked;
  }

  function applySfc(pack, jcList) {
    const locked = (pack.matches || []).map((m) => lockSfc(m, jcList)).filter(Boolean);
    const r14 = locked.map((m) => Object.assign({}, m));
    const r9 = pickNine(locked).map((m) => Object.assign({}, m));
    global.CC_DATA.r14.matches = r14;
    global.CC_DATA.r14.title = "胜负彩 / 任 14 · " + (pack.draw || "");
    global.CC_DATA.r14.draw = pack.draw || "";
    global.CC_DATA.r14.version = (pack.live ? "体彩即时 " : "期次缓存 ") + (pack.draw || "");
    global.CC_DATA.r14.date = r14[0] ? r14[0].date : global.CC_DATA.r14.date;
    global.CC_DATA.r14.buy = sfcBuy(r14, pack, "任14");
    global.CC_DATA.r14.dualLimit = 1;
    global.CC_DATA.r14.env = "14 场全锁。比竞彩宽，禁止死胆。";
    global.CC_DATA.r9.matches = r9;
    global.CC_DATA.r9.title = "任 9 · " + (pack.draw || "");
    global.CC_DATA.r9.draw = pack.draw || "";
    global.CC_DATA.r9.version = global.CC_DATA.r14.version;
    global.CC_DATA.r9.date = r9[0] ? r9[0].date : global.CC_DATA.r9.date;
    global.CC_DATA.r9.buy = sfcBuy(r9, pack, "任9");
    global.CC_DATA.r9.dualLimit = 1;
    global.CC_DATA.r9.env = "同一期里挑 9 场相对清楚的。";
    return { r9, r14 };
  }

  function finish() {
    if (global.CC_EXTRAS) global.CC_EXTRAS.attach();
    else if (global.CC_ENGINE) global.CC_ENGINE.attachAll();
  }

  global.CC_PRED = { lockOne, apply, applyBeidan, applySfc, capDual, finish };
})(window);
