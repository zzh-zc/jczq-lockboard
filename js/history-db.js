(function (global) {
  /**
   * 历史锁号：默认读 GitHub Pages 同仓 js/history-lock-cache.js（第三方托管，无需自启服务）。
   * 可选 historyApi 连自建库；一般不用。
   */
  const cfg = () => global.CC_CONFIG || {};

  function cutSince() {
    const days = cfg().historyDays || 10;
    if (global.CC_BOARD && CC_BOARD.cutIso) return CC_BOARD.cutIso();
    if (global.CC_ODDS && CC_ODDS.addDays && CC_ODDS.todayIso) {
      return CC_ODDS.addDays(CC_ODDS.todayIso(), 1 - days);
    }
    return "";
  }

  function staticRows() {
    const pack = global.CC_HISTORY_LOCK_CACHE || {};
    const since = cutSince();
    return (pack.matches || []).filter((m) => {
      if (!m || !m.slot) return false;
      if (!since) return true;
      const d = m.issueDate || m.date || "";
      return d >= since;
    });
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

  function archiveRow(row) {
    return Object.assign({}, row, {
      sealed: true,
      manuscript: true,
      lock: true,
      source: "archive",
    });
  }

  function mergeIntoData(rows) {
    if (!global.CC_DATA || !CC_DATA.jczq || !rows.length) return 0;
    const list = CC_DATA.jczq.matches || [];
    let n = 0;
    rows.forEach((row) => {
      if (!row || !row.slot) return;
      const arc = archiveRow(row);
      const hit = list.find((m) => sameKey(m, arc));
      if (hit) {
        if (isFrozen(hit)) return;
        Object.assign(hit, arc);
        n += 1;
        return;
      }
      if (list.some((m) => m && m.slot === arc.slot && isFrozen(m))) return;
      list.push(arc);
      n += 1;
    });
    CC_DATA.jczq.matches = list;
    return n;
  }

  async function pullRemote() {
    const u = String(cfg().historyApi || "").replace(/\/$/, "");
    if (!u) return [];
    const since = cutSince();
    try {
      const res = await fetch(u + "/api/history?since=" + encodeURIComponent(since), { cache: "no-store" });
      if (!res.ok) return [];
      const pack = await res.json();
      return (pack && pack.matches) || [];
    } catch {
      return [];
    }
  }

  async function loadIntoData() {
    let n = mergeIntoData(staticRows());
    const remote = await pullRemote();
    if (remote.length) n += mergeIntoData(remote);
    return n;
  }

  function sealFinished(list) {
    const bySlot = {};
    staticRows().forEach((r) => { bySlot[r.slot] = r; });
    (list || []).forEach((m) => {
      if (!m || isFrozen(m)) return;
      if (bySlot[m.slot]) {
        Object.assign(m, archiveRow(bySlot[m.slot]));
        return;
      }
      if (finished(m) && m.manuscript) m.sealed = true;
    });
    return 0;
  }

  function isFrozen(m) {
    return !!(m && (m.sealed || m.source === "archive" || m.source === "db"));
  }

  global.CC_HISTORY_DB = {
    staticRows,
    loadIntoData,
    mergeIntoData,
    sealFinished,
    isFrozen,
  };
})(window);
