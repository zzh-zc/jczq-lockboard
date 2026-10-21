(function (global) {
  const PAGE = "https://odds.500.com/europe_jczq.shtml";
  const PIN = "293";
  const IW = "280";
  const AVG = "0";

  function hottest(o) {
    if (!o) return "even";
    if (Math.abs(o.h - o.a) < 0.4 && o.d > Math.min(o.h, o.a)) return "even";
    const m = Math.min(o.h, o.d, o.a);
    if (m === o.h) return "home";
    if (m === o.a) return "away";
    return "draw";
  }

  function row(arr) {
    if (!arr || arr.length < 3) return null;
    return { h: +arr[0], d: +arr[1], a: +arr[2], ret: +arr[6] || 0, kh: +arr[7] || 0, kd: +arr[8] || 0, ka: +arr[9] || 0 };
  }

  function label(side) {
    return side === "home" ? "主" : side === "away" ? "客" : side === "draw" ? "平" : "对开";
  }

  async function loadText(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error("http " + res.status);
      return res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchPage() {
    try {
      return await loadText(PAGE);
    } catch (e1) {
      return loadText("https://cors.eu.org/" + PAGE);
    }
  }

  function parsePage(html) {
    const fids = {};
    const re = /value="(\d+)"[^>]*>\s*(周[一二三四五六日]\d{3})/g;
    let hit;
    while ((hit = re.exec(html))) fids[hit[2]] = hit[1];
    const start = html.indexOf("var ouzhiList");
    const brace = html.indexOf("{", start);
    const marker = html.indexOf("var timeOffset", brace);
    const end = marker > 0 ? html.lastIndexOf("}", marker) + 1 : 0;
    if (start < 0 || brace < 0 || end <= brace) return { fids: fids, list: {} };
    try {
      return { fids: fids, list: JSON.parse(html.slice(brace, end)) };
    } catch (err) {
      return { fids: fids, list: {} };
    }
  }

  function readFid(list, fid) {
    const pack = list[fid];
    if (!pack) return null;
    const avgNow = row((pack[AVG] || [])[0]);
    const avgOpen = row((pack[AVG] || [])[1]);
    const pinNow = row((pack[PIN] || pack[IW] || [])[0]);
    const avgSide = hottest(avgNow);
    const pinSide = hottest(pinNow);
    const veto = !!(pinNow && avgNow && pinSide !== "even" && avgSide !== "even" && pinSide !== avgSide);
    let quake = "暂时没变";
    let ratio = 1;
    if (avgOpen && avgNow && avgOpen.h) {
      ratio = avgOpen.h / avgNow.h;
      if (ratio > 1.05) quake = "主胜在降，钱往主走";
      else if (ratio < 0.95) quake = "主胜在升，热门升温";
      const ar = avgOpen.a / avgNow.a;
      if (ar > 1.05 && ratio <= 1.02) quake = "客胜在降，钱往客走";
    }
    return {
      avgNow: avgNow, avgOpen: avgOpen, pinNow: pinNow,
      avgSide: avgSide, pinSide: pinSide, veto: veto, quake: quake, ratio: ratio,
    };
  }

  function fromCache() {
    const cache = global.CC_OUZHI_CACHE;
    if (!cache || !cache.fids || !cache.list) return null;
    return { fids: cache.fids, list: cache.list };
  }

  async function loadBooks() {
    try {
      const parsed = parsePage(await fetchPage());
      if (Object.keys(parsed.fids).length) return { parsed: parsed, live: true };
    } catch (err) {
      // 500 没有 CORS，站点页用推上去的百家缓存。
    }
    const cache = fromCache();
    return cache ? { parsed: cache, live: false } : { parsed: null, live: false };
  }

  async function enrich(pack) {
    const got = await loadBooks();
    if (!got.parsed) {
      pack.booksOk = false;
      pack.booksLive = false;
      return pack;
    }
    pack.matches.forEach((m) => {
      const key = String(m.slot || "").replace(/\s/g, "");
      const fid = got.parsed.fids[key];
      if (!fid) return;
      m.books500 = readFid(got.parsed.list, fid);
    });
    pack.booksOk = true;
    pack.booksLive = got.live;
    return pack;
  }

  global.CC_BOOKS = { enrich, hottest, label };
})(window);
