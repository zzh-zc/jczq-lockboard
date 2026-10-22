(function (global) {
  const STORE = "jczq-cc-intel-match-v1";
  const PIN_B64 = "c3VvaGFv";
  const SKIP = /U-18|官方会员|MY TOKYO|发售通知|抽奖|商业战略|中国足球史上|超话|重锤|站前广场|精酿啤酒|女足|画廊|ArchDaily|[\u3040-\u30ff]/;
  const CATS = ["全部", "伤病", "轮换", "阵容", "新闻"];

  function pinOk(raw) {
    const pin = String(raw || "").trim().toLowerCase();
    let expect = "";
    try { expect = atob(PIN_B64); } catch { expect = ""; }
    return pin && pin === expect;
  }

  function opened() {
    try {
      const list = JSON.parse(localStorage.getItem(STORE) || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveOpened(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, 200))); } catch { /* ignore */ }
  }

  function matchKey(m) {
    if (!m) return "";
    return m.slot || (m.date || "") + "|" + (m.home || "") + "|" + (m.away || "");
  }

  function teamKey(name) {
    return "team:" + String(name || "").trim();
  }

  function isOpen(id) {
    return opened().indexOf(id) >= 0;
  }

  function unlockMatch(id, pin) {
    if (!id || !pinOk(pin)) return false;
    const list = opened();
    if (list.indexOf(id) < 0) list.push(id);
    saveOpened(list);
    return true;
  }

  function lockMatch(id) {
    saveOpened(opened().filter((x) => x !== id));
  }

  function keep(item) {
    const blob = String((item && item.title) || "") + String((item && item.summary) || "");
    return !SKIP.test(blob);
  }

  function catOf(kind) {
    if (kind === "伤停") return "伤病";
    if (kind === "转会") return "轮换";
    if (kind === "情报" || kind === "近况") return "阵容";
    return "新闻";
  }

  function tagOf(kind) {
    if (kind === "伤停") return "伤病";
    if (kind === "转会") return "轮换";
    if (kind === "情报") return "内部情报";
    if (kind === "近况") return "阵容";
    if (kind === "外媒") return "新闻";
    return "新闻";
  }

  function stamp(raw, side, team) {
    return (raw || []).filter(keep).map((item) => {
      const kind = item.kind || "新闻";
      return {
        kind: kind,
        cat: catOf(kind),
        tag: tagOf(kind),
        t: item.t || "",
        title: item.title || "",
        summary: item.summary || "",
        team: team,
        side: side,
      };
    });
  }

  function lookup(m) {
    const cache = global.CC_NEWS_CACHE && global.CC_NEWS_CACHE.bySlot;
    if (!cache || !m) return null;
    const raw = cache[m.slot] || cache[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")];
    if (!raw) return null;
    return {
      id: raw.slot || matchKey(m),
      slot: raw.slot || m.slot || "",
      date: raw.date,
      home: raw.home,
      away: raw.away,
      homeLogo: raw.homeLogo || "",
      awayLogo: raw.awayLogo || "",
      homeNews: stamp(raw.homeNews, "home", raw.home),
      awayNews: stamp(raw.awayNews, "away", raw.away),
    };
  }

  function feedOf(m, cat) {
    const pack = (m && m.intel) || lookup(m);
    if (!pack) return [];
    const rows = [].concat(pack.homeNews || [], pack.awayNews || []);
    if (!cat || cat === "全部") return rows;
    return rows.filter((x) => x.cat === cat);
  }

  function countOf(pack) {
    if (!pack) return 0;
    return ((pack.homeNews || []).length) + ((pack.awayNews || []).length);
  }

  function lockedCount(pack) {
    if (!pack) return 0;
    return isOpen(pack.id) ? 0 : 1;
  }

  function attachAll() {
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      const list = global.CC_DATA && CC_DATA[key] && CC_DATA[key].matches;
      (list || []).forEach((m) => {
        const pack = lookup(m);
        if (pack) m.intel = pack;
      });
    });
  }

  const INTEL_STORE = "jczq-cc-intel-live-v1";
  const pulledAt = {};

  function loadLive() {
    try {
      const pack = JSON.parse(localStorage.getItem(INTEL_STORE) || "null");
      if (!pack || !pack.bySlot) return;
      if (!global.CC_NEWS_CACHE) global.CC_NEWS_CACHE = { bySlot: {} };
      Object.assign(CC_NEWS_CACHE.bySlot, pack.bySlot);
      if (pack.at) CC_NEWS_CACHE.at = pack.at;
    } catch (err) { /* ignore */ }
  }

  function saveLive() {
    try {
      localStorage.setItem(INTEL_STORE, JSON.stringify({ at: Date.now(), bySlot: (global.CC_NEWS_CACHE || {}).bySlot || {} }));
    } catch (err) { /* ignore */ }
  }

  function putRaw(m, raw) {
    if (!global.CC_NEWS_CACHE) global.CC_NEWS_CACHE = { bySlot: {} };
    if (!CC_NEWS_CACHE.bySlot) CC_NEWS_CACHE.bySlot = {};
    if (m.slot) CC_NEWS_CACHE.bySlot[m.slot] = raw;
    CC_NEWS_CACHE.bySlot[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")] = raw;
    CC_NEWS_CACHE.at = new Date().toTimeString().slice(0, 5);
  }

  function tallySide(games) {
    const n = games.length;
    const w = games.filter((g) => g.res === "W").length;
    const d = games.filter((g) => g.res === "D").length;
    const l = games.filter((g) => g.res === "L").length;
    const gf = games.reduce((s, g) => s + (g.gf || 0), 0);
    const ga = games.reduce((s, g) => s + (g.ga || 0), 0);
    const streak = games.map((g) => g.res).join("");
    return { n: n, w: w, d: d, l: l, gf: gf, ga: ga, streak: streak, games: games };
  }

  function gamesOf(rows, teamId) {
    return (rows || []).slice().reverse().map((g) => {
      const tt = g.tooltipText || {};
      const ourHome = String((g.home && g.home.id) || tt.homeTeamId || "") === String(teamId);
      const hs = Number(tt.homeScore);
      const as = Number(tt.awayScore);
      const gf = ourHome ? hs : as;
      const ga = ourHome ? as : hs;
      const res = gf > ga ? "W" : gf < ga ? "L" : "D";
      const comp = (g.tournament && g.tournament.name) || (g.league && g.league.name) || "";
      return {
        date: String((tt.utcTime || (g.date && g.date.utcTime) || "")).slice(0, 10),
        opp: ourHome ? (tt.awayTeam || (g.away && g.away.name) || "") : (tt.homeTeam || (g.home && g.home.name) || ""),
        oppId: ourHome ? (tt.awayTeamId || (g.away && g.away.id)) : (tt.homeTeamId || (g.home && g.home.id)),
        home: ourHome,
        gf: gf || 0,
        ga: ga || 0,
        res: res,
        score: String(g.score || "").replace(/\s/g, ""),
        comp: comp,
      };
    }).filter((g) => !/友谊|Friendly/i.test(g.comp || ""));
  }

  function injOf(list) {
    return (list || []).map((p) => ({
      name: p.name || "",
      pos: p.role || p.position || "",
      reason: "伤停 · 复出 " + (((p.unavailability || {}).expectedReturn) || ""),
      no: p.shirtNumber != null ? p.shirtNumber : null,
    }));
  }

  function newsOfInsights(insights, teamId, side) {
    return (insights || []).filter((x) => !teamId || x.teamId == null || String(x.teamId) === String(teamId)).slice(0, 4).map((x) => ({
      kind: "情报",
      t: "",
      title: x.text || x.defaultText || "",
      summary: "",
      side: side,
    }));
  }

  function mergeNews(oldRows, fresh) {
    const seen = {};
    const out = [];
    [].concat(fresh || [], oldRows || []).forEach((x) => {
      const k = (x.title || "") + (x.kind || "");
      if (!k || seen[k] || !keep(x)) return;
      seen[k] = true;
      out.push(x);
    });
    return out.slice(0, 16);
  }

  async function detailsOf(id) {
    const url = "https://www.fotmob.com/api/data/matchDetails?matchId=" + id;
    if (global.CC_LIVE && CC_LIVE.getJson) return CC_LIVE.getJson(url);
    const res = await fetch(url, { cache: "no-store" });
    return res.json();
  }

  function applyDetails(m, json) {
    const general = json.general || {};
    const header = json.header || {};
    const teams = header.teams || [];
    const home = teams[0] || general.homeTeam || {};
    const away = teams[1] || general.awayTeam || {};
    const lineup = (json.content && json.content.lineup) || {};
    const facts = (json.content && json.content.matchFacts) || {};
    const form = facts.teamForm || [];
    const insights = facts.insights || [];
    const prev = (global.CC_NEWS_CACHE && CC_NEWS_CACHE.bySlot && (CC_NEWS_CACHE.bySlot[m.slot] || {})) || {};
    const raw = {
      slot: m.slot,
      date: m.date,
      home: m.home,
      away: m.away,
      homeId: home.id || prev.homeId,
      awayId: away.id || prev.awayId,
      matchId: general.matchId || prev.matchId,
      homeLogo: (home.imageUrl || "").replace("_small.png", ".png") || prev.homeLogo,
      awayLogo: (away.imageUrl || "").replace("_small.png", ".png") || prev.awayLogo,
      homeNews: mergeNews(prev.homeNews, newsOfInsights(insights, home.id, "home").concat(injOf((lineup.homeTeam || {}).unavailable).map((p) => ({ kind: "伤停", t: "", title: (p.no != null ? p.no + " " : "") + p.name + " 缺阵", summary: p.reason })))),
      awayNews: mergeNews(prev.awayNews, newsOfInsights(insights, away.id, "away").concat(injOf((lineup.awayTeam || {}).unavailable).map((p) => ({ kind: "伤停", t: "", title: (p.no != null ? p.no + " " : "") + p.name + " 缺阵", summary: p.reason })))),
    };
    putRaw(m, raw);
    m.intel = lookup(m);
    if (global.CC_FORM && CC_FORM.ingestLive) {
      const hg = gamesOf(form[0], home.id);
      const ag = gamesOf(form[1], away.id);
      CC_FORM.ingestLive(m, {
        homeId: home.id || prev.homeId,
        awayId: away.id || prev.awayId,
        homeEn: home.name || home.longName || "",
        awayEn: away.name || away.longName || "",
        homeSide: { recent: tallySide(hg), venue: tallySide(hg.filter((g) => g.home)), injuries: injOf((lineup.homeTeam || {}).unavailable) },
        awaySide: { recent: tallySide(ag), road: tallySide(ag.filter((g) => !g.home)), injuries: injOf((lineup.awayTeam || {}).unavailable) },
      });
    }
    return raw;
  }

  async function pullOne(m, force) {
    const pack = lookup(m) || {};
    const id = pack.matchId || m.matchId;
    if (!id) return;
    const key = String(id);
    if (!force && pulledAt[key] && Date.now() - pulledAt[key] < 8 * 60 * 1000) return;
    const json = await detailsOf(id);
    pulledAt[key] = Date.now();
    applyDetails(m, json);
  }

  async function mapPool(list, n, fn) {
    const q = list.slice();
    await Promise.all(Array.from({ length: n }, async () => {
      while (q.length) {
        const x = q.shift();
        try { await fn(x); } catch (err) { /* 单场失败不影响整轮 */ }
      }
    }));
  }

  async function pullLive(matches, opt) {
    const force = !!(opt && opt.force);
    const list = (matches || []).filter((m) => m && m.source === "live");
    const hot = list.filter((m) => m.liveState === "live" || m.liveState === "ft").concat(list);
    const seen = {};
    const uniq = [];
    hot.forEach((m) => {
      const k = matchKey(m);
      if (seen[k]) return;
      seen[k] = true;
      uniq.push(m);
    });
    const cap = force ? 24 : 12;
    await mapPool(uniq.slice(0, cap), 3, (m) => pullOne(m, force));
    attachAll();
    saveLive();
    if (global.CC_FORM && CC_FORM.saveLive) CC_FORM.saveLive();
    return uniq.length;
  }

  global.CC_NEWS = {
    CATS, pinOk, isOpen, unlockMatch, lockMatch, matchKey, teamKey,
    lookup, feedOf, countOf, lockedCount, attachAll, boot: attachAll,
    pullLive, loadLive, saveLive,
  };
})(window);
