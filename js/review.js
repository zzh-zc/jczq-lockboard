(function (global) {
  const STORE = "jczq-cc-ledger-v1";
  const DAYS = 30;
  const MIX = /日职|日乙|J1|J2|韩K|K联|澳超|芬超|瑞超|挪超|挪甲|美职|中甲/;
  const MID = /欧国联|英冠|欧罗巴|欧协|法乙|德乙/;
  const DRAWISH = /西甲/;
  const HIST_URL = "https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=90&provinceId=0&pageSize=30&pageNo=1";

  function today() {
    if (global.CC_ODDS && CC_ODDS.todayIso) return CC_ODDS.todayIso();
    const d = new Date();
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function addDays(iso, n) {
    if (global.CC_ODDS && CC_ODDS.addDays) return CC_ODDS.addDays(iso, n);
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function cutIso() {
    return addDays(today(), 1 - DAYS);
  }

  function inWindow(iso) {
    const d = String(iso || "");
    return d && d >= cutIso();
  }

  function keyOf(m) {
    return [(m.date || ""), (m.home || ""), (m.away || "")].join("|");
  }

  function envOf(league) {
    const g = String(league || "");
    if (MIX.test(g)) return "掺局区";
    if (MID.test(g)) return "中可信";
    return "高可信";
  }

  function weights() {
    return { mix: MIX, mid: MID, drawish: DRAWISH, singleMin: 1.85 };
  }

  function slim(m) {
    return {
      code: m.code || "",
      slot: m.slot || "",
      date: m.date || "",
      league: m.league || "",
      home: m.home || "",
      away: m.away || "",
      kickoff: m.kickoff || "",
      sp: m.sp || "",
      pick: m.pick || "",
      dual: !!m.dual,
      light: m.light || "",
      tag: m.tag || "",
      env: m.env || envOf(m.league),
      action: m.action || "",
      result: m.result || "",
      score: m.score || "",
      source: m.source || "lock",
    };
  }

  function readLedger() {
    try {
      const pack = JSON.parse(localStorage.getItem(STORE) || "null");
      const list = pack && Array.isArray(pack.matches) ? pack.matches : [];
      return list.filter((m) => m && inWindow(m.date));
    } catch {
      return [];
    }
  }

  function saveLedger(list) {
    const keep = (list || []).filter((m) => m && inWindow(m.date));
    try {
      localStorage.setItem(STORE, JSON.stringify({ at: Date.now(), cut: cutIso(), matches: keep }));
    } catch (err) {
      try {
        localStorage.setItem(STORE, JSON.stringify({ at: Date.now(), matches: keep.slice(-120) }));
      } catch (e2) { /* ignore */ }
    }
    return keep;
  }

  function seedLocks() {
    const out = [];
    const rev = (global.CC_DATA && CC_DATA.review && CC_DATA.review.matches) || [];
    rev.forEach((m) => {
      out.push(slim({
        date: (CC_DATA.review && CC_DATA.review.date) || m.date,
        league: m.league || "欧冠",
        home: m.home, away: m.away, code: m.code,
        pick: m.pick, dual: /\//.test(m.pick || ""),
        result: m.result, score: m.score, tag: "本台锁号",
        source: "lock", env: "高可信",
      }));
    });
    return out;
  }

  function mergeRow(map, row, lockPick) {
    const k = keyOf(row);
    if (!k || k === "||") return;
    const cur = map.get(k);
    if (!cur) {
      map.set(k, slim(row));
      return;
    }
    if (lockPick && row.pick && !cur.pick) cur.pick = row.pick;
    if (lockPick && row.pick && cur.source !== "lock") {
      cur.pick = row.pick;
      cur.dual = !!row.dual || /\//.test(row.pick);
      cur.sp = row.sp || cur.sp;
      cur.light = row.light || cur.light;
      cur.tag = row.tag || cur.tag;
      cur.env = row.env || cur.env;
      cur.source = "lock";
    }
    if (!cur.result && row.result) cur.result = row.result;
    if (!cur.score && row.score) cur.score = row.score;
    if (!cur.sp && row.sp) cur.sp = row.sp;
  }

  function ingest(list) {
    const map = new Map();
    seedLocks().concat(readLedger()).forEach((m) => mergeRow(map, m, true));
    (list || []).forEach((m) => mergeRow(map, m, true));
    ((((global.CC_DATA || {}).jczq || {}).matches) || []).forEach((m) => mergeRow(map, m, true));
    const scored = global.CC_RESULT && CC_RESULT.all ? CC_RESULT.all() : [];
    scored.forEach((m) => mergeRow(map, m, false));
    const next = [...map.values()].filter((m) => inWindow(m.date));
    saveLedger(next);
    return next;
  }

  function ledger() {
    const list = readLedger();
    if (list.length) return list;
    return ingest([]);
  }

  function hadHit(m) {
    if (global.CC_RESULT && CC_RESULT.hadHit) return CC_RESULT.hadHit(m);
    const p = String(m.pick || "");
    const r = m.result;
    if (r === "主" || r === "胜") return /主|胜/.test(p);
    if (r === "客" || r === "负") return /客|负/.test(p);
    if (r === "平") return /平/.test(p);
    return false;
  }

  function ours() {
    return ledger().filter((m) => m.pick && (m.result || m.score) && m.source !== "sfc-history");
  }

  function monthPack() {
    return global.CC_REVIEW_CACHE || { matches: [], policies: [], leagues: [], envs: [], n: 0 };
  }

  function bagStat(list, keyFn) {
    const bag = {};
    list.forEach((m) => {
      const k = keyFn(m);
      bag[k] = bag[k] || { n: 0, hit: 0 };
      bag[k].n += 1;
      if (hadHit(m)) bag[k].hit += 1;
    });
    return bag;
  }

  function pct(a, b) {
    return b ? Math.round((a / b) * 1000) / 10 : 0;
  }

  function stats() {
    const done = ours();
    const duals = done.filter((m) => m.dual || /\//.test(m.pick || ""));
    const singles = done.filter((m) => !(m.dual || /\//.test(m.pick || "")));
    const hit = done.filter(hadHit);
    const month = monthPack();
    return {
      oursN: done.length,
      oursHit: hit.length,
      oursPct: pct(hit.length, done.length),
      dualN: duals.length,
      dualHit: duals.filter(hadHit).length,
      dualPct: pct(duals.filter(hadHit).length, duals.length),
      singleN: singles.length,
      singleHit: singles.filter(hadHit).length,
      singlePct: pct(singles.filter(hadHit).length, singles.length),
      byEnv: bagStat(done, (m) => m.env || envOf(m.league)),
      byLight: bagStat(done, (m) => m.light || "unknown"),
      month: month,
    };
  }

  function insights() {
    const st = stats();
    const lines = [];
    const month = st.month || {};
    const pol = {};
    (month.policies || []).forEach((p) => { pol[p.label] = p; });
    if (month.n) {
      lines.push("近一个月胜负彩样本 " + month.n + " 场。主不败 " + (pol["主不败31"] && pol["主不败31"].pct) + "%，单主只有 " + (pol["单主"] && pol["单主"].pct) + "%。单边不够当死胆。");
    }
    (month.envs || []).forEach((e) => {
      if (e.env === "高可信") lines.push("高可信（五大联赛+欧冠）主不败 " + e.undefeatedH + "%（n=" + e.n + "），可以跟不败双选。");
      if (e.env === "中可信") lines.push("中可信（欧国联/英冠/欧罗巴这档）主不败只有 " + e.undefeatedH + "%，客胜 " + e.away + "%。不当高可信单出。");
    });
    const xh = (month.leagues || []).find((x) => x.league === "西甲");
    if (xh && xh.n >= 8) lines.push("西甲这月平局 " + xh.draw + "%。主热也先带平，不单出。");
    const uc = (month.leagues || []).find((x) => x.league === "欧冠");
    if (uc) lines.push("欧冠主胜 " + uc.home + "%、平只有 " + uc.draw + "%。深盘仍禁止死胆，但平不是这月的主矛盾。");
    lines.push("对开改锁不败（主/平或平/客），不再主推更短的客。");
    if (st.oursN < 12) lines.push("本台有赛果的锁号 " + st.oursN + " 场，样本不够，只描述不改阈值。不败命中 " + st.oursHit + "/" + st.oursN + "。");
    else lines.push("本台锁号不败 " + st.oursHit + "/" + st.oursN + "（" + st.oursPct + "%）。双选 " + st.dualHit + "/" + st.dualN + "，单选 " + st.singleHit + "/" + st.singleN + "。");
    return lines;
  }

  function dates() {
    const set = new Set();
    ledger().forEach((m) => { if (m.date) set.add(m.date); });
    (monthPack().matches || []).forEach((m) => { if (m.date && inWindow(m.date)) set.add(m.date); });
    const have = [...set].sort();
    return have.length ? have : [today()];
  }

  function dayRows(date) {
    const locks = ledger().filter((m) => m.date === date && m.pick);
    if (locks.length) return locks;
    return (monthPack().matches || []).filter((m) => m.date === date);
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[c]));
  }

  function summaryHtml() {
    const st = stats();
    const month = st.month || {};
    const pol = {};
    (month.policies || []).forEach((p) => { pol[p.label] = p; });
    const cards = [
      { k: "本台不败", v: st.oursN ? st.oursHit + "/" + st.oursN : "—", s: st.oursPct ? st.oursPct + "%" : "样本少" },
      { k: "本台双选", v: st.dualN ? st.dualHit + "/" + st.dualN : "—", s: st.dualPct ? st.dualPct + "%" : "" },
      { k: "月样本主不败", v: (pol["主不败31"] && pol["主不败31"].pct != null) ? pol["主不败31"].pct + "%" : "—", s: month.n ? month.n + "场胜负彩" : "" },
      { k: "月样本单主", v: (pol["单主"] && pol["单主"].pct != null) ? pol["单主"].pct + "%" : "—", s: "不够当死胆" },
    ];
    const lis = insights().map((t) => "<li>" + esc(t) + "</li>").join("");
    return `
      <div class="shop-rev">
        <b>每日复盘 · 近一个月样本进模型</b>
        <div class="shop-rev-grid">${cards.map((c) => `<div class="shop-rev-card"><span>${esc(c.k)}</span><strong>${esc(c.v)}</strong><em>${esc(c.s)}</em></div>`).join("")}</div>
        <ul>${lis}</ul>
      </div>
    `;
  }

  function flattenHistory(json) {
    const draws = ((json && json.value && json.value.list) || []).filter((d) => d.lotteryDrawResult);
    const matches = [];
    draws.forEach((d) => {
      (d.matchList || []).forEach((row) => {
        const date = String(row.startTime || "").slice(0, 10);
        if (!inWindow(date)) return;
        const result = row.result === "3" ? "主" : row.result === "0" ? "客" : row.result === "1" ? "平" : "";
        if (!result) return;
        matches.push({
          draw: d.lotteryDrawNum,
          date,
          league: row.matchName || "",
          home: row.masterTeamAllName || row.masterTeamName || "",
          away: row.guestTeamAllName || row.guestTeamName || "",
          score: String(row.czScore || "").replace(":", "-"),
          result,
          result310: String(row.result || ""),
          source: "sfc-history",
        });
      });
    });
    return { draws: draws.map((d) => d.lotteryDrawNum), matches };
  }

  function rateMonth(matches) {
    const hitPick = (pick, result) => {
      if (result === "主") return /主/.test(pick);
      if (result === "客") return /客/.test(pick);
      if (result === "平") return /平/.test(pick);
      return false;
    };
    const rate = (label, pick) => {
      let n = 0; let hit = 0;
      matches.forEach((m) => { n += 1; if (hitPick(pick, m.result)) hit += 1; });
      return { label, n, hit, pct: pct(hit, n) };
    };
    const byLeague = {};
    const byEnv = {};
    matches.forEach((m) => {
      const lg = m.league || "其他";
      const env = envOf(m.league);
      byLeague[lg] = byLeague[lg] || { n: 0, home: 0, draw: 0, away: 0, undefeatedH: 0 };
      byEnv[env] = byEnv[env] || { n: 0, home: 0, draw: 0, away: 0, undefeatedH: 0 };
      [byLeague[lg], byEnv[env]].forEach((b) => {
        b.n += 1;
        if (m.result === "主") b.home += 1;
        if (m.result === "平") b.draw += 1;
        if (m.result === "客") b.away += 1;
        if (m.result === "主" || m.result === "平") b.undefeatedH += 1;
      });
    });
    const row = (obj, key, name) => Object.keys(obj).map((k) => ({
      [name]: k, n: obj[k].n,
      home: pct(obj[k].home, obj[k].n),
      draw: pct(obj[k].draw, obj[k].n),
      away: pct(obj[k].away, obj[k].n),
      undefeatedH: pct(obj[k].undefeatedH, obj[k].n),
    })).sort((a, b) => b.n - a.n);
    return {
      at: today(),
      cut: cutIso(),
      n: matches.length,
      policies: [
        rate("单主", "主"), rate("单客", "客"), rate("单平", "平"),
        rate("主不败31", "主/平"), rate("客不败10", "平/客"), rate("胜负30", "主/客"),
      ],
      leagues: row(byLeague, 0, "league"),
      envs: row(byEnv, 0, "env"),
      matches,
    };
  }

  async function pullMonth() {
    if (!global.CC_LIVE || !CC_LIVE.getJson) return monthPack();
    try {
      const json = await CC_LIVE.getJson(HIST_URL);
      const flat = flattenHistory(json);
      if (flat.matches.length) {
        global.CC_REVIEW_CACHE = rateMonth(flat.matches);
        global.CC_REVIEW_CACHE.draws = flat.draws;
      }
    } catch (err) {
      // 体彩历史偶发拦，用推上去的月样本。
    }
    ingest([]);
    return monthPack();
  }

  global.CC_REVIEW = {
    DAYS, envOf, weights, ingest, ledger, ours, stats, insights,
    dates, dayRows, summaryHtml, pullMonth, monthPack,
  };
})(window);
