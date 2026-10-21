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
  }

  function attachAll() {
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      const list = global.CC_DATA && CC_DATA[key] && CC_DATA[key].matches;
      (list || []).forEach((m) => {
        const pack = lookup(m);
        if (pack) patch(m, pack);
      });
    });
  }

  global.CC_FORM = { attachAll, lookup, wd, injText };
})(window);
