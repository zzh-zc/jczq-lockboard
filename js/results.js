(function (global) {
  const ALIAS = [
    [/皇家马德里|皇马/, "皇马"],
    [/莱比锡红牛|莱红牛|莱比锡/, "莱比锡"],
    [/曼彻斯特联|曼联/, "曼联"],
    [/曼彻斯特城|曼城/, "曼城"],
    [/巴黎圣日耳曼|巴黎圣日尔曼|巴黎/, "巴黎"],
    [/巴塞罗那|巴萨/, "巴萨"],
    [/拜仁慕尼黑|拜仁/, "拜仁"],
    [/加拉塔萨雷|加拉塔萨/, "加拉塔萨"],
    [/布拉迪斯拉发/, "布拉迪"],
    [/弗鲁米嫩塞|弗鲁米嫩/, "弗鲁米嫩"],
    [/马德里竞技|马竞/, "马竞"],
    [/阿斯顿维拉|维拉/, "维拉"],
    [/博德闪耀/, "博德"],
    [/里斯本竞技/, "里斯本"],
    [/LASK林茨|林茨/, "林茨"],
    [/帕尔梅拉斯|帕梅拉斯/, "帕梅拉斯"],
    [/比利亚雷亚尔|黄潜/, "黄潜"],
    [/雅典AEK|AEK/, "AEK"],
    [/皇家贝蒂斯|贝蒂斯/, "贝蒂斯"],
    [/皇家社会/, "社会"],
    [/国际米兰|国米/, "国米"],
    [/勒沃库森/, "药厂"],
    [/OFI克里特|克里特/, "克里特"],
    [/格拉茨风暴|格风暴/, "风暴"],
    [/萨格勒布迪纳摩|萨迪纳摩/, "萨格勒布"],
    [/波兹南莱赫|波兹南/, "波兹南"],
    [/贝西克塔斯|贝西克塔/, "贝西克塔"],
    [/利勒斯特罗姆|利勒斯特/, "利勒斯特"],
    [/维戈塞尔塔|塞尔塔/, "塞尔塔"],
    [/亚拉腊|阿拉拉特亚美尼亚|阿拉拉特/, "亚拉腊"],
    [/比亚韦斯托克|乔治罗尼亚/, "比亚韦"],
    [/拉普拉塔大学生|拉普大学/, "拉普"],
    [/沃尔夫斯堡|沃夫斯堡/, "沃夫斯堡"],
    [/埃尔夫斯堡|埃夫斯堡/, "埃夫斯堡"],
    [/赫拉克勒斯|赫拉克勒/, "赫拉克勒"],
    [/伊普斯维奇|伊普斯/, "伊普斯"],
    [/诺丁汉森林|诺丁汉/, "诺丁汉"],
    [/米德尔斯堡|米堡/, "米堡"],
    [/前进之鹰/, "前进之鹰"],
    [/特尔斯达|特尔斯塔/, "特尔斯达"],
    [/布里斯班咆哮|布里斯班/, "布里斯班"],
    [/珀斯光荣|珀斯/, "珀斯"],
    [/吉马良斯|维多利亚吉马良斯/, "吉马良斯"],
    [/马里迪莫/, "马里迪莫"],
  ];

  function core(s) {
    return String(s || "").replace(/FC|RB|AFC|竞技|\s/g, "");
  }

  function teamKey(s) {
    const raw = String(s || "");
    const hit = ALIAS.find((row) => row[0].test(raw));
    if (hit) return hit[1];
    return core(raw);
  }

  function sameTeam(a, b) {
    const x = teamKey(a);
    const y = teamKey(b);
    return x && y && (x === y || x.includes(y) || y.includes(x));
  }

  function fromCache() {
    return ((global.CC_RESULT_CACHE || {}).matches || []).slice();
  }

  function fromSlates() {
    const out = [];
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      ((((global.CC_DATA || {})[key] || {}).matches) || []).forEach((m) => {
        if (m && (m.score || m.result)) out.push(m);
      });
    });
    return out;
  }

  function stamp(m) {
    return {
      code: m.code || "",
      slot: m.slot || "",
      league: m.league || "",
      home: m.home || "",
      away: m.away || "",
      date: m.date || "",
      issueDate: m.issueDate || "",
      kickoff: m.kickoff || "",
      score: m.score || "",
      result: m.result || "",
      pick: m.pick || "",
      hadPicks: m.hadPicks,
      ttgPicks: m.ttgPicks,
      ftOu: m.ftOu,
      ftScores: m.ftScores,
      hafuPicks: m.hafuPicks,
      htScores: m.htScores,
      htScore: m.htScore || m.halfScore,
      matchId: m.matchId,
      hit: m.hit,
    };
  }

  function slotCode(s) {
    const hit = String(s || "").match(/(\d{3,4})$/);
    return hit ? hit[1] : String(s || "");
  }

  function nearDay(a, b) {
    const da = String((a && (a.issueDate || a.date)) || "");
    const db = String((b && (b.issueDate || b.date)) || "");
    if (!da || !db) return true;
    if (da === db) return true;
    const t = (s) => Date.parse(s + "T12:00:00");
    return Math.abs(t(da) - t(db)) <= 36 * 3600 * 1000;
  }

  function isGhostMarkets(m) {
    const nums = (m.ttgPicks || m.ftOu || []).map((x) => Number(String(x).replace(/[^\d]/g, ""))).filter((n) => Number.isFinite(n));
    const scores = (m.ftScores || []).map(parseScore).filter(Boolean);
    if (nums.length < 2 || scores.length < 2) return false;
    return scores.every((s) => nums.indexOf(s.tot) < 0);
  }

  function scrubGhost(m) {
    if (!m || (!m.score && !m.result) || !isGhostMarkets(m)) return;
    m.ttgPicks = [];
    m.ftOu = [];
    m.ftScores = [];
  }

  function all() {
    const seen = {};
    const out = [];
    fromCache().concat(fromSlates()).forEach((m) => {
      const row = stamp(m);
      const key = [teamKey(row.home), teamKey(row.away), row.score || row.result].join("|");
      if (!row.score && !row.result) return;
      if (seen[key]) {
        if (!seen[key].htScore && row.htScore) seen[key].htScore = row.htScore;
        return;
      }
      seen[key] = row;
      out.push(row);
    });
    out.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.code).localeCompare(String(b.code)));
    return out;
  }

  function search(q, date) {
    const needle = String(q || "").trim().toLowerCase();
    return all().filter((m) => {
      if (date && m.date !== date) return false;
      if (!needle) return true;
      const hay = `${m.code}${m.slot}${m.league}${m.home}${m.away}${m.score}${m.result}`.toLowerCase();
      return hay.indexOf(needle) >= 0;
    });
  }

  function sameIssue(a, b) {
    const da = String((a && (a.issueDate || a.date)) || "");
    const db = String((b && (b.issueDate || b.date)) || "");
    return !!(da && db && da === db);
  }

  function lookup(m) {
    if (!m) return null;
    const list = all();
    const code = slotCode(m.slot || m.code);
    const slotHit = code && list.find((r) => slotCode(r.slot || r.code) === code && sameTeam(r.home, m.home) && sameTeam(r.away, m.away) && sameIssue(r, m));
    if (slotHit) return slotHit;
    return list.find((r) => sameTeam(r.home, m.home) && sameTeam(r.away, m.away) && sameIssue(r, m)) || null;
  }

  function parseScore(s) {
    const hit = String(s || "").replace(/：/g, ":").replace(/-/g, ":").match(/(\d+)\s*:\s*(\d+)/);
    if (!hit) return null;
    return { h: +hit[1], a: +hit[2], tot: +hit[1] + +hit[2], lab: hit[1] + "-" + hit[2] };
  }

  function resultOf(m) {
    const r = m && m.result;
    if (r === "主" || r === "胜" || r === "客" || r === "负" || r === "平") return r;
    const sc = parseScore(m && m.score);
    if (!sc) return "";
    if (sc.h > sc.a) return "主";
    if (sc.h < sc.a) return "客";
    return "平";
  }

  function hitOf(pick, result) {
    const p = String(pick || "");
    if (result === "主" || result === "胜") return /主|让胜|(^|\/)胜(\/|$)/.test(p);
    if (result === "客" || result === "负") return /客|让负|(^|\/)负(\/|$)/.test(p);
    if (result === "平") return /平/.test(p);
    return false;
  }

  function hadHit(m) {
    const pick = (m && m.pick) || ((m && m.hadPicks) || []).join("/");
    return hitOf(pick, resultOf(m));
  }

  function ttgHit(m) {
    const sc = parseScore(m && m.score);
    if (!sc) return false;
    return ((m.ttgPicks || m.ftOu || []).map(String)).some((p) => {
      if (/7\+|7球/.test(p) && sc.tot >= 7) return true;
      const n = Number(String(p).replace(/[^\d]/g, ""));
      return n === sc.tot;
    });
  }

  function crsHit(m) {
    const sc = parseScore(m && m.score);
    if (!sc) return false;
    return (m.ftScores || []).some((x) => {
      const p = parseScore(String(x).replace(/-/g, ":"));
      return p && p.h === sc.h && p.a === sc.a;
    });
  }

  function hafuNorm(p) {
    const s = String(p || "").replace(/\s/g, "").replace(/[\/\-]/g, "");
    const pair = s.match(/[胜平负]{2}/);
    return pair ? pair[0] : s;
  }

  function hafuHit(m) {
    const picks = (m.hafuPicks || m.htScores || []).map(hafuNorm).filter((p) => /[胜平负]{2}/.test(p));
    if (!picks.length) return null;
    const ft = parseScore(m && m.score);
    const ftSide = ft ? (ft.h > ft.a ? "胜" : ft.h < ft.a ? "负" : "平") : (resultOf(m) === "主" ? "胜" : resultOf(m) === "客" ? "负" : resultOf(m) === "平" ? "平" : "");
    const ht = parseScore(m && (m.htScore || m.halfScore));
    if (ht && ft) {
      const lab = (ht.h > ht.a ? "胜" : ht.h < ht.a ? "负" : "平") + (ft.h > ft.a ? "胜" : ft.h < ft.a ? "负" : "平");
      return picks.some((p) => p === lab);
    }
    if (ftSide && picks.every((p) => p.slice(-1) !== ftSide)) return false;
    return null;
  }

  function chips(m) {
    if (global.CC_ODDS && CC_ODDS.kickedOff && !CC_ODDS.kickedOff(m) && m.liveState !== "live") {
      return { had: null, ttg: null, crs: null, hafu: null };
    }
    if (!m || (!m.result && !m.score)) return { had: null, ttg: null, crs: null, hafu: null };
    const hasTtg = ((m.ttgPicks || m.ftOu || []).length > 0);
    const hasCrs = ((m.ftScores || []).length > 0);
    return {
      had: (m.pick || (m.hadPicks && m.hadPicks.length)) ? hadHit(m) : null,
      ttg: hasTtg ? ttgHit(m) : null,
      crs: hasCrs ? crsHit(m) : null,
      hafu: hafuHit(m),
    };
  }

  function hitAny(m) {
    if (!m || (!m.result && !m.score)) return null;
    const hasPick = m.pick || (m.hadPicks && m.hadPicks.length) || (m.ftScores && m.ftScores.length) || (m.ttgPicks && m.ttgPicks.length);
    if (!hasPick) return null;
    return !!(hadHit(m) || ttgHit(m) || crsHit(m) || hafuHit(m) === true);
  }

  function reviewOf(m) {
    if (!m.score && !m.result) return;
    const any = hitAny(m);
    if (any != null) m.hit = any;
    if (m.review) {
      m.tag = m.hit ? "复盘中" : "复盘挂";
      return;
    }
    const bits = [];
    if (hadHit(m)) bits.push("胜平负中");
    if (ttgHit(m)) bits.push("进球中");
    if (crsHit(m)) bits.push("比分中");
    m.review = bits.length ? bits.join("、") : "全挂";
    m.tag = m.hit ? "复盘中" : "复盘挂";
    m.summary = [m.review, "赛果 " + (m.score || "") + " " + (m.result || "")].join("。") + "。";
  }

  function attachList(list) {
    (list || []).forEach((m) => {
      if (global.CC_ODDS && CC_ODDS.scrubUnplayed) CC_ODDS.scrubUnplayed(m);
      if (global.CC_ODDS && CC_ODDS.kickedOff && !CC_ODDS.kickedOff(m) && m.liveState !== "live") return;
      const hit = lookup(m);
      if (hit) {
        m.score = m.score || hit.score;
        m.result = m.result || hit.result;
        m.htScore = m.htScore || hit.htScore || hit.halfScore;
        m.matchId = m.matchId || hit.matchId;
      }
      scrubGhost(m);
      reviewOf(m);
    });
  }

  global.CC_RESULT = { all, search, lookup, attachList, hitOf, hitAny, hadHit, ttgHit, crsHit, hafuHit, chips, parseScore, resultOf, isGhostMarkets, sameTeam, teamKey };
})(window);
