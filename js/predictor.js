(function (global) {
  const MIX = /日职|日乙|J1|J2|韩K|K联|澳超|芬超|瑞超|挪超|挪甲|美职|中甲/;

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

  function sidesOf(pick) {
    const p = String(pick || "");
    const set = [];
    if (/主|让胜/.test(p) || /(^|\/)胜(\/|$)/.test(p)) set.push("胜");
    if (/平|让平/.test(p) || /(^|\/)平(\/|$)/.test(p)) set.push("平");
    if (/客|让负/.test(p) || /(^|\/)负(\/|$)/.test(p)) set.push("负");
    return set.length ? set : ["胜"];
  }

  function pad2(arr, fb) {
    const out = (arr || []).filter(Boolean).slice();
    (fb || []).forEach((x) => {
      if (out.length < 2 && x && out.indexOf(x) < 0) out.push(x);
    });
    while (out.length < 2) out.push(out[0] || "—");
    return out.slice(0, 2);
  }

  function totOf(row) {
    const p = String(row.label).split("-").map(Number);
    return (p[0] || 0) + (p[1] || 0);
  }

  function scoreCtx(ttg, line, had, night) {
    let sum = 0;
    let wsum = 0;
    let peak = night ? 3 : 2;
    let peakO = 99;
    for (let i = 0; i <= 7; i += 1) {
      const o = n((ttg || {})["s" + i]);
      if (!o || o < 1.01) continue;
      const w = 1 / o;
      sum += i * w;
      wsum += w;
      if (o < peakO) {
        peakO = o;
        peak = i;
      }
    }
    let aim = wsum ? sum / wsum : (night ? 3 : 2.4);
    if (peak >= 3) aim = Math.max(aim, peak);
    if (Math.abs(line || 0) >= 1) aim = Math.max(aim, 2.6);
    const fav = had ? Math.min(had.h || 9, had.d || 9, had.a || 9) : 9;
    if (fav <= 1.25) aim = Math.max(aim, 3.1);
    else if (fav <= 1.45) aim = Math.max(aim, 2.7);
    let margin = 0;
    if ((line || 0) <= -1.25) margin = 2;
    else if ((line || 0) <= -0.75) margin = 1.2;
    else if ((line || 0) >= 1.25) margin = -2;
    else if ((line || 0) >= 0.75) margin = -1.2;
    else if (had && had.h && had.a) {
      if (had.h < had.a - 0.35) margin = fav <= 1.3 ? 2.1 : fav <= 1.7 ? 1.2 : 0.8;
      else if (had.a < had.h - 0.35) margin = fav <= 1.3 ? -2.1 : fav <= 1.7 ? -1.2 : -0.8;
    }
    return { aim: aim, peak: peak, margin: margin, line: line || 0, fav: fav };
  }

  function clip(x, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(x)));
  }

  function oneScore(side, ctx, bump) {
    const aim = (ctx && ctx.aim) || 2.4;
    const mgn = (ctx && ctx.margin) || 0;
    const t = Math.max(0, aim + (bump || 0));
    if (side === "平") {
      let g = clip(t / 2, 0, 4);
      if (bump && g >= 1) g = bump > 0 ? Math.min(4, g + 1) : Math.max(0, g - 1);
      return g + "-" + g;
    }
    const mag = Math.max(1, Math.abs(mgn) + (bump ? 0.35 : 0));
    let home = (t + (side === "胜" ? mag : -mag)) / 2;
    let away = t - home;
    if (side === "胜" && home <= away) home = away + 1;
    if (side === "负" && away <= home) away = home + 1;
    return clip(home, 0, 6) + "-" + clip(away, 0, 6);
  }

  function fallbackScores(pick, ctx) {
    const s = sidesOf(pick);
    if (s.length === 1) {
      const a = oneScore(s[0], ctx, 0);
      const b = oneScore(s[0], ctx, 0.85);
      return a === b ? [a, oneScore(s[0], ctx, -0.85)] : [a, b];
    }
    return [oneScore(s[0], ctx, 0), oneScore(s[1], ctx, 0)];
  }

  function preferScore(row, side, ctx) {
    const tot = totOf(row);
    const p = String(row.label).split("-").map(Number);
    const margin = (p[0] || 0) - (p[1] || 0);
    let w = Math.log(Math.max(row.odds, 1.05));
    w += Math.abs(tot - ctx.aim) * 0.5;
    if (side === "平") w += Math.abs(tot - Math.max(2, ctx.aim)) * 0.25;
    else w += Math.abs(margin - ctx.margin) * 0.42;
    if (ctx.aim >= 2.9 && tot >= 4 && tot <= 5) w -= 0.18;
    if (ctx.aim <= 1.7 && tot >= 4) w += 0.55;
    if (ctx.aim >= 2.4 && tot <= 1) w += 0.35;
    return w;
  }

  function pickCrs(rows, side, ctx) {
    const list = (rows || []).slice();
    if (!list.length) return [];
    list.sort((a, b) => a.odds - b.odds || preferScore(a, side, ctx) - preferScore(b, side, ctx));
    const first = list[0];
    const rest = list.filter((r) => totOf(r) !== totOf(first));
    rest.sort((a, b) => Math.abs(totOf(a) - ctx.peak) - Math.abs(totOf(b) - ctx.peak) || a.odds - b.odds);
    const second = rest[0] || list[1] || first;
    return [first.label, second.label];
  }

  function crsAligned(crs, sides, ctx) {
    const by = { 胜: [], 平: [], 负: [] };
    Object.keys(crs || {}).forEach((k) => {
      const hit = k.match(/^s(\d{2})s(\d{2})$/);
      if (!hit) return;
      const h = Number(hit[1]);
      const a = Number(hit[2]);
      const odds = n(crs[k]);
      if (!odds || odds < 1.01) return;
      const side = h > a ? "胜" : h < a ? "负" : "平";
      by[side].push({ label: h + "-" + a, odds: odds });
    });
    if (sides.length === 1) return pickCrs(by[sides[0]], sides[0], ctx).slice(0, 2);
    const a = pickCrs(by[sides[0]], sides[0], ctx)[0];
    const b = pickCrs(by[sides[1]], sides[1], ctx)[0];
    return [a, b].filter(Boolean);
  }

  function ttgAligned(ttg, scores) {
    const fromScores = [];
    (scores || []).forEach((s) => {
      const p = String(s).split("-");
      if (p.length < 2) return;
      const tot = Number(p[0]) + Number(p[1]);
      const lab = tot >= 7 ? "7+" : tot + "球";
      if (fromScores.indexOf(lab) < 0) fromScores.push(lab);
    });
    const rows = [];
    for (let i = 0; i <= 7; i += 1) {
      const o = n((ttg || {})["s" + i]);
      if (!o || o < 1.01) continue;
      rows.push({ label: i >= 7 ? "7+" : i + "球", odds: o, i: i });
    }
    rows.sort((a, b) => a.odds - b.odds);
    if (!rows.length) return pad2(fromScores, ["2球", "3球"]);
    const peak = rows[0].i;
    const near = rows.filter((r) => Math.abs(r.i - peak) <= 1).map((r) => r.label);
    return pad2(fromScores, near.concat(rows.map((r) => r.label)));
  }

  function hafuFt(lab) {
    if (/胜$/.test(lab)) return "胜";
    if (/平$/.test(lab)) return "平";
    return "负";
  }

  function hafuAligned(hafu, sides) {
    const map = { hh: "胜胜", hd: "胜平", ha: "胜负", dh: "平胜", dd: "平平", da: "平负", ah: "负胜", ad: "负平", aa: "负负" };
    const rows = Object.keys(map).map((k) => ({ label: map[k], odds: n((hafu || {})[k]) || 99 }))
      .filter((r) => r.odds < 90 && sides.indexOf(hafuFt(r.label)) >= 0)
      .sort((a, b) => a.odds - b.odds);
    if (rows.length) return pad2(rows.map((r) => r.label), rows.map((r) => r.label));
    const has = (x) => sides.indexOf(x) >= 0;
    if (has("胜") && has("平") && !has("负")) return ["平胜", "平平"];
    if (has("负") && has("平") && !has("胜")) return ["平平", "平负"];
    if (has("胜") && has("负") && !has("平")) return ["胜胜", "负负"];
    if (has("负") && !has("胜")) return ["负负", "平负"];
    return ["胜胜", "平胜"];
  }

  function hhadAligned(hhad, sides) {
    const map = { 胜: ["h", "让胜"], 平: ["d", "让平"], 负: ["a", "让负"] };
    let keys = sides.map((s) => map[s]).filter(Boolean);
    if (keys.length === 1) {
      keys = sides[0] === "负" ? [map.负, map.平] : [keys[0], map.平];
    }
    const rows = keys.map((x) => ({ label: x[1], odds: n((hhad || {})[x[0]]) || 99 }));
    rows.sort((a, b) => a.odds - b.odds);
    return pad2(rows.map((r) => r.label), rows.map((r) => r.label));
  }

  function fillMarkets(locked, raw, hadOdds, line) {
    raw = raw || {};
    locked._mk = { crs: raw.crs, ttg: raw.ttg, hafu: raw.hafu, hhad: raw.hhad, had: hadOdds, line: line };
    const sides = sidesOf(locked.pick);
    locked.hadPicks = sides.slice();
    locked.hhadPicks = hhadAligned(raw.hhad || {}, sides);
    const hh = Number(String(locked.kickoff || "00:00").slice(0, 2));
    const night = /欧冠|欧罗巴|欧协|英超|西甲|意甲|德甲|法甲/.test(String(locked.league || "")) || hh >= 21 || hh <= 5;
    const ctx = scoreCtx(raw.ttg, line, hadOdds, night);
    locked.ftScores = pad2(crsAligned(raw.crs, sides, ctx), fallbackScores(locked.pick, ctx));
    locked.ttgPicks = ttgAligned(raw.ttg, locked.ftScores);
    locked.hafuPicks = hafuAligned(raw.hafu, sides);
    locked.ftOu = locked.ttgPicks;
    locked.htScores = locked.hafuPicks;
    locked.htOu = locked.hafuPicks;
    locked.handicap = line ? (line > 0 ? "+" + line : String(line)) : locked.handicap || "";
    locked.scriptNote = "胜平负跟欧赔去水；让球跟亚盘 " + (locked.handicap || "0") + "；比分和进球跟进球数盘峰值 " + ctx.peak + " 球；半全场跟半全场赔率。全是当场盘口，不套底稿。";
  }

  function realign(list) {
    (list || []).forEach((m) => {
      if (!m._mk) return;
      fillMarkets(m, m._mk, m._mk.had, m._mk.line);
    });
  }

  function marketSrc(raw, twin) {
    const mk = twin && twin._mk;
    if (!mk) return raw;
    return {
      crs: (raw && raw.crs) || mk.crs,
      ttg: (raw && raw.ttg) || mk.ttg,
      hafu: (raw && raw.hafu) || mk.hafu,
      hhad: (raw && raw.hhad) || mk.hhad,
    };
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
    const locked = decide(eu, fight || veto, env, o, ah);
    stamp(locked, raw, sp, env);
    fillMarkets(locked, raw, o, line);
    locked.ticks = ticksOf(o, ah, books, line);
    locked.action = actionOf(locked);
    locked.summary = summarize(locked, eu, ah, fight, veto, sp, shake, books);
    locked.market = marketOf(locked, eu, ah, fight, veto, shake, books);
    locked.factors = [
      { name: "SP", text: `${sp}。让球 ${locked.handicap || "0"}。欧 ${eu} 亚 ${ah}。` },
      { name: "伤停轮换", text: "未知。算法不拿空伤停改号。" },
      { name: "发布会", text: "未知。" },
      { name: "战意", text: "未知。等新闻和近况补。" },
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
    locked.liveScore = raw.liveScore || "";
    locked.liveState = raw.liveState || "";
    locked.liveMinute = raw.liveMinute || "";
    if (raw.score) locked.score = raw.score;
    if (raw.result) locked.result = raw.result;
  }

  function ahQuotes(line, ah) {
    if ((line != null && line < -0.1) || ah === "home") return { home: 0.80, away: 1.00 };
    if ((line != null && line > 0.1) || ah === "away") return { home: 1.00, away: 0.80 };
    return { home: 1.00, away: 1.00 };
  }

  function ticksOf(o, ah, books, line) {
    const open = books && books.avgOpen ? books.avgOpen : o;
    const now = books && books.avgNow ? books.avgNow : o;
    const fake = ahQuotes(line, ah);
    const ahOpen = open.kh ? { home: open.kh, away: open.ka } : fake;
    const ahNow = now.kh ? { home: now.kh, away: now.ka } : fake;
    return [
      { t: "初盘", h: open.h, d: open.d, a: open.a, ah: ahOpen, ou: { over: open.h, under: open.a }, vol: 8 },
      { t: "即时", h: now.h, d: now.d, a: now.a, ah: ahNow, ou: { over: now.h, under: now.a }, vol: 12 },
    ];
  }

  function undefeated(eu) {
    if (eu === "away") return { pick: "平/客", dual: true };
    if (eu === "even") return { pick: "主/客", dual: true };
    return { pick: "主/平", dual: true };
  }

  function together(eu, ah) {
    return (eu === "home" && ah === "home") || (eu === "away" && ah === "away");
  }

  function decide(eu, red, env, o, ah) {
    const ahSide = ah || "even";
    const aligned = together(eu, ahSide);
    let out;
    if (env === "掺局区" || eu === "even") {
      out = {
        pick: eu === "even" ? "主/客" : eu === "away" ? "平/客" : "主/平",
        dual: true, paperOppose: false, tag: eu === "even" ? "对开" : "胶着", light: "yellow",
        lock: !red && env === "掺局区" ? aligned : !red && eu !== "even",
      };
    } else if (eu === "draw") {
      out = { pick: "主/平", dual: true, paperOppose: false, tag: "偏平", light: "yellow", lock: !red };
    } else {
      const side = eu === "away" ? o.a : o.h;
      const can = !red && (aligned || ahSide === "even");
      out = side < 1.8
        ? { pick: eu === "away" ? "平/客" : "主/平", dual: true, paperOppose: false, tag: "低赔不单", light: "yellow", lock: can }
        : { pick: eu === "away" ? "客" : "主", dual: false, paperOppose: false, tag: "跟一边", light: "green", lock: can };
    }
    if (!red) return out;
    const cover = undefeated(eu);
    out.pick = cover.pick;
    out.dual = true;
    out.lock = false;
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
        note: "市场标红：热门单边不可信。倾向写下看出手，动作是别碰。",
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
    const bits = [sp, "锁 " + String(m.pick || "").replace(/主/g, "胜").replace(/客/g, "负"), "胜平负 " + (m.hadPicks || []).join("/"), "让球 " + (m.hhadPicks || []).join("/"), shake];
    if (books && books.avgOpen && books.avgNow) {
      bits.push("平均初盘 " + books.avgOpen.h.toFixed(2) + " → 即时 " + books.avgNow.h.toFixed(2));
    }
    if (fight) bits.push("欧亚打架");
    if (veto) bits.push("百家背离");
    if (m.light === "red") bits.push("红灯只警告热门单边，锁号仍给");
    return bits.join("。") + "。";
  }

  function capDual(list) {
    const keep = { 别碰热门: 0, 别碰: 0, 对开: 1, 战意改向: 2, 战意定边: 2, 稳妥带平: 2, 低赔不单: 2, 偏平: 3, 胶着: 4, 内容拧着: 0, 两边降档: 0 };
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
      if (m.env === "掺局区") continue;
      if ((keep[m.tag] != null ? keep[m.tag] : 9) <= 2) break;
      m.dual = false;
      collapsePick(m);
      m.tag = "名额满才单";
      if (m.light === "green") m.light = "yellow";
    }
  }

  function playable(m) {
    return m && (m.action === "买一边" || m.action === "买两边" || m.action === "少买");
  }

  function buyLines(list, extra) {
    const play = (list || []).filter(playable);
    const skip = (list || []).filter((m) => !playable(m));
    const dual = play.filter((m) => m.dual).length;
    const green = play.filter((m) => m.light === "green").map((m) => m.code + m.pick);
    const mix = play.filter((m) => m.env === "掺局区").map((m) => m.code + m.pick);
    return [
      extra || `列表 ${list.length} 场，出手 ${play.length}，观察 ${skip.length}。出手里双选 ${dual}/${play.length || 1}`,
      green.length ? "跟一边：" + green.join("、") : "这一轮没有清楚的单边",
      mix.length ? "掺局区只少买：" + mix.join("、") : "掺局区没有同向场",
      skip.length ? "红灯/对开/内容拧着：只观察，不进怎么买" : "没有观察场",
      "一场一锁。双选不到一半。折太低的双选路过。",
      "灯是状态，动作才是出不出手。倾向和动作必须一致。",
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

  function lockBeidan(raw, jcList) {
    const hh = raw.hhad || {};
    const o = { h: n(hh.h), d: n(hh.d), a: n(hh.a) };
    if (!o.h || !o.d || !o.a) return null;
    const line = n(hh.goalLineValue || hh.goalLine) || 0;
    const had = { h: n((raw.had || {}).h), d: n((raw.had || {}).d), a: n((raw.had || {}).a) };
    const euHad = had.h && had.d && had.a ? hottest(had) : hottest(o);
    const eu = hottest(o);
    const ah = ahFav(line);
    const fight = (euHad === "home" && ah === "away") || (euHad === "away" && ah === "home");
    const env = MIX.test(raw.league) ? "掺局区" : "高可信";
    const locked = decide(eu, fight, env, o, ah);
    locked.pick = asHandicap(locked.pick);
    stamp(locked, raw, fmtSp(o), env);
    fillMarkets(locked, marketSrc(raw, twinOf(raw, jcList)), had.h ? had : o, line);
    locked.ticks = ticksOf(had.h ? had : o, ah, null, line);
    locked.action = actionOf(locked);
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
    const locked = decide(eu, false, env, o, "even");
    if (!locked.dual) {
      const cover = undefeated(eu);
      locked.pick = cover.pick;
      locked.dual = true;
      locked.tag = "任14带平";
      locked.light = "yellow";
    }
    locked.lock = true;
    stamp(locked, raw, fmtSp(o), env);
    locked.action = actionOf(locked);
    fillMarkets(locked, marketSrc(raw, twin), o, 0);
    locked.combo = toCombo(locked.pick);
    locked.ticks = ticksOf(o, "even", null, 0);
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
      "任14/任9 比竞彩宽，1.3 禁止死胆。套餐跟着胜平负走。",
    ];
  }

  function todayIso() {
    if (global.CC_ODDS && CC_ODDS.todayIso) return CC_ODDS.todayIso();
    const d = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function apply(pack) {
    const locked = pack.matches.map(lockOne);
    const old = (global.CC_DATA.jczq && global.CC_DATA.jczq.matches) || [];
    locked.forEach((m) => overlayNotes(m, old));
    const keyOf = (m) => m.slot || [m.date, m.home, m.away].join("|");
    const seen = new Set(locked.map(keyOf));
    const today = todayIso();
    const keep = old.filter((m) => {
      if (seen.has(keyOf(m))) return false;
      if (m.result) return true;
      return m.source === "live" && (!m.date || m.date >= today);
    });
    const all = keep.concat(locked);
    capDual(all);
    realign(all);
    global.CC_DATA.jczq.matches = all;
    global.CC_DATA.jczq.title = "竞彩足球 · 即时算法 " + all.length + " 场";
    global.CC_DATA.jczq.version = (pack.booksOk ? "竞彩+500百家 " : "竞彩官方 SP ") + (pack.updatedAt || "");
    global.CC_DATA.jczq.date = locked[0] ? locked[0].date : global.CC_DATA.jczq.date;
    global.CC_DATA.jczq.buy = buyLines(all);
    global.CC_DATA.jczq.env = all.some((m) => m.env === "掺局区") ? "含掺局区，少买。十一点卡出手。" : "高可信为主。十一点卡出手，不败追稳。";
    const mix = all.filter((m) => m.env === "掺局区").length;
    global.CC_DATA.jczq.dualLimit = mix > all.length * 0.5 ? 1 : 0.5;
    global.CC_DATA._liveAt = pack.updatedAt;
    return all;
  }

  function applyBeidan(pack, jcList) {
    const locked = (pack.matches || []).map((m) => lockBeidan(m, jcList)).filter(Boolean);
    capDual(locked);
    realign(locked);
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

  function euFromPick(m) {
    const p = String(m.pick || "");
    if (/主\/客|让胜\/让负/.test(p)) return "even";
    if (/平\/客|让平\/让负|^客$|^让负$|^负$/.test(p)) return "away";
    return "home";
  }

  function favOdds(m, eu) {
    const nums = String(m.sp || "").match(/(\d+\.\d+)/g);
    if (!nums || nums.length < 3) return null;
    if (eu === "away") return +nums[2];
    if (eu === "home") return +nums[0];
    return Math.min(+nums[0], +nums[2]);
  }

  function contentClash(m, eu) {
    const d = m.draft || {};
    if (eu === "away" && d.homeHard && d.awaySoft) return "主场近况硬、客场软，客热不跟单";
    if (eu === "home" && d.awayHard && d.homeSoft) return "客场近况硬、主场软，主热不跟单";
    return "";
  }

  function sidePick(m, side, dual) {
    const one = side === "away" ? "客" : "主";
    const two = side === "away" ? "平/客" : "主/平";
    const raw = dual ? two : one;
    return /让/.test(String(m.pick || "")) ? asHandicap(raw) : raw;
  }

  function applyWill(m, eu, d) {
    const side = d.clashWill;
    if (!side || m.light === "red") return false;
    if (eu === side) return false;
    const fav = favOdds(m, side);
    const dual = fav != null && fav < 1.8;
    m.pick = sidePick(m, side, dual);
    m.dual = dual;
    m.light = dual ? "yellow" : "green";
    m.lock = true;
    m.paperOppose = eu !== "even";
    m.tag = eu === "even" ? "战意定边" : "战意改向";
    m.steady = eu === "even"
      ? ("对开，战意偏" + (side === "away" ? "客" : "主") + "，跟一边")
      : ("战意偏" + (side === "away" ? "客" : "主") + "，不跟盘口热门");
    if (m._mk) fillMarkets(m, m._mk, m._mk.had, m._mk.line);
    return true;
  }

  function applySteady(m) {
    if (!m || m.source !== "live") return;
    if (m.light === "red") return;
    if (global.CC_FORM && CC_FORM.fillFactors && !m.draft) CC_FORM.fillFactors(m, m.form);
    const d = m.draft || {};
    const eu = euFromPick(m);
    const clash = contentClash(m, eu);
    m.steady = clash || "";
    if (d.bothLight) {
      m.lock = false;
      m.tag = "两边降档";
      return;
    }
    if (applyWill(m, eu, d)) return;
    if (clash) {
      m.lock = false;
      m.paperOppose = true;
      m.tag = "内容拧着";
      m.steady = clash;
      return;
    }
    if (m.tag === "对开") {
      m.lock = false;
      return;
    }
    if (m.dual && m.engine && m.engine.cover != null && m.engine.cover < 1.3) {
      m.lock = false;
      m.tag = "折太低";
      m.steady = "买两边折下来不到 1.3，这笔不玩";
    }
  }

  function applySteadyAll() {
    ["jczq", "beidan"].forEach((key) => {
      ((((global.CC_DATA || {})[key] || {}).matches) || []).forEach(applySteady);
    });
  }

  function actionOf(m) {
    const g = m.engine && m.engine.gate;
    const will = m.will || (global.CC_FORM && CC_FORM.willOf && CC_FORM.willOf(m));
    if (will && !m.will) m.will = will;
    if (m.light === "red" || g === "别碰") return "别碰";
    if (m.lock === false || m.tag === "内容拧着" || m.tag === "两边降档" || m.tag === "折太低") return "路过";
    if (will && will.gap === "都轻") return "路过";
    if (m.env === "掺局区" || m.tag === "名额满才单") return "少买";
    if (m.tag === "战意改向" || m.tag === "战意定边" || m.tag === "跟一边") return m.dual ? "买两边" : "买一边";
    if (m.tag === "低赔不单" || m.tag === "胶着" || m.tag === "偏平") return "买两边";
    if (g === "不出手" || g === "路过") return "路过";
    if (m.dual) return "买两边";
    if (m.light === "green") return "买一边";
    return "路过";
  }

  function formLine(side, key) {
    const p = side && side[key];
    if (!p || !p.n) return "样本不足";
    return p.n + "场" + p.w + "胜" + p.d + "平" + p.l + "负";
  }

  function writeWhy(m) {
    if (global.CC_ENGINE && !m.engine) m.engine = CC_ENGINE.read(m);
    const e = m.engine;
    const why = [];
    why.push({
      from: "联赛环境",
      fact: (m.league || "") + " → " + (m.env || "未知"),
      so: m.env === "掺局区" ? "默认胶着，禁止标绿单边进长串" : "高可信，欧亚同向才出单边",
    });
    if (e && global.CC_ENGINE) {
      const h = CC_ENGINE.pct(e.fair.h);
      const d = CC_ENGINE.pct(e.fair.d);
      const a = CC_ENGINE.pct(e.fair.a);
      why.push({
        from: "竞彩即时 SP",
        fact: (m.sp || "—") + "，去水后 主" + h + "% / 平" + d + "% / 客" + a + "%，抽水 " + (e.vig * 100).toFixed(1) + "%",
        so: "钱站" + e.moneySide + "，这是方向，不是已经能买",
      });
      why.push({
        from: "欧亚",
        fact: "欧赔" + CC_ENGINE.sideLabel(e.eu) + " / 亚盘" + CC_ENGINE.sideLabel(e.ah) + (e.fight ? "，打架" : "，没拧着"),
        so: e.fight ? "方向不可信，别碰热门单边" : "同向才允许跟",
      });
    }
    const lamp = m.light === "green" ? "清楚" : m.light === "red" ? "别碰热门" : "胶着";
    why.push({ from: "灯", fact: lamp + (m.tag ? " · " + m.tag : ""), so: m.light === "green" ? "可以写单边倾向" : m.light === "red" ? "热门单边不可信" : "只写不败，不写必胜" });
    if (e && e.reasons && e.reasons.length) {
      why.push({
        from: "出手闸门",
        fact: e.gate + (e.layer ? " · " + e.layer.label : ""),
        so: e.reasons.join(""),
      });
    }
    writeWhyDraft(m, why);
    const act = actionOf(m);
    const pick = String(m.pick || "").replace(/主/g, "胜").replace(/客/g, "负");
    why.push({ from: "结论", fact: "倾向 " + pick + "，动作 " + act, so: actHint(act) });
    m.why = why;
    m.action = act;
    m.summary = why.map((x) => x.from + "：" + x.fact + " → " + x.so).join("。") + "。";
  }

  function writeWhyDraft(m, why) {
    const order = ["战意", "利益关系", "赛事优先级", "实力", "主客", "伤停轮换", "赛程", "阵容特性", "重要程度", "发布会", "SP"];
    const bag = {};
    (m.factors || []).forEach((f) => { if (f && f.name) bag[f.name] = f.text; });
    order.forEach((name) => {
      const so = name === "战意"
        ? (m.tag === "战意改向" || m.tag === "战意定边" ? "战意有边就改边，能单就单" : "战意同向或两边一样，不另改号")
        : "底稿用来卡出手，不拿近况去博冷";
      why.push({ from: name, fact: bag[name] || "未知", so: so });
    });
    if (m.tag === "内容拧着" || m.tag === "两边降档" || m.tag === "折太低" || m.tag === "战意改向" || m.tag === "战意定边" || m.steady) {
      why.push({
        from: "稳妥闸门",
        fact: m.steady || m.tag,
        so: m.tag === "战意改向" || m.tag === "战意定边" ? "战意改边，一场一锁" : (m.lock === false ? "路过，不买两张凑" : "能单就单"),
      });
    }
  }

  function actHint(act) {
    if (act === "买一边") return "一场一锁，跟一边";
    if (act === "买两边") return "只有胶着才买两张，名额不到一半";
    if (act === "少买") return "掺局区少买，不进长串";
    if (act === "别碰") return "别碰热门单边";
    return "倾向写下，这笔先不出";
  }

  function explainAll() {
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      (((global.CC_DATA || {})[key] || {}).matches || []).forEach(writeWhy);
    });
  }

  function refreshBuy() {
    const jc = (global.CC_DATA || {}).jczq;
    if (jc && jc.matches) jc.buy = buyLines(jc.matches);
    const bd = (global.CC_DATA || {}).beidan;
    if (bd && bd.matches) bd.buy = buyLines(bd.matches, "北单出手才进怎么买，列表仍全量");
  }

  function finish() {
    if (global.CC_EXTRAS) global.CC_EXTRAS.attach();
    else if (global.CC_ENGINE) global.CC_ENGINE.attachAll();
    if (global.CC_NEWS) CC_NEWS.attachAll();
    if (global.CC_FORM) CC_FORM.attachAll();
    if (global.CC_ENGINE) CC_ENGINE.attachAll();
    applySteadyAll();
    ["jczq", "beidan"].forEach((key) => {
      capDual((((global.CC_DATA || {})[key] || {}).matches) || []);
    });
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      realign(((global.CC_DATA || {})[key] || {}).matches);
    });
    explainAll();
    refreshBuy();
    if (global.CC_RESULT && CC_RESULT.attachList) {
      ["jczq", "beidan", "r14", "r9"].forEach((key) => {
        CC_RESULT.attachList(((global.CC_DATA || {})[key] || {}).matches);
      });
    }
  }

  function scoresOf(m) {
    const mk = m && m._mk ? m._mk : {};
    const had = mk.had || {};
    const line = mk.line != null ? mk.line : n(m && m.handicap) || 0;
    const hh = Number(String((m && m.kickoff) || "00:00").slice(0, 2));
    const night = /欧冠|欧罗巴|欧协|英超|西甲|意甲|德甲|法甲/.test(String((m && m.league) || "")) || hh >= 21 || hh <= 5;
    const ctx = scoreCtx(mk.ttg, line, had, night);
    return pad2(crsAligned(mk.crs, sidesOf(m && m.pick), ctx), fallbackScores(m && m.pick, ctx));
  }

  global.CC_PRED = { lockOne, apply, applyBeidan, applySfc, capDual, finish, explainAll, scoresOf };
})(window);
