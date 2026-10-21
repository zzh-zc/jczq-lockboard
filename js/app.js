(function () {
  const STORE = "jczq-cc-custom-v1";
  const TODAY = window.CC_ODDS ? CC_ODDS.todayIso() : "2026-10-21";
  const phoneMq = window.matchMedia("(max-width: 760px)");
  const state = { view: "jczq", selected: null, q: "", league: "全部", risk: "全部", date: TODAY, pane: "index", idxTab: "eu", phonePane: "list" };

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

  function pickClass(token) {
    if (/主|让胜|3/.test(token) && !/客|让负|0/.test(token)) return "home";
    if (/平|让平|1/.test(token) && !/主|客|让胜|让负/.test(token)) return "draw";
    if (/客|让负|0/.test(token) && !/主|让胜|3/.test(token)) return "away";
    return "draw";
  }

  function lightChip(m) {
    const l = (m.market && m.market.light) || "yellow";
    const map = { green: "🟢 清楚", yellow: "🟡 胶着", red: "🔴 别碰" };
    return `<span class="chip light-${l}">${map[l]}</span>`;
  }

  function chips(pick) {
    return String(pick || "").split("/").filter(Boolean).map((p) =>
      `<span class="chip ${pickClass(p)}">${p}</span>`
    ).join("");
  }

  function topStats() {
    const j = dualStats(CC_DATA.jczq.matches);
    const b = dualStats(CC_DATA.beidan.matches);
    const r = CC_DATA.review;
    $("topStats").innerHTML = `
      <div class="stat"><b>${j.dual}/${j.total} · ${(j.pct * 100).toFixed(0)}%</b><span>竞彩双选</span></div>
      <div class="stat"><b>${b.dual}/${b.total} · ${(b.pct * 100).toFixed(0)}%</b><span>北单双选</span></div>
      <div class="stat"><b>${r.hit}/${r.total}</b><span>昨夜欧冠 ${((r.hit / r.total) * 100).toFixed(0)}%</span></div>
    `;
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
      if (state.risk === "出手" && (!m.engine || m.engine.gate !== "可以看")) return false;
      if (state.risk === "不出手" && (!m.engine || m.engine.gate === "可以看")) return false;
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
    const over = stats.pct >= data.dualLimit;
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
        <div class="quota ${over ? "warn" : ""}">
          <div class="bar"><i style="width:${Math.min(100, stats.pct * 100)}%"></i></div>
          <p>双选 ${stats.dual}/${stats.total}（${(stats.pct * 100).toFixed(0)}%）· 上限 50%${over ? " · 已顶格" : ""}</p>
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
              <div class="row"><span>${m.league} · ${m.code}</span><span>${m.kickoff || ""}</span></div>
              <div class="teams">${m.home} vs ${m.away}</div>
              <div class="chips">
                ${lightChip(m)}
                ${gateChip(m)}
                ${chips(m.pick)}
                ${m.dual ? '<span class="chip">买两边</span>' : '<span class="chip">买一边</span>'}
                ${envChip(m)}
              </div>
              <div class="script-line">
                <span>${(m.ftScores || ["—", "—"]).join(" / ")}</span>
                <span>${(m.ftOu || ["—", "—"]).join(" / ")}</span>
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
            <div class="kicker">${m.home} vs ${m.away}${m.paperOppose ? " · 热门别跟" : ""}</div>
            <div class="script-line">${(m.ftScores || []).join(" / ")} · ${(m.ftOu || []).join(" / ")}</div>
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

  function envChip(m) {
    if (m.env === "掺局区") return '<span class="chip env">日职少买</span>';
    return "";
  }

  function gateChip(m) {
    const g = m.engine && m.engine.gate;
    if (!g) return "";
    const cls = g === "可以看" ? "home" : g === "路过" ? "draw" : "cold";
    return `<span class="chip ${cls}">${g}</span>`;
  }

  function renderScripts(m) {
    const cards = [
      ["全场比分", m.ftScores],
      ["半场比分", m.htScores],
      ["全场大小", m.ftOu],
      ["半场大小", m.htOu],
    ];
    return `
      <div class="script-grid">
        ${cards.map(([title, pair]) => `
          <div class="script-card">
            <h4>${title} · 2</h4>
            <div class="pair">${(pair || ["—", "—"]).map((x) => `<b>${x}</b>`).join("")}</div>
          </div>
        `).join("")}
      </div>
      <div class="note">${m.scriptNote || "比分和大小只是参考，买的是上面的锁号。"}</div>
    `;
  }

  function renderObserve(m) {
    const mk = m.market || { light: "yellow", drift: "两边差不多", veto: "看不出一边倒", quake: "暂时没变", note: "先当胶着，不单边。" };
    const cls = mk.light || "yellow";
    const title = cls === "green" ? "🟢 清楚 · 可以跟一边" : cls === "red" ? "🔴 别碰 · 热门单边不可信" : "🟡 胶着 · 不要只买一边";
    return `
      <div class="observe ${cls}">
        <div class="observe-light">${title}</div>
        <div class="observe-grid">
          <div><span>钱站哪边</span><b>${mk.drift || "—"}</b></div>
          <div><span>公司吵不吵</span><b>${mk.veto || "—"}</b></div>
          <div><span>临场变没变</span><b>${mk.quake || "—"}</b></div>
        </div>
        <p>${mk.note || ""}</p>
      </div>
      ${renderEngine(m)}
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
        <div class="gate ${gateCls}">${e.gate} · ${e.layer.label}${e.cover ? " · 两边合起来 " + e.cover.toFixed(2) : ""}</div>
        <p>${e.note}</p>
        <p class="kicker">主 ${CC_ENGINE.flowLabel(e.flow.home)}　客 ${CC_ENGINE.flowLabel(e.flow.away)}　走势是示意，概率按竞彩即时赔率去水</p>
      </div>
    `;
  }

  function unpriced(m) {
    const get = (name) => ((m.factors || []).find((f) => f.name === name) || {}).text || "";
    const fresh = (text) => /点名|不上|B\s*队|确认轮换|预计不上|官宣/.test(text || "");
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
          <p class="kicker">${m.league} · ${m.date} ${m.kickoff || ""}${m.score ? " · 完场 " + m.score : ""}</p>
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
      ${renderScripts(m)}
    `;
  }

  function renderDetail(m, data) {
    return `
      <div class="detail-head">
        <div>
          <h3>${m.home} vs ${m.away}</h3>
          <p class="kicker">${m.league} · ${m.date || ""} ${m.kickoff || ""}${m.handicap ? " · 让球 " + m.handicap : ""}</p>
        </div>
      </div>
      ${renderObserve(m)}
      <div class="verdict">
        <div><span>锁号</span><b>${m.pick}${m.combo ? " · 复式 " + m.combo : ""}</b></div>
        <div><span>现在赔率</span><b>${m.sp || "—"}</b></div>
        <div><span>怎么买</span><b>${m.dual ? "买两边" : "只买一边"}</b></div>
      </div>
      <div class="note">${m.summary || ""}</div>
      ${unpriced(m)}
      ${renderScripts(m)}
    `;
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

  function render() {
    if (state.view === "review") return renderReview();
    if (state.view === "rules") return renderRules();
    renderSlate();
  }

  function lockText() {
    const data = slate() || CC_DATA.jczq;
    const day = data.matches.filter((m) => m.date === state.date);
    const lines = [`${data.title}　${state.date}`, ""];
    day.forEach((m) => {
      const script = m.ftScores ? `　全场 ${m.ftScores.join("/")}　半场 ${m.htScores.join("/")}　大小 ${m.ftOu.join("/")}　半场大小 ${m.htOu.join("/")}` : "";
      const lamp = (m.market && m.market.light) === "red" ? "　别碰" : (m.market && m.market.light) === "green" ? "　清楚" : "　胶着";
      lines.push(`${m.code} ${m.home} vs ${m.away}　${m.pick}${lamp}${script}`);
    });
    lines.push("", ...(data.buy || []));
    return lines.join("\n");
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      state.view = btn.dataset.view;
      state.selected = null;
      state.q = "";
      state.league = "全部";
      state.risk = "全部";
      state.phonePane = "list";
      render();
    };
  });

  $("btnCopy").onclick = async () => {
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
  $("btnAdd").onclick = () => { setModal(true); };
  $("btnCloseModal").onclick = () => { setModal(false); };
  modal.addEventListener("click", (e) => { if (e.target === modal) setModal(false); });

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const light = fd.get("light") || "yellow";
    const unpricedText = String(fd.get("unpriced") || "").trim();
    const match = {
      slate: state.view === "review" || state.view === "rules" ? "jczq" : state.view,
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

  const HOUR_MS = 60 * 60 * 1000;
  const clock = { nextAt: Date.now() + HOUR_MS, busy: false };

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
  }

  async function refreshData() {
    if (clock.busy) return;
    const modal = $("modal");
    if (modal && !modal.hidden) {
      clock.nextAt = Date.now() + 15000;
      return;
    }
    clock.busy = true;
    const hint = $("refreshHint");
    if (hint) hint.textContent = "正在拉最新锁号…";
    try {
      if (window.CC_LIVE && window.CC_PRED) {
        const pack = await CC_LIVE.pull();
        const locked = CC_PRED.apply(pack);
        const dates = [...new Set(locked.map((m) => m.date))].sort();
        if (dates.length && !locked.some((m) => m.date === state.date)) state.date = dates[0];
        topStats();
        render();
        if (hint) hint.textContent = `算法 ${new Date().toTimeString().slice(0, 5)} · ${locked.length} 场`;
      } else {
        throw new Error("no live");
      }
    } catch {
      try {
        await loadScript("js/data.js");
        await loadScript("js/odds.js");
        await loadScript("js/extras.js");
        await loadScript("js/engine.js");
        topStats();
        render();
        if (hint) hint.textContent = `离线底稿 ${new Date().toTimeString().slice(0, 5)}`;
      } catch {
        if (hint) hint.textContent = "刷新失败，下小时再试";
      }
    } finally {
      clock.busy = false;
      clock.nextAt = Date.now() + HOUR_MS;
      tickClock();
    }
  }

  $("btnRefresh").onclick = () => {
    clock.nextAt = Date.now();
    refreshData();
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() >= clock.nextAt) refreshData();
  });
  setInterval(tickClock, 1000);
  tickClock();

  topStats();
  render();
  refreshData();
})();
