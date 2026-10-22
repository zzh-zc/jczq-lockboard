(function (global) {
  const MIX = /日职|日乙|J1|J2|韩K|K联|澳超|芬超|瑞超|挪超|挪甲|美职|中甲/;
  const MID = /欧国联|英冠|欧罗巴|欧协|法乙|德乙/;

  function envOf(league) {
    if (global.CC_REVIEW && CC_REVIEW.envOf) return CC_REVIEW.envOf(league);
    const g = String(league || "");
    if (MIX.test(g)) return "掺局区";
    if (MID.test(g)) return "中可信";
    return "高可信";
  }

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

  function leagueStyle(league) {
    if (global.CC_FORM && CC_FORM.leagueProfile) return CC_FORM.leagueProfile(league).style;
    const g = String(league || "");
    if (/意甲|法甲|葡超|日职|日乙|韩K|瑞超|芬超|奥甲|波甲|土超|苏超/.test(g)) return "grind";
    if (/英超|德甲|荷甲|比甲|澳超|美职|解放者|欧冠/.test(g)) return "open";
    return "mid";
  }

  function profOf(m) {
    if (m && m.leagueProf) return m.leagueProf;
    if (global.CC_FORM && CC_FORM.leagueProfile) return CC_FORM.leagueProfile(m && m.league);
    return { style: leagueStyle(m && m.league), draw: "mid", goals: "mid", note: "" };
  }

  function h2hOf(m) {
    if (m && m.h2h && m.h2h.n) return m.h2h;
    if (global.CC_FORM && CC_FORM.h2hOf) return CC_FORM.h2hOf(m);
    return { n: 0, text: "交手样本不足。" };
  }

  function formTotal(m) {
    const hs = m && m.form && m.form.homeSide && m.form.homeSide.recent;
    const as = m && m.form && m.form.awaySide && m.form.awaySide.recent;
    if (!hs || !hs.n || !as || !as.n) return null;
    return ((hs.gf || 0) / hs.n + (as.ga || 0) / as.n) * 0.5 + ((as.gf || 0) / as.n + (hs.ga || 0) / hs.n) * 0.5;
  }

  function scoreCtx(ttg, line, had, night, m) {
    let sum = 0;
    let wsum = 0;
    let peak = 2;
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
    let aim = wsum ? sum / wsum : (night ? 2.7 : 2.4);
    const prof = profOf(m);
    const style = prof.style || leagueStyle(m && m.league);
    const goals = prof.goals || (style === "grind" ? "small" : (style === "open" ? "big" : "mid"));
    const ft = formTotal(m);
    const h2h = h2hOf(m);
    if (ft != null) aim = aim * 0.78 + ft * 0.22;
    if (h2h && h2h.n >= 3 && h2h.avgTot) aim = aim * 0.72 + h2h.avgTot * 0.28;
    if (goals === "small" || style === "grind") aim *= 0.90;
    if (goals === "big" || style === "open") aim *= 1.08;
    if (night && (goals === "big" || style === "open")) aim += 0.08;
    const fav = had ? Math.min(had.h || 9, had.d || 9, had.a || 9) : 9;
    let margin = 0;
    if ((line || 0) <= -1.75) margin = 2.4;
    else if ((line || 0) <= -1.25) margin = 1.9;
    else if ((line || 0) <= -0.75) margin = 1.15;
    else if ((line || 0) >= 1.75) margin = -2.4;
    else if ((line || 0) >= 1.25) margin = -1.9;
    else if ((line || 0) >= 0.75) margin = -1.15;
    else if (had && had.h && had.a) {
      if (had.h < had.a - 0.35) margin = fav <= 1.28 ? 2.0 : fav <= 1.7 ? 1.15 : 0.65;
      else if (had.a < had.h - 0.35) margin = fav <= 1.28 ? -2.0 : fav <= 1.7 ? -1.15 : -0.65;
    }
    return { aim: aim, peak: peak, margin: margin, line: line || 0, fav: fav, style: style, goals: goals, draw: prof.draw };
  }

  function clip(x, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(x)));
  }

  function fact(k) {
    let x = 1;
    for (let i = 2; i <= k; i += 1) x *= i;
    return x;
  }

  function pois(l, k) {
    return Math.exp(-l) * Math.pow(Math.max(l, 0.05), k) / fact(k);
  }

  function oneScore(side, ctx, bump) {
    const aim = (ctx && ctx.aim) || 2.6;
    const mgn = (ctx && ctx.margin) || 0;
    const t = Math.max(1.4, aim + (bump || 0));
    if (side === "平") {
      let g = clip(t / 2, 0, 4);
      if (g === 0 && t >= 1.8) g = 1;
      if (bump > 0) g = Math.min(4, Math.max(2, g + 1));
      return g + "-" + g;
    }
    const mag = Math.max(0.8, Math.abs(mgn) + (bump ? 0.45 : 0));
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
      const b = oneScore(s[0], ctx, ctx && ctx.aim >= 3 ? 1.15 : 0.9);
      return a === b ? [a, oneScore(s[0], ctx, -0.7)] : [a, b];
    }
    return [oneScore(s[0], ctx, 0), oneScore(s[1], ctx, 0)];
  }

  function lambdas(ctx) {
    const tot = Math.max(1.3, (ctx && ctx.aim) || 2.6);
    const diff = (ctx && ctx.margin) || 0;
    let home = (tot + diff) / 2;
    let away = tot - home;
    return { h: Math.max(0.3, Math.min(4.6, home)), a: Math.max(0.3, Math.min(4.6, away)) };
  }

  function ttgLab(i) {
    return i >= 7 ? "7+" : i + "球";
  }

  function ttgNums(picks) {
    return (picks || []).map((p) => {
      if (/7\+/.test(String(p))) return 7;
      const x = Number(String(p).replace(/[^\d]/g, ""));
      return Number.isFinite(x) ? x : null;
    }).filter((x) => x != null);
  }

  function pickTtg(ttg, ctx, sides) {
    const drawOnly = sides && sides.length === 1 && sides[0] === "平";
    const rows = [];
    for (let i = 0; i <= 7; i += 1) {
      const o = n((ttg || {})["s" + i]);
      if (!o || o < 1.01) continue;
      let w = 1 / o;
      const small = ctx && (ctx.goals === "small" || ctx.style === "grind");
      const big = ctx && (ctx.goals === "big" || ctx.style === "open");
      if (small) {
        if (i === 1 || i === 2) w *= 1.14;
        if (i >= 4) w *= 0.78;
        if (i === 0) w *= 0.92;
      } else if (big) {
        if (i >= 4) w *= 1.12;
        if (i <= 1) w *= 0.82;
      }
      if (drawOnly) w *= (i % 2 === 0 ? 1.28 : 0.48);
      rows.push({ i: i, o: o, w: w });
    }
    if (!rows.length) {
      let core = Math.max(0, Math.min(6, Math.round((ctx && ctx.aim) || 2.5)));
      if (drawOnly && core % 2) core -= 1;
      const alt = drawOnly ? core + 2 : ((ctx && (ctx.goals === "small" || ctx.style === "grind")) ? Math.max(0, core - 1) : core + 1);
      const second = alt === core ? core + 1 : alt;
      return [ttgLab(core), ttgLab(second)];
    }
    rows.sort((a, b) => b.w - a.w);
    const first = rows[0];
    const left = rows.find((r) => r.i === first.i - 1);
    const right = rows.find((r) => r.i === first.i + 1);
    let second;
    if (drawOnly) {
      second = rows.find((r) => r.i !== first.i && r.i % 2 === 0) || right || left || rows[1];
    } else if (left && right) {
      const close = Math.abs(left.w - right.w) < 0.04 * Math.max(left.w, right.w);
      const small = ctx && (ctx.goals === "small" || ctx.style === "grind");
      const big = ctx && (ctx.goals === "big" || ctx.style === "open");
      if (close && small) second = left;
      else if (close && big) second = right;
      else second = left.w >= right.w ? left : right;
    } else {
      second = left || right || rows[1] || first;
    }
    const lo = first.i <= second.i ? first : second;
    const hi = first.i <= second.i ? second : first;
    return [ttgLab(lo.i), ttgLab(hi.i)];
  }

  function crsMap(crs) {
    const oddsMap = {};
    Object.keys(crs || {}).forEach((k) => {
      const hit = k.match(/^s(\d{2})s(\d{2})$/);
      if (!hit) return;
      const o = n(crs[k]);
      if (o && o >= 1.01) oddsMap[Number(hit[1]) + "-" + Number(hit[2])] = o;
    });
    return oddsMap;
  }

  function scoreCells(tot) {
    const out = [];
    if (tot >= 7) {
      for (let i = 0; i <= 6; i += 1) {
        for (let j = 0; j <= 6; j += 1) {
          if (i + j >= 7) out.push([i, j]);
        }
      }
      return out;
    }
    for (let i = 0; i <= tot; i += 1) {
      const j = tot - i;
      if (j >= 0 && j <= 6) out.push([i, j]);
    }
    return out;
  }

  function bestScoreForTot(tot, sideSet, ctx, oddsMap, avoid) {
    const la = lambdas(ctx);
    const rows = [];
    scoreCells(tot).forEach((pair) => {
      const i = pair[0];
      const j = pair[1];
      const side = i > j ? "胜" : i < j ? "负" : "平";
      if (sideSet.indexOf(side) < 0) return;
      const lab = i + "-" + j;
      if (lab === avoid) return;
      let p = pois(la.h, i) * pois(la.a, j);
      if (oddsMap[lab]) p *= 1 / Math.sqrt(oddsMap[lab]);
      if (ctx.fav <= 1.28 && Math.abs(i - j) >= 3) p *= 1.32;
      rows.push({ label: lab, p: p });
    });
    rows.sort((a, b) => b.p - a.p);
    return rows[0] || null;
  }

  function pickScores(sides, ctx, crs, tots) {
    const sideSet = sides && sides.length ? sides : ["胜"];
    const oddsMap = crsMap(crs);
    const targets = (tots || []).filter((t) => t >= 0).slice(0, 2);
    if (!targets.length) return fallbackScores(sideSet.join("/"), ctx);
    const a = bestScoreForTot(targets[0], sideSet, ctx, oddsMap, "");
    const b = bestScoreForTot(targets[1] != null ? targets[1] : targets[0], sideSet, ctx, oddsMap, a ? a.label : "");
    if (a && b) return [a.label, b.label];
    if (a) {
      const extra = bestScoreForTot(targets[0], sideSet, ctx, oddsMap, a.label);
      return extra ? [a.label, extra.label] : [a.label, a.label];
    }
    return fallbackScores(sideSet.join("/"), ctx);
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
    if (locked && (locked.score || locked.result)) return;
    raw = raw || {};
    locked._mk = { crs: raw.crs, ttg: raw.ttg, hafu: raw.hafu, hhad: raw.hhad, had: hadOdds, line: line };
    const sides = sidesOf(locked.pick);
    locked.hadPicks = sides.slice();
    locked.hhadPicks = hhadAligned(raw.hhad || {}, sides);
    const hh = Number(String(locked.kickoff || "00:00").slice(0, 2));
    const night = /欧冠|欧罗巴|欧协|英超|西甲|意甲|德甲|法甲/.test(String(locked.league || "")) || hh >= 21 || hh <= 5;
    const ctx = scoreCtx(raw.ttg, line, hadOdds, night, locked);
    locked.ttgPicks = pickTtg(raw.ttg, ctx, sides);
    locked.ftScores = pickScores(sides, ctx, raw.crs, ttgNums(locked.ttgPicks));
    locked.hafuPicks = hafuAligned(raw.hafu, sides);
    if (ctx.draw === "high" && sides.indexOf("平") >= 0 && locked.hafuPicks.indexOf("平平") < 0) {
      locked.hafuPicks = pad2(["平平"].concat(locked.hafuPicks), locked.hafuPicks);
    }
    if (ctx.draw === "high" && locked.hhadPicks.indexOf("让平") < 0) {
      locked.hhadPicks = pad2([locked.hhadPicks[0], "让平"], locked.hhadPicks);
    }
    locked.ftOu = locked.ttgPicks;
    locked.htScores = locked.hafuPicks;
    locked.htOu = locked.hafuPicks;
    locked.handicap = line ? (line > 0 ? "+" + line : String(line)) : locked.handicap || "";
    const prof = profOf(locked);
    const h2h = h2hOf(locked);
    locked.scriptNote = (prof.note || "进球数跟进球盘。") + (h2h.n ? " " + h2h.text : " 交手样本不足。") + " 让球 " + (locked.handicap || "0") + "。";
  }

  function realign(list) {
    (list || []).forEach((m) => {
      if (!m._mk || m.score || m.result) return;
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
    const env = envOf(raw.league);
    const sp = fmtSp(o);
    const shake = quake(raw.had);
    const locked = decide(eu, env, o, raw.league);
    stamp(locked, raw, sp, env);
    fillMarkets(locked, raw, o, line);
    locked.ticks = ticksOf(o, line);
    locked.action = actionOf(locked);
    locked.summary = summarize(locked, eu, sp, shake);
    locked.market = marketOf(locked, eu, shake);
    locked.factors = blankFactors(sp, locked.handicap);
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

  function FACTORS_11() {
    return ["战意", "利益关系", "赛事优先级", "实力", "主客", "伤停轮换", "赛程", "阵容特性", "重要程度", "发布会", "SP"];
  }

  function blankFactors(sp, handicap) {
    return FACTORS_11().map((name) => ({
      name: name,
      text: name === "SP" ? ((sp || "未知") + "。竞彩即时三项。让球 " + (handicap || "0") + "。") : "未知。",
    }));
  }

  function ticksOf(o, line) {
    return [
      { t: "竞彩SP", h: o.h, d: o.d, a: o.a, ah: null, ou: null, vol: 10, line: line || 0 },
    ];
  }

  function undefeated(eu) {
    if (eu === "away") return { pick: "平/客", dual: true };
    if (eu === "even") return { pick: "主/客", dual: true };
    return { pick: "主/平", dual: true };
  }

  function decide(eu, env, o, league) {
    const w = (global.CC_REVIEW && CC_REVIEW.weights && CC_REVIEW.weights()) || { singleMin: 1.85, drawish: /西甲/ };
    const cover = eu === "away" ? "平/客" : "主/平";
    if (env === "掺局区" || env === "中可信" || eu === "even") {
      const evenAway = eu === "even" && o && o.h > o.a;
      return {
        pick: eu === "away" || evenAway ? "平/客" : "主/平",
        dual: true, paperOppose: false,
        tag: eu === "even" ? "对开" : (env === "中可信" ? "中可信双" : "胶着"),
        light: "yellow",
        lock: env !== "掺局区",
      };
    }
    const prof = (global.CC_FORM && CC_FORM.leagueProfile) ? CC_FORM.leagueProfile(league) : {};
    if (eu === "draw" || (prof.draw === "high" && eu === "home")) {
      return { pick: "主/平", dual: true, paperOppose: false, tag: eu === "draw" ? "偏平" : "平多联赛", light: "yellow", lock: true };
    }
    const side = eu === "away" ? o.a : o.h;
    if (side < (w.singleMin || 1.85)) {
      return { pick: cover, dual: true, paperOppose: false, tag: "低赔不单", light: "yellow", lock: true };
    }
    return { pick: eu === "away" ? "客" : "主", dual: false, paperOppose: false, tag: "跟一边", light: "green", lock: true };
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

  function marketOf(m, eu, shake) {
    const drift = eu === "even" ? "两边差不多" : ("偏" + (eu === "away" ? "客" : eu === "draw" ? "平" : "主"));
    if (m.light === "green") {
      return { light: "green", drift: drift, veto: "十一点有边", quake: shake, note: "内容同向，跟一边。" };
    }
    return {
      light: "yellow", drift: drift, veto: eu === "even" ? "对开" : "内容胶着",
      quake: shake, note: m.env !== "高可信" ? "中可信/掺局区少买，不进长串。" : "先看十一点，胶着就路过。",
    };
  }

  function summarize(m, eu, sp, shake) {
    const bits = [sp, "锁 " + String(m.pick || "").replace(/主/g, "胜").replace(/客/g, "负"), "胜平负 " + (m.hadPicks || []).join("/"), shake, "按十一点出号，不拿欧亚找补"];
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
      if (m.env === "掺局区" || m.env === "中可信") continue;
      if (/低赔不单|对开|偏平|稳妥带平|中可信双|平多联赛|交手多平/.test(m.tag || "")) continue;
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

  function findOld(raw, olds) {
    return (olds || []).find((o) => {
      if (!o) return false;
      if (o.slot && raw.slot && o.slot === raw.slot && (!o.date || !raw.date || o.date === raw.date)) return true;
      return sameTeam(o.home, raw.home) && sameTeam(o.away, raw.away) && (!o.date || !raw.date || o.date === raw.date);
    }) || null;
  }

  function overlayNotes(live, olds) {
    const hit = findOld(live, olds);
    if (!hit) return;
    const text = ((hit.factors || []).find((f) => f.name === "伤停轮换") || {}).text || "";
    if (/点名|不上|B\s*队|官宣|确认轮换/.test(text)) {
      live.factors[1] = { name: "伤停轮换", text };
      live.summary += " 有未定价伤停，单独看。";
    }
  }

  function stampLiveOnto(prev, raw) {
    if (raw.score) prev.score = raw.score;
    if (raw.result) prev.result = raw.result;
    prev.liveScore = raw.liveScore || prev.liveScore;
    prev.liveState = raw.liveState || prev.liveState;
    prev.liveMinute = raw.liveMinute || prev.liveMinute;
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
    const eu = hottest(o);
    const env = envOf(raw.league);
    const locked = decide(eu, env, o, raw.league);
    locked.pick = asHandicap(locked.pick);
    stamp(locked, raw, fmtSp(o), env);
    fillMarkets(locked, marketSrc(raw, twinOf(raw, jcList)), had.h ? had : o, line);
    locked.ticks = ticksOf(had.h ? had : o, line);
    locked.action = actionOf(locked);
    locked.summary = summarize(locked, eu, locked.sp, "北单让球盘");
    locked.market = marketOf(locked, eu, "北单让球盘");
    locked.factors = blankFactors(locked.sp, locked.handicap);
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
    const env = envOf(raw.league);
    const locked = decide(eu, env, o, raw.league);
    locked.lock = true;
    stamp(locked, raw, fmtSp(o), env);
    locked.action = actionOf(locked);
    fillMarkets(locked, marketSrc(raw, twin), o, 0);
    locked.combo = toCombo(locked.pick);
    locked.ticks = ticksOf(o, 0);
    locked.summary = summarize(locked, eu, locked.sp, "胜负彩");
    locked.market = marketOf(locked, eu, "胜负彩");
    locked.factors = blankFactors(locked.sp, "0");
    return locked;
  }

  function sfcOdds(m) {
    const nums = String((m && m.sp) || "").match(/(\d+\.\d+)/g);
    if (!nums || nums.length < 3) return { h: 2.4, d: 3.3, a: 2.5 };
    return { h: +nums[0], d: +nums[1], a: +nums[2] };
  }

  function dualNeed(m) {
    const o = sfcOdds(m);
    const fav = Math.min(o.h, o.d, o.a);
    const gap = Math.abs(o.h - o.a);
    let s = 0;
    if (fav < 1.5) s += 100;
    if (fav < 1.8) s += 40;
    if (gap < 0.35) s += 50;
    if (o.d <= Math.min(o.h, o.a) + 0.35) s += 28;
    if (m && m.env === "掺局区") s += 12;
    if (m && m.light === "yellow") s += 8;
    if (m && m.light === "green" && fav >= 2) s -= 18;
    return s;
  }

  function isThreeWay(m) {
    const o = sfcOdds(m);
    return Math.abs(o.h - o.a) < 0.45 && o.d <= Math.min(o.h, o.a) + 0.55;
  }

  function sfcSetCombo(m, combo) {
    const map = { "3": "主", "1": "平", "0": "客" };
    m.combo = combo;
    m.dual = String(combo).length > 1;
    m.pick = String(combo).split("").map((ch) => map[ch] || ch).join("/");
    m.tag = combo.length === 1 ? "单出" : (combo.length === 3 ? "三选" : "双选");
  }

  function defaultDualCombo(m) {
    const o = sfcOdds(m);
    const eu = hottest(o);
    if (eu === "away") return "10";
    if (eu === "even") return o.h <= o.a ? "31" : "10";
    return "31";
  }

  function sfcNotes(list) {
    return (list || []).reduce((n, m) => n * Math.max(1, String(m.combo || "3").length), 1);
  }

  function stakeOf(list) {
    const notes = sfcNotes(list);
    const duals = (list || []).filter((m) => String(m.combo || "").length === 2).length;
    const triples = (list || []).filter((m) => String(m.combo || "").length === 3).length;
    const singles = (list || []).length - duals - triples;
    return { notes: notes, yuan: notes * 2, duals: duals, triples: triples, singles: singles };
  }

  function allocateSfc(list, maxYuan) {
    const maxNotes = Math.max(1, Math.floor(maxYuan / 2));
    (list || []).forEach((m) => {
      const main = String(m.combo || toCombo(m.pick) || "3").charAt(0);
      sfcSetCombo(m, /[310]/.test(main) ? main : "3");
    });
    const ranked = list.slice().sort((a, b) => dualNeed(b) - dualNeed(a));
    ranked.forEach((m) => {
      if (dualNeed(m) <= 0) return;
      if (sfcNotes(list) * 2 > maxNotes) return;
      sfcSetCombo(m, defaultDualCombo(m));
    });
    const evenSingle = ranked.find((m) => isThreeWay(m) && String(m.combo).length === 1);
    const evenDual = ranked.find((m) => isThreeWay(m) && String(m.combo).length === 2);
    if (evenSingle && sfcNotes(list) * 3 <= maxNotes) sfcSetCombo(evenSingle, "310");
    else if (evenDual && (sfcNotes(list) / 2) * 3 <= maxNotes) sfcSetCombo(evenDual, "310");
    return list;
  }

  function pickNineBudget(list) {
    const ranked = list.slice().sort((a, b) => dualNeed(b) - dualNeed(a));
    const glue = ranked.slice(0, 4);
    const clear = ranked.slice(4).sort((a, b) => dualNeed(a) - dualNeed(b)).slice(0, 5);
    const keep = {};
    glue.concat(clear).forEach((m) => { keep[(m.code || "") + "|" + (m.home || "") + "|" + (m.away || "")] = true; });
    return list.filter((m) => keep[(m.code || "") + "|" + (m.home || "") + "|" + (m.away || "")]).map((m) => Object.assign({}, m));
  }

  function sfcBuy(list, pack, kind) {
    const line = list.map((m) => (m.combo || toCombo(m.pick)).charAt(0)).join(" ");
    const dual = list.map((m) => m.combo || toCombo(m.pick)).join(" ");
    const st = stakeOf(list);
    return [
      `${kind} · ${pack.draw || ""} · 截止 ${pack.end || ""}`,
      "主推：" + line,
      "复式：" + dual,
      st.notes + "注 × 2元 = " + st.yuan + "元　单" + st.singles + " / 双" + st.duals + (st.triples ? " / 三选" + st.triples : ""),
    ];
  }

  function todayIso() {
    if (global.CC_ODDS && CC_ODDS.todayIso) return CC_ODDS.todayIso();
    const d = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function apply(pack) {
    const old = (global.CC_DATA.jczq && global.CC_DATA.jczq.matches) || [];
    const locked = pack.matches.map((raw) => {
      const prev = findOld(raw, old);
      const done = raw.score || raw.result || (prev && (prev.score || prev.result));
      if (prev && done && prev.pick) {
        stampLiveOnto(prev, raw);
        return prev;
      }
      const m = lockOne(raw);
      overlayNotes(m, old);
      return m;
    });
    const keyOf = (m) => m.slot || [m.date, m.home, m.away].join("|");
    const seen = new Set(locked.map(keyOf));
    const keep = old.filter((m) => {
      if (!m || seen.has(keyOf(m))) return false;
      if (locked.some((n) => sameTeam(n.home, m.home) && sameTeam(n.away, m.away) && (!m.date || !n.date || m.date === n.date))) return false;
      if (!m.source) m.source = "board";
      return true;
    });
    capDual(locked.filter((m) => !m.score && !m.result));
    realign(locked);
    realign(keep);
    let all = keep.concat(locked);
    if (global.CC_BOARD && CC_BOARD.pruneList) all = CC_BOARD.pruneList(all);
    global.CC_DATA.jczq.matches = all;
    global.CC_DATA.jczq.title = "竞彩足球 · 在售 " + locked.length + " / 历史 " + keep.length;
    global.CC_DATA.jczq.version = (pack.booksOk ? "竞彩+500百家 " : "竞彩官方 SP ") + (pack.updatedAt || "");
    global.CC_DATA.jczq.date = locked[0] ? locked[0].date : global.CC_DATA.jczq.date;
    global.CC_DATA.jczq.buy = buyLines(locked);
    global.CC_DATA.jczq.env = locked.some((m) => m.env !== "高可信") ? "含中可信/掺局区，少买。" : "高可信为主。一场一锁。";
    const mix = locked.filter((m) => m.env !== "高可信").length;
    global.CC_DATA.jczq.dualLimit = mix > locked.length * 0.5 ? 1 : 0.5;
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
    const r14 = allocateSfc(locked.map((m) => Object.assign({}, m)), 400);
    const r9 = allocateSfc(pickNineBudget(r14), 32);
    const st14 = stakeOf(r14);
    const st9 = stakeOf(r9);
    global.CC_DATA.r14.matches = r14;
    global.CC_DATA.r14.title = "胜负彩 / 任 14 · " + (pack.draw || "");
    global.CC_DATA.r14.draw = pack.draw || "";
    global.CC_DATA.r14.version = (pack.live ? "体彩即时 " : "期次缓存 ") + (pack.draw || "");
    global.CC_DATA.r14.date = r14[0] ? r14[0].date : global.CC_DATA.r14.date;
    global.CC_DATA.r14.buy = sfcBuy(r14, pack, "任14");
    global.CC_DATA.r14.stake = st14;
    global.CC_DATA.r14.dualLimit = 1;
    global.CC_DATA.r14.env = "14 场全锁。预算不超过 400 元，胶着才双选。";
    global.CC_DATA.r9.matches = r9;
    global.CC_DATA.r9.title = "任 9 · " + (pack.draw || "");
    global.CC_DATA.r9.draw = pack.draw || "";
    global.CC_DATA.r9.version = global.CC_DATA.r14.version;
    global.CC_DATA.r9.date = r9[0] ? r9[0].date : global.CC_DATA.r9.date;
    global.CC_DATA.r9.buy = sfcBuy(r9, pack, "任9");
    global.CC_DATA.r9.stake = st9;
    global.CC_DATA.r9.dualLimit = 1;
    global.CC_DATA.r9.env = "9 场控制 32 元：4 双 5 单。";
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

  function applyLeagueAndH2h(m) {
    const prof = profOf(m);
    const h2h = h2hOf(m);
    m.leagueProf = prof;
    m.h2h = h2h;
    const pick = String(m.pick || "");
    const single = !m.dual && !/\//.test(pick);
    const addDraw = single && m.lock !== false && m.light !== "red"
      && (prof.draw === "high" || (h2h.n >= 3 && h2h.drawish));
    if (addDraw) {
      const away = /客|让负/.test(pick) && !/主|让胜/.test(pick);
      m.pick = away ? (/让/.test(pick) ? "让平/让负" : "平/客") : (/让/.test(pick) ? "让胜/让平" : "主/平");
      m.dual = true;
      m.light = "yellow";
      m.tag = h2h.drawish ? "交手多平" : "平多联赛";
      m.steady = (h2h.n ? h2h.text : prof.note) + " 单边不够，带平。";
    } else {
      m.steady = [m.steady, prof.note, h2h.n ? h2h.text : ""].filter(Boolean).join(" ");
    }
    if (m._mk) fillMarkets(m, m._mk, m._mk.had, m._mk.line);
    return addDraw;
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
    if (m.score || m.result) return;
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
    if (applyWill(m, eu, d)) {
      applyLeagueAndH2h(m);
      return;
    }
    if (clash) {
      m.lock = false;
      m.paperOppose = true;
      m.tag = "内容拧着";
      m.steady = clash;
      return;
    }
    applyLeagueAndH2h(m);
    if (m.tag === "对开" && m.env === "掺局区") {
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
    const will = m.will || (global.CC_FORM && CC_FORM.willOf && CC_FORM.willOf(m));
    if (will && !m.will) m.will = will;
    if (m.light === "red") return "别碰";
    if (m.lock === false || m.tag === "内容拧着" || m.tag === "两边降档" || m.tag === "折太低") return "路过";
    if (will && will.gap === "都轻") return "路过";
    if (m.env === "掺局区" || m.env === "中可信" || m.tag === "名额满才单") return "少买";
    if (m.tag === "战意改向" || m.tag === "战意定边" || m.tag === "跟一边") return m.dual ? "买两边" : "买一边";
    if (m.tag === "低赔不单" || m.tag === "胶着" || m.tag === "偏平" || m.tag === "平多联赛" || m.tag === "交手多平" || m.tag === "对开") return "买两边";
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
    if (m.source !== "live") {
      if (!m.action) m.action = m.dual ? "买两边" : "买一边";
      return;
    }
    if (global.CC_ENGINE && !m.engine) m.engine = CC_ENGINE.read(m);
    const why = [];
    why.push({
      from: "联赛环境",
      fact: (m.league || "") + " → " + (m.env || "未知"),
      so: m.env !== "高可信" ? "中可信/掺局区少买，不进长串" : "先填十一点，再锁号",
    });
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
    const soOf = {
      战意: m.tag === "战意改向" || m.tag === "战意定边" ? "战意有边就改边，能单就单" : "两边一样就不另改号",
      利益关系: "无硬证据写无，不猜假赛",
      赛事优先级: "杯赛和联赛分开看谁更当回事",
      实力: "近况硬软用来核对，不单拿排名博冷",
      主客: "主场客场能力分开记",
      伤停轮换: "名单伤停通常已知，点名不上才动号",
      赛程: "一周多赛要降档",
      阵容特性: "能磨还是能翻，只描述",
      重要程度: "都重禁止编单边，都轻先路过",
      发布会: "只收点名轮换",
      SP: "竞彩即时三项，胶着就双选或路过",
    };
    order.forEach((name) => {
      why.push({ from: name, fact: bag[name] || "未知", so: soOf[name] || "按十一点核对" });
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
    if (jc && jc.matches) jc.buy = buyLines(jc.matches.filter((m) => m.source === "live" && !m.result));
  }

  function finish() {
    if (global.CC_EXTRAS) global.CC_EXTRAS.attach();
    else if (global.CC_ENGINE) global.CC_ENGINE.attachAll();
    if (global.CC_NEWS) CC_NEWS.attachAll();
    if (global.CC_FORM) CC_FORM.attachAll();
    if (global.CC_ENGINE) CC_ENGINE.attachAll();
    if (global.CC_DATA.beidan) global.CC_DATA.beidan.matches = [];
    applySteadyAll();
    capDual((((global.CC_DATA || {}).jczq || {}).matches || []).filter((m) => m.source === "live" && !m.result));
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      realign(((global.CC_DATA || {})[key] || {}).matches);
    });
    explainAll();
    refreshBuy();
    if (global.CC_REVIEW && CC_REVIEW.ingest) {
      CC_REVIEW.ingest((((global.CC_DATA || {}).jczq || {}).matches) || []);
    }
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
    const ctx = scoreCtx(mk.ttg, line, had, night, m);
    const sides = sidesOf(m && m.pick);
    return pickScores(sides, ctx, mk.crs, ttgNums(pickTtg(mk.ttg, ctx, sides)));
  }

  global.CC_PRED = { lockOne, apply, applyBeidan, applySfc, capDual, finish, explainAll, scoresOf };
})(window);
