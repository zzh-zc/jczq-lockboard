(function (global) {
  const POS = { Keeper: "门将", Defender: "后卫", Midfielder: "中场", Attacker: "前锋" };
  const PROFS = [
    { re: /意甲|法甲|葡超|奥甲|波甲|土超|苏超/, style: "grind", draw: "mid", tilt: 0.97, note: "小球、平局概率略高，不默认小分或带平" },
    { re: /日职|日乙|韩K|K联|瑞超|芬超/, style: "grind", draw: "mid", tilt: 0.97, note: "掺局区小球概率略高，最终看出球盘和交手" },
    { re: /西甲/, style: "mid", draw: "mid", tilt: 1, note: "平局概率略高，主热也不默认带平" },
    { re: /英超/, style: "open", draw: "mid", tilt: 1.03, note: "大球概率略高，照样会出小球" },
    { re: /德甲|荷甲|比甲|澳超|美职/, style: "open", draw: "mid", tilt: 1.03, note: "对攻概率略高，不默认大分" },
    { re: /欧冠/, style: "open", draw: "mid", tilt: 1.03, note: "大球概率略高，深盘冷门照样磨" },
    { re: /解放者/, style: "open", draw: "mid", tilt: 1.03, note: "对攻概率略高，跟这场交手和进球盘" },
    { re: /欧罗巴|欧协|欧国联/, style: "mid", draw: "mid", tilt: 1, note: "中可信，大小球看出球盘、交手和近况" },
    { re: /英冠|法乙|德乙/, style: "mid", draw: "mid", tilt: 1, note: "客队常有戏，不默认主不败" },
  ];

  function monthOverlay(league) {
    const rows = ((((global.CC_REVIEW_CACHE || {}).matches) || []).filter((m) => m.league === league));
    if (rows.length < 8) return null;
    let tot = 0;
    let n = 0;
    let small = 0;
    let big = 0;
    let d = 0;
    rows.forEach((m) => {
      const hit = String(m.score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
      if (!hit) return;
      const t = +hit[1] + +hit[2];
      tot += t;
      n += 1;
      if (t <= 2) small += 1;
      if (t >= 4) big += 1;
      if (m.result === "平" || m.result === "1") d += 1;
    });
    if (!n) return null;
    return { n: n, avgTot: tot / n, draw: d / n, small: small / n, big: big / n };
  }

  function leagueProfile(league) {
    const g = String(league || "");
    const hit = PROFS.find((p) => p.re.test(g)) || { style: "mid", draw: "mid", tilt: 1, note: "联赛风格不明，先看出球盘、交手和近况" };
    const mon = monthOverlay(g);
    const out = {
      league: g,
      style: hit.style,
      draw: hit.draw,
      tilt: hit.tilt != null ? hit.tilt : 1,
      goals: "mid",
      note: hit.note,
      month: mon,
    };
    if (mon && mon.n >= 8) {
      out.tilt = Math.max(0.94, Math.min(1.08, 0.55 * out.tilt + 0.45 * (mon.avgTot / 2.6)));
      if (mon.draw >= 0.32) out.draw = "high";
      else if (mon.draw <= 0.12) out.draw = "low";
      else out.draw = "mid";
      out.note = hit.note + "。近一个月" + mon.n + "场场均" + mon.avgTot.toFixed(1) + "球，平" + Math.round(mon.draw * 100) + "%。只作轻微倾向，出号跟这场数据。";
    }
    return out;
  }

  function coreName(s) {
    return String(s || "").replace(/FC|RB|AFC|竞技|\s/g, "").toLowerCase();
  }

  function sameOpp(g, id, name) {
    if (id != null && g.oppId != null && String(g.oppId) === String(id)) return true;
    const a = coreName(g.opp);
    const b = coreName(name);
    return a && b && a.length >= 3 && (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0);
  }

  function flipRes(r) {
    if (r === "W") return "L";
    if (r === "L") return "W";
    return "D";
  }

  function buildH2h(m, hs, as, ids) {
    const awayId = ids && ids.awayId;
    const homeId = ids && ids.homeId;
    const awayEn = (ids && ids.awayEn) || (m && m.away);
    const homeEn = (ids && ids.homeEn) || (m && m.home);
    const fromHome = (((hs && hs.recent) || {}).games || []).filter((g) => sameOpp(g, awayId, awayEn)).map((g) => ({
      date: g.date, score: g.score, tot: (g.gf || 0) + (g.ga || 0),
      res: g.res, gf: g.gf, ga: g.ga, home: g.home, opp: g.opp, comp: g.comp,
    }));
    const fromAway = (((as && as.recent) || {}).games || []).filter((g) => sameOpp(g, homeId, homeEn)).map((g) => ({
      date: g.date, score: g.score, tot: (g.gf || 0) + (g.ga || 0),
      res: flipRes(g.res), gf: g.ga, ga: g.gf, home: !g.home, opp: g.opp, comp: g.comp,
    }));
    const seen = {};
    const games = [];
    fromHome.concat(fromAway).forEach((g) => {
      const k = (g.date || "") + "|" + (g.score || "");
      if (seen[k]) return;
      seen[k] = true;
      games.push(g);
    });
    games.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const n = games.length;
    if (!n) return { n: 0, w: 0, d: 0, l: 0, avgTot: 0, small: 0, big: 0, games: [], text: "近况名单没对上交手，这场跟盘口、进球盘和近况走。" };
    const w = games.filter((g) => g.res === "W").length;
    const d = games.filter((g) => g.res === "D").length;
    const l = games.filter((g) => g.res === "L").length;
    const avgTot = games.reduce((s, g) => s + (g.tot || 0), 0) / n;
    const small = games.filter((g) => g.tot <= 2).length;
    const big = games.filter((g) => g.tot >= 4).length;
    let size = "中规中矩";
    if (avgTot <= 2.15 || small >= n * 0.5) size = "小球偏多";
    else if (avgTot >= 3.15 || big >= n * 0.5) size = "大球偏多";
    const drawish = d >= Math.max(2, n * 0.35);
    const text = "近" + n + "次交手，主队视角" + w + "胜" + d + "平" + l + "负，场均" + avgTot.toFixed(1) + "球。" + size + (drawish ? "，平局偏多。" : "。");
    return { n: n, w: w, d: d, l: l, avgTot: avgTot, small: small, big: big, drawish: drawish, games: games, text: text };
  }

  function h2hOf(m) {
    const pack = (m && m.form) || lookup(m);
    if (pack && pack.h2h) return pack.h2h;
    return buildH2h(m, pack && pack.homeSide, pack && pack.awaySide, pack);
  }

  function lookup(m) {
    const cache = global.CC_FORM_CACHE && CC_FORM_CACHE.bySlot;
    if (!cache || !m) return null;
    return cache[m.slot] || cache[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")] || null;
  }

  function wd(pack) {
    if (!pack || !pack.n) return "近况先跟这场盘口";
    return pack.n + "场 " + pack.w + "胜" + pack.d + "平" + pack.l + "负　进" + pack.gf + "失" + pack.ga + "　" + (pack.streak || "");
  }

  function thin(text) {
    return !String(text || "").trim() || /未知|样本不足|数据不足/.test(String(text));
  }

  function parseSp(m) {
    const nums = String((m && m.sp) || "").match(/(\d+\.\d+)/g);
    if (!nums || nums.length < 3) return null;
    return { h: +nums[0], d: +nums[1], a: +nums[2] };
  }

  function paperTalk(m) {
    const o = parseSp(m);
    const line = (m && (m.handicap || (m.hhad && (m.hhad.goalLine || m.hhad.goalLineValue)))) || "0";
    const league = (m && m.league) || "这场";
    if (!o) return league + "按竞彩即时三项出号，胶着就双选。";
    const even = Math.abs(o.h - o.a) < 0.4;
    const fav = o.h <= o.a ? "主" : "客";
    const odds = Math.min(o.h, o.a);
    if (even) return league + "对开 " + o.h.toFixed(2) + " / " + o.d.toFixed(2) + " / " + o.a.toFixed(2) + "，让球 " + line + "。市场没把一边开穿。";
    if (odds <= 1.35) return league + "热门在" + fav + " " + odds.toFixed(2) + "，平 " + o.d.toFixed(2) + "，让球 " + line + "。深盘按实力差记，禁止死胆。";
    return league + "热门在" + fav + " " + odds.toFixed(2) + "，平 " + o.d.toFixed(2) + "，另一边 " + Math.max(o.h, o.a).toFixed(2) + "，让球 " + line + "。";
  }

  function roundTalk(m) {
    const g = String((m && m.league) || "");
    if (/欧冠|欧罗巴|欧协|解放者|亚冠/.test(g)) return g + "一轮，两边都不是友谊赛。";
    if (/日职|日乙|韩K/.test(g)) return g + "一轮。掺局区逐场看。";
    return (g || "联赛") + "一轮。";
  }

  function reasonOf(p) {
    const raw = String(p.reason || "伤停");
    return raw.replace(/^伤停\s*·\s*/, "");
  }

  function injText(list, side) {
    if (!list || !list.length) return side + "无公开伤停";
    return side + "缺阵 " + list.map((p) => {
      const pos = POS[p.pos] || p.pos || "";
      const no = p.no != null ? p.no + " " : "";
      return no + p.name + (pos ? " " + pos : "") + "（" + reasonOf(p) + "）";
    }).join("、");
  }

  function newsBlob(m, side) {
    const pack = (m && m.intel) || (global.CC_NEWS && CC_NEWS.lookup(m));
    const list = pack ? (side === "away" ? pack.awayNews : pack.homeNews) : [];
    return (list || []).map((x) => String((x && x.title) || "") + " " + String((x && x.summary) || "")).join(" ");
  }

  function sideWill(blob) {
    let w = "普通";
    if (/轮换|轮休|B\s*队|二队|青年军|已出线|提前出线|已淘汰|无关紧要|降档|一周三赛|离任|抗议管理层/.test(blob)) w = "轻";
    if (/必须赢|必须取胜|争冠|保级战|面临保级|保级六分|生死|没退路|出线关键|六分|淘汰赛|看得重|每场都要|都要争胜|最重要|下课|再惨败|进欧联|前24/.test(blob)) w = "重";
    return w;
  }

  function willOf(m) {
    const league = m.league || "";
    const hb = newsBlob(m, "home");
    const ab = newsBlob(m, "away");
    const home = sideWill(hb);
    const away = sideWill(ab);
    const unpriced = /点名不上|确认轮换|B\s*队|二队首发|青年军出场/.test(hb + " " + ab);
    let gap = "差不多";
    if (home === "重" && away === "重") gap = "都重";
    else if (home === "轻" && away === "轻") gap = "都轻";
    else if (home === "重" && away !== "重") gap = "主更重";
    else if (away === "重" && home !== "重") gap = "客更重";
    else if (home === "轻" && away !== "轻") gap = "主更轻";
    else if (away === "轻" && home !== "轻") gap = "客更轻";
    const cup = /欧冠|欧罗巴|欧协|解放者|南美|亚冠/.test(league);
    const prio = cup ? "杯赛要逐场看谁更当回事" : (m.env === "掺局区" ? "联赛掺局，战意要逐场看" : "联赛一轮");
    const extra = unpriced
      ? "有轮换/点名，盘口可能没吃完。"
      : (gap === "主更重" || gap === "客更重" || gap === "主更轻" || gap === "客更轻"
        ? "战意有边，跟这边不败。"
        : "两边未见点名，当普通合同场，不另改号。");
    const text = "主队" + home + " / 客队" + away + "。" + (gap === "差不多" ? extra : ("看" + gap + "。" + extra));
    return { home: home, away: away, gap: gap, unpriced: unpriced, prio: prio, text: text };
  }

  function newsBlobAll(m) {
    return newsBlob(m, "home") + " " + newsBlob(m, "away");
  }

  function interestOf(m) {
    const blob = newsBlobAll(m) + " " + (m.home || "") + (m.away || "");
    if (/德比|同城|直接对话|六分战|同组/.test(blob)) return "有直接对话/德比，只记一笔，无假赛证据写无。";
    return "无。";
  }

  function busyOf(side, date) {
    const games = ((side || {}).recent || {}).games || [];
    const end = Date.parse(date || "") || Date.now();
    return games.filter((g) => {
      const t = Date.parse(g.date || "");
      return t && end - t >= 0 && end - t <= 8 * 86400000;
    }).length;
  }

  function scheduleOf(m, hs, as) {
    const hb = busyOf(hs, m.date);
    const ab = busyOf(as, m.date);
    if (!hb && !ab) return { text: roundTalk(m), busy: false, home: 0, away: 0 };
    const text = "主队近8天" + hb + "场，客队近8天" + ab + "场。";
    return { text: text, busy: hb >= 2 || ab >= 2, home: hb, away: ab };
  }

  function shapeOf(m, hs, as) {
    const hr = (hs && hs.recent) || {};
    const ar = (as && as.recent) || {};
    if (!hr.n && !ar.n) {
      const prof = leagueProfile(m && m.league);
      return {
        text: paperTalk(m) + (prof.note ? " 联赛风格：" + prof.note + "。" : ""),
        homeHard: false, awayHard: false, homeSoft: false, awaySoft: false,
      };
    }
    const text = "主队近况进" + (hr.gf || 0) + "失" + (hr.ga || 0) + "；客队近况进" + (ar.gf || 0) + "失" + (ar.ga || 0) + "。";
    return {
      text: text,
      homeHard: hr.n >= 5 && hr.w >= hr.n * 0.7,
      awayHard: ar.n >= 5 && ar.w >= ar.n * 0.7,
      homeSoft: hr.n >= 5 && hr.w <= hr.n * 0.3,
      awaySoft: ar.n >= 5 && ar.w <= ar.n * 0.3,
    };
  }

  function pressOf(m) {
    const blob = newsBlobAll(m);
    if (/点名不上|确认轮换|B\s*队|二队首发|青年军/.test(blob)) return { text: "有点名/轮换，盘口可能没吃完。", late: true };
    if (/发布会|赛前|首发/.test(blob)) return { text: "有赛前表态，未见点名不上。", late: false };
    return { text: "没收到点名不上，不拿发布会改号。", late: false };
  }

  function lateInj(hs, as) {
    const inj = [].concat((hs && hs.injuries) || [], (as && as.injuries) || []);
    return inj.some((p) => /Doubtful|出战成疑|临场|doubt/i.test(String((p && p.reason) || "")));
  }

  function fillFactors(m, pack) {
    const hs = (pack && pack.homeSide) || (m.form && m.form.homeSide) || {};
    const as = (pack && pack.awaySide) || (m.form && m.form.awaySide) || {};
    m.factors = m.factors || [];
    const hasRecent = !!(hs.recent && hs.recent.n) || !!(as.recent && as.recent.n);
    const hasVenue = !!(hs.venue && hs.venue.n) || !!(as.road && as.road.n);
    const hasInj = ((hs.injuries || []).length + (as.injuries || []).length) > 0;
    const keepWill = ((m.factors.find((f) => f.name === "战意") || {}).text) || "";
    const set = (name, text) => {
      const hit = m.factors.find((f) => f.name === name);
      if (hit && !thin(hit.text) && thin(text)) return;
      if (hit && !thin(hit.text) && name !== "SP") {
        if (name === "实力" && hasRecent) hit.text = text;
        else if (name === "主客" && hasVenue) hit.text = text;
        else if (name === "伤停轮换" && hasInj) hit.text = text;
        else if (name === "赛程" && (busyOf(hs, m.date) || busyOf(as, m.date))) hit.text = text;
        else if (name === "阵容特性" && hasRecent) hit.text = text;
        return;
      }
      if (hit) hit.text = text;
      else m.factors.push({ name: name, text: text });
    };
    m.will = willOf(m);
    if (!thin(keepWill)) m.will = Object.assign({}, m.will, { text: keepWill });
    const sch = scheduleOf(m, hs, as);
    const shape = shapeOf(m, hs, as);
    const press = pressOf(m);
    set("战意", m.will.text);
    set("利益关系", interestOf(m));
    set("赛事优先级", m.will.prio);
    const h2h = (pack && pack.h2h) || buildH2h(m, hs, as, pack);
    const prof = leagueProfile(m.league);
    m.h2h = h2h;
    m.leagueProf = prof;
    const h2hBit = h2h.n ? ("交手：" + h2h.text) : "交手名单没对上，跟盘口和近况。";
    set("实力", hasRecent
      ? ("主队近" + wd(hs.recent) + "。客队近" + wd(as.recent) + "。友谊赛已剔除。" + h2hBit)
      : paperTalk(m) + " " + h2hBit);
    set("主客", hasVenue
      ? ("主队主场近" + wd(hs.venue) + "。客队客场近" + wd(as.road) + "。友谊赛已剔除。")
      : "主队主场，客队客场。" + paperTalk(m));
    set("伤停轮换", hasInj
      ? (injText(hs.injuries, "主队") + "。" + injText(as.injuries, "客队") + "。名单伤停通常已定价，出战成疑才单看。")
      : "公开名单没点到能改号的核心缺席，不拿伤停改号。");
    set("赛程", sch.text);
    set("阵容特性", shape.text + (shape.text.indexOf("联赛风格") >= 0 ? "" : "联赛风格：" + prof.note) + (h2h.n ? " 交手" + (h2h.avgTot ? "场均" + h2h.avgTot.toFixed(1) + "球。" : "。") : "。"));
    set("重要程度", m.will.gap === "都重" ? "两边都要，禁止单边编故事。" : (m.will.gap === "都轻" ? "两边都可能降档，先路过。" : (m.will.gap === "主更重" || m.will.gap === "客更重" || m.will.gap === "主更轻" || m.will.gap === "客更轻" ? "一边看得更重，跟战意不败。" : "战意差不多，看其余十点。")));
    set("发布会", press.text);
    set("SP", m.sp ? (m.sp + "。竞彩即时三项，胶着就双选或路过。") : paperTalk(m));
    m.draft = {
      clashWill: (m.will.gap === "主更重" || m.will.gap === "客更轻") ? "home" : ((m.will.gap === "客更重" || m.will.gap === "主更轻") ? "away" : ""),
      bothHeavy: m.will.gap === "都重",
      bothLight: m.will.gap === "都轻",
      unpriced: !!(m.will.unpriced || press.late),
      lateInj: lateInj(hs, as),
      busy: sch.busy,
      homeHard: shape.homeHard,
      awayHard: shape.awayHard,
      homeSoft: shape.homeSoft,
      awaySoft: shape.awaySoft,
    };
  }

  function patch(m, pack) {
    if (pack && !pack.h2h) pack.h2h = buildH2h(m, pack.homeSide, pack.awaySide, pack);
    m.form = pack;
    fillFactors(m, pack);
  }

  function attachAll() {
    ["jczq", "r14", "r9"].forEach((key) => {
      const list = global.CC_DATA && CC_DATA[key] && CC_DATA[key].matches;
      (list || []).forEach((m) => {
        if (!m || m.source === "sfc-history") return;
        const pack = lookup(m) || m.form || null;
        if (pack) patch(m, pack);
        else fillFactors(m, null);
      });
    });
  }

  function putCache(m, pack) {
    if (!global.CC_FORM_CACHE) global.CC_FORM_CACHE = { bySlot: {} };
    if (!CC_FORM_CACHE.bySlot) CC_FORM_CACHE.bySlot = {};
    pack.slot = pack.slot || m.slot;
    pack.date = pack.date || m.date;
    pack.home = pack.home || m.home;
    pack.away = pack.away || m.away;
    if (m.slot) CC_FORM_CACHE.bySlot[m.slot] = pack;
    CC_FORM_CACHE.bySlot[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")] = pack;
    CC_FORM_CACHE.at = new Date().toTimeString().slice(0, 5);
  }

  function ingestLive(m, live) {
    if (!m || !live) return lookup(m);
    const prev = lookup(m) || { homeSide: {}, awaySide: {} };
    const hs = Object.assign({}, prev.homeSide || {});
    const as = Object.assign({}, prev.awaySide || {});
    const lh = live.homeSide || {};
    const la = live.awaySide || {};
    if (lh.recent && lh.recent.n) hs.recent = lh.recent;
    if (lh.venue && lh.venue.n) hs.venue = lh.venue;
    if (lh.injuries && lh.injuries.length) hs.injuries = lh.injuries;
    if (la.recent && la.recent.n) as.recent = la.recent;
    if (la.road && la.road.n) as.road = la.road;
    if (la.injuries && la.injuries.length) as.injuries = la.injuries;
    const ids = {
      homeId: live.homeId || prev.homeId,
      awayId: live.awayId || prev.awayId,
      homeEn: live.homeEn || prev.homeEn,
      awayEn: live.awayEn || prev.awayEn,
    };
    const pack = {
      slot: m.slot, date: m.date, home: m.home, away: m.away,
      homeId: ids.homeId, awayId: ids.awayId, homeEn: ids.homeEn, awayEn: ids.awayEn,
      homeSide: hs, awaySide: as,
      h2h: buildH2h(m, hs, as, ids),
    };
    putCache(m, pack);
    patch(m, pack);
    return pack;
  }

  function tallySide(games) {
    const n = (games || []).length;
    return {
      n: n,
      w: (games || []).filter((g) => g.res === "W").length,
      d: (games || []).filter((g) => g.res === "D").length,
      l: (games || []).filter((g) => g.res === "L").length,
      gf: (games || []).reduce((s, g) => s + (g.gf || 0), 0),
      ga: (games || []).reduce((s, g) => s + (g.ga || 0), 0),
      streak: (games || []).map((g) => g.res).join(""),
      games: games || [],
    };
  }

  function gamesFromFixtures(fixtures, teamId) {
    return (fixtures || [])
      .filter((g) => {
        const st = g.status || {};
        if (!st.finished) return false;
        const comp = (g.tournament && g.tournament.name) || "";
        if (/友谊|Friendly/i.test(comp)) return false;
        return g.home && g.away && g.home.score != null && g.away.score != null;
      })
      .sort((a, b) => String((b.status && b.status.utcTime) || "").localeCompare(String((a.status && a.status.utcTime) || "")))
      .slice(0, 8)
      .map((g) => {
        const ourHome = String(g.home.id) === String(teamId);
        const gf = ourHome ? Number(g.home.score) : Number(g.away.score);
        const ga = ourHome ? Number(g.away.score) : Number(g.home.score);
        return {
          date: String((g.status && g.status.utcTime) || "").slice(0, 10),
          opp: ourHome ? g.away.name : g.home.name,
          oppId: ourHome ? g.away.id : g.home.id,
          home: ourHome,
          gf: gf || 0,
          ga: ga || 0,
          res: gf > ga ? "W" : gf < ga ? "L" : "D",
          score: String((g.status && g.status.scoreStr) || (g.home.score + "-" + g.away.score)).replace(/\s/g, ""),
          comp: (g.tournament && g.tournament.name) || "",
        };
      });
  }

  function parseTeamPage(html, id) {
    const marker = "<script id=\"__NEXT_DATA__\" type=\"application/json\">";
    const i = String(html || "").indexOf(marker);
    if (i < 0) return null;
    const j = html.indexOf("</script>", i);
    const data = JSON.parse(html.slice(i + marker.length, j));
    const fb = (((data.props || {}).pageProps || {}).fallback) || {};
    const key = Object.keys(fb).find((k) => k.indexOf("team-" + id) === 0);
    return (key && fb[key]) || fb["team-" + id] || null;
  }

  async function readText(url) {
    if (global.CC_LIVE && CC_LIVE.getText) return CC_LIVE.getText(url);
    const res = await fetch(url, { cache: "no-store" });
    return res.text();
  }

  async function pullTeam(id) {
    if (!id) return [];
    const url = "https://www.fotmob.com/teams/" + id;
    const html = await readText(url);
    const team = parseTeamPage(html, id);
    if (!team) return [];
    return gamesFromFixtures((((team.fixtures || {}).allFixtures || {}).fixtures) || [], id);
  }

  function teamIdsOf(m) {
    const pack = lookup(m) || m.form || {};
    const raw = (global.CC_NEWS_CACHE && CC_NEWS_CACHE.bySlot && (CC_NEWS_CACHE.bySlot[m.slot] || {})) || {};
    return {
      homeId: pack.homeId || raw.homeId,
      awayId: pack.awayId || raw.awayId,
      homeEn: pack.homeEn || "",
      awayEn: pack.awayEn || "",
    };
  }

  async function pullLive(matches, opt) {
    const force = !!(opt && opt.force);
    const list = (matches || []).filter((m) => m && /周[一二三四五六日]\d{3}/.test(String(m.slot || "")));
    const cap = force ? 6 : 4;
    let used = 0;
    for (let i = 0; i < list.length && used < cap; i += 1) {
      const m = list[i];
      const ids = teamIdsOf(m);
      const prev = lookup(m) || {};
      const thinHome = !(((prev.homeSide || {}).recent || {}).n);
      const thinAway = !(((prev.awaySide || {}).recent || {}).n);
      if (!force && !thinHome && !thinAway) continue;
      if (!ids.homeId && !ids.awayId) continue;
      try {
        const hg = (force || thinHome) && ids.homeId ? await pullTeam(ids.homeId) : ((((prev.homeSide || {}).recent || {}).games) || []);
        const ag = (force || thinAway) && ids.awayId ? await pullTeam(ids.awayId) : ((((prev.awaySide || {}).recent || {}).games) || []);
        if ((force || thinHome) && ids.homeId) used += 1;
        if ((force || thinAway) && ids.awayId) used += 1;
        ingestLive(m, {
          homeId: ids.homeId,
          awayId: ids.awayId,
          homeEn: ids.homeEn,
          awayEn: ids.awayEn,
          homeSide: { recent: tallySide(hg), venue: tallySide(hg.filter((g) => g.home)) },
          awaySide: { recent: tallySide(ag), road: tallySide(ag.filter((g) => !g.home)) },
        });
      } catch (err) { /* 单队失败不影响整轮 */ }
    }
    saveLive();
    return used;
  }

  const FORM_STORE = "jczq-cc-form-live-v1";

  function loadLive() {
    try {
      const pack = JSON.parse(localStorage.getItem(FORM_STORE) || "null");
      if (!pack || !pack.bySlot) return;
      if (!global.CC_FORM_CACHE) global.CC_FORM_CACHE = { bySlot: {} };
      Object.assign(CC_FORM_CACHE.bySlot, pack.bySlot);
      if (pack.at) CC_FORM_CACHE.at = pack.at;
    } catch (err) { /* ignore */ }
  }

  function saveLive() {
    try {
      localStorage.setItem(FORM_STORE, JSON.stringify({ at: Date.now(), bySlot: (global.CC_FORM_CACHE || {}).bySlot || {} }));
    } catch (err) { /* ignore */ }
  }

  global.CC_FORM = { attachAll, lookup, wd, injText, willOf, fillFactors, ingestLive, pullLive, loadLive, saveLive, leagueProfile, h2hOf, buildH2h, paperTalk, thin };
})(window);
