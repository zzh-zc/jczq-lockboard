(function () {
  const STORE = "jczq-cc-custom-v1";
  const TODAY = window.CC_ODDS ? CC_ODDS.todayIso() : "2026-10-21";
  const phoneMq = window.matchMedia("(max-width: 760px)");
  const state = { view: "jczq", selected: null, q: "", league: "全部", risk: "全部", date: TODAY, pane: "index", idxTab: "eu", phonePane: "list", newsCat: "全部", unlockId: null };

  function onPhone() {
    return phoneMq.matches;
  }

  const $ = (id) => document.getElementById(id);
  const workspace = $("workspace");

  function customs() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; }
  }
  function saveCustom(match) {
    const list = customs();
    list.unshift(match);
    localStorage.setItem(STORE, JSON.stringify(list));
  }

  function slate() {
    const base = CC_DATA[state.view];
    if (!base || !base.matches) return null;
    const extra = customs().filter((m) => m.slate === state.view);
    return { ...base, matches: extra.concat(base.matches) };
  }

  function dualStats(matches) {
    const dual = matches.filter((m) => m.dual).length;
    const pct = matches.length ? dual / matches.length : 0;
    return { dual, total: matches.length, pct };
  }

  function showPick(pick) {
    return String(pick || "").replace(/主/g, "胜").replace(/客/g, "负");
  }

  function pickClass(token) {
    const t = String(token || "");
    if (/^\d-\d$/.test(t)) {
      const p = t.split("-").map(Number);
      return p[0] > p[1] ? "home" : p[0] < p[1] ? "away" : "draw";
    }
    if (/^(胜胜|平胜|负胜|让胜|胜|主)$/.test(t) || t === "3") return "home";
    if (/^(平平|胜平|负平|让平|平)$/.test(t) || t === "1") return "draw";
    if (/^(负负|平负|胜负|让负|负|客)$/.test(t) || t === "0") return "away";
    if (/主|让胜/.test(t) && !/客|让负/.test(t)) return "home";
    if (/平|让平/.test(t) && !/主|客|让胜|让负/.test(t)) return "draw";
    if (/客|让负/.test(t) && !/主|让胜/.test(t)) return "away";
    return "draw";
  }

  function lightChip(m) {
    const l = (m.market && m.market.light) || "yellow";
    const map = { green: "🟢 清楚", yellow: "🟡 胶着", red: "🔴 别碰" };
    return `<span class="chip light-${l}">${map[l]}</span>`;
  }

  function kickedOff(m) {
    if (m.liveState === "live" || m.liveState === "ft") return true;
    const ts = new Date(`${m.date || ""}T${(m.kickoff || "00:00")}:00`).getTime();
    return Number.isFinite(ts) && Date.now() >= ts - 5 * 60 * 1000;
  }

  function scoreMark(m) {
    if (m.liveState === "live" && (m.liveScore || m.liveMinute)) {
      return `　<span class="chip live">${esc(m.liveScore || "0-0")} ${esc(m.liveMinute || "进行中")}</span>`;
    }
    const sc = m.score || (m.liveState === "ft" ? m.liveScore : "");
    if (!sc) return "";
    const cls = m.hit ? "home" : m.hit === false ? "cold" : "draw";
    return `　<span class="chip ${cls}">${m.result ? "赛果" : "完场"} ${esc(sc)} ${esc(m.result || "")}</span>`;
  }

  function scoreText(m) {
    if (m.liveState === "live" && (m.liveScore || m.liveMinute)) {
      return " · " + (m.liveScore || "0-0") + " " + (m.liveMinute || "进行中");
    }
    if (m.score) return " · 赛果 " + m.score + " " + (m.result || "");
    if (m.liveState === "ft" && m.liveScore) return " · 完场 " + m.liveScore;
    return "";
  }

  function kickLabel(m) {
    if (m.liveState === "live") return m.liveMinute || "进行中";
    if (m.liveState === "ft" || m.score) return "完场";
    return m.kickoff || "";
  }

  function chips(pick) {
    return showPick(pick).split("/").filter(Boolean).map((p) =>
      `<span class="chip ${pickClass(p)}">${p}</span>`
    ).join("");
  }

  function topStats() {
    if (!$("topStats") || $("topStats").hidden) return;
    const live = (CC_DATA.jczq.matches || []).filter((m) => m.source === "live" && !m.result);
    const hist = (CC_DATA.jczq.matches || []).filter((m) => m.source !== "live" || m.result);
    const j = dualStats(live);
    const r14 = CC_DATA.r14.matches || [];
    $("topStats").innerHTML = `
      <div class="stat"><b>${j.total}</b><span>竞彩在售</span></div>
      <div class="stat"><b>${hist.length}</b><span>历史预测</span></div>
      <div class="stat"><b>${(CC_DATA.r9.matches || []).length}/${r14.length}</b><span>任9 / 任14</span></div>
    `;
  }

  function jumpDateForView() {
    const data = (state.view === "news" || state.view === "results") ? CC_DATA.jczq : CC_DATA[state.view];
    if (!data || !data.matches) return;
    if (data.matches.some((m) => m.date === state.date && m.source === "live" && !m.result)) return;
    const upcoming = [...new Set(data.matches.filter((m) => m.source === "live" && !m.result).map((m) => m.date).filter(Boolean))].sort();
    if (upcoming.length) {
      state.date = upcoming.find((d) => d >= TODAY) || upcoming[0];
      return;
    }
    if (data.matches.some((m) => m.date === state.date)) return;
    const dates = [...new Set(data.matches.map((m) => m.date).filter(Boolean))].sort();
    if (dates.length) state.date = dates[dates.length - 1];
  }

  function filtered(matches) {
    return matches.filter((m) => {
      if ((m.date || "") !== state.date) return false;
      const hay = `${m.code}${m.league}${m.home}${m.away}${m.pick}${m.tag || ""}`.toLowerCase();
      if (state.q && !hay.includes(state.q.toLowerCase())) return false;
      if (state.league !== "全部" && m.league !== state.league) return false;
      if (state.risk === "双选" && !m.dual) return false;
      if (state.risk === "单选" && m.dual) return false;
      if (state.risk === "清楚" && (!m.market || m.market.light !== "green")) return false;
      if (state.risk === "胶着" && (!m.market || m.market.light !== "yellow")) return false;
      if (state.risk === "别碰" && (!m.market || m.market.light !== "red") && (!m.engine || m.engine.gate !== "别碰")) return false;
      if (state.risk === "出手" && !playing(m)) return false;
      if (state.risk === "不出手" && playing(m)) return false;
      return true;
    });
  }

  function dateLabel() {
    if (state.date === TODAY) return "今天";
    if (state.date < TODAY) return "已完场 / 历史";
    return "未开赛 / 以后";
  }

  function renderSlate() {
    const data = slate();
    const matches = filtered(data.matches);
    const dayMatches = data.matches.filter((m) => m.date === state.date);
    const stats = dualStats(dayMatches);
    const cap = data.dualLimit == null ? 0.5 : data.dualLimit;
    if (!state.selected || !matches.some((m) => m.id === state.selected)) {
      state.selected = matches[0] ? matches[0].id : null;
    }
    const current = matches.find((m) => m.id === state.selected) || matches[0];
    if (current) state.selected = current.id;
    const leagues = ["全部", ...new Set(dayMatches.map((m) => m.league))];

    workspace.innerHTML = `
      <section class="panel">
        <h2>赛事雷达</h2>
        <div class="date-nav">
          <button type="button" class="ghost" id="dayPrev">◀</button>
          <input type="date" id="dayPick" value="${state.date}" />
          <button type="button" class="ghost" id="dayNext">▶</button>
          <button type="button" class="ghost ${state.date === TODAY ? "on" : ""}" id="dayToday">今天</button>
        </div>
        <p class="kicker">${state.date} · ${dateLabel()} · ${matches.length} 场</p>
        <div class="quota ${cap < 1 && stats.pct >= cap ? "warn" : ""}">
          <div class="bar"><i style="width:${Math.min(100, stats.pct * 100 / (cap || 1))}%"></i></div>
          <p>双选 ${stats.dual}/${stats.total}（${(stats.pct * 100).toFixed(0)}%）${cap < 1 ? " · 上限 " + (cap * 100).toFixed(0) + "%" : " · 任选不卡双选"}${cap < 1 && stats.pct >= cap ? " · 已顶格" : ""}</p>
        </div>
        <div class="filters">
          <input id="q" placeholder="搜球队 / 场次" value="${state.q}" />
        </div>
        <div class="filters">
          <select id="league">${leagues.map((l) => `<option ${l === state.league ? "selected" : ""}>${l}</option>`).join("")}</select>
          <select id="risk">
            ${["全部", "出手", "不出手", "清楚", "胶着", "别碰", "双选", "单选"].map((x) => `<option ${x === state.risk ? "selected" : ""}>${x}</option>`).join("")}
          </select>
        </div>
        <div class="match-list">
          ${matches.length ? matches.map((m) => `
            <button type="button" class="match-card ${m.id === state.selected ? "on" : ""}" data-id="${m.id}">
              <div class="row"><span>${m.league} · ${m.code}</span><span>${kickLabel(m)}</span></div>
              <div class="teams">${m.home} vs ${m.away}${scoreMark(m)}</div>
              <div class="chips">
                ${lightChip(m)}
                ${actionChip(m)}
                ${watchChip(m)}
                ${chips(m.pick)}
                ${envChip(m)}
                ${injChip(m)}
                ${newsChip(m)}
              </div>
              <div class="script-line fx-mini ${watching(m) ? "dim" : ""}">
                ${(m.hadPicks || showPick(m.pick).split("/").filter(Boolean)).join(" ")}
               　${(m.ftScores || []).join(" / ") || "—"}
               　${(m.ttgPicks || m.ftOu || []).join(" / ") || ""}
               　${(m.hafuPicks || []).join(" / ") || ""}
              </div>
            </button>
          `).join("") : `<div class="empty">这一天还没有锁号。翻到相邻日期，或点右上角录入。</div>`}
        </div>
      </section>
      <section class="panel">${current ? `
        <button type="button" class="ghost phone-back" id="btnBackList">← 赛事列表</button>
        <div class="detail-flow">${renderCenter(current, data)}</div>
      ` : "<p>这一天没有赛事</p>"}</section>
      <aside class="panel">
        <h2>怎么买</h2>
        <div class="buy">${(data.buy || []).map((x) => `<span>${x}</span>`).join("")}</div>
        <h2 style="margin-top:16px">锁号池 · ${state.date}</h2>
        ${dayMatches.map((m) => `
          <div class="pool-item" data-id="${m.id}">
            <div class="row"><b>${m.code}</b> ${chips(m.pick)}</div>
            <div class="kicker">${m.home} vs ${m.away}${scoreText(m)}${m.paperOppose ? " · 热门别跟" : ""}</div>
            <div class="script-line fx-mini">${(m.hadPicks || []).join(" ")}　${(m.ftScores || []).join("/")}</div>
          </div>
        `).join("") || "<p class='kicker'>无</p>"}
      </aside>
    `;
    let phoneClass = "";
    if (onPhone()) {
      phoneClass = current && state.phonePane === "detail" ? " phone-detail" : " phone-list";
    }
    workspace.className = "workspace layout" + (state.pane === "index" ? " layout-index" : "") + phoneClass;
    $("q").oninput = (e) => { state.q = e.target.value; render(); };
    $("league").onchange = (e) => { state.league = e.target.value; render(); };
    $("risk").onchange = (e) => { state.risk = e.target.value; render(); };
    const jump = (n) => {
      state.date = CC_ODDS.addDays(state.date, n);
      state.selected = null;
      state.phonePane = "list";
      render();
    };
    $("dayPrev").onclick = () => jump(-1);
    $("dayNext").onclick = () => jump(1);
    $("dayToday").onclick = () => { state.date = TODAY; state.selected = null; state.phonePane = "list"; render(); };
    $("dayPick").onchange = (e) => { state.date = e.target.value; state.selected = null; state.phonePane = "list"; render(); };
    const back = $("btnBackList");
    if (back) {
      back.onclick = () => {
        state.phonePane = "list";
        render();
      };
    }
    workspace.querySelectorAll("[data-id]").forEach((el) => {
      el.onclick = () => {
        state.selected = el.getAttribute("data-id");
        if (onPhone()) state.phonePane = "detail";
        render();
        if (onPhone()) window.scrollTo(0, 0);
      };
    });
    workspace.querySelectorAll("[data-pane]").forEach((el) => {
      el.onclick = () => { state.pane = el.getAttribute("data-pane"); render(); };
    });
    workspace.querySelectorAll("[data-idx]").forEach((el) => {
      el.onclick = () => { state.idxTab = el.getAttribute("data-idx"); render(); };
    });
    const svg = document.getElementById("oddsChart");
    if (svg && current && current.ticks) CC_ODDS.drawChart(svg, current.ticks, state.idxTab);
  }

  function watching(m) {
    return m.action === "别碰" || m.action === "路过" || m.lock === false;
  }

  function playing(m) {
    return m.action === "买一边" || m.action === "买两边" || m.action === "少买";
  }

  function actionChip(m) {
    const a = m.action || (watching(m) ? "路过" : m.dual ? "买两边" : "买一边");
    const cls = a === "买一边" ? "home" : a === "别碰" || a === "路过" ? "cold" : "draw";
    return `<span class="chip ${cls}">${a}</span>`;
  }

  function watchChip(m) {
    if (!watching(m)) return "";
    return '<span class="chip cold">观察</span>';
  }

  function envChip(m) {
    if (m.env === "掺局区") return '<span class="chip env">掺局区</span>';
    return "";
  }

  function injChip(m) {
    const pack = m.form || (window.CC_FORM ? CC_FORM.lookup(m) : null);
    if (!pack) return "";
    const n = ((pack.homeSide && pack.homeSide.injuries) || []).length + ((pack.awaySide && pack.awaySide.injuries) || []).length;
    if (!n) return '<span class="chip">无伤停</span>';
    return `<span class="chip cold">伤停 ${n}</span>`;
  }

  function newsChip(m) {
    const pack = m.intel || (window.CC_NEWS ? CC_NEWS.lookup(m) : null);
    const n = window.CC_NEWS ? CC_NEWS.countOf(pack) : 0;
    if (!n) return "";
    const locked = window.CC_NEWS && CC_NEWS.lockedCount(pack);
    return `<span class="chip intel">${locked ? "内部" : "消息 " + n}</span>`;
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[c]));
  }

  function gateChip(m) {
    const g = m.engine && m.engine.gate;
    if (!g) return "";
    const cls = g === "可以看" ? "home" : g === "路过" ? "draw" : "cold";
    return `<span class="chip ${cls}">${g}</span>`;
  }

  function renderScripts(m) {
    const rows = [
      ["胜平负", m.hadPicks || showPick(m.pick).split("/").filter(Boolean)],
      ["让球" + (m.handicap ? " " + m.handicap : ""), m.hhadPicks],
      ["比分", m.ftScores],
      ["进球数", m.ttgPicks || m.ftOu],
      ["半全场", m.hafuPicks || m.htScores],
    ];
    return `
      <div class="fx-assist">
        <div class="fx-assist-head">分析助手</div>
        ${rows.map(([lab, pair]) => `
          <div class="fx-row">
            <span>${lab}</span>
            <div class="fx-picks">${(pair || []).map((x) => `<b class="chip ${pickClass(x)}">${x}</b>`).join("") || "—"}</div>
          </div>
        `).join("")}
        <p class="fx-note">${m.scriptNote || "比分、进球、半全场跟着胜平负走。"}</p>
      </div>
    `;
  }

  function streakHtml(pack) {
    return String((pack && pack.streak) || "").split("").map((ch) =>
      `<i class="wdl ${ch === "W" ? "home" : ch === "L" ? "away" : "draw"}">${ch === "W" ? "胜" : ch === "L" ? "负" : "平"}</i>`
    ).join("");
  }

  function injList(list, empty) {
    if (!list || !list.length) return `<p class="kicker">${empty}</p>`;
    return `<ul class="inj-list">${list.map((p) => {
      const why = String(p.reason || "").replace(/^伤停\s*·\s*/, "");
      return `<li><b>${p.no != null ? p.no + " " : ""}${p.name}</b> ${p.pos || ""}　${why}</li>`;
    }).join("")}</ul>`;
  }

  function renderScout(m) {
    const pack = m.form || (window.CC_FORM ? CC_FORM.lookup(m) : null);
    if (!pack) {
      return `<div class="fx-scout"><div class="fx-assist-head">伤停 / 主客能力</div><p class="fx-note">这场还没有赛程底稿。友谊赛不计入。伤停不改锁号。</p></div>`;
    }
    const hs = pack.homeSide || {};
    const as = pack.awaySide || {};
    return `
      <div class="fx-scout">
        <div class="fx-assist-head">伤停 / 主客能力　友谊赛已剔除</div>
        <div class="scout-grid">
          <div>
            <h4>${m.home} · 伤停</h4>
            ${injList(hs.injuries, "无公开伤停")}
            <h4>主场近 ${hs.venue && hs.venue.n ? hs.venue.n : 0} 场</h4>
            <p class="kicker">${window.CC_FORM ? CC_FORM.wd(hs.venue) : ""}</p>
            <div class="wdl-row">${streakHtml(hs.venue)}</div>
          </div>
          <div>
            <h4>${m.away} · 伤停</h4>
            ${injList(as.injuries, "无公开伤停")}
            <h4>客场近 ${as.road && as.road.n ? as.road.n : 0} 场</h4>
            <p class="kicker">${window.CC_FORM ? CC_FORM.wd(as.road) : ""}</p>
            <div class="wdl-row">${streakHtml(as.road)}</div>
          </div>
        </div>
        <p class="fx-note">内容底稿。公开伤停通常已定价，不改锁号。出战成疑才标成未吃进盘口。</p>
      </div>
    `;
  }

  function renderObserve(m) {
    const mk = m.market || { light: "yellow", drift: "两边差不多", veto: "看不出一边倒", quake: "暂时没变", note: "先当胶着，不单边。" };
    const cls = mk.light || "yellow";
    const act = m.action || (m.dual ? "买两边" : "买一边");
    let title = "🟡 胶着 · " + act;
    if (cls === "green") title = "🟢 清楚 · " + act;
    if (cls === "red") title = "🔴 别碰热门单边 · " + act;
    if (cls === "yellow" && act === "买一边") title = "🟡 胶着 · 路过，不是买一边";
    return `
      <div class="observe ${cls}">
        <div class="observe-light">${title}</div>
        <div class="observe-grid">
          <div><span>钱站哪边</span><b>${mk.drift || "—"}</b></div>
          <div><span>公司吵不吵</span><b>${mk.veto || "—"}</b></div>
          <div><span>临场变没变</span><b>${mk.quake || "—"}</b></div>
        </div>
        <p>倾向 ${showPick(m.pick)}　动作 ${act}。灯是市场状态，动作才是出不出手。</p>
      </div>
      ${renderWhy(m)}
      ${renderEngine(m)}
    `;
  }

  function renderWhy(m) {
    const rows = m.why || [];
    if (!rows.length) return "";
    return `
      <div class="why-card">
        <div class="fx-assist-head">结论怎么来的</div>
        <ol>
          ${rows.map((x) => `<li><span>${x.from}</span><b>${x.fact}</b><em>所以 ${x.so}</em></li>`).join("")}
        </ol>
      </div>
    `;
  }

  function renderEngine(m) {
    const e = m.engine || (window.CC_ENGINE ? CC_ENGINE.read(m) : null);
    if (!e) return "";
    const h = CC_ENGINE.pct(e.fair.h);
    const d = CC_ENGINE.pct(e.fair.d);
    const a = CC_ENGINE.pct(e.fair.a);
    const gateCls = e.gate === "可以看" ? "ok" : e.gate === "路过" ? "soft" : "stop";
    return `
      <div class="engine">
        <div class="prob-bar" title="去掉抽水后，钱实际站哪边">
          <i class="h" style="width:${h}%">主 ${h}%</i>
          <i class="d" style="width:${d}%">平 ${d}%</i>
          <i class="a" style="width:${a}%">客 ${a}%</i>
        </div>
        <div class="channels">
          <div><span>欧赔</span><b>${CC_ENGINE.sideLabel(e.eu)}</b></div>
          <div><span>亚盘</span><b>${CC_ENGINE.sideLabel(e.ah)}</b></div>
          <div><span>大小</span><b>${CC_ENGINE.sideLabel(e.ou, "ou")}</b></div>
        </div>
        <div class="gate ${gateCls}">${e.gate} · ${e.layer.label}${m.dual && e.cover ? " · 两边合起来 " + e.cover.toFixed(2) : (!m.dual && e.mainOdds ? " · 这口赔 " + Number(e.mainOdds).toFixed(2) : "")}</div>
        <p>${e.note}</p>
        <p class="kicker">主 ${CC_ENGINE.flowLabel(e.flow.home)}　客 ${CC_ENGINE.flowLabel(e.flow.away)}　走势是示意，概率按竞彩即时赔率去水</p>
      </div>
    `;
  }

  function unpriced(m) {
    const get = (name) => ((m.factors || []).find((f) => f.name === name) || {}).text || "";
    const fresh = (text) => /点名|不上|B\s*队|确认轮换|预计不上|官宣|Doubtful|出战成疑|临场/.test(text || "");
    const bits = [];
    if (fresh(get("伤停轮换"))) bits.push(get("伤停轮换"));
    if (fresh(get("发布会"))) bits.push(get("发布会"));
    if (!bits.length) return "";
    return `<div class="note"><b>盘口可能还没吃进去的</b><div>${bits.join("<br>")}</div></div>`;
  }

  function renderCenter(m, data) {
    return `
      <div class="pane-tabs">
        <button type="button" class="${state.pane === "index" ? "on" : ""}" data-pane="index">盘口</button>
        <button type="button" class="${state.pane === "judge" ? "on" : ""}" data-pane="judge">锁号</button>
      </div>
      ${state.pane === "index" ? renderIndex(m) : renderDetail(m, data)}
    `;
  }

  function renderIndex(m) {
    const ticks = (m.ticks || []).slice().reverse().slice(0, 14);
    const books = m.books || [];
    return `
      <div class="detail-head">
        <div>
          <h3>${m.home} vs ${m.away}</h3>
          <p class="kicker">${m.league} · ${m.date} ${m.kickoff || ""}${scoreText(m)}</p>
        </div>
        <div class="chips">${lightChip(m)}${chips(m.pick)}${m.result ? `<span class="chip ${m.hit ? "home" : "cold"}">${m.hit ? "中" : "挂"} ${m.result}</span>` : ""}</div>
      </div>
      ${renderObserve(m)}
      <div class="idx-tabs">
        ${[["eu", "欧赔"], ["ah", "亚盘"], ["ou", "大小"]].map(([k, lab]) =>
          `<button type="button" class="${state.idxTab === k ? "on" : ""}" data-idx="${k}">${lab}</button>`
        ).join("")}
        <span class="kicker">黄线=主胜　红线=客胜　蓝线=成交量</span>
      </div>
      <div class="idx-grid">
        <svg id="oddsChart" class="odds-svg"></svg>
        <div class="idx-ticks">
          <h2>即时变动</h2>
          ${ticks.map((p) => `
            <div class="tick-row">
              <span>${p.t}</span>
              <b>${state.idxTab === "ah" ? p.ah.home : state.idxTab === "ou" ? p.ou.over : p.h.toFixed(2)}</b>
              <b class="away">${state.idxTab === "ah" ? p.ah.away : state.idxTab === "ou" ? p.ou.under : p.a.toFixed(2)}</b>
            </div>
          `).join("")}
        </div>
        <div class="idx-books">
          <h2>各家现在怎么开</h2>
          ${books.map((b) => `
            <div class="book ${b.iw ? "iw" : ""}">
              <div class="row"><b>${b.name}</b><span class="${b.dh < 0 ? "down" : b.dh > 0 ? "up" : ""}">${b.dh > 0 ? "↑" : b.dh < 0 ? "↓" : "—"}${Math.abs(b.dh).toFixed(2)}</span></div>
              <div class="odds-3">${b.h} / ${b.d} / ${b.a}</div>
              <p>${b.comment}</p>
            </div>
          `).join("")}
        </div>
      </div>
      ${renderScout(m)}
      ${renderIntel(m)}
      ${renderScripts(m)}
    `;
  }

  function renderDetail(m, data) {
    return `
      <div class="detail-head">
        <div>
          <h3>${m.home} vs ${m.away}</h3>
          <p class="kicker">${m.league} · ${m.date || ""} ${m.kickoff || ""}${m.handicap ? " · 让球 " + m.handicap : ""}${scoreText(m)}</p>
        </div>
      </div>
      ${renderObserve(m)}
      <div class="verdict">
        <div><span>锁号</span><b>${showPick(m.pick)}${m.combo ? " · 复式 " + m.combo : ""}</b></div>
        <div><span>现在赔率</span><b>${m.sp || "—"}</b></div>
        <div><span>动作</span><b>${m.action || (m.dual ? "买两边" : "路过")}</b></div>
      </div>
      <div class="note">${m.action ? "动作 " + m.action + " · 倾向 " + showPick(m.pick) : (m.summary || "")}</div>
      ${unpriced(m)}
      ${renderScout(m)}
      ${renderIntel(m)}
      ${renderScripts(m)}
    `;
  }

  function cnDate(iso) {
    const p = String(iso || "").split("-");
    if (p.length < 3) return iso || "";
    return Number(p[0]) + "年" + Number(p[1]) + "月" + Number(p[2]) + "日";
  }

  function lockSvg(open) {
    if (open) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 8h-1V7a4 4 0 0 0-7.8-1.2l1.6.8A2 2 0 0 1 14 7v1H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6z"/></svg>';
  }

  function crest(name, src, away) {
    const letter = esc(String(name || "内").slice(0, 1));
    const img = src
      ? `<img src="${esc(src)}" alt="${esc(name)}" onerror="this.remove()">`
      : "";
    return `<div class="intel-crest"><span class="intel-ava ${away ? "away" : ""}">${letter}</span>${img}</div>`;
  }

  function renderIntelRow(item) {
    const ava = String(item.team || "内").slice(0, 1);
    const body = item.summary || item.title || "";
    return `
      <div class="intel-row">
        <span class="intel-ava ${item.side === "away" ? "away" : ""}">${esc(ava)}</span>
        <div class="intel-body">
          <div class="intel-tag">${esc(item.tag)} · ${esc(item.team || "")}</div>
          <h4>${esc(item.title)}</h4>
          ${body && body !== item.title ? `<p class="intel-preview">${esc(body)}</p>` : ""}
        </div>
        <span class="intel-time">${esc(item.t || "")}</span>
      </div>
    `;
  }

  function renderIntelMatch(m, cat) {
    const pack = m.intel || (window.CC_NEWS ? CC_NEWS.lookup(m) : null);
    if (!pack || !window.CC_NEWS) return "";
    const id = pack.id;
    const open = CC_NEWS.isOpen(id);
    const n = CC_NEWS.countOf(pack);
    const rows = open ? CC_NEWS.feedOf(m, cat) : [];
    const asking = state.unlockId === id && !open;
    return `
      <article class="intel-match ${open ? "is-open" : "is-locked"}" data-intel-card="${esc(id)}">
        <div class="intel-cover">
          <div class="intel-cover-h">${esc(m.league || "")} · ${esc(m.code || "")} · ${esc(kickLabel(m))}${m.liveScore || m.score ? " · " + esc(m.liveScore || m.score) : ""}</div>
          <div class="intel-vs">
            <div class="intel-side">${crest(m.home, pack.homeLogo, false)}<b>${esc(m.home)}</b></div>
            <i>VS</i>
            <div class="intel-side">${crest(m.away, pack.awayLogo, true)}<b>${esc(m.away)}</b></div>
          </div>
          <div class="intel-cover-foot">
            <p>${open ? "已解锁 · 这场全部消息" : n + " 条内部消息 · 点这张卡解锁"}</p>
            <button type="button" class="intel-lockbtn ${open ? "open" : ""}" data-intel-id="${esc(id)}" aria-label="${open ? "重新上锁" : "解锁这场"}">${lockSvg(open)}</button>
          </div>
          ${asking ? `
            <form class="intel-unlock" data-unlock="${esc(id)}">
              <input name="pin" type="password" autocomplete="off" placeholder="这场口令" />
              <button type="submit" class="primary">解锁这场</button>
              <span class="intel-err"></span>
            </form>
          ` : ""}
        </div>
        ${open ? (rows.map(renderIntelRow).join("") || "<p class='kicker' style='padding:10px 12px'>这一类没有消息。</p>") : ""}
      </article>
    `;
  }

  function renderIntel(m) {
    const pack = m.intel || (window.CC_NEWS ? CC_NEWS.lookup(m) : null);
    if (!pack || !window.CC_NEWS || !CC_NEWS.countOf(pack)) return "";
    return `
      <div class="intel-page" style="margin-top:12px">
        <div class="intel-head">
          <h2>内部消息</h2>
          <p>点整张卡解锁，解开看这场全部。内容底稿，不改灯。</p>
        </div>
        ${renderIntelMatch(m, "全部")}
      </div>
    `;
  }

  function renderNews() {
    const cats = (window.CC_NEWS && CC_NEWS.CATS) || ["全部"];
    const data = CC_DATA.jczq || { matches: [] };
    const day = (data.matches || []).filter((m) => (m.date || "") === state.date);
    const at = (window.CC_NEWS_CACHE && CC_NEWS_CACHE.at) || "";
    const cards = day.map((m) => renderIntelMatch(m, state.newsCat)).filter(Boolean).join("");
    workspace.className = "workspace";
    workspace.innerHTML = `
      <section class="panel">
        <div class="intel-page">
          <div class="intel-head">
            <h2>内部消息</h2>
            <p>一场一锁 · 点整张卡解锁 · 封面是两队对战 · 缓存 ${esc(at)} · 不改灯</p>
            <div class="date-nav">
              <button type="button" class="ghost" id="dayPrev">◀</button>
              <input type="date" id="dayPick" value="${state.date}" />
              <button type="button" class="ghost" id="dayNext">▶</button>
              <button type="button" class="ghost ${state.date === TODAY ? "on" : ""}" id="dayToday">今天</button>
            </div>
            <div class="intel-cats">
              ${cats.map((c) => `<button type="button" class="${c === state.newsCat ? "on" : ""}" data-news-cat="${c}">${c}</button>`).join("")}
            </div>
          </div>
          <div class="intel-day">${esc(cnDate(state.date))}</div>
          ${cards || "<p class='kicker'>这一天还没有球队消息。</p>"}
        </div>
      </section>
    `;
    const jump = (n) => {
      state.date = CC_ODDS.addDays(state.date, n);
      state.unlockId = null;
      render();
    };
    $("dayPrev").onclick = () => jump(-1);
    $("dayNext").onclick = () => jump(1);
    $("dayToday").onclick = () => { state.date = TODAY; state.unlockId = null; render(); };
    $("dayPick").onchange = (e) => { state.date = e.target.value; state.unlockId = null; render(); };
    bindIntel();
  }

  function bindIntel() {
    workspace.querySelectorAll("[data-news-cat]").forEach((btn) => {
      btn.onclick = () => { state.newsCat = btn.getAttribute("data-news-cat"); state.unlockId = null; render(); };
    });
    workspace.querySelectorAll("[data-intel-card]").forEach((card) => {
      card.onclick = (e) => {
        const id = card.getAttribute("data-intel-card");
        if (e.target.closest("[data-unlock]")) return;
        if (window.CC_NEWS && CC_NEWS.isOpen(id)) {
          if (!e.target.closest("[data-intel-id]")) return;
          CC_NEWS.lockMatch(id);
          state.unlockId = null;
          render();
          return;
        }
        if (state.unlockId === id) return;
        state.unlockId = id;
        render();
        const box = workspace.querySelector(`[data-unlock="${id}"] input`);
        if (box) box.focus();
      };
    });
    workspace.querySelectorAll("[data-unlock]").forEach((form) => {
      form.onclick = (e) => e.stopPropagation();
      form.onsubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = form.getAttribute("data-unlock");
        const pin = (new FormData(form).get("pin") || "").toString();
        if (window.CC_NEWS && CC_NEWS.unlockMatch(id, pin)) {
          state.unlockId = null;
          render();
          return;
        }
        const err = form.querySelector(".intel-err");
        if (err) err.textContent = "口令不对";
      };
    });
  }

  function renderReview() {
    const r = CC_DATA.review;
    workspace.className = "workspace";
    workspace.innerHTML = `
      <section class="panel">
        <div class="detail-head">
          <div>
            <div class="kicker">${r.date}</div>
            <h3>${r.title}　<span class="${r.hit / r.total >= 0.6 ? "hit" : "miss"}">${r.hit}/${r.total}</span></h3>
            <p class="kicker">双选 ${r.dualHit} · 单选 ${r.singleHit}</p>
          </div>
        </div>
        <div class="note">${r.note}</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>场</th><th>对阵</th><th>赛果</th><th>锁号</th><th></th><th>错在哪</th></tr></thead>
          <tbody>
            ${r.matches.map((m) => `
              <tr>
                <td>${m.code}</td>
                <td>${m.home} vs ${m.away}</td>
                <td>${m.score} · ${m.result}</td>
                <td>${m.pick}</td>
                <td class="${m.hit ? "hit" : "miss"}">${m.hit ? "中" : "挂"}</td>
                <td>${m.why}</td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>
        <h2 style="margin:16px 0 8px">带走的四条</h2>
        ${r.lessons.map((x) => `<div class="rule-card">${x}</div>`).join("")}
      </section>
    `;
  }

  function renderRules() {
    workspace.className = "workspace";
    workspace.innerHTML = `<section class="rules">${CC_DATA.rules.map((r) => `
      <article class="rule-card"><h2>${r.title}</h2><p>${r.text}</p></article>
    `).join("")}</section>`;
  }

  function renderResults() {
    const q = state.q || "";
    const date = state.date === TODAY ? "" : state.date;
    const rows = window.CC_RESULT ? CC_RESULT.search(q, date) : [];
    const at = (window.CC_RESULT_CACHE && CC_RESULT_CACHE.at) || "";
    workspace.className = "workspace";
    workspace.innerHTML = `
      <section class="panel">
        <div class="detail-head">
          <div>
            <h3>赛果查询</h3>
            <p class="kicker">按日期、场次、队名查。昨天竞彩列表也会直接带出比分。缓存 ${esc(at)}</p>
          </div>
        </div>
        <div class="date-nav">
          <button type="button" class="ghost" id="dayPrev">◀</button>
          <input type="date" id="dayPick" value="${state.date}" />
          <button type="button" class="ghost" id="dayNext">▶</button>
          <button type="button" class="ghost ${state.date === TODAY ? "on" : ""}" id="dayToday">今天</button>
        </div>
        <div class="filters">
          <input id="q" placeholder="搜队名 / 场次 / 比分" value="${esc(q)}" />
        </div>
        <p class="kicker">${date ? state.date : "近几天"} · ${rows.length} 场</p>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>日期</th><th>场</th><th>对阵</th><th>赛果</th><th>当时锁号</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((m) => `
              <tr>
                <td>${esc(m.date)}</td>
                <td>${esc(m.slot || m.code)}</td>
                <td>${esc(m.home)} vs ${esc(m.away)}</td>
                <td>${esc(m.score)} · ${esc(m.result || "")}</td>
                <td>${esc(showPick(m.pick) || "—")}</td>
                <td class="${m.hit ? "hit" : (m.hit === false ? "miss" : "")}">${m.hit === true ? "中" : m.hit === false ? "挂" : ""}</td>
              </tr>
            `).join("") : `<tr><td colspan="6">这一天还没有赛果。翻到昨天或搜队名。</td></tr>`}
          </tbody>
        </table></div>
      </section>
    `;
    const jump = (n) => {
      state.date = CC_ODDS.addDays(state.date, n);
      render();
    };
    $("dayPrev").onclick = () => jump(-1);
    $("dayNext").onclick = () => jump(1);
    $("dayToday").onclick = () => { state.date = TODAY; render(); };
    $("dayPick").onchange = (e) => { state.date = e.target.value; render(); };
    $("q").oninput = (e) => { state.q = e.target.value; render(); };
  }

  function render() {
    if (window.CC_SHOP) {
      CC_SHOP.render();
      return;
    }
    if (state.view === "beidan") state.view = "jczq";
    if (state.view === "review") return renderReview();
    if (state.view === "rules") return renderRules();
    if (state.view === "news") return renderNews();
    if (state.view === "results") return renderResults();
    renderSlate();
    bindIntel();
  }

  function lockText() {
    const data = slate() || CC_DATA.jczq;
    const day = data.matches.filter((m) => m.date === state.date);
    const lines = [`${data.title}　${state.date}`, ""];
    day.forEach((m) => {
      const script = `　胜平负 ${(m.hadPicks || []).join("/") || showPick(m.pick)}　让球 ${(m.hhadPicks || []).join("/") || "—"}　比分 ${(m.ftScores || []).join("/")}　进球 ${(m.ttgPicks || m.ftOu || []).join("/")}　半全场 ${(m.hafuPicks || []).join("/")}`;
      const lamp = (m.market && m.market.light) === "red" ? "　别碰" : (m.market && m.market.light) === "green" ? "　清楚" : "　胶着";
      lines.push(`${m.code} ${m.home} vs ${m.away}　${m.pick}${lamp}${script}`);
    });
    lines.push("", ...(data.buy || []));
    return lines.join("\n");
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    if (!btn.dataset || !btn.dataset.view) return;
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      state.view = btn.dataset.view;
      state.selected = null;
      state.q = "";
      state.league = "全部";
      state.risk = "全部";
      state.phonePane = "list";
      jumpDateForView();
      render();
    };
  });

  if ($("btnCopy")) $("btnCopy").onclick = async () => {
    const text = lockText();
    try {
      await navigator.clipboard.writeText(text);
      $("btnCopy").textContent = "已复制";
      setTimeout(() => { $("btnCopy").textContent = "复制锁号"; }, 1200);
    } catch {
      window.prompt("复制锁号", text);
    }
  };

  const modal = $("modal");
  const form = $("addForm");
  function setModal(open) {
    modal.hidden = !open;
    modal.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if ($("btnAdd")) $("btnAdd").onclick = () => { setModal(true); };
  if ($("btnCloseModal")) $("btnCloseModal").onclick = () => { setModal(false); };
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) setModal(false); });

  if (form && form.querySelector("[name=code]")) form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const light = fd.get("light") || "yellow";
    const unpricedText = String(fd.get("unpriced") || "").trim();
    const match = {
      slate: state.view === "review" || state.view === "rules" || state.view === "results" ? "jczq" : state.view,
      code: fd.get("code"),
      league: fd.get("league"),
      home: fd.get("home"),
      away: fd.get("away"),
      kickoff: fd.get("kickoff"),
      sp: fd.get("sp"),
      pick: fd.get("pick"),
      dual: String(fd.get("pick")).includes("/"),
      paperOppose: light === "red",
      tag: "手动",
      summary: unpricedText || "手动录入。",
      factors: unpricedText ? [{ name: "伤停轮换", text: unpricedText }] : [],
      ftScores: [fd.get("ft1") || "1-0", fd.get("ft2") || "2-1"],
      htScores: [fd.get("ht1") || "0-0", fd.get("ht2") || "1-0"],
      ftOu: [fd.get("ou1") || "小2.5", fd.get("ou2") || "小3.5"],
      htOu: [fd.get("htou1") || "小1.5", fd.get("htou2") || "小0.5"],
      scriptNote: "比分和大小只是参考，买的是上面的锁号。",
      date: state.date,
      market: {
        light,
        drift: light === "green" ? "一边更清楚" : light === "red" ? "热门不可信" : "两边差不多",
        veto: light === "green" ? "各家差不多" : light === "red" ? "公司打架" : "对开",
        quake: "手动",
        note: light === "green" ? "可以跟一边。" : light === "red" ? "别碰热门单边。" : "不要只买一边。",
      },
    };
    if (window.CC_ODDS) CC_ODDS.enrichMatch(match, state.date);
    if (window.CC_ENGINE) match.engine = CC_ENGINE.read(match);
    match.id = `${match.date}-${match.code}`;
    saveCustom(match);
    setModal(false);
    form.reset();
    state.view = match.slate;
    state.selected = match.id;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.view === state.view));
    render();
  };

  if (phoneMq.addEventListener) phoneMq.addEventListener("change", render);
  else phoneMq.addListener(render);

  const PRED_MS = 5 * 60 * 1000;
  const SCORE_MS = 30 * 1000;
  const clock = { nextAt: Date.now() + PRED_MS, busy: false };
  const scoreClock = { nextAt: Date.now() + 8000, busy: false };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function clockLabel(ms) {
    const left = Math.max(0, ms);
    return `${pad2(Math.floor(left / 60000))}:${pad2(Math.floor((left % 60000) / 1000))}`;
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      document.querySelectorAll(`script[src*="${path}"]`).forEach((node) => node.remove());
      const s = document.createElement("script");
      s.src = `${path}?t=${Date.now()}`;
      s.onload = resolve;
      s.onerror = () => reject(new Error(path));
      document.body.appendChild(s);
    });
  }

  function tickClock() {
    const count = $("refreshCount");
    if (count) count.textContent = clockLabel(clock.nextAt - Date.now());
    if (!clock.busy && Date.now() >= clock.nextAt) refreshData();
    if (!scoreClock.busy && !clock.busy && Date.now() >= scoreClock.nextAt) refreshScores();
  }

  async function refreshScores() {
    if (scoreClock.busy || clock.busy) return;
    if (!window.CC_LIVE || !CC_LIVE.pullScores) return;
    const list = (CC_DATA.jczq.matches || []).filter((m) => m.source === "live");
    if (!list.length) {
      scoreClock.nextAt = Date.now() + SCORE_MS;
      return;
    }
    const hot = list.some((m) => m.liveState === "live" || kickedOff(m));
    scoreClock.busy = true;
    try {
      await CC_LIVE.pullScores(list);
      if (window.CC_RESULT && CC_RESULT.attachList) CC_RESULT.attachList(list);
      render();
    } catch (err) {
      // 比分刷新失败不影响锁号。
    } finally {
      scoreClock.busy = false;
      scoreClock.nextAt = Date.now() + (hot ? SCORE_MS : SCORE_MS * 4);
    }
  }

  async function refreshData(force) {
    if (clock.busy) return;
    const modal = $("modal");
    if (modal && !modal.hidden) {
      clock.nextAt = Date.now() + 15000;
      return;
    }
    clock.busy = true;
    const btn = $("btnRefresh");
    if (btn) btn.classList.add("spin");
    const hint = $("refreshHint");
    if (hint) hint.textContent = force ? "正在拉盘口、消息和预测…" : "正在拉最新锁号…";
    try {
      if (window.CC_LIVE && window.CC_PRED) {
        let pack = await CC_LIVE.pull();
        if (window.CC_LIVE.pullScores) await CC_LIVE.pullScores(pack.matches);
        if (window.CC_BOOKS) pack = await CC_BOOKS.enrich(pack);
        const locked = CC_PRED.apply(pack);
        let sfc = { matches: [], live: false, draw: "" };
        try { sfc = await CC_LIVE.pullSfc(); } catch (e2) { sfc = { matches: [], live: false, draw: "" }; }
        CC_PRED.applySfc(sfc, locked);
        CC_PRED.finish();
        if (window.CC_REVIEW && CC_REVIEW.pullMonth) {
          try { await CC_REVIEW.pullMonth(); } catch (e4) { /* 月样本用缓存 */ }
        }
        if (window.CC_BOARD) CC_BOARD.pruneAndSave();
        if (window.CC_NEWS && CC_NEWS.pullLive) {
          try { await CC_NEWS.pullLive((CC_DATA.jczq && CC_DATA.jczq.matches) || [], { force: !!force }); } catch (e3) { /* 消息源拦了先用缓存 */ }
          CC_PRED.finish();
          if (window.CC_BOARD) CC_BOARD.pruneAndSave();
        }
        topStats();
        render();
        if (hint) {
          const liveN = ((CC_DATA.jczq && CC_DATA.jczq.matches) || []).filter((m) => m.source === "live" && !m.result).length;
          const hist = ((CC_DATA.jczq && CC_DATA.jczq.matches) || []).filter((m) => m.source !== "live" || m.result).length;
          hint.textContent = `即时 ${new Date().toTimeString().slice(0, 5)} · 在售${liveN} · 近10天${hist}`;
        }
      } else {
        throw new Error("no live");
      }
    } catch {
      try {
        await loadScript("js/data.js");
        await loadScript("js/odds.js");
        await loadScript("js/extras.js");
        await loadScript("js/engine.js");
        if (window.CC_BOARD) CC_BOARD.load();
        topStats();
        render();
        if (hint) hint.textContent = `离线底稿 ${new Date().toTimeString().slice(0, 5)}`;
      } catch {
        if (hint) hint.textContent = "刷新失败，点右上角再试";
      }
    } finally {
      clock.busy = false;
      clock.nextAt = Date.now() + PRED_MS;
      if (btn) btn.classList.remove("spin");
      tickClock();
    }
  }

  $("btnRefresh").onclick = () => {
    clock.nextAt = Date.now();
    refreshData(true);
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() >= clock.nextAt - PRED_MS + 120000) refreshData(true);
  });
  setInterval(tickClock, 1000);
  tickClock();

  if (window.CC_FORM && CC_FORM.loadLive) CC_FORM.loadLive();
  if (window.CC_NEWS && CC_NEWS.loadLive) CC_NEWS.loadLive();
  if (window.CC_BOARD) CC_BOARD.load();
  if (window.CC_FORM) CC_FORM.attachAll();
  if (window.CC_NEWS) CC_NEWS.boot();
  if (window.CC_ENGINE) CC_ENGINE.attachAll();
  try {
    if (window.CC_PRED && window.CC_JC_CACHE && CC_JC_CACHE.matches && CC_JC_CACHE.matches.length) {
      const locked = CC_PRED.apply(CC_JC_CACHE);
      if (window.CC_SFC_CACHE) CC_PRED.applySfc(CC_SFC_CACHE, locked);
      CC_PRED.finish();
      if (window.CC_REVIEW && CC_REVIEW.ingest) CC_REVIEW.ingest((CC_DATA.jczq && CC_DATA.jczq.matches) || []);
      if (window.CC_LIVE && CC_LIVE.pullScores) {
        CC_LIVE.pullScores(CC_DATA.jczq.matches).then(() => { render(); }).catch(() => {});
      }
    } else if (window.CC_PRED && CC_PRED.explainAll) {
      CC_PRED.explainAll();
    }
  } catch (err) {
    if (window.CC_PRED && CC_PRED.explainAll) CC_PRED.explainAll();
  }
  topStats();
  jumpDateForView();
  if (window.CC_SHOP && CC_SHOP.jumpLive) CC_SHOP.jumpLive();
  render();
  refreshData(true);
})();
