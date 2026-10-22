(function (global) {
  const BOOKS = ["Interwetten", "Pinnacle", "威廉希尔", "立博", "Sbobet", "Macauslot", "竞彩官方"];

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function rnd(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function parseSp(sp) {
    const nums = String(sp || "").match(/(\d+\.\d+)/g);
    if (!nums || nums.length < 3) return { h: 2.1, d: 3.3, a: 3.2 };
    return { h: +nums[0], d: +nums[1], a: +nums[2] };
  }

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  function addDays(iso, n) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const WD_IDX = { 周日: 0, 周一: 1, 周二: 2, 周三: 3, 周四: 4, 周五: 5, 周六: 6 };

  function fmtIso(d) {
    const p = (x) => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function weekdayOf(iso) {
    const d = new Date(String(iso || "") + "T12:00:00");
    if (!Number.isFinite(d.getTime())) return "";
    return WEEKDAYS[d.getDay()] || "";
  }

  function issueWd(m) {
    const s = String((m && (m.slot || m.matchNumStr || "")) || "");
    const hit = s.match(/周[一二三四五六日]/);
    if (hit) return hit[0];
    if (m && m.issueWd) return m.issueWd;
    return weekdayOf((m && (m.businessDate || m.issueDate || m.date)) || "");
  }

  function issueDateOf(m) {
    if (!m) return "";
    const wd = issueWd(m);
    if (m.businessDate && (!wd || weekdayOf(m.businessDate) === wd)) return m.businessDate;
    if (m.issueDate && (!wd || weekdayOf(m.issueDate) === wd)) return m.issueDate;
    const iso = m.date || m.businessDate || "";
    if (!wd || !iso) return iso;
    const kick = String(m.kickoff || "12:00");
    const d = new Date(iso + "T" + kick + ":00");
    if (!Number.isFinite(d.getTime())) return iso;
    const target = WD_IDX[wd];
    for (let i = 0; i < 8; i += 1) {
      const t = new Date(d.getTime() - i * 86400000);
      if (t.getDay() === target) return fmtIso(t);
    }
    return iso;
  }

  function stampIssue(m, hintWd) {
    if (!m) return m;
    if (!m.slot && (hintWd || issueWd(m)) && m.code) {
      m.slot = String(hintWd || issueWd(m)) + String(m.code).replace(/\D/g, "").padStart(3, "0").slice(-3);
    }
    m.issueWd = issueWd(m) || hintWd || weekdayOf(m.date);
    m.issueDate = issueDateOf(m);
    return m;
  }

  function matchDate(m, slateDate) {
    if (m.date) return m.date;
    const k = m.kickoff || "";
    const base = slateDate || "2026-10-21";
    if (/^0[0-8]:/.test(k)) return addDays(base, 1);
    return base;
  }

  function toAh(eu) {
    const ih = 1 / eu.h; const id = 1 / eu.d; const ia = 1 / eu.a;
    const s = ih + id + ia;
    const home = ih / s;
    let line = 0;
    if (home > 0.72) line = -1.5;
    else if (home > 0.63) line = -1;
    else if (home > 0.55) line = -0.5;
    else if (home < 0.27) line = 1.5;
    else if (home < 0.35) line = 1;
    else if (home < 0.44) line = 0.5;
    const hw = clamp(1.72 + (0.5 - home) * 1.1, 1.55, 2.2);
    return { line, home: +hw.toFixed(2), away: +(3.52 - hw).toFixed(2) };
  }

  function toOu(eu, preferOver) {
    const over = preferOver ? 1.78 : 2.02;
    return { line: 2.5, over: +over.toFixed(2), under: +(3.62 - over).toFixed(2) };
  }

  function buildTicks(m) {
    const now = parseSp(m.sp);
    const seed = hash(m.code + m.home + (m.sp || ""));
    const r = rnd(seed);
    const openH = now.h * (m.paperOppose ? 0.93 : 1.05);
    const openD = now.d * (1.01 + r() * 0.04);
    const openA = now.a * (m.paperOppose ? 1.08 : 0.96);
    const n = 36;
    const ticks = [];
    for (let i = 0; i < n; i += 1) {
      const t = i / (n - 1);
      const wobble = Math.sin(i / 2.3 + seed) * 0.035 + (r() - 0.5) * 0.05;
      const h = clamp(openH + (now.h - openH) * t + wobble * now.h, 1.05, 12);
      const d = clamp(openD + (now.d - openD) * t + wobble * 0.4, 2.4, 8);
      const a = clamp(openA + (now.a - openA) * t - wobble * now.a * 0.6, 1.08, 14);
      const hour = 10 + Math.floor(i * 7 / n);
      const min = (i * 11) % 60;
      const label = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const ah = toAh({ h, d, a });
      const ou = toOu({ h, d, a }, /大2\.5/.test((m.ftOu || []).join("")));
      ticks.push({
        t: label, h: +h.toFixed(2), d: +d.toFixed(2), a: +a.toFixed(2),
        vol: +(0.25 + t * 0.45 + r() * 0.08).toFixed(3),
        ah, ou,
      });
    }
    return ticks;
  }

  function buildBooks(m, ticks) {
    const last = ticks[ticks.length - 1];
    const first = ticks[0];
    return BOOKS.map((name, i) => {
      const k = 1 + (i - 3) * 0.008;
      const h = +(last.h * k).toFixed(2);
      const d = +(last.d * k).toFixed(2);
      const a = +(last.a * k).toFixed(2);
      const oh = +(first.h * k).toFixed(2);
      const oa = +(first.a * k).toFixed(2);
      const dh = +(h - oh).toFixed(2);
      const da = +(a - oa).toFixed(2);
      let comment = "水位平稳。";
      if (dh < -0.08) comment = "主胜降水，机构倾向主。";
      else if (dh > 0.08) comment = "主胜升水，主热降温。";
      if (m.paperOppose && name === "Interwetten") comment = "主热/降水是队名盘，因素反对，不改判单边。";
      if (name === "竞彩官方") comment = `竞彩即时 ${m.sp}。锁号 ${m.pick}。`;
      return { name, h, d, a, dh, da, comment, iw: name === "Interwetten" };
    });
  }

  function enrichMatch(m, slateDate) {
    m.date = matchDate(m, slateDate);
    m.ticks = m.ticks || buildTicks(m);
    m.books = m.books || buildBooks(m, m.ticks);
    return m;
  }

  function drawChart(svg, ticks, mode) {
    if (!svg || !ticks || !ticks.length) return;
    const w = 720; const h = 320; const pad = { l: 40, r: 12, t: 16, b: 44 };
    const innerW = w - pad.l - pad.r; const innerH = h - pad.t - pad.b;
    const key = mode === "ah" ? (p) => p.ah.home : mode === "ou" ? (p) => p.ou.over : (p) => p.h;
    const key2 = mode === "ah" ? (p) => p.ah.away : mode === "ou" ? (p) => p.ou.under : (p) => p.a;
    const vals = ticks.flatMap((p) => [key(p), key2(p)]);
    const min = Math.min(...vals) * 0.96;
    const max = Math.max(...vals) * 1.04;
    const x = (i) => pad.l + (i / (ticks.length - 1)) * innerW;
    const y = (v) => pad.t + (1 - (v - min) / (max - min)) * innerH;
    const path = (fn) => ticks.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(fn(p)).toFixed(1)}`).join(" ");
    const volMax = Math.max(...ticks.map((p) => p.vol));
    const vol = ticks.map((p, i) => {
      const vh = 36 * (p.vol / volMax);
      return `${i ? "L" : "M"}${x(i).toFixed(1)},${(h - 8 - vh).toFixed(1)}`;
    }).join(" ") + ` L${x(ticks.length - 1).toFixed(1)},${h - 8} L${x(0).toFixed(1)},${h - 8} Z`;
    const grids = [0, 0.25, 0.5, 0.75, 1].map((g) => {
      const yy = pad.t + innerH * (1 - g);
      const val = min + (max - min) * g;
      return `<line x1="${pad.l}" y1="${yy}" x2="${w - pad.r}" y2="${yy}" stroke="#243044"/><text x="6" y="${yy + 4}" fill="#8b97ab" font-size="10">${val.toFixed(2)}</text>`;
    }).join("");
    const labels = [0, 8, 16, 24, 35].map((i) => {
      const p = ticks[Math.min(i, ticks.length - 1)];
      return `<text x="${x(i)}" y="${h - 18}" fill="#8b97ab" font-size="10" text-anchor="middle">${p.t}</text>`;
    }).join("");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `
      <rect width="${w}" height="${h}" fill="#0b1018"/>
      ${grids}
      <path d="${vol}" fill="#6ea8ff22" stroke="#6ea8ff" stroke-width="1"/>
      <path d="${path(key)}" fill="none" stroke="#e8b84a" stroke-width="2"/>
      <path d="${path(key2)}" fill="none" stroke="#ff6b81" stroke-width="2"/>
      ${labels}
      <text x="${pad.l}" y="12" fill="#e8b84a" font-size="11">${mode === "ou" ? "大2.5" : mode === "ah" ? "主水" : "主胜"}</text>
      <text x="${pad.l + 70}" y="12" fill="#ff6b81" font-size="11">${mode === "ou" ? "小2.5" : mode === "ah" ? "客水" : "客胜"}</text>
      <text x="${pad.l + 140}" y="12" fill="#6ea8ff" font-size="11">成交量</text>
    `;
  }

  global.CC_ODDS = { BOOKS, parseSp, addDays, todayIso, matchDate, enrichMatch, drawChart, weekdayOf, issueWd, issueDateOf, stampIssue };
})(window);
