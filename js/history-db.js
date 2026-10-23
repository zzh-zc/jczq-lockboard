(function (global) {
  const cfg = () => global.CC_CONFIG || {};

  function apiBase() {
    const u = String(cfg().historyApi || "").replace(/\/$/, "");
    return u || "";
  }

  function headers() {
    const h = { "Content-Type": "application/json" };
    const key = cfg().historyKey || "";
    if (key) h["X-JCZQ-Key"] = key;
    return h;
  }

  function cutSince() {
    const days = cfg().historyDays || 10;
    if (global.CC_BOARD && CC_BOARD.cutIso) return CC_BOARD.cutIso();
    if (global.CC_ODDS && CC_ODDS.addDays && CC_ODDS.todayIso) {
      return CC_ODDS.addDays(CC_ODDS.todayIso(), 1 - days);
    }
    return "";
  }

  function sameKey(a, b) {
    if (global.CC_BOARD && CC_BOARD.keyOf) {
      return CC_BOARD.keyOf(a) === CC_BOARD.keyOf(b);
    }
    return String(a.slot) === String(b.slot) && String(a.issueDate || a.date) === String(b.issueDate || b.date);
  }

  function finished(m) {
    return !!(m && (m.result || m.score) && m.pick);
  }

  function toSealPayload(m) {
    if (!m || m.sealed || m.source === "db") return null;
    if (!finished(m)) return null;
    if (global.CC_ODDS && CC_ODDS.stampIssue) CC_ODDS.stampIssue(m);
    return {
      issueDate: m.issueDate || m.date,
      slot: m.slot,
      code: m.code,
      league: m.league,
      home: m.home,
      away: m.away,
      date: m.date,
      kickoff: m.kickoff,
      sp: m.sp,
      pick: m.pick,
      dual: !!m.dual,
      tag: m.tag,
      env: m.env,
      paperOppose: !!m.paperOppose,
      ttgPicks: m.ttgPicks || m.ftOu || [],
      ftScores: m.ftScores || [],
      hafuPicks: m.hafuPicks || m.htScores || [],
      hadPicks: m.hadPicks || [],
      hhadPicks: m.hhadPicks || [],
      summary: m.summary || "",
      factors: m.factors || [],
      score: m.score,
      result: m.result,
      htScore: m.htScore || m.halfScore,
    };
  }

  async function pull() {
    const base = apiBase();
    if (!base) return [];
    const since = cutSince();
    const url = base + "/api/history?since=" + encodeURIComponent(since) + "&days=" + (cfg().historyDays || 10);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const pack = await res.json();
      return (pack && pack.matches) || [];
    } catch {
      return [];
    }
  }

  function mergeIntoData(rows) {
    if (!global.CC_DATA || !CC_DATA.jczq || !rows.length) return 0;
    const list = CC_DATA.jczq.matches || [];
    let n = 0;
    rows.forEach((row) => {
      if (!row || !row.slot) return;
      const hit = list.find((m) => sameKey(m, row));
      if (hit) {
        if (hit.sealed || hit.source === "db") return;
        Object.assign(hit, row, { sealed: true, manuscript: true, source: "db", lock: true });
        n += 1;
        return;
      }
      if (list.some((m) => m && m.slot === row.slot && (m.sealed || m.source === "db"))) return;
      list.push(Object.assign({}, row, { sealed: true, manuscript: true, source: "db", lock: true }));
      n += 1;
    });
    CC_DATA.jczq.matches = list;
    return n;
  }

  async function loadIntoData() {
    const rows = await pull();
    return mergeIntoData(rows);
  }

  async function sealOne(m) {
    const base = apiBase();
    const body = toSealPayload(m);
    if (!base || !body) return false;
    try {
      const res = await fetch(base + "/api/history/seal", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      const pack = await res.json();
      if (pack && pack.match) {
        m.sealed = true;
        m.source = "db";
        m.manuscript = true;
      }
      return !!(pack && pack.ok);
    } catch {
      return false;
    }
  }

  async function sealFinished(list) {
    const base = apiBase();
    if (!base) return 0;
    const rows = (list || []).filter((m) => toSealPayload(m));
    if (!rows.length) return 0;
    let ok = 0;
    for (let i = 0; i < rows.length; i += 1) {
      if (await sealOne(rows[i])) ok += 1;
    }
    return ok;
  }

  function isFrozen(m) {
    return !!(m && (m.sealed || m.source === "db"));
  }

  global.CC_HISTORY_DB = {
    pull, loadIntoData, mergeIntoData, sealOne, sealFinished, isFrozen, toSealPayload,
  };
})(window);
