(function (global) {
  const STORE = "jczq-cc-intel-match-v1";
  const PIN_B64 = "c3VvaGFv";
  const SKIP = /U-18|官方会员|MY TOKYO|发售通知|抽奖|商业战略|中国足球史上|超话|重锤|站前广场|精酿啤酒/;
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
        source: item.source || "",
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

  global.CC_NEWS = {
    CATS, pinOk, isOpen, unlockMatch, lockMatch, matchKey,
    lookup, feedOf, countOf, lockedCount, attachAll, boot: attachAll,
  };
})(window);
