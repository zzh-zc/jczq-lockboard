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

  function slotCode(m) {
    const hit = String((m && (m.slot || m.code)) || "").match(/(\d{3,4})$/);
    return hit ? hit[1] : String((m && (m.slot || m.code)) || "");
  }

  function keyOf(m) {
    if (!m) return "";
    const iss = m.issueDate || ((global.CC_ODDS && CC_ODDS.issueDateOf) ? CC_ODDS.issueDateOf(m) : "") || m.date || "";
    const code = slotCode(m);
    if (code) return iss + "|" + code;
    return [iss, m.home || "", m.away || ""].join("|");
  }

  function sameTeams(a, b) {
    if (global.CC_RESULT && global.CC_RESULT.sameTeam) {
      return global.CC_RESULT.sameTeam(a.home, b.home) && global.CC_RESULT.sameTeam(a.away, b.away);
    }
    return a.home === b.home && a.away === b.away;
  }

  function nearDay(a, b) {
    const da = String((a && (a.issueDate || a.date)) || "");
    const db = String((b && (b.issueDate || b.date)) || "");
    if (!da || !db) return true;
    if (da === db) return true;
    const t = (s) => Date.parse(s + "T12:00:00");
    return Math.abs(t(da) - t(db)) <= 36 * 3600 * 1000;
  }

  function preferMatch(a, b) {
    const locked = (m) => !!(m.pick || (m.ttgPicks && m.ttgPicks.length) || (m.hafuPicks && m.hafuPicks.length));
    const scored = (m) => !!(m.score || m.result);
    const week = (m) => /周/.test(m.slot || "");
    if (locked(a) !== locked(b)) return locked(a) ? a : b;
    if (scored(a) !== scored(b)) return scored(a) ? a : b;
    if (week(a) !== week(b)) return week(a) ? a : b;
    return a;
  }

  function absorb(keep, drop) {
    const started = global.CC_ODDS && CC_ODDS.kickedOff ? CC_ODDS.kickedOff(keep) || CC_ODDS.kickedOff(drop) : true;
    if (started && !keep.score && drop.score) {
      keep.score = drop.score;
      keep.result = keep.result || drop.result;
    }
    if (!keep.result && drop.result) keep.result = drop.result;
    if (!keep.htScore && (drop.htScore || drop.halfScore)) keep.htScore = drop.htScore || drop.halfScore;
    if (!keep.matchId && drop.matchId) keep.matchId = drop.matchId;
    if (!keep.pick && drop.pick) keep.pick = drop.pick;
    if ((!keep.ttgPicks || !keep.ttgPicks.length) && drop.ttgPicks && drop.ttgPicks.length) keep.ttgPicks = drop.ttgPicks;
    if ((!keep.ftScores || !keep.ftScores.length) && drop.ftScores && drop.ftScores.length) keep.ftScores = drop.ftScores;
    if ((!keep.hafuPicks || !keep.hafuPicks.length) && drop.hafuPicks && drop.hafuPicks.length) keep.hafuPicks = drop.hafuPicks;
    if ((!keep.hadPicks || !keep.hadPicks.length) && drop.hadPicks && drop.hadPicks.length) keep.hadPicks = drop.hadPicks;
    if (/周/.test(drop.slot || "") && !/周/.test(keep.slot || "")) keep.slot = drop.slot;
    if (!keep.issueDate && drop.issueDate) keep.issueDate = drop.issueDate;
  }

  function collapseTwins(list) {
    const out = [];
    (list || []).forEach((m) => {
      if (!m) return;
      const hit = out.find((x) => sameTeams(x, m) && nearDay(x, m));
      if (!hit) {
        out.push(m);
        return;
      }
      const keep = preferMatch(hit, m);
      const drop = keep === hit ? m : hit;
      absorb(keep, drop);
      if (keep !== hit) out[out.indexOf(hit)] = keep;
    });
    return out;
  }

  function slim(m) {
    return {
      id: m.id, slot: m.slot, code: m.code, date: m.date, home: m.home, away: m.away,
      league: m.league, kickoff: m.kickoff, sp: m.sp, pick: m.pick, dual: m.dual,
      issueDate: m.issueDate, issueWd: m.issueWd, businessDate: m.businessDate,
      lock: m.lock, tag: m.tag, action: m.action, result: m.result, score: m.score,
      htScore: m.htScore || m.halfScore,
      liveScore: m.liveScore, liveState: m.liveState, liveMinute: m.liveMinute,
      handicap: m.handicap, source: m.source || "board", light: m.light, env: m.env,
      ttgPicks: m.ttgPicks, ftScores: m.ftScores, hadPicks: m.hadPicks,
      hhadPicks: m.hhadPicks, hafuPicks: m.hafuPicks, _mk: m._mk, summary: m.summary,
      steady: m.steady, why: m.why, market: m.market, engine: m.engine,
      will: m.will, factors: m.factors,
    };
  }

  function read() {
    try {
      const pack = JSON.parse(localStorage.getItem(STORE) || "null");
      const list = pack && Array.isArray(pack.matches) ? pack.matches : [];
      return list.filter((m) => m && inWindow(m.issueDate || m.date));
    } catch {
      return [];
    }
  }

  function save(list) {
    const keep = (list || []).filter((m) => m && inWindow(m.issueDate || m.date)).map(slim);
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
    return (list || []).filter((m) => m && inWindow(m.issueDate || m.date));
  }

  function mergeInto(cur, saved) {
    const map = new Map();
    pruneList(cur).forEach((m) => map.set(keyOf(m), m));
    saved.forEach((m) => {
      const k = keyOf(m);
      if (!k || !inWindow(m.issueDate || m.date)) return;
      const hit = map.get(k);
      if (!hit) {
        if (!m.source) m.source = "board";
        map.set(k, m);
        return;
      }
      const started = global.CC_ODDS && CC_ODDS.kickedOff ? CC_ODDS.kickedOff(hit) || CC_ODDS.kickedOff(m) : true;
      if (started && !hit.result && m.result) {
        hit.result = m.result;
        hit.score = hit.score || m.score;
      }
      if (started && !hit.score && m.score) hit.score = m.score;
      if (!hit.htScore && (m.htScore || m.halfScore)) hit.htScore = m.htScore || m.halfScore;
      if (!hit.pick && m.pick) hit.pick = m.pick;
      if ((hit.score || hit.result || m.score || m.result) && m.ttgPicks && m.ttgPicks.length) {
        hit.pick = m.pick || hit.pick;
        hit.hadPicks = m.hadPicks || hit.hadPicks;
        hit.ttgPicks = m.ttgPicks;
        hit.ftOu = m.ftOu || m.ttgPicks;
        hit.ftScores = m.ftScores || hit.ftScores;
        hit.hafuPicks = m.hafuPicks || hit.hafuPicks;
        hit.hhadPicks = m.hhadPicks || hit.hhadPicks;
        hit._mk = m._mk || hit._mk;
      }
    });
    return collapseTwins([...map.values()]).sort((a, b) => String(a.issueDate || a.date).localeCompare(String(b.issueDate || b.date)) || String(a.slot || "").localeCompare(String(b.slot || "")));
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
    const all = collapseTwins(pruneList((CC_DATA.jczq.matches || []).filter((m) => m.source !== "sfc-history")));
    all.forEach((m) => {
      if (global.CC_ODDS && CC_ODDS.stampIssue) CC_ODDS.stampIssue(m);
    });
    CC_DATA.jczq.matches = all;
    return save(all.filter((m) => m.source !== "hist"));
  }

  global.CC_BOARD = { DAYS, today, cutIso, inWindow, keyOf, load, pruneAndSave, pruneList, save, collapseTwins };
})(window);
