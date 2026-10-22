(function (global) {
  const TODAY = global.CC_ODDS ? CC_ODDS.todayIso() : "2026-10-22";
  const state = {
    tab: "fx",
    date: TODAY,
    selected: null,
    info: false,
    infoTab: "fx",
    slip: [],
    stake: 10,
    unlockAsk: null,
    newsCat: "全部",
  };

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[c]));
  }

  function today() {
    return (global.CC_BOARD && CC_BOARD.today()) || (global.CC_ODDS && CC_ODDS.todayIso()) || TODAY;
  }

  function all() {
    const list = ((global.CC_DATA || {}).jczq || {}).matches || [];
    if (global.CC_BOARD && CC_BOARD.pruneList) return CC_BOARD.pruneList(list);
    return list;
  }

  function dayList() {
    return all().filter((m) => (m.date || "") === state.date);
  }

  function dates() {
    const have = [...new Set(all().map((m) => m.date).filter(Boolean))].sort();
    if (!have.length) return [today()];
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
    if (global.CC_RESULT && CC_RESULT.hitAny) return CC_RESULT.hitAny(m);
    if (!m.result || !global.CC_RESULT) return null;
    return CC_RESULT.hitOf(m.pick, m.result);
  }

  function dayChip(iso) {
    const list = all().filter((m) => m.date === iso);
    const done = list.filter((m) => m.result || m.score);
    const hit = done.filter((m) => hitOf(m) === true).length;
    const lab = iso === today() ? "今日" : wd(iso);
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

  function hafuText(m) {
    const raw = (m.hafuPicks || m.htScores || []).slice(0, 2);
    if (!raw.length) return "胜胜/平胜";
    return raw.join("/");
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
      return `<span class="shop-result">${esc(m.score)}</span>${ok === true ? '<span class="shop-hit">中</span>' : ok === false ? '<span class="shop-miss">挂</span>' : ""}`;
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
          <button type="button" class="shop-pill" data-add="${esc(m.id)}" data-kind="hafu">${esc(hafuText(m))}</button>
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
    const show = (state.date === TODAY ? rows.slice(0, 40) : rows.filter((r) => r.date === state.date));
    const ours = dayList().filter((m) => m.score || m.result);
    const list = ours.length ? ours : show;
    $("shopMain").innerHTML = list.map((m) => {
      const ok = hitOf(m);
      const res = m.result === "主" || m.result === "胜" ? "主胜" : m.result === "客" || m.result === "负" ? "客胜" : m.result === "平" ? "平局" : "";
      const lockBits = [];
      if (m.pick || (m.hadPicks && m.hadPicks.length)) lockBits.push(hadText(m));
      if ((m.ttgPicks || m.ftOu || []).length) lockBits.push(ttgText(m));
      if ((m.ftScores || []).length) lockBits.push(crsText(m));
      if ((m.hafuPicks || m.htScores || []).length) lockBits.push(hafuText(m));
      const lockLine = lockBits.join("  ");
      return `
        <article class="shop-sg">
          <div class="shop-sg-hd"><span>${esc(m.league || "")} · ${esc(m.slot || m.code || "")}</span><span>${esc(m.date || "")} ${esc(m.kickoff || "")}</span></div>
          <div class="shop-sg-teams">
            <span>${esc(m.home)}</span>
            <span class="shop-sg-score">${esc(m.score || "-:-")}</span>
            <span>${esc(m.away)}</span>
          </div>
          <div class="shop-sg-foot">
            <span>${esc(res)}</span>
            <span>${lockLine ? "锁 " + esc(lockLine) : "未锁"}</span>
            <b class="${ok === true ? "hit" : ok === false ? "miss" : ""}">${ok === true ? "中" : ok === false ? "挂" : "—"}</b>
          </div>
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
      const e = m.engine || (global.CC_ENGINE && CC_ENGINE.read(m)) || {};
      const h = pct(f.h); const d = pct(f.d); const a = pct(f.a);
      const mx = Math.max(h, d, a);
      const mk = m.market || {};
      return `
        <article class="shop-card">
          <div class="shop-card-top">
            <span class="shop-slot">${esc(slotOf(m))}</span>
            <span>${esc(m.league || "")}</span>
            <span>${esc(whenOf(m))}</span>
            <button type="button" class="shop-fx" data-info="${esc(m.id || slotOf(m))}">赛事分析</button>
          </div>
          <div class="shop-vs">
            <div class="shop-team"><span>${esc(m.home)}</span></div>
            <b>VS</b>
            <div class="shop-team"><span>${esc(m.away)}</span></div>
          </div>
          <div class="shop-wind-meta">
            <span>SP ${esc(m.sp || "—")}</span>
            <span>让 ${esc(m.handicap || "0")}</span>
            <span>欧 ${esc(global.CC_ENGINE ? CC_ENGINE.sideLabel(e.eu) : "—")} / 亚 ${esc(global.CC_ENGINE ? CC_ENGINE.sideLabel(e.ah) : "—")}</span>
            <span>${esc(e.fight ? "欧亚拧着" : "同向")}</span>
            <span>${esc(mk.quake || "走势未知")}</span>
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
    const stake = Number(state.stake) || 10;
    const ret = combo * stake;
    $("shopMain").innerHTML = `
      <div class="shop-slip">
        <p class="shop-note" style="padding:0 0 8px">点下面的号进过关。赔率用竞彩即时 SP 近似。</p>
        ${state.slip.length ? state.slip.map((x, i) => `<p>${esc(x.label)}　${x.odd}<button type="button" data-del="${i}">删</button></p>`).join("") : "<p>还没有选号</p>"}
        <p>本金 <input id="shopStake" type="number" min="1" step="1" value="${stake}" /> 元</p>
        <p><b>${state.slip.length} 串 1　过关 ${combo.toFixed(2)}　回报约 ${ret.toFixed(2)}</b></p>
      </div>
      ${dayList().map(renderCard).join("")}
    `;
  }

  function ui() {
    return { fair, pct, hadText, ttgText, crsText, hafuText };
  }

  function renderInfo() {
    const list = dayList();
    if (!list.length) { state.info = false; renderList(); return; }
    const cur = list.find((m) => (m.id || slotOf(m)) === state.selected) || list[0];
    state.selected = cur.id || slotOf(cur);
    const lg = logos(cur);
    const body = global.CC_SHOP_DETAIL
      ? CC_SHOP_DETAIL.infoBody(state.infoTab, cur, ui(), state)
      : "";
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
        <button type="button" class="${state.infoTab === "msg" ? "on" : ""}" data-infotab="msg">内部消息</button>
      </div>
      ${body}
    `;
  }

  function addSlip(id, kind) {
    const m = all().find((x) => (x.id || slotOf(x)) === id);
    if (!m) return;
    const label = slotOf(m) + " " + (kind === "had" ? hadText(m) : kind === "ttg" ? ttgText(m) : kind === "hafu" ? hafuText(m) : crsText(m));
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
    const stakeBox = $("shopStake");
    if (stakeBox) stakeBox.onchange = () => { state.stake = +stakeBox.value || 10; render(); };
    document.querySelectorAll("[data-news-cat]").forEach((el) => {
      el.onclick = () => { state.newsCat = el.getAttribute("data-news-cat"); render(); };
    });
    document.querySelectorAll("[data-intel-card]").forEach((card) => {
      card.onclick = (e) => {
        const id = card.getAttribute("data-intel-card");
        if (e.target.closest("[data-unlock]")) return;
        if (global.CC_NEWS && CC_NEWS.isOpen(id)) {
          if (!e.target.closest("[data-intel-id]")) return;
          CC_NEWS.lockMatch(id);
          state.unlockAsk = null;
          render();
          return;
        }
        if (state.unlockAsk === id) return;
        state.unlockAsk = id;
        render();
        const box = document.querySelector(`[data-unlock="${id}"] input`);
        if (box) box.focus();
      };
    });
    document.querySelectorAll("form[data-unlock]").forEach((form) => {
      form.onclick = (e) => e.stopPropagation();
      form.onsubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = form.getAttribute("data-unlock");
        const pin = (new FormData(form).get("pin") || "").toString();
        if (global.CC_NEWS && CC_NEWS.unlockMatch(id, pin)) {
          state.unlockAsk = null;
          render();
          return;
        }
        const err = form.querySelector(".intel-err");
        if (err) err.textContent = "口令不对";
      };
    });
  }

  function jumpLive() {
    if (all().some((m) => m.date === state.date)) return;
    const live = all().filter((m) => m.source === "live" && !m.result);
    const ds = [...new Set(live.map((m) => m.date).filter(Boolean))].sort();
    const now = today();
    if (ds.length) state.date = ds.find((d) => d >= now) || ds[0];
    else {
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
    else if (state.tab === "msg") {
      $("shopMain").innerHTML = global.CC_SHOP_DETAIL
        ? CC_SHOP_DETAIL.innerListHtml(dayList(), state, logos)
        : "";
    }
    else renderList();
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("on", el.getAttribute("data-tab") === state.tab);
    });
    bind();
  }

  global.CC_SHOP = { render, jumpLive, state };
})(window);
