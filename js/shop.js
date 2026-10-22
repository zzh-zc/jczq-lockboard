(function (global) {
  const TODAY = global.CC_ODDS ? CC_ODDS.todayIso() : "2026-10-22";
  const state = {
    tab: "fx",
    date: TODAY,
    selected: null,
    info: false,
    infoTab: "fx",
    slip: [],
  };

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[c]));
  }

  function all() {
    return ((global.CC_DATA || {}).jczq || {}).matches || [];
  }

  function dayList() {
    return all().filter((m) => (m.date || "") === state.date);
  }

  function dates() {
    const have = [...new Set(all().map((m) => m.date).filter(Boolean))].sort();
    if (!have.length) return [TODAY];
    return have;
  }

  function wd(iso) {
    const map = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const d = new Date(iso + "T12:00:00");
    return map[d.getDay()] || "";
  }

  function md(iso) {
    const p = String(iso || "").split("-");
    return (p[1] || "") + "." + (p[2] || "");
  }

  function hitOf(m) {
    if (!m.result || !global.CC_RESULT) return null;
    return CC_RESULT.hitOf(m.pick, m.result);
  }

  function dayChip(iso) {
    const list = all().filter((m) => m.date === iso);
    const done = list.filter((m) => m.result);
    const hit = done.filter((m) => hitOf(m) === true).length;
    const lab = iso === TODAY ? "今日" : wd(iso);
    if (!list.length) return { top: "--场", bot: lab + " " + md(iso) };
    if (!done.length) return { top: list.length + "场", bot: lab + " " + md(iso) };
    return { top: done.length + "中" + hit, bot: lab + " " + md(iso) };
  }

  function logos(m) {
    const pack = (m && m.intel) || (global.CC_NEWS && CC_NEWS.lookup(m)) || (global.CC_NEWS_CACHE && CC_NEWS_CACHE.bySlot && CC_NEWS_CACHE.bySlot[m.slot]);
    return {
      home: pack && pack.homeLogo,
      away: pack && pack.awayLogo,
    };
  }

  function crest(url, name) {
    if (url) return `<img class="shop-crest" src="${esc(url)}" alt="" />`;
    return `<span class="shop-crest fallback">${esc(String(name || "?").slice(0, 1))}</span>`;
  }

  function hadText(m) {
    return String(m.pick || "").replace(/主/g, "胜").replace(/客/g, "负");
  }

  function ttgText(m) {
    const raw = m.ttgPicks || m.ftOu || [];
    const nums = raw.map((x) => String(x).replace(/[^\d.]/g, "")).filter(Boolean);
    if (nums.length) return nums.map((n) => n + "球").join("/");
    return "2球/3球";
  }

  function crsText(m) {
    const raw = (m.ftScores || []).slice(0, 3);
    if (!raw.length) return "1:0/0:1";
    return raw.map((x) => String(x).replace(/-/g, ":")).join("/");
  }

  function slotOf(m) {
    return m.slot || m.code || "";
  }

  function whenOf(m) {
    const md2 = String(m.date || "").slice(5);
    return (md2 || "") + " " + (m.kickoff || "");
  }

  function spParts(m) {
    const nums = String(m.sp || "").match(/(\d+\.\d+)/g) || [];
    return { h: +nums[0] || 0, d: +nums[1] || 0, a: +nums[2] || 0 };
  }

  function fair(m) {
    if (m.engine && m.engine.fair) return m.engine.fair;
    if (global.CC_ENGINE) return CC_ENGINE.read(m).fair;
    return { h: 0.33, d: 0.33, a: 0.34 };
  }

  function pct(x) {
    return Math.round((x || 0) * 1000) / 10;
  }

  function formPack(m) {
    return m.form || (global.CC_FORM && CC_FORM.lookup(m)) || null;
  }

  function sideLine(side, label) {
    const r = (side && side.recent) || {};
    if (!r.n) return label + "样本不足。";
    const rate = Math.round((r.w / r.n) * 100);
    const mood = rate >= 60 ? "良好" : rate >= 40 ? "一般" : "较差";
    return label + "近" + r.n + "场" + r.w + "胜" + r.d + "平" + r.l + "负，胜场率" + rate + "%，状态" + mood + "；进" + (r.gf || 0) + "失" + (r.ga || 0) + "，场均进" + ((r.gf || 0) / r.n).toFixed(1) + "失" + ((r.ga || 0) / r.n).toFixed(1) + "。";
  }

  function renderHead() {
    const hint = $("refreshHint");
    const liveAt = (global.CC_DATA && CC_DATA._liveAt) || "即时";
    $("shopSub").textContent = "盘口研究 · " + liveAt;
    if (hint) $("shopSub").textContent = hint.textContent || $("shopSub").textContent;
  }

  function renderRail() {
    $("shopRail").innerHTML = dates().map((d) => {
      const c = dayChip(d);
      return `<button type="button" class="shop-day ${d === state.date ? "on" : ""}" data-day="${d}"><b>${esc(c.top)}</b><span>${esc(c.bot)}</span></button>`;
    }).join("");
  }

  function liveMark(m) {
    if (m.liveState === "live") return `<span class="shop-pill live">${esc(m.liveScore || "0-0")} ${esc(m.liveMinute || "")}</span>`;
    if (m.score) {
      const ok = hitOf(m);
      return `<span class="shop-pill ${ok ? "live" : ""}">${esc(m.score)} ${ok === true ? "中" : ok === false ? "挂" : ""}</span>`;
    }
    return "";
  }

  function renderCard(m) {
    const lg = logos(m);
    return `
      <article class="shop-card" data-id="${esc(m.id || slotOf(m))}">
        <div class="shop-card-top">
          <span class="shop-slot">${esc(slotOf(m))}</span>
          <span>${esc(m.league || "")}</span>
          <span>${esc(whenOf(m))}</span>
          <button type="button" class="shop-fx" data-info="${esc(m.id || slotOf(m))}">赛事分析</button>
        </div>
        <div class="shop-vs">
          <div class="shop-team">${crest(lg.home, m.home)}<span>${esc(m.home)}</span></div>
          <b>VS</b>
          <div class="shop-team">${crest(lg.away, m.away)}<span>${esc(m.away)}</span></div>
        </div>
        <div class="shop-pills">
          <button type="button" class="shop-pill" data-add="${esc(m.id)}" data-kind="had">${esc(hadText(m))}</button>
          <button type="button" class="shop-pill" data-add="${esc(m.id)}" data-kind="ttg">${esc(ttgText(m))}</button>
          <button type="button" class="shop-pill" data-add="${esc(m.id)}" data-kind="crs">${esc(crsText(m))}</button>
          ${liveMark(m)}
        </div>
      </article>
    `;
  }

  function renderList() {
    const list = dayList();
    $("shopMain").innerHTML = list.length
      ? list.map(renderCard).join("")
      : `<p class="shop-note">这一天还没有赛事。</p>`;
  }

  function renderResults() {
    const rows = global.CC_RESULT ? CC_RESULT.search("", state.date === TODAY ? "" : state.date) : [];
    const show = state.date === TODAY ? rows.slice(0, 40) : rows.filter((r) => r.date === state.date);
    const ours = dayList();
    $("shopMain").innerHTML = (show.length ? show : ours.filter((m) => m.score)).map((m) => {
      const pick = m.pick || "";
      const ok = m.result && global.CC_RESULT ? CC_RESULT.hitOf(pick, m.result) : null;
      return `
        <article class="shop-sg">
          <div class="shop-sg-hd"><span>${esc(m.league || "")} · ${esc(m.slot || m.code || "")}</span><span>${esc(m.date || "")} ${esc(m.kickoff || "")}</span></div>
          <div class="shop-sg-teams">
            <span>${esc(m.home)}</span>
            <span class="shop-sg-score">${esc(m.score || "-:-")}</span>
            <span>${esc(m.away)}</span>
          </div>
          <p class="shop-note" style="padding:0">${pick ? "锁 " + esc(String(pick).replace(/主/g, "胜").replace(/客/g, "负")) : "赛果"} ${ok === true ? "· 中" : ok === false ? "· 挂" : ""}</p>
        </article>
      `;
    }).join("") || `<p class="shop-note">这一天还没有赛果。</p>`;
  }

  function barRow(lab, v, hot) {
    return `<div class="shop-bar"><span>${lab}</span><i style="width:${Math.max(6, v)}%"></i><span class="${hot ? "shop-hot" : ""}">${v}%${hot ? " 热" : ""}</span></div>`;
  }

  function renderWind() {
    const list = dayList();
    $("shopMain").innerHTML = list.map((m) => {
      const f = fair(m);
      const h = pct(f.h); const d = pct(f.d); const a = pct(f.a);
      const mx = Math.max(h, d, a);
      return `
        <article class="shop-card">
          <div class="shop-card-top">
            <span class="shop-slot">${esc(slotOf(m))}</span>
            <span>${esc(m.league || "")}</span>
            <span>${esc(m.date || "")}</span>
            <span></span>
          </div>
          <div class="shop-vs">
            <div class="shop-team"><span>${esc(m.home)}</span></div>
            <b>VS</b>
            <div class="shop-team"><span>${esc(m.away)}</span></div>
          </div>
          <div class="shop-bars">
            ${barRow("胜", h, h === mx)}
            ${barRow("平", d, d === mx)}
            ${barRow("负", a, a === mx)}
          </div>
        </article>
      `;
    }).join("") || `<p class="shop-note">这一天还没有风向。</p>`;
  }

  function oddOf(m, kind) {
    const o = spParts(m);
    if (kind === "had") {
      const p = hadText(m);
      if (p === "胜") return o.h;
      if (p === "负") return o.a;
      if (p === "平") return o.d;
      if (/胜/.test(p) && /平/.test(p) && o.h && o.d) return +(1 / (1 / o.h + 1 / o.d)).toFixed(2);
      if (/负/.test(p) && /平/.test(p) && o.a && o.d) return +(1 / (1 / o.a + 1 / o.d)).toFixed(2);
      if (/胜/.test(p) && /负/.test(p) && o.h && o.a) return +(1 / (1 / o.h + 1 / o.a)).toFixed(2);
      return o.h || 2;
    }
    return 3.2;
  }

  function renderCalc() {
    const combo = state.slip.reduce((s, x) => s * (x.odd || 1), 1);
    $("shopMain").innerHTML = `
      <p class="shop-note">点赛事分析页的三个号，会进过关条。只算竞彩即时 SP 近似。</p>
      <div class="shop-slip">
        ${state.slip.length ? state.slip.map((x, i) => `<p>${esc(x.label)}　${x.odd}<button type="button" data-del="${i}">删</button></p>`).join("") : "<p>还没有选号</p>"}
        <p><b>过关约 ${combo.toFixed(2)}</b></p>
      </div>
      ${dayList().map(renderCard).join("")}
    `;
  }

  function analysisHtml(m) {
    const pack = formPack(m);
    const hs = (pack && pack.homeSide) || {};
    const as = (pack && pack.awaySide) || {};
    const f = fair(m);
    const will = m.will && m.will.text ? m.will.text : "未知。";
    return `
      <div class="shop-block"><h3>队伍的实力</h3><p>${esc(sideLine(hs, "主队" + m.home + "："))}</p><p>${esc(sideLine(as, "客队" + m.away + "："))}</p></div>
      <div class="shop-block"><h3>赛前状态分析</h3><p>${esc(sideLine(hs, "●主队："))}</p><p>${esc(sideLine(as, "●客队："))}</p><p>战意：${esc(will)}</p></div>
      <div class="shop-block"><h3>攻防能力分析</h3><p>${esc(sideLine(hs, "●主队："))}</p><p>${esc(sideLine(as, "●客队："))}</p></div>
      <div class="shop-block"><h3>泊松分布</h3><p>去水后胜 ${pct(f.h)}% / 平 ${pct(f.d)}% / 负 ${pct(f.a)}%。</p></div>
      <div class="shop-block"><h3>进球效率预测</h3><p>比分 ${esc(crsText(m))}，总进球 ${esc(ttgText(m))}。</p></div>
      <div class="shop-block"><h3>综合分析</h3><p>倾向 ${esc(hadText(m))}，动作 ${esc(m.action || "")}。${esc(m.steady || m.tag || "")}</p><p class="shop-note">赛事分析只整理盘口和公开近况，不做投注引导。</p></div>
    `;
  }

  function intelHtml(m) {
    const pack = m.intel || (global.CC_NEWS && CC_NEWS.lookup(m));
    const id = m.id || (global.CC_NEWS && CC_NEWS.matchKey(m)) || slotOf(m);
    const open = global.CC_NEWS && [m.id, m.slot, id].filter(Boolean).some((k) => CC_NEWS.isOpen(k));
    if (!pack) return `<div class="shop-block"><p>这场还没有赛事情报。</p></div>`;
    if (!open) {
      return `<div class="shop-block intel-lock"><p>内部消息锁着。点卡片任意处输入口令。</p>
        <form data-unlock="${esc(id)}"><input name="pin" type="password" placeholder="口令" /><button class="shop-pill" type="submit">解开</button></form></div>`;
    }
    const rows = [].concat(pack.homeNews || [], pack.awayNews || []).slice(0, 12);
    return `<div class="shop-block"><h3>赛事情报</h3>${rows.map((x) => `<p><b>${esc(x.title || "")}</b> ${esc(x.summary || "")}</p>`).join("") || "<p>暂无</p>"}</div>`;
  }

  function histHtml(m) {
    const pack = formPack(m);
    const games = [].concat((((pack || {}).homeSide || {}).recent || {}).games || [], (((pack || {}).awaySide || {}).recent || {}).games || []).slice(0, 12);
    return `<div class="shop-block"><h3>历史战绩</h3>${games.length ? games.map((g) => `<p>${esc(g.date || "")} ${esc(g.comp || "")} vs ${esc(g.opp || "")} ${esc(g.score || "")} ${esc(g.res || "")}</p>`).join("") : "<p>样本不足。</p>"}</div>`;
  }

  function renderInfo() {
    const list = dayList();
    if (!list.length) { state.info = false; renderList(); return; }
    const cur = list.find((m) => (m.id || slotOf(m)) === state.selected) || list[0];
    state.selected = cur.id || slotOf(cur);
    const lg = logos(cur);
    const body = state.infoTab === "intel" ? intelHtml(cur) : state.infoTab === "hist" ? histHtml(cur) : analysisHtml(cur);
    $("shopInfo").hidden = false;
    $("shopInfo").innerHTML = `
      <div class="shop-info-bar"><button type="button" id="shopBack">←</button><h2>赛事分析详情</h2><span></span></div>
      <div class="shop-slots">${list.map((m) => `<button type="button" class="${(m.id || slotOf(m)) === state.selected ? "on" : ""}" data-pick="${esc(m.id || slotOf(m))}">${esc(slotOf(m))}</button>`).join("")}</div>
      <div class="shop-banner">
        <div class="shop-card-top" style="justify-content:center"><span class="shop-slot">${esc(slotOf(cur))}</span><span>${esc(cur.league || "")}</span><span>${esc(whenOf(cur))}</span></div>
        <div class="shop-vs">
          <div class="shop-team">${crest(lg.home, cur.home)}<span>[主]${esc(cur.home)}</span></div>
          <b>VS</b>
          <div class="shop-team">${crest(lg.away, cur.away)}<span>${esc(cur.away)}[客]</span></div>
        </div>
      </div>
      <div class="shop-subtabs">
        <button type="button" class="${state.infoTab === "fx" ? "on" : ""}" data-infotab="fx">赛事分析</button>
        <button type="button" class="${state.infoTab === "intel" ? "on" : ""}" data-infotab="intel">赛事情报</button>
        <button type="button" class="${state.infoTab === "hist" ? "on" : ""}" data-infotab="hist">历史战绩</button>
      </div>
      ${body}
    `;
  }

  function addSlip(id, kind) {
    const m = all().find((x) => (x.id || slotOf(x)) === id);
    if (!m) return;
    const label = slotOf(m) + " " + (kind === "had" ? hadText(m) : kind === "ttg" ? ttgText(m) : crsText(m));
    const odd = oddOf(m, kind);
    state.slip.push({ label: label, odd: odd });
    state.tab = "calc";
    render();
  }

  function bind() {
    document.querySelectorAll("[data-day]").forEach((el) => {
      el.onclick = () => { state.date = el.getAttribute("data-day"); state.info = false; render(); };
    });
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.onclick = () => { state.tab = el.getAttribute("data-tab"); state.info = false; render(); };
    });
    document.querySelectorAll("[data-info]").forEach((el) => {
      el.onclick = (e) => {
        e.preventDefault();
        state.selected = el.getAttribute("data-info");
        state.info = true;
        state.infoTab = "fx";
        render();
      };
    });
    document.querySelectorAll("[data-add]").forEach((el) => {
      el.onclick = () => addSlip(el.getAttribute("data-add"), el.getAttribute("data-kind"));
    });
    document.querySelectorAll("[data-del]").forEach((el) => {
      el.onclick = () => { state.slip.splice(+el.getAttribute("data-del"), 1); render(); };
    });
    const back = $("shopBack");
    if (back) back.onclick = () => { state.info = false; render(); };
    document.querySelectorAll("[data-pick]").forEach((el) => {
      el.onclick = () => { state.selected = el.getAttribute("data-pick"); render(); };
    });
    document.querySelectorAll("[data-infotab]").forEach((el) => {
      el.onclick = () => { state.infoTab = el.getAttribute("data-infotab"); render(); };
    });
    document.querySelectorAll("form[data-unlock]").forEach((form) => {
      form.onsubmit = (e) => {
        e.preventDefault();
        const id = form.getAttribute("data-unlock");
        const pin = (new FormData(form).get("pin") || "").toString();
        if (global.CC_NEWS && CC_NEWS.unlockMatch(id, pin)) render();
      };
    });
    const infoRoot = $("shopInfo");
    if (infoRoot && !infoRoot.hidden) {
      infoRoot.onclick = (e) => {
        if (state.infoTab !== "intel") return;
        const form = infoRoot.querySelector("form[data-unlock]");
        if (!form) return;
        if (e.target.closest("form")) return;
        const pin = window.prompt("口令");
        if (pin && global.CC_NEWS && CC_NEWS.unlockMatch(form.getAttribute("data-unlock"), pin)) render();
      };
    }
  }

  function jumpLive() {
    const live = all().filter((m) => m.source === "live" && !m.result);
    const ds = [...new Set(live.map((m) => m.date).filter(Boolean))].sort();
    if (ds.length) state.date = ds.find((d) => d >= TODAY) || ds[0];
    else if (!all().some((m) => m.date === state.date)) {
      const allD = dates();
      if (allD.length) state.date = allD[allD.length - 1];
    }
  }

  function render() {
    if (!$("shopMain")) return;
    renderHead();
    renderRail();
    $("shopInfo").hidden = !state.info;
    if (state.info) renderInfo();
    else if (state.tab === "sg") renderResults();
    else if (state.tab === "wind") renderWind();
    else if (state.tab === "calc") renderCalc();
    else renderList();
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("on", el.getAttribute("data-tab") === state.tab);
    });
    bind();
  }

  global.CC_SHOP = { render, jumpLive, state };
})(window);
