(function (global) {
  const STORE = "jczq-cc-intel-v1";
  const PIN_B64 = "c3VvaGFv";
  const SKIP = /U-18|官方会员|MY TOKYO|发售通知|抽奖|商业战略|中国足球史上|超话|重锤|站前广场|精酿啤酒/;
  const RANK = { 伤停: 0, 情报: 1, 外媒: 2, 转会: 3, 新闻: 4, 近况: 5 };

  function unlocked() {
    try { return localStorage.getItem(STORE) === "1"; } catch { return false; }
  }

  function persist(on) {
    try {
      if (on) localStorage.setItem(STORE, "1");
      else localStorage.removeItem(STORE);
    } catch { /* ignore */ }
  }

  function wantPin() {
    try {
      const q = new URLSearchParams(location.search);
      return (q.get("k") || q.get("intel") || "").trim();
    } catch {
      return "";
    }
  }

  function pinOk(raw) {
    const pin = String(raw || "").trim().toLowerCase();
    let expect = "";
    try { expect = atob(PIN_B64); } catch { expect = ""; }
    return pin && pin === expect;
  }

  function unlock(raw) {
    if (!pinOk(raw)) return false;
    persist(true);
    return true;
  }

  function lock() {
    persist(false);
  }

  function keep(item) {
    const blob = String((item && item.title) || "") + String((item && item.summary) || "");
    return !SKIP.test(blob);
  }

  function tidy(list) {
    return (list || []).filter(keep).slice().sort((a, b) => (RANK[a.kind] != null ? RANK[a.kind] : 9) - (RANK[b.kind] != null ? RANK[b.kind] : 9));
  }

  function lookup(m) {
    const cache = global.CC_NEWS_CACHE && global.CC_NEWS_CACHE.bySlot;
    if (!cache || !m) return null;
    const raw = cache[m.slot] || cache[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")];
    if (!raw) return null;
    return {
      slot: raw.slot,
      date: raw.date,
      home: raw.home,
      away: raw.away,
      homeNews: tidy(raw.homeNews),
      awayNews: tidy(raw.awayNews),
    };
  }

  function countOf(pack) {
    if (!pack) return 0;
    return ((pack.homeNews || []).length) + ((pack.awayNews || []).length);
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

  function boot() {
    const auto = wantPin();
    if (auto && pinOk(auto)) persist(true);
    attachAll();
  }

  global.CC_NEWS = { unlocked, unlock, lock, lookup, countOf, attachAll, boot, pinOk };
})(window);
