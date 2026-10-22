(function (global) {
  const TODAY = global.CC_ODDS ? CC_ODDS.todayIso() : "2026-10-22";
  const state = {
    tab: "fx",
    date: TODAY,
    selected: null,
    info: false,
    infoTab: "fx",
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

  function predPills(m) {
    return `
      <div class="shop-pills">
        <span class="shop-pill">${esc(hadText(m))}</span>
        <span class="shop-pill">${esc(ttgText(m))}</span>
        <span class="shop-pill">${esc(crsText(m))}</span>
        <span class="shop-pill">${esc(hafuText(m))}</span>
        ${liveMark(m)}
      </div>
    `;
  }

  function renderCard(m) {
    const lg = logos(m);
    const id = m.id || slotOf(m);
    return `
      <article class="shop-card" data-info="${esc(id)}">
        <div class="shop-card-top">
          <span class="shop-slot">${esc(slotOf(m))}</span>
          <span>${esc(m.league || "")}</span>
          <span>${esc(whenOf(m))}</span>
          <span class="shop-fx">赛事分析</span>
        </div>
        <div class="shop-vs">
          <div class="shop-team">${crest(lg.home, m.home)}<span>${esc(m.home)}</span></div>
          <b>VS</b>
          <div class="shop-team">${crest(lg.away, m.away)}<span>${esc(m.away)}</span></div>
        </div>
        ${predPills(m)}
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
      const h = pct(f.h); const d = pct(f.d); const a = pct(f.a);
      const mx = Math.max(h, d, a);
      return `
        <article class="shop-card" data-info="${esc(m.id || slotOf(m))}">
          <div class="shop-card-top">
            <span class="shop-slot">${esc(slotOf(m))}</span>
            <span>${esc(m.league || "")}</span>
            <span>${esc(whenOf(m))}</span>
            <span class="shop-fx">赛事分析</span>
          </div>
          <div class="shop-vs">
            <div class="shop-team"><span>${esc(m.home)}</span></div>
            <b>VS</b>
            <div class="shop-team"><span>${esc(m.away)}</span></div>
          </div>
          <div class="shop-wind-meta">
            <span>SP ${esc(m.sp || "—")}</span>
            <span>让 ${esc(m.handicap || "0")}</span>
            <span>战意 ${esc((m.will && m.will.gap) || "不明")}</span>
            <span>${esc(m.tag || "")}</span>
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

  function to310(m) {
    if (m.combo) return String(m.combo).split("").join("/");
    return String(m.pick || "")
      .replace(/主|胜/g, "3")
      .replace(/平/g, "1")
      .replace(/客|负/g, "0");
  }

  function sfcTwin(m) {
    return all().find((x) => x.home === m.home && x.away === m.away)
      || all().find((x) => (x.home || "").indexOf(m.home) >= 0 || (m.home || "").indexOf(x.home) >= 0);
  }

  function renderSfcBlock(title, pack, list, r9set) {
    const buy = pack.buy || [];
    const rows = list.map((m, i) => {
      const twin = sfcTwin(m);
      const id = twin ? (twin.id || slotOf(twin)) : "";
      const n9 = r9set && r9set.has((m.code || "") + "|" + (m.home || ""));
      return `
        <div class="shop-sfc-row"${id ? ` data-info="${esc(id)}"` : ""}>
          <span class="shop-slot">${esc(m.code || String(i + 1))}</span>
          <div>
            <div class="lab">${esc(m.home)} vs ${esc(m.away)}</div>
            <div class="meta">${esc(m.league || "")}　${esc(m.kickoff || "")}　${esc(m.sp || "")}</div>
          </div>
          <span class="r9">${n9 ? "任9" : ""}</span>
          <span class="shop-sfc-pick">${esc(to310(m))}</span>
        </div>
      `;
    }).join("");
    return `
      <div class="shop-sfc-head">
        <b>${esc(title)}</b>
        <p>${esc(pack.title || "")}　${esc(pack.version || "")}</p>
        <p>${esc(buy[1] || "")}</p>
        <p>${esc(buy[2] || "")}</p>
      </div>
      ${rows || '<p class="shop-note">这一期还没有推荐。</p>'}
    `;
  }

  function renderSfc() {
    const r14 = (global.CC_DATA && CC_DATA.r14) || {};
    const r9 = (global.CC_DATA && CC_DATA.r9) || {};
    const r14list = r14.matches || [];
    const r9list = r9.matches || [];
    const r9set = new Set(r9list.map((m) => (m.code || "") + "|" + (m.home || "")));
    $("shopMain").innerHTML = r14list.length || r9list.length
      ? renderSfcBlock("任14 推荐", r14, r14list, r9set) + renderSfcBlock("任9 推荐", r9, r9list, r9set)
      : `<p class="shop-note">这一期还没有胜负彩 / 任9。</p>`;
  }

  function ui() {
    return { fair, pct, hadText, ttgText, crsText, hafuText };
  }

  function renderInfo() {
    const cur = all().find((m) => (m.id || slotOf(m)) === state.selected) || dayList()[0];
    if (!cur) { state.info = false; renderList(); return; }
    if (cur.date) state.date = cur.date;
    const list = dayList();
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
        ${predPills(cur)}
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
    const back = $("shopBack");
    if (back) back.onclick = () => { state.info = false; render(); };
    document.querySelectorAll("[data-pick]").forEach((el) => {
      el.onclick = () => { state.selected = el.getAttribute("data-pick"); render(); };
    });
    document.querySelectorAll("[data-infotab]").forEach((el) => {
      el.onclick = () => { state.infoTab = el.getAttribute("data-infotab"); render(); };
    });
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
    else if (state.tab === "sfc") renderSfc();
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
