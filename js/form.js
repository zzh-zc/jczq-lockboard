(function (global) {
  const POS = { Keeper: "门将", Defender: "后卫", Midfielder: "中场", Attacker: "前锋" };

  function lookup(m) {
    const cache = global.CC_FORM_CACHE && CC_FORM_CACHE.bySlot;
    if (!cache || !m) return null;
    return cache[m.slot] || cache[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")] || null;
  }

  function wd(pack) {
    if (!pack || !pack.n) return "样本不足";
    return pack.n + "场 " + pack.w + "胜" + pack.d + "平" + pack.l + "负　进" + pack.gf + "失" + pack.ga + "　" + (pack.streak || "");
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
    let gap = "不明";
    if (home === "重" && away === "重") gap = "都重";
    else if (home === "轻" && away === "轻") gap = "都轻";
    else if (home === "重" && away !== "重") gap = "主更重";
    else if (away === "重" && home !== "重") gap = "客更重";
    else if (home === "轻" && away !== "轻") gap = "主更轻";
    else if (away === "轻" && home !== "轻") gap = "客更轻";
    const cup = /欧冠|欧罗巴|欧协|解放者|南美|亚冠/.test(league);
    const prio = cup ? "杯赛要逐场看谁更当回事" : (m.env === "掺局区" ? "联赛掺局，战意要逐场看" : "联赛一轮");
    const text = "主队" + home + " / 客队" + away + "。看" + gap + "。" + (unpriced ? "有轮换/点名，盘口可能没吃完。" : (gap === "主更重" || gap === "客更重" || gap === "主更轻" || gap === "客更轻" ? "战意有边，跟这边不败。" : "两边战意差不多，不另改号。"));
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
    const text = "主队近8天" + hb + "场，客队近8天" + ab + "场。";
    return { text: text, busy: hb >= 2 || ab >= 2, home: hb, away: ab };
  }

  function shapeOf(hs, as) {
    const hr = (hs && hs.recent) || {};
    const ar = (as && as.recent) || {};
    if (!hr.n && !ar.n) return { text: "样本不足。", homeHard: false, awayHard: false };
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
    return { text: "未知。只收点名轮换。", late: false };
  }

  function lateInj(hs, as) {
    const inj = [].concat((hs && hs.injuries) || [], (as && as.injuries) || []);
    return inj.some((p) => /Doubtful|出战成疑|临场|doubt/i.test(String((p && p.reason) || "")));
  }

  function fillFactors(m, pack) {
    const hs = (pack && pack.homeSide) || (m.form && m.form.homeSide) || {};
    const as = (pack && pack.awaySide) || (m.form && m.form.awaySide) || {};
    m.factors = m.factors || [];
    const set = (name, text) => {
      const hit = m.factors.find((f) => f.name === name);
      if (hit) hit.text = text;
      else m.factors.push({ name: name, text: text });
    };
    m.will = willOf(m);
    const sch = scheduleOf(m, hs, as);
    const shape = shapeOf(hs, as);
    const press = pressOf(m);
    set("战意", m.will.text);
    set("利益关系", interestOf(m));
    set("赛事优先级", m.will.prio);
    set("实力", pack ? ("主队近" + wd(hs.recent) + "。客队近" + wd(as.recent) + "。友谊赛已剔除。") : "未知。");
    set("主客", pack ? ("主队主场近" + wd(hs.venue) + "。客队客场近" + wd(as.road) + "。友谊赛已剔除。") : "未知。");
    set("伤停轮换", pack ? (injText(hs.injuries, "主队") + "。" + injText(as.injuries, "客队") + "。名单伤停通常已定价，出战成疑才单看。") : "未知。");
    set("赛程", sch.text);
    set("阵容特性", shape.text);
    set("重要程度", m.will.gap === "都重" ? "两边都要，禁止单边编故事。" : (m.will.gap === "都轻" ? "两边都可能降档，先路过。" : (m.will.gap === "主更重" || m.will.gap === "客更重" || m.will.gap === "主更轻" || m.will.gap === "客更轻" ? "一边看得更重，跟战意不败。" : "战意差不多，听盘口。")));
    set("发布会", press.text);
    set("SP", m.sp ? (m.sp + "。服务于读盘，不是最后找补。") : "未知。");
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
    m.form = pack;
    fillFactors(m, pack);
  }

  function attachAll() {
    ["jczq", "r14", "r9"].forEach((key) => {
      const list = global.CC_DATA && CC_DATA[key] && CC_DATA[key].matches;
      (list || []).forEach((m) => {
        if (m.source !== "live") return;
        const pack = lookup(m);
        if (pack) {
          patch(m, pack);
          return;
        }
        fillFactors(m, null);
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
    const pack = { slot: m.slot, date: m.date, home: m.home, away: m.away, homeSide: hs, awaySide: as };
    putCache(m, pack);
    patch(m, pack);
    return pack;
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

  global.CC_FORM = { attachAll, lookup, wd, injText, willOf, fillFactors, ingestLive, loadLive, saveLive };
})(window);
