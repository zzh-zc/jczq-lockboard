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
    return {
      code: codeOf(m),
      league: m.leagueAbbName || m.leagueAllName || "",
      home: m.homeTeamAbbName || m.homeTeamAllName || "",
      away: m.awayTeamAbbName || m.awayTeamAllName || "",
      date: m.matchDate || m.businessDate || "",
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

  async function pull() {
    const json = await loadJson(JC_SRC);
    if (!json.success || !json.value) throw new Error("empty");
    const matches = [];
    (json.value.matchInfoList || []).forEach((day) => {
      (day.subMatchList || []).forEach((row) => {
        if (!row.had || !n(row.had.h) || !n(row.had.d) || !n(row.had.a)) return;
        if (row.matchStatus && /Cancel|Paused/i.test(row.matchStatus)) return;
        matches.push(mapJc(row));
      });
    });
    if (!matches.length) throw new Error("no matches");
    return { matches, updatedAt: json.value.lastUpdateTime || "", n: n };
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

  global.CC_LIVE = { pull, pullSfc, pullBjdc, n, shortLeague };
})(window);
