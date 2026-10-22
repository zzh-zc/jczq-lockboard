(function (global) {
  const POS = { Keeper: "门将", Defender: "后卫", Midfielder: "中场", Attacker: "前锋" };

  function lookup(m) {
    const cache = global.CC_FORM_CACHE && CC_FORM_CACHE.bySlot;
    if (!cache || !m) return null;
    return cache[m.slot] || cache[(m.date || "") + "|" + (m.home || "") + "|" + (m.away || "")] || null;
  }

  function wd(pack) {
    if (!pack || !pack.n) return "样本不足";
    return pack.n + "场 " + pack.w + "胜" + pack.d + "平" + pack.l + "负　进" + pack.gf + "失" + pack.ga + "　" + (pack.streak || "");
  }

  function reasonOf(p) {
    const raw = String(p.reason || "伤停");
    return raw.replace(/^伤停\s*·\s*/, "");
  }

  function injText(list, side) {
    if (!list || !list.length) return side + "无公开伤停";
    return side + "缺阵 " + list.map((p) => {
      const pos = POS[p.pos] || p.pos || "";
      const no = p.no != null ? p.no + " " : "";
      return no + p.name + (pos ? " " + pos : "") + "（" + reasonOf(p) + "）";
    }).join("、");
  }

  function newsBlob(m, side) {
    const pack = (m && m.intel) || (global.CC_NEWS && CC_NEWS.lookup(m));
    const list = pack ? (side === "away" ? pack.awayNews : pack.homeNews) : [];
    return (list || []).map((x) => String((x && x.title) || "") + " " + String((x && x.summary) || "")).join(" ");
  }

  function sideWill(blob, league) {
    const cup = /欧冠|欧罗巴|欧协|解放者|南美|亚冠/;
    let w = cup.test(league || "") ? "重" : "普通";
    if (/轮换|轮休|B\s*队|二队|青年军|已出线|提前出线|已淘汰|无关紧要|降档|一周三赛/.test(blob)) w = "轻";
    if (/必须赢|必须取胜|争冠|保级|生死|没退路|出线关键|六分|淘汰赛|看得重/.test(blob)) w = "重";
    return w;
  }

  function willOf(m) {
    const league = m.league || "";
    const hb = newsBlob(m, "home");
    const ab = newsBlob(m, "away");
    const home = sideWill(hb, league);
    const away = sideWill(ab, league);
    const unpriced = /点名不上|确认轮换|B\s*队|二队首发|青年军出场/.test(hb + " " + ab);
    let gap = "不明";
    if (home === "重" && away === "重") gap = "都重";
    else if (home === "轻" && away === "轻") gap = "都轻";
    else if (home === "重" && away !== "重") gap = "主更重";
    else if (away === "重" && home !== "重") gap = "客更重";
    else if (home === "轻" && away !== "轻") gap = "主更轻";
    else if (away === "轻" && home !== "轻") gap = "客更轻";
    const cup = /欧冠|欧罗巴|欧协|解放者|南美|亚冠/.test(league);
    const prio = cup ? "杯赛主业，默认两边都当回事" : (m.env === "掺局区" ? "联赛掺局，战意要逐场看" : "联赛一轮");
    const text = "主队" + home + " / 客队" + away + "。看" + gap + "。" + (unpriced ? "有轮换/点名，盘口可能没吃完。" : "公开战意通常已定价，不拿它改方向。");
    return { home: home, away: away, gap: gap, unpriced: unpriced, prio: prio, text: text };
  }

  function patch(m, pack) {
    m.form = pack;
    const hs = pack.homeSide || {};
    const as = pack.awaySide || {};
    m.factors = m.factors || [];
    const set = (name, text) => {
      const hit = m.factors.find((f) => f.name === name);
      if (hit) hit.text = text;
      else m.factors.push({ name: name, text: text });
    };
    set("伤停轮换", injText(hs.injuries, "主队") + "。" + injText(as.injuries, "客队") + "。名单伤停通常已定价，出战成疑才单看。");
    set("主客", "主队主场近" + wd(hs.venue) + "。客队客场近" + wd(as.road) + "。友谊赛已剔除。");
    set("实力", "主队近" + wd(hs.recent) + "。客队近" + wd(as.recent) + "。友谊赛已剔除。");
    m.will = willOf(m);
    set("战意", m.will.text);
    set("赛事优先级", m.will.prio);
    set("重要程度", m.will.gap === "都重" ? "两边都要，不单边编故事。" : (m.will.gap === "都轻" ? "两边都可能降档，先路过。" : "一边看得更重，只改出手不改方向。"));
  }

  function attachAll() {
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      const list = global.CC_DATA && CC_DATA[key] && CC_DATA[key].matches;
      (list || []).forEach((m) => {
        const pack = lookup(m);
        if (pack) {
          patch(m, pack);
          return;
        }
        m.will = willOf(m);
        m.factors = m.factors || [];
        const hit = m.factors.find((f) => f.name === "战意");
        if (hit) hit.text = m.will.text;
        else m.factors.push({ name: "战意", text: m.will.text });
      });
    });
  }

  global.CC_FORM = { attachAll, lookup, wd, injText, willOf };
})(window);
