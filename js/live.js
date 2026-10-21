(function (global) {
  const SRC = "https://webapi.sporttery.cn/gateway/jc/football/getMatchCalculatorV1.qry?poolCode=had,hhad,ttg&channel=c";

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

  function mapOne(m) {
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
      matchId: m.matchId,
    };
  }

  async function pull() {
    const res = await fetch(SRC, { cache: "no-store" });
    if (!res.ok) throw new Error("sporttery " + res.status);
    const json = await res.json();
    if (!json.success || !json.value) throw new Error("empty");
    const matches = [];
    (json.value.matchInfoList || []).forEach((day) => {
      (day.subMatchList || []).forEach((row) => {
        if (!row.had || !n(row.had.h) || !n(row.had.d) || !n(row.had.a)) return;
        if (row.matchStatus && /Cancel|Paused/i.test(row.matchStatus)) return;
        matches.push(mapOne(row));
      });
    });
    if (!matches.length) throw new Error("no matches");
    return { matches, updatedAt: json.value.lastUpdateTime || "", n: n };
  }

  global.CC_LIVE = { pull, n };
})(window);
