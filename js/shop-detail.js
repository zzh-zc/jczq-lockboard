(function (global) {
  const POS = { Keeper: "门将", Defender: "后卫", Midfielder: "中场", Attacker: "前锋", 门将: "门将", 后卫: "后卫", 中场: "中场", 前锋: "前锋" };
  const JUNK = /U-18|官方会员|女足|画廊|ArchDaily|预测分析|集锦|超话|抽奖|直播$|[\u3040-\u30ff]/;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[c]));
  }

  function packOf(m) {
    return m.form || (global.CC_FORM && CC_FORM.lookup(m)) || null;
  }

  function newsOf(m) {
    return m.intel || (global.CC_NEWS && CC_NEWS.lookup(m)) || null;
  }

  function engineOf(m) {
    if (m.engine) return m.engine;
    if (global.CC_ENGINE) return CC_ENGINE.read(m);
    return null;
  }

  function factor(m, name) {
    return ((m.factors || []).find((f) => f.name === name) || {}).text || "";
  }

  function avg(n, x) {
    return n ? (x / n).toFixed(1) : "—";
  }

  function mood(r) {
    if (!r || !r.n) return "样本不足";
    const rate = r.w / r.n;
    if (rate >= 0.6) return "状态不错";
    if (rate >= 0.4) return "状态一般";
    return "状态偏弱";
  }

  function wdl(ch) {
    const cls = ch === "W" ? "w" : ch === "L" ? "l" : "d";
    const lab = ch === "W" ? "胜" : ch === "L" ? "负" : "平";
    return `<i class="shop-wdl ${cls}">${lab}</i>`;
  }

  function streak(pack) {
    return String((pack && pack.streak) || "").split("").map(wdl).join("");
  }

  function sideLine(name, side, venueLab) {
    const r = (side && side.recent) || {};
    if (!r.n) return name + "近期样本不足，只记一笔未知。";
    const v = (side && (venueLab === "客场" ? side.road : side.venue)) || {};
    const venue = v.n
      ? venueLab + "近" + v.n + "场" + v.w + "胜" + v.d + "平" + v.l + "负，进" + v.gf + "失" + v.ga + "。"
      : venueLab + "样本不足。";
    return name + "近" + r.n + "场" + r.w + "胜" + r.d + "平" + r.l + "负，胜场率" + Math.round((r.w / r.n) * 100) + "%，" + mood(r) + "；场均进" + avg(r.n, r.gf) + "失" + avg(r.n, r.ga) + "。" + venue;
  }

  function lastGames(side, n) {
    return (((side || {}).recent || {}).games || []).slice(0, n);
  }

  function gameLine(g) {
    const where = g.home ? "主场" : "客场";
    const res = g.res === "W" ? "胜" : g.res === "L" ? "负" : "平";
    return (g.date || "").slice(5) + " " + (g.comp || "") + " " + where + " vs " + (g.opp || "") + " " + (g.score || "") + " " + res;
  }

  function cupMix(games) {
    const cup = (games || []).filter((g) => /欧冠|欧罗巴|欧协|解放者|亚冠|杯/.test(g.comp || "")).length;
    const league = (games || []).length - cup;
    if (cup && league) return "联赛" + league + "场、杯赛" + cup + "场掺着打，战意要分开看。";
    if (cup) return "近况基本是杯赛。";
    return "近况主要是联赛。";
  }

  function attackLine(name, side, other, home) {
    const r = (side && side.recent) || {};
    const o = (other && other.recent) || {};
    if (!r.n) return name + "攻防样本不足。";
    const att = "场均进" + avg(r.n, r.gf);
    const def = "场均失" + avg(r.n, r.ga);
    const pack = home ? side.venue : side.road;
    const loc = pack && pack.n
      ? (home ? "主场" : "客场") + "进" + avg(pack.n, pack.gf) + "失" + avg(pack.n, pack.ga)
      : "";
    const vs = o.n ? "对面近况场均失" + avg(o.n, o.ga) + "。" : "";
    return "●" + name + "：" + att + "、" + def + (loc ? "；" + loc : "") + "。" + vs;
  }

  function fact(n) {
    let x = 1;
    for (let i = 2; i <= n; i += 1) x *= i;
    return x;
  }

  function pois(l, k) {
    return Math.exp(-l) * Math.pow(l, k) / fact(k);
  }

  function lambdaOf(attSide, defSide, bump) {
    const a = (attSide && attSide.recent) || {};
    const d = (defSide && defSide.recent) || {};
    if (!a.n || !d.n) return 1.25 + bump;
    const att = (a.gf || 0) / a.n;
    const def = (d.ga || 0) / d.n;
    return Math.max(0.45, Math.min(3.1, (att + def) / 2 + bump));
  }

  function poissonBlock(m, hs, as) {
    const lh = lambdaOf(hs, as, 0.12);
    const la = lambdaOf(as, hs, -0.04);
    const cells = [];
    for (let i = 0; i <= 5; i += 1) {
      for (let j = 0; j <= 5; j += 1) {
        cells.push({ s: i + ":" + j, p: pois(lh, i) * pois(la, j), tot: i + j });
      }
    }
    cells.sort((a, b) => b.p - a.p);
    const top = cells.slice(0, 6);
    const p01 = cells.filter((x) => x.tot <= 1).reduce((s, x) => s + x.p, 0);
    const p23 = cells.filter((x) => x.tot === 2 || x.tot === 3).reduce((s, x) => s + x.p, 0);
    const p4 = cells.filter((x) => x.tot >= 4).reduce((s, x) => s + x.p, 0);
    return {
      lh: lh.toFixed(2),
      la: la.toFixed(2),
      top: top,
      bands: [
        ["0-1球", Math.round(p01 * 100)],
        ["2-3球", Math.round(p23 * 100)],
        ["4球+", Math.round(p4 * 100)],
      ],
    };
  }

  function lamp(m) {
    const mk = m.market || {};
    const light = mk.light || m.light || "yellow";
    if (light === "green") return "🟢 稳";
    if (light === "red") return "🔴 别碰热门单边";
    return "🟡 胶着";
  }

  function analysisHtml(m, ui) {
    const pack = packOf(m);
    const hs = (pack && pack.homeSide) || {};
    const as = (pack && pack.awaySide) || {};
    const f = ui.fair(m);
    const poi = poissonBlock(m, hs, as);
    const e = engineOf(m);
    const will = (m.will && m.will.text) || factor(m, "战意") || "未知。";
    const why = (m.why || []).filter((x) => x.from === "结论" || x.from === "灯" || x.from === "出手闸门");
    return `
      <div class="shop-block"><h3>队伍的实力</h3>
        <p>${esc(sideLine(m.home, hs, "主场"))}</p>
        <p>${esc(sideLine(m.away, as, "客场"))}</p>
        <p>${esc(cupMix(lastGames(hs, 8).concat(lastGames(as, 8))))}</p>
      </div>
      <div class="shop-block"><h3>赛前状态分析</h3>
        <p>●主队 ${esc(m.home)}　${streak(hs.recent)}</p>
        <p>${esc(lastGames(hs, 4).map(gameLine).join("；") || "近况未知。")}</p>
        <p>●客队 ${esc(m.away)}　${streak(as.recent)}</p>
        <p>${esc(lastGames(as, 4).map(gameLine).join("；") || "近况未知。")}</p>
        <p>战意：${esc(will)}</p>
        <p>赛程：${esc(factor(m, "赛程") || "未知。")}</p>
      </div>
      <div class="shop-block"><h3>攻防能力分析</h3>
        <p>${esc(attackLine(m.home, hs, as, true))}</p>
        <p>${esc(attackLine(m.away, as, hs, false))}</p>
        <p>${esc(factor(m, "阵容特性") || "")}</p>
      </div>
      <div class="shop-block"><h3>泊松分布</h3>
        <p>期望进球 主 ${poi.lh} / 客 ${poi.la}。去水后胜 ${ui.pct(f.h)}% / 平 ${ui.pct(f.d)}% / 负 ${ui.pct(f.a)}%。</p>
        <div class="shop-poi">${poi.top.map((x) => `<span><b>${x.s}</b>${Math.round(x.p * 1000) / 10}%</span>`).join("")}</div>
        <div class="shop-bands">${poi.bands.map((x) => `<span>${x[0]} ${x[1]}%</span>`).join("")}</div>
      </div>
      <div class="shop-block"><h3>进球效率预测</h3>
        <p>比分倾向 ${esc(ui.crsText(m))}，总进球 ${esc(ui.ttgText(m))}。期望总进球 ${(Number(poi.lh) + Number(poi.la)).toFixed(1)}。</p>
      </div>
      <div class="shop-block"><h3>综合分析</h3>
        <p>${esc(lamp(m))}　方向 ${esc((m.market && m.market.drift) || (e && ("钱站" + e.moneySide)) || "未知")}　分歧 ${esc((m.market && m.market.veto) || (e && e.fight ? "欧亚拧着" : "抱团"))}　走势 ${esc((m.market && m.market.quake) || "暂时没变")}</p>
        <p>倾向 ${esc(ui.hadText(m))}，动作 ${esc(m.action || "")}。${esc(m.steady || m.tag || "")}</p>
        ${why.map((x) => `<p>${esc(x.from)}：${esc(x.fact)} → ${esc(x.so)}</p>`).join("")}
        <p class="shop-note">只整理盘口和公开近况，不做投注引导。</p>
      </div>
    `;
  }

  function injRows(list) {
    const bag = {};
    (list || []).forEach((p) => {
      const pos = POS[p.pos] || p.pos || "其他";
      (bag[pos] = bag[pos] || []).push(p);
    });
    const order = ["门将", "后卫", "中场", "前锋", "其他"];
    const keys = order.filter((k) => bag[k] && bag[k].length);
    if (!keys.length) return `<p class="shop-note" style="padding:8px 0">无公开伤停</p>`;
    return keys.map((k) => {
      const names = bag[k].map((p) => {
        const why = String(p.reason || "").replace(/^伤停\s*·\s*/, "");
        return `<em>${esc(p.no != null ? p.no + " " : "")}${esc(p.name)}</em><small>${esc(why)}</small>`;
      }).join("");
      return `<div class="shop-inj-row"><b>${esc(k)}</b><div>${names}</div></div>`;
    }).join("");
  }

  function newsBits(rows) {
    return (rows || []).filter((x) => x && x.title && !JUNK.test(x.title + (x.summary || "")) && x.kind !== "转会" && x.kind !== "伤停").slice(0, 3);
  }

  function transferLine(rows, name) {
    const list = (rows || []).filter((x) => x.kind === "转会").slice(0, 3);
    if (!list.length) return "";
    return name + "近期人员变动：" + list.map((x) => x.title).join("；") + "。";
  }

  function storyParas(name, side, rows, venueLab, opp) {
    const r = (side && side.recent) || {};
    const paras = [];
    paras.push(sideLine(name, side, venueLab));
    const games = lastGames(side, 3);
    if (games.length) paras.push("最近交手：" + games.map(gameLine).join("；") + "。");
    paras.push(cupMix(lastGames(side, 8)));
    const inj = (side && side.injuries) || [];
    paras.push(inj.length
      ? "伤停名单里有" + inj.length + "人，公开伤停通常已进盘口，出战成疑才单看。"
      : "公开渠道暂未见成规模伤停。");
    const bits = newsBits(rows);
    bits.forEach((x) => paras.push("公开消息：" + x.title + (x.summary ? "。" + x.summary : "。")));
    const move = transferLine(rows, name);
    if (move) paras.push(move);
    if (opp) paras.push("本场对手是" + opp + "。内容底稿，不拿故事去压灯。");
    return paras;
  }

  function briefHtml(m) {
    const pack = packOf(m);
    const news = newsOf(m);
    const hs = (pack && pack.homeSide) || {};
    const as = (pack && pack.awaySide) || {};
    const hn = (news && news.homeNews) || [];
    const an = (news && news.awayNews) || [];
    return `
      <div class="shop-block shop-story">
        <h3>${esc(m.home)}情报</h3>
        ${storyParas(m.home, hs, hn, "主场", m.away).map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>
      <div class="shop-block shop-story">
        <h3>${esc(m.away)}情报</h3>
        ${storyParas(m.away, as, an, "客场", m.home).map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>
      <div class="shop-block">
        <h3>主队伤停</h3>
        ${injRows(hs.injuries)}
      </div>
      <div class="shop-block">
        <h3>客队伤停</h3>
        ${injRows(as.injuries)}
      </div>
    `;
  }

  function histCol(name, side, venueLab) {
    const r = (side && side.recent) || {};
    const v = venueLab === "客场" ? (side && side.road) : (side && side.venue);
    const games = lastGames(side, 8);
    const rows = games.length ? games.map((g) => {
      const cls = g.res === "W" ? "w" : g.res === "L" ? "l" : "d";
      return `<div class="shop-game"><span>${esc((g.date || "").slice(5))}</span><span>${esc(g.comp || "")} ${g.home ? "主" : "客"} ${esc(g.opp || "")}</span><b class="${cls}">${esc(g.score || "")}</b>${wdl(g.res)}</div>`;
    }).join("") : `<p class="shop-note" style="padding:8px 0">样本不足</p>`;
    return `
      <div class="shop-block">
        <h3>${esc(name)}近况</h3>
        <p>${esc(r.n ? ("近" + r.n + "场 " + r.w + "胜" + r.d + "平" + r.l + "负　进" + r.gf + "失" + r.ga) : "未知")}</p>
        <div class="shop-wdl-row">${streak(r)}</div>
        <p>${esc(v && v.n ? (venueLab + "近" + v.n + "场 " + v.w + "胜" + v.d + "平" + v.l + "负　进" + v.gf + "失" + v.ga) : venueLab + "未知")}</p>
        ${rows}
      </div>
    `;
  }

  function histHtml(m) {
    const pack = packOf(m);
    const hs = (pack && pack.homeSide) || {};
    const as = (pack && pack.awaySide) || {};
    return `<div class="shop-hist">${histCol(m.home, hs, "主场")}${histCol(m.away, as, "客场")}</div>`;
  }

  function lockSvg(open) {
    if (open) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 8h-1V7a4 4 0 0 0-7.8-1.2l1.6.8A2 2 0 0 1 14 7v1H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6z"/></svg>';
  }

  function teamId(name) {
    return (global.CC_NEWS && CC_NEWS.teamKey(name)) || ("team:" + name);
  }

  function isOpen(name) {
    return !!(global.CC_NEWS && CC_NEWS.isOpen(teamId(name)));
  }

  function intelRow(item) {
    const ava = String(item.team || "内").slice(0, 1);
    const body = item.summary || "";
    return `
      <div class="shop-msg-row">
        <span class="shop-ava ${item.side === "away" ? "away" : ""}">${esc(ava)}</span>
        <div>
          <div class="shop-msg-tag">${esc(item.tag || item.kind || "消息")} · ${esc(item.team || "")}</div>
          <h4>${esc(item.title)}</h4>
          ${body && body !== item.title ? `<p>${esc(body)}</p>` : ""}
        </div>
        <small>${esc(item.t || "")}</small>
      </div>
    `;
  }

  function teamCard(opt) {
    const open = isOpen(opt.name);
    const id = teamId(opt.name);
    const asking = opt.ask === id && !open;
    const rows = open ? (opt.rows || []).filter((x) => !opt.cat || opt.cat === "全部" || x.cat === opt.cat) : [];
    return `
      <article class="shop-msg ${open ? "open" : "lock"}" data-intel-card="${esc(id)}">
        <div class="shop-msg-cover">
          <div class="shop-msg-h">${esc(opt.league || "")} · ${esc(opt.meta || "")}</div>
          <div class="shop-msg-team">
            ${opt.logo ? `<img class="shop-crest" src="${esc(opt.logo)}" alt="" />` : `<span class="shop-crest fallback">${esc(String(opt.name).slice(0, 1))}</span>`}
            <b>${esc(opt.name)}</b>
            <span>${esc(opt.vs || "")}</span>
          </div>
          <div class="shop-msg-foot">
            <p>${open ? "已解锁 · 这队全部消息" : (opt.rows || []).length + " 条内部消息 · 点这张卡解锁"}</p>
            <button type="button" class="shop-lockbtn ${open ? "open" : ""}" data-intel-id="${esc(id)}" aria-label="${open ? "重新上锁" : "解锁"}">${lockSvg(open)}</button>
          </div>
          ${asking ? `<form class="shop-unlock" data-unlock="${esc(id)}"><input name="pin" type="password" autocomplete="off" placeholder="这队口令" /><button type="submit" class="shop-pill">解锁这队</button><span class="intel-err"></span></form>` : ""}
        </div>
        ${open ? (rows.map(intelRow).join("") || "<p class='shop-note'>这一类没有消息。</p>") : ""}
      </article>
    `;
  }

  function innerHtml(m, state) {
    const news = newsOf(m);
    const lg = {
      home: news && news.homeLogo,
      away: news && news.awayLogo,
    };
    const cats = (global.CC_NEWS && CC_NEWS.CATS) || ["全部"];
    const cat = state.newsCat || "全部";
    return `
      <div class="shop-block" style="padding-bottom:8px">
        <p class="shop-note" style="padding:0 0 8px">一队一锁。点卡片任意处输入口令。内容底稿，不改灯。</p>
        <div class="shop-cats">${cats.map((c) => `<button type="button" class="${c === cat ? "on" : ""}" data-news-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      </div>
      ${teamCard({ name: m.home, logo: lg.home, league: m.league, meta: "主队", vs: "vs " + m.away, rows: (news && news.homeNews) || [], ask: state.unlockAsk, cat: cat })}
      ${teamCard({ name: m.away, logo: lg.away, league: m.league, meta: "客队", vs: "vs " + m.home, rows: (news && news.awayNews) || [], ask: state.unlockAsk, cat: cat })}
    `;
  }

  function innerListHtml(list, state, logosFn) {
    const cats = (global.CC_NEWS && CC_NEWS.CATS) || ["全部"];
    const cat = state.newsCat || "全部";
    const seen = {};
    const cards = [];
    list.forEach((m) => {
      const news = newsOf(m);
      const lg = logosFn ? logosFn(m) : { home: news && news.homeLogo, away: news && news.awayLogo };
      [
        { name: m.home, logo: lg.home, rows: (news && news.homeNews) || [], meta: "主队 " + (m.slot || ""), vs: "vs " + m.away },
        { name: m.away, logo: lg.away, rows: (news && news.awayNews) || [], meta: "客队 " + (m.slot || ""), vs: "vs " + m.home },
      ].forEach((t) => {
        if (seen[t.name]) return;
        seen[t.name] = true;
        cards.push(teamCard({
          name: t.name, logo: t.logo, league: m.league, meta: t.meta, vs: t.vs,
          rows: t.rows, ask: state.unlockAsk, cat: cat,
        }));
      });
    });
    return `
      <p class="shop-note">内部消息 · 每个队伍一张 · 点卡解锁</p>
      <div class="shop-cats" style="padding:0 4px 12px">${cats.map((c) => `<button type="button" class="${c === cat ? "on" : ""}" data-news-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      ${cards.join("") || "<p class='shop-note'>这一天还没有球队消息。</p>"}
    `;
  }

  function infoBody(tab, m, ui, state) {
    if (tab === "intel") return briefHtml(m);
    if (tab === "hist") return histHtml(m);
    if (tab === "msg") return innerHtml(m, state);
    return analysisHtml(m, ui);
  }

  global.CC_SHOP_DETAIL = { infoBody, innerListHtml, injRows, analysisHtml, briefHtml, histHtml };
})(window);
