(function (global) {
  const JC_SRC = "https://webapi.sporttery.cn/gateway/jc/football/getMatchCalculatorV1.qry?poolCode=had,hhad,ttg,hafu,crs&channel=c";
  const SFC_SRC = "https://webapi.sporttery.cn/gateway/lottery/getFootBallMatchV1.qry?param=90,0";
  const BJDC_SRC = "https://trade.500.com/bjdc/";

  function n(x) {
    const v = parseFloat(x);
    return Number.isFinite(v) ? v : null;
  }

  function codeOf(m) {
    const raw = String(m.matchNumStr || m.matchNum || "");
    const tail = raw.match(/(\d{3})\s*$/);
    if (tail) return tail[1];
    const num = String(m.matchNum || "");
    return num.slice(-3).padStart(3, "0");
  }

  function kickOf(m) {
    const t = String(m.matchTime || "");
    return t.slice(0, 5);
  }

  function mapJc(m) {
    const row = {
      code: codeOf(m),
      league: m.leagueAbbName || m.leagueAllName || "",
      home: m.homeTeamAbbName || m.homeTeamAllName || "",
      away: m.awayTeamAbbName || m.awayTeamAllName || "",
      date: m.matchDate || m.businessDate || "",
      businessDate: m.businessDate || "",
      kickoff: kickOf(m),
      slot: String(m.matchNumStr || "").replace(/\s/g, ""),
      status: m.matchStatus || "",
      had: m.had || {},
      hhad: m.hhad || {},
      ttg: m.ttg || {},
      hafu: m.hafu || {},
      crs: m.crs || {},
      matchId: m.matchId,
    };
    return global.CC_ODDS && CC_ODDS.stampIssue ? CC_ODDS.stampIssue(row) : row;
  }

  async function loadText(url, extra) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, Object.assign({ cache: "no-store", signal: ctrl.signal }, extra || {}));
      if (!res.ok) throw new Error("http " + res.status);
      return res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadJson(url) {
    const text = await loadText(url);
    return JSON.parse(text);
  }

  function fromJcCache() {
    const cache = global.CC_JC_CACHE;
    if (!cache || !cache.matches || !cache.matches.length) return null;
    return { matches: cache.matches.slice(), updatedAt: cache.updatedAt || "", n: n, fromCache: true };
  }

  function matchKey(m) {
    return m.slot || [m.date, m.home, m.away].join("|");
  }

  function hasHad(m) {
    const had = (m && m.had) || {};
    return !!(n(had.h) && n(had.d) && n(had.a));
  }

  function sameClub(a, b) {
    if (global.CC_RESULT && CC_RESULT.sameTeam) return CC_RESULT.sameTeam(a, b);
    return String(a || "") === String(b || "");
  }

  function bjdcOf(m) {
    const list = ((global.CC_BJDC_CACHE || {}).matches) || [];
    return list.find((x) => sameClub(x.home, m.home) && sameClub(x.away, m.away)) || null;
  }

  function fillMissingHad(list) {
    (list || []).forEach((m) => {
      if (!m || hasHad(m)) return;
      const b = bjdcOf(m);
      if (!b || !n((b.had || {}).h) || !n((b.had || {}).d) || !n((b.had || {}).a)) return;
      m.had = Object.assign({}, b.had);
      if (!m.hhad || (m.hhad.h == null && !m.hhad.goalLine)) m.hhad = b.hhad || m.hhad;
      if (!m.kickoff && b.kickoff) m.kickoff = b.kickoff;
    });
    return list;
  }

  function pickPool(cur, prev) {
    if (cur && Object.keys(cur).length > 3) return cur;
    return prev || cur || {};
  }

  function mergeJc(live, cached) {
    const map = new Map();
    (cached || []).forEach((m) => map.set(matchKey(m), Object.assign({}, m)));
    (live || []).forEach((m) => {
      const key = matchKey(m);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, m);
        return;
      }
      map.set(key, Object.assign({}, prev, m, {
        had: hasHad(m) ? m.had : prev.had,
        hhad: m.hhad && (m.hhad.h || m.hhad.goalLine) ? m.hhad : prev.hhad,
        ttg: pickPool(m.ttg, prev.ttg),
        hafu: pickPool(m.hafu, prev.hafu),
        crs: pickPool(m.crs, prev.crs),
      }));
    });
    return fillMissingHad([...map.values()])
      .filter((m) => hasHad(m) || (m.home && m.away))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.code).localeCompare(String(b.code)));
  }

  async function pullLiveRows() {
    const json = await loadJson(JC_SRC);
    if (!json.success || !json.value) throw new Error("empty");
    const matches = [];
    (json.value.matchInfoList || []).forEach((day) => {
      (day.subMatchList || []).forEach((row) => {
        if (row.matchStatus && /Cancel|Paused/i.test(row.matchStatus)) return;
        matches.push(mapJc(row));
      });
    });
    return { matches: fillMissingHad(matches), updatedAt: json.value.lastUpdateTime || "" };
  }

  async function pull() {
    const cache = fromJcCache();
    let live = [];
    let updatedAt = "";
    try {
      const pack = await pullLiveRows();
      live = pack.matches;
      updatedAt = pack.updatedAt;
    } catch (err) {
      if (!cache) throw err;
      return cache;
    }
    const matches = mergeJc(live, cache && cache.matches);
    if (!matches.length) {
      if (cache) return cache;
      throw new Error("no matches");
    }
    return { matches, updatedAt: updatedAt || (cache && cache.updatedAt) || "", n: n };
  }

  function ymdOf(date) {
    return String(date || "").replace(/-/g, "");
  }

  function cleanScore(raw) {
    const m = String(raw || "").replace(/\s/g, "").match(/(\d+)[-:](\d+)/);
    return m ? m[1] + "-" + m[2] : "";
  }

  function hadOfScore(score) {
    const m = String(score || "").match(/^(\d+)-(\d+)$/);
    if (!m) return "";
    const h = Number(m[1]);
    const a = Number(m[2]);
    if (h > a) return "主";
    if (h < a) return "客";
    return "平";
  }

  function liveStateOf(st) {
    if (!st) return "ns";
    if (st.finished) return "ft";
    if (st.started || st.ongoing) return "live";
    return "ns";
  }

  function newsOf(m) {
    const bag = (global.CC_NEWS_CACHE && global.CC_NEWS_CACHE.bySlot) || {};
    if (m.slot && bag[m.slot]) return bag[m.slot];
    const same = (global.CC_RESULT && CC_RESULT.sameTeam) || ((a, b) => a === b);
    const code = String(m.slot || m.code || "").replace(/^周./, "");
    return Object.values(bag).find((x) => {
      if (same(x.home, m.home) && same(x.away, m.away)) return true;
      return code && String(x.slot || "").replace(/^周./, "") === code && same(x.home, m.home);
    }) || {};
  }

  async function fetchFotmobDay(ymd) {
    const url = "https://www.fotmob.com/api/data/matches?date=" + ymd;
    try {
      return await loadJson(url);
    } catch (e1) {
      try {
        return await loadJson("https://cors.eu.org/" + url);
      } catch (e2) {
        return loadJson("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
      }
    }
  }

  function indexFotmob(json, byId, byHome) {
    (json.leagues || []).forEach((lg) => {
      (lg.matches || []).forEach((row) => {
        const home = row.home || {};
        const away = row.away || {};
        const st = row.status || {};
        const score = cleanScore(st.scoreStr) || (home.score != null && away.score != null ? home.score + "-" + away.score : "");
        const item = {
          id: row.id,
          score: score,
          liveState: liveStateOf(st),
          liveMinute: String((st.liveTime && st.liveTime.short) || "").replace(/[\u200e\u200f]/g, ""),
        };
        if (row.id != null) byId[String(row.id)] = item;
        if (home.id != null) byHome[String(home.id)] = item;
      });
    });
  }

  function stampLive(m, hit) {
    if (!hit) return;
    const started = hit.liveState === "live" || hit.liveState === "ft";
    if (!started) {
      m.liveState = "ns";
      m.liveScore = "";
      m.liveMinute = "";
      if (global.CC_ODDS && CC_ODDS.scrubUnplayed) CC_ODDS.scrubUnplayed(m);
      if (hit.id) m.matchId = m.matchId || hit.id;
      return;
    }
    m.liveScore = hit.score || "";
    m.liveState = hit.liveState || "";
    m.liveMinute = hit.liveMinute || "";
    if (hit.htScore) m.htScore = hit.htScore;
    if (hit.liveState === "ft" && hit.score) {
      m.score = hit.score;
      m.result = m.result || hadOfScore(hit.score);
    }
    if (hit.id) m.matchId = m.matchId || hit.id;
  }

  function htFromDetails(json) {
    const events = ((((json || {}).content || {}).matchFacts || {}).events || {}).events || [];
    const half = events.find((e) => e && e.type === "Half" && (e.halfStrShort === "HT" || e.homeScore != null));
    if (half && half.homeScore != null && half.awayScore != null) return half.homeScore + "-" + half.awayScore;
    let h = 0;
    let a = 0;
    for (let i = 0; i < events.length; i += 1) {
      const e = events[i];
      if (!e) continue;
      if (e.type === "Half") break;
      if (e.type !== "Goal") continue;
      if (e.isHome) h += 1;
      else a += 1;
    }
    if (h || a) return h + "-" + a;
    return "";
  }

  async function fetchFotmobMatch(id) {
    const url = "https://www.fotmob.com/api/data/matchDetails?matchId=" + id;
    try {
      return await loadJson(url);
    } catch (e1) {
      try {
        return await loadJson("https://cors.eu.org/" + url);
      } catch (e2) {
        return loadJson("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
      }
    }
  }

  function scoreDays(list) {
    const days = {};
    (list || []).forEach((m) => {
      const ymd = ymdOf(m.date);
      if (ymd.length === 8) days[ymd] = true;
      if (/^0[0-9]:/.test(m.kickoff || "") && global.CC_ODDS && CC_ODDS.addDays) {
        const prev = ymdOf(CC_ODDS.addDays(m.date, -1));
        if (prev.length === 8) days[prev] = true;
      }
    });
    return Object.keys(days);
  }

  async function fillHalfScores(list, byId) {
    const need = (list || []).filter((m) => (m.score || m.liveState === "ft") && !m.htScore && (m.matchId || (newsOf(m).matchId)));
    for (let i = 0; i < need.length && i < 12; i += 1) {
      const m = need[i];
      const id = m.matchId || newsOf(m).matchId;
      if (!id) continue;
      try {
        const ht = htFromDetails(await fetchFotmobMatch(id));
        if (ht) {
          m.htScore = ht;
          if (byId[String(id)]) byId[String(id)].htScore = ht;
        }
      } catch (err) {
        // 半场比分源拦了就下一轮。
      }
    }
  }

  async function pullScores(matches) {
    const list = matches || [];
    const days = scoreDays(list);
    if (!days.length) return list;
    const byId = {};
    const byHome = {};
    for (let i = 0; i < days.length; i += 1) {
      try {
        indexFotmob(await fetchFotmobDay(days[i]), byId, byHome);
      } catch (err) {
        // 比分源偶发拦，下一轮再刷。
      }
    }
    list.forEach((m) => {
      const news = newsOf(m);
      const hit = (m.matchId && byId[String(m.matchId)]) || (news.matchId && byId[String(news.matchId)]);
      stampLive(m, hit);
    });
    await fillHalfScores(list, byId);
    return list;
  }

  function mapSfcRow(row) {
    return {
      code: String(row.matchNum || row.code || ""),
      league: row.matchName || row.league || "",
      home: row.masterTeamAllName || row.masterTeamName || row.home || "",
      away: row.guestTeamAllName || row.guestTeamName || row.away || "",
      date: String(row.startTime || row.date || "").slice(0, 10),
      kickoff: row.kickoff || "",
      had: row.had || { h: row.h || "", d: row.d || "", a: row.a || "" },
      hhad: {},
      ttg: {},
      hafu: {},
      crs: {},
      result: row.result || "",
    };
  }

  async function pullSfc() {
    try {
      const json = await loadJson(SFC_SRC);
      const sm = json && json.value && json.value.sfcMatch;
      const list = (sm && sm.matchList) || [];
      if (list.length) {
        return {
          draw: sm.lotteryDrawNum || "",
          end: sm.lotterySaleEndtime || "",
          matches: list.map(mapSfcRow),
          live: true,
          updatedAt: sm.lotterySaleEndtime || "",
        };
      }
    } catch (err) {
      // 体彩传统足彩偶发拦，用推上去的期次缓存。
    }
    const cache = global.CC_SFC_CACHE;
    if (!cache || !cache.matches) return { draw: "", matches: [], live: false };
    return { draw: cache.draw || "", end: cache.end || "", matches: cache.matches.slice(), live: false, updatedAt: cache.updatedAt || "" };
  }

  function shortLeague(name) {
    return String(name || "")
      .replace("J1联赛", "日职")
      .replace("J2联赛", "日乙")
      .replace("欧冠联赛", "欧冠")
      .replace("欧罗巴联赛", "欧罗巴")
      .replace("欧协联赛", "欧协");
  }

  function parseBjdcHtml(html) {
    const rows = [];
    const re = /<tr class="vs_lines[^"]*" style="display:" value="(\{[^"]+\})" fid="(\d+)">([\s\S]*?)<\/tr>/g;
    let hit;
    while ((hit = re.exec(html))) {
      const meta = {};
      String(hit[1]).replace(/(\w+):'([^']*)'/g, (_, k, v) => {
        meta[k] = v;
        return "";
      });
      if (meta.disabled === "yes") continue;
      const block = hit[3];
      const pjoz = [];
      const bdsp = [];
      block.replace(/class="sp_w35 eng pjoz">([\d.]+)/g, (_, v) => pjoz.push(v));
      block.replace(/class="sp_value eng(?: red)?">([\d.]+)/g, (_, v) => bdsp.push(v));
      const kick = (block.match(/title="比赛时间：([^"]+)"/) || [])[1];
      const line = meta.rangqiuNum || "0";
      rows.push({
        code: String(meta.index || "").padStart(3, "0"),
        league: shortLeague(meta.leagueName),
        home: meta.homeTeam || "",
        away: meta.guestTeam || "",
        date: String(meta.scheduleDate || "").slice(0, 10),
        kickoff: kick || String(meta.endTime || "").slice(11, 16),
        endTime: meta.endTime || "",
        fid: hit[2],
        had: { h: pjoz[0] || "", d: pjoz[1] || "", a: pjoz[2] || "" },
        hhad: { h: bdsp[0] || "", d: bdsp[1] || "", a: bdsp[2] || "", goalLine: line, goalLineValue: line },
      });
    }
    return rows;
  }

  async function fetchBjdcHtml() {
    try {
      return await loadText(BJDC_SRC);
    } catch (e1) {
      return loadText("https://cors.eu.org/" + BJDC_SRC);
    }
  }

  async function pullBjdc() {
    try {
      const html = await fetchBjdcHtml();
      const matches = parseBjdcHtml(html);
      if (matches.length) return { matches, live: true, updatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") };
    } catch (err) {
      // 500 无 CORS，用缓存。
    }
    const cache = global.CC_BJDC_CACHE;
    if (!cache || !cache.matches) return { matches: [], live: false };
    const matches = cache.matches.map((m) => ({
      code: m.code,
      league: shortLeague(m.league),
      home: m.home,
      away: m.away,
      date: m.date,
      kickoff: m.kickoff,
      endTime: m.endTime,
      fid: m.fid,
      had: m.had || {},
      hhad: m.hhad || {},
    }));
    return { matches, live: false, updatedAt: cache.updatedAt || "" };
  }

  global.CC_LIVE = { pull, pullSfc, pullBjdc, pullScores, n, shortLeague, matchKey, hadOfScore, getJson: loadJson, fetchFotmobDay };
})(window);
