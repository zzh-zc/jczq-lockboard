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
      hit: m.hit,
    };
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

  function hitOf(pick, result) {
    const p = String(pick || "");
    if (result === "主" || result === "胜") return /主|让胜|(^|\/)胜(\/|$)/.test(p);
    if (result === "客" || result === "负") return /客|让负|(^|\/)负(\/|$)/.test(p);
    if (result === "平") return /平/.test(p);
    return false;
  }

  function attachList(list) {
    (list || []).forEach((m) => {
      const hit = lookup(m);
      if (hit) {
        m.score = m.score || hit.score;
        m.result = m.result || hit.result;
      }
      if (m.pick && m.result && m.hit == null) m.hit = hitOf(m.pick, m.result);
    });
  }

  global.CC_RESULT = { all, search, lookup, attachList, hitOf };
})(window);
