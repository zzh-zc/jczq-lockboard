(function (global) {
  function core(s) {
    return String(s || "").replace(/FC|RB|AFC|竞技|\s/g, "");
  }

  function sameTeam(a, b) {
    const x = core(a);
    const y = core(b);
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
      hit: m.hit,
    };
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
      const key = [row.date, row.home, row.away, row.score].join("|");
      if (!row.score && !row.result) return;
      if (seen[key]) return;
      seen[key] = true;
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

  function lookup(m) {
    if (!m) return null;
    return all().find((r) => r.date === m.date && sameTeam(r.home, m.home) && sameTeam(r.away, m.away)) || null;
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

  function hafuHit(m) {
    const ht = parseScore(m && (m.htScore || m.halfScore));
    const ft = parseScore(m && m.score);
    if (!ht || !ft) return null;
    const side = (h, a) => (h > a ? "胜" : h < a ? "负" : "平");
    const lab = side(ht.h, ht.a) + side(ft.h, ft.a);
    const picks = m.hafuPicks || m.htScores || [];
    if (!picks.length) return null;
    return picks.some((p) => String(p).replace(/\s/g, "") === lab);
  }

  function chips(m) {
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
      const hit = lookup(m);
      if (hit) {
        m.score = m.score || hit.score;
        m.result = m.result || hit.result;
      }
      scrubGhost(m);
      reviewOf(m);
    });
  }

  global.CC_RESULT = { all, search, lookup, attachList, hitOf, hitAny, hadHit, ttgHit, crsHit, hafuHit, chips, parseScore, resultOf, isGhostMarkets };
})(window);
