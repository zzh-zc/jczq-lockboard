(function (global) {
  const STORE = "jczq-cc-board-v1";
  const DAYS = 10;

  function today() {
    if (global.CC_ODDS && CC_ODDS.todayIso) return CC_ODDS.todayIso();
    const d = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function cutIso() {
    if (global.CC_ODDS && CC_ODDS.addDays) return CC_ODDS.addDays(today(), 1 - DAYS);
    return today();
  }

  function inWindow(iso) {
    const d = String(iso || "");
    if (!d) return false;
    return d >= cutIso();
  }

  function keyOf(m) {
    return (m && (m.slot || [(m.date || ""), (m.home || ""), (m.away || "")].join("|"))) || "";
  }

  function slim(m) {
    return {
      id: m.id, slot: m.slot, code: m.code, date: m.date, home: m.home, away: m.away,
      league: m.league, kickoff: m.kickoff, sp: m.sp, pick: m.pick, dual: m.dual,
      lock: m.lock, tag: m.tag, action: m.action, result: m.result, score: m.score,
      liveScore: m.liveScore, liveState: m.liveState, liveMinute: m.liveMinute,
      handicap: m.handicap, source: m.source || "board", light: m.light, env: m.env,
      ttgPicks: m.ttgPicks, ftScores: m.ftScores, hadPicks: m.hadPicks,
      hhadPicks: m.hhadPicks, hafuPicks: m.hafuPicks, summary: m.summary,
      steady: m.steady, why: m.why, market: m.market, engine: m.engine,
      will: m.will, factors: m.factors,
    };
  }

  function read() {
    try {
      const pack = JSON.parse(localStorage.getItem(STORE) || "null");
      const list = pack && Array.isArray(pack.matches) ? pack.matches : [];
      return list.filter((m) => m && inWindow(m.date));
    } catch {
      return [];
    }
  }

  function save(list) {
    const keep = (list || []).filter((m) => m && inWindow(m.date)).map(slim);
    try {
      localStorage.setItem(STORE, JSON.stringify({ at: Date.now(), cut: cutIso(), matches: keep }));
    } catch (err) {
      try {
        localStorage.setItem(STORE, JSON.stringify({ at: Date.now(), cut: cutIso(), matches: keep.slice(-80) }));
      } catch (e2) { /* ignore */ }
    }
    return keep;
  }

  function pruneList(list) {
    return (list || []).filter((m) => m && inWindow(m.date));
  }

  function mergeInto(cur, saved) {
    const map = new Map();
    pruneList(cur).forEach((m) => map.set(keyOf(m), m));
    saved.forEach((m) => {
      const k = keyOf(m);
      if (!k || !inWindow(m.date)) return;
      const hit = map.get(k);
      if (!hit) {
        if (!m.source) m.source = "board";
        map.set(k, m);
        return;
      }
      if (!hit.result && m.result) {
        hit.result = m.result;
        hit.score = hit.score || m.score;
      }
      if (!hit.pick && m.pick) hit.pick = m.pick;
    });
    return [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.slot || "").localeCompare(String(b.slot || "")));
  }

  function load() {
    if (!global.CC_DATA || !CC_DATA.jczq) return [];
    const next = mergeInto(CC_DATA.jczq.matches || [], read());
    CC_DATA.jczq.matches = next;
    save(next);
    return next;
  }

  function pruneAndSave() {
    if (!global.CC_DATA || !CC_DATA.jczq) return [];
    CC_DATA.jczq.matches = pruneList(CC_DATA.jczq.matches || []);
    return save(CC_DATA.jczq.matches);
  }

  global.CC_BOARD = { DAYS, today, cutIso, inWindow, keyOf, load, pruneAndSave, pruneList, save };
})(window);
