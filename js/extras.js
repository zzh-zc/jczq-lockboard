(function (global) {
  function parseSp(sp) {
    const nums = String(sp || "").match(/(\d+\.\d+)/g);
    if (!nums) return null;
    if (nums.length >= 3) return { h: +nums[0], d: +nums[1], a: +nums[2] };
    return { h: +nums[0], d: null, a: null, raw: sp };
  }

  function iwFlat(sp, shape, verdict, trigger) {
    const now = parseSp(sp);
    return {
      shape: shape || "主不变 平不变 客不变",
      verdict: verdict || "即时盘，未见有效变盘，不改判。",
      trigger: !!trigger,
      now,
      open: now,
    };
  }

  function pair(a, b) { return [a, b]; }

  function agents(rows) {
    return rows.map(([name, vote, text, paper]) => ({ name, vote, text, paper: !!paper }));
  }

  const JC = {
    "001": {
      ftScores: pair("2-1", "2-0"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "小3.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "东京能零封，柏客场刚被灌。脚本小球，半场先磨。",
      iw: iwFlat("2.09 / 3.45 / 2.78", "主略热 平中 客中", "主热和因素同向，不改判。掺局区不进稳。"),
      agents: agents([
        ["战意席", "主", "东京五连胜要续，柏客场给脸。"],
        ["优先级席", "主", "柏亚冠刚踢完，联赛客场降档。"],
        ["内容席", "主", "东京近 8 场丢 1 球，柏联赛刚 1-3。"],
        ["主客席", "主", "味之素主场。"],
        ["伤停席", "观察", "名单未知，不拿伤停改号。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "2.09 纸面主。跟。", true],
      ]),
    },
    "002": {
      ftScores: pair("2-1", "1-2"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "大1.5"),
      scriptNote: "对开不写 1-1。平赔 3.40 不是必平。半场先 0-0。",
      iw: iwFlat("2.34 / 3.40 / 2.45", "主客对开 平偏短", "对开盘不单边。变盘未把平打成必平。"),
      market: { light: "yellow", drift: "两边差不多", veto: "对开，没一边倒", quake: "暂时没变", note: "两边赔率差不多。不要只买一边，也别拿日职去指定谁赢。" },
      agents: agents([
        ["战意席", "观察", "两边都不是游客，战意打平。"],
        ["优先级席", "观察", "都是联赛一轮。"],
        ["内容席", "客", "神户第 4 更整，川崎能打也漏。"],
        ["主客席", "主", "川崎主场有。"],
        ["伤停席", "观察", "未知。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "客", "客 2.45 略短于主 2.34，对开。", true],
      ]),
    },
    "003": {
      ftScores: pair("1-0", "2-1"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "日乙消息少，脚本跟主场小比分。不进串。",
      iw: iwFlat("2.15 / 3.67 / 2.55", "主热 平高", "主热无反对项，不改判。名额满才单。"),
      agents: agents([
        ["战意席", "主", "日乙主场要分。"],
        ["优先级席", "主", "联赛。"],
        ["内容席", "观察", "消息少，不当豪门。"],
        ["主客席", "主", "主场。"],
        ["伤停席", "观察", "未知。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "2.15 跟主。", true],
      ]),
    },
    "004": {
      ftScores: pair("2-1", "1-2"), htScores: pair("1-0", "0-1"),
      ftOu: pair("大2.5", "大3.5"), htOu: pair("大1.5", "小1.5"),
      scriptNote: "两边都能翻，不写 1-1。预报有雨不改大球。",
      iw: iwFlat("2.15 / 3.45 / 2.67", "主略热 客中", "主热是队名，不是内容。不改判单曼联。"),
      market: { light: "red", drift: "略偏科莫", veto: "公司不齐心", quake: "曼联队名把客赔开短了", note: "看起来偏科莫，但跟曼联队名拧着。别只买科莫，也别只买曼联。" },
      agents: agents([
        ["战意席", "主", "科莫刚 4-1 莱比锡要续。"],
        ["优先级席", "主", "科莫欧冠是身份场；曼联也不会游客。"],
        ["内容席", "主", "科莫联赛 3-1 佛罗伦萨；曼联队名大于内容。"],
        ["主客席", "主", "湖边主场。曼联欧冠客场难看。"],
        ["伤停席", "客", "科莫缺查洛巴一线；曼联约罗停、锋线也残。"],
        ["发布会席", "观察", "法布雷加斯 vs 卡里克，无点名轮换。"],
        ["盘口座", "主", "2.15 / 2.67 纸面略偏主。不跟队名单边。", true],
      ]),
    },
    "005": {
      ftScores: pair("1-0", "1-1"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "两边欧冠 0 分都急。客队虫，先带平。奥斯梅亨能偷，不大球必开。",
      iw: iwFlat("1.90 / 3.50 / 3.15", "主热 客中", "1.90 主热。因素要带平，盘口没有把平打短到改判单主。"),
      agents: agents([
        ["战意席", "主", "两边 0 分都要，主场更急着开张。"],
        ["优先级席", "平", "加拉合同绑欧冠，不是鱼腩。"],
        ["内容席", "平", "两边都在输。加拉上限更高。"],
        ["主客席", "主", "里尔主场，加拉客场弱。"],
        ["伤停席", "平", "莱奥伤，奥斯梅亨预计上。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "1.90 纸面主。", true],
      ]),
    },
    "006": {
      ftScores: pair("0-1", "1-2"), htScores: pair("0-0", "0-1"),
      ftOu: pair("小2.5", "小3.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "跟内容客。莱万特能磨，脚本小球。",
      iw: iwFlat("3.32 / 3.10 / 1.98", "客热 平偏短", "客 1.98 与内容同向。平 3.10 偏短，是主场磨，不改判单客进稳。"),
      agents: agents([
        ["战意席", "客", "毕尔巴鄂客场当联赛一轮。"],
        ["优先级席", "客", "都是联赛，客队不是游客。"],
        ["内容席", "客", "阵容和内容都在莱万特上面。"],
        ["主客席", "平", "莱万特主场能磨，不是龙。"],
        ["伤停席", "观察", "未知。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "客", "1.98 纸面客。", true],
      ]),
    },
    "007": {
      ftScores: pair("3-0", "2-1"), htScores: pair("1-0", "2-0"),
      ftOu: pair("大2.5", "大3.5"), htOu: pair("大1.5", "小1.5"),
      scriptNote: "莱比锡 1-4 科莫，磨不满。深盘不默认平。伯纳乌能翻。",
      iw: iwFlat("1.15 / 6.60 / 9.20", "深盘主 平客都高", "深盘持稳。没有降主到要防平的变盘。禁止死胆。"),
      market: { light: "green", drift: "明显偏皇马", veto: "各家差不多", quake: "没乱走", note: "可以跟皇马。1.15 别梭哈，别拿去串长龙。" },
      agents: agents([
        ["战意席", "主", "皇马欧冠 6 分刚 4-3 罗马，主场要分。"],
        ["优先级席", "主", "皇马欧冠不会收。"],
        ["内容席", "主", "莱比锡客场会崩。"],
        ["主客席", "主", "伯纳乌。磨的证据不够。"],
        ["伤停席", "主", "维尼修斯欧冠能上。缺的不够改号。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "1.15 纸面主。禁止死胆。", true],
      ]),
    },
    "008": {
      ftScores: pair("2-1", "1-1"), htScores: pair("1-0", "0-0"),
      ftOu: pair("大2.5", "小3.5"), htOu: pair("小1.5", "大1.5"),
      scriptNote: "维京刚 3-3 拜仁，能进就是能磨平。1.15 强制带平。",
      iw: iwFlat("1.15 / 6.50 / 9.40", "深盘主", "深盘未降。费内课是内容带平，不是变盘改判。"),
      agents: agents([
        ["战意席", "主", "维拉 6 分要顶 8。"],
        ["优先级席", "主", "维拉欧冠是赛季最大生意。"],
        ["内容席", "平", "维京能进也能漏，刚踢满拜仁。"],
        ["主客席", "主", "维拉公园。"],
        ["伤停席", "平", "维拉边卫伤，维京后卫也缺。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "1.15 纸面主。强制带平。", true],
      ]),
    },
    "009": {
      ftScores: pair("2-1", "1-1"), htScores: pair("1-0", "0-0"),
      ftOu: pair("大2.5", "小3.5"), htOu: pair("小1.5", "大1.5"),
      scriptNote: "1.43 波尔图课。费耶能进，必须带平。",
      iw: iwFlat("1.43 / 4.50 / 4.80", "主热 平客中高", "主热未降到 1.3 以下。因素带平，变盘不改判单主。"),
      agents: agents([
        ["战意席", "主", "贝蒂斯 6 分要续。"],
        ["优先级席", "主", "西甲第 4，欧冠同样值钱。"],
        ["内容席", "平", "费耶能赢科莫，也能被灌。"],
        ["主客席", "主", "主场近 5 个 4 胜。"],
        ["伤停席", "平", "费耶伤兵长，不是没牙。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "1.43 纸面主。必须带平。", true],
      ]),
    },
    "010": {
      ftScores: pair("2-1", "1-2"), htScores: pair("1-0", "0-1"),
      ftOu: pair("大2.5", "小3.5"), htOu: pair("小1.5", "大1.5"),
      scriptNote: "两边都能翻。不写 1-1。平赔 3.55 不是必平。",
      iw: iwFlat("1.89 / 3.55 / 3.14", "主热 客缩", "主 1.89 纸面热。客 3.14 不远。不改判单拜仁。"),
      market: { light: "red", drift: "主热", veto: "背离", quake: "奥利塞停后主热未散", note: "有倾向但内容拧着。别碰 1.89 单拜仁。" },
      agents: agents([
        ["战意席", "观察", "两边都要前 8，没有游客。"],
        ["优先级席", "客", "阿森纳合同绑欧冠，客场不会收。"],
        ["内容席", "客", "阿森纳欧冠 2 胜 0 失；拜仁刚 3-3 维京。"],
        ["主客席", "主", "安联。拜仁不是主场虫。"],
        ["伤停席", "客", "奥利塞停、穆夏拉伤。"],
        ["发布会席", "观察", "助理出席，公关丢掉，不是轮换。"],
        ["盘口座", "主", "1.89 纸面主。不跟单边。", true],
      ]),
    },
    "011": {
      ftScores: pair("2-0", "3-1"), htScores: pair("1-0", "2-0"),
      ftOu: pair("大2.5", "大3.5"), htOu: pair("大1.5", "小1.5"),
      scriptNote: "林茨能进不是能磨。深盘不默认平。让-2 禁止死胆。",
      iw: { shape: "让-2 热主", verdict: "胜平负未开。让-2 覆盖大，禁止死胆。不改判。", trigger: false, now: { h: 2.22, d: null, a: null }, open: { h: 2.22, d: null, a: null } },
      agents: agents([
        ["战意席", "主", "体育 6 分要顶 8。"],
        ["优先级席", "主", "欧冠 6 分是大钱。"],
        ["内容席", "主", "体育 3-1 加拉、2-0 朗斯。"],
        ["主客席", "主", "阿尔瓦拉德。"],
        ["伤停席", "主", "缺的不够改号。林茨能进。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "让-2。按 1.15 区跟主。", true],
      ]),
    },
    "012": {
      ftScores: pair("2-1", "1-0"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "半球档本应带平，双选满了才单。漏平就是这份。",
      iw: iwFlat("1.90 / 3.70 / 3.00", "主热 客不远", "1.90 主热信心不足。变盘未把平打短。任 14 已包 31。"),
      agents: agents([
        ["战意席", "主", "两边 3 分都要。"],
        ["优先级席", "主", "布鲁日刚 4-3 国米，欧冠会发力。"],
        ["内容席", "平", "朗斯能磨。布鲁日能打也漏。"],
        ["主客席", "主", "扬布雷达尔。"],
        ["伤停席", "观察", "两边都有伤，不够改号。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "1.90 纸面主。", true],
      ]),
    },
    "013": {
      ftScores: pair("1-0", "2-1"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "小3.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "解放者杯德比，死敌不是放水。脚本小球。",
      iw: iwFlat("1.67 / 3.30 / 4.40", "主热 平中", "主热与纸面同向。德比磨，不改判进稳。"),
      agents: agents([
        ["战意席", "主", "德比两边都要。"],
        ["优先级席", "主", "解放者杯大于联赛。"],
        ["内容席", "主", "帕尔梅拉斯纸面在弗鲁上面。"],
        ["主客席", "主", "主场硬。"],
        ["伤停席", "观察", "未知。"],
        ["发布会席", "观察", "未知。"],
        ["盘口座", "主", "1.67 纸面主。", true],
      ]),
    },
  };

  const BD = {
    "039": {
      ftScores: pair("1-0", "1-1"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "小3.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "北单平赔 2.88 异常短。竞彩包 30，北单反而带平。",
      iw: iwFlat("2.46 / 2.88 / 4.04", "平异常短", "平 2.88 是变盘信号。不单神户。"),
    },
    "042": {
      ftScores: pair("1-0", "1-1"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "不跟樱花客热。名古屋刚 3-1 柏。",
      iw: iwFlat("2.84 / 4.85 / 2.25", "客热 主中", "客 2.25 纸面樱花。因素反对，不改判跟客。"),
    },
    "046": {
      ftScores: pair("0-1", "0-2"), htScores: pair("0-0", "0-1"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "大1.5"),
      scriptNote: "+1 让胜 1.62 不跟。广岛赢 1 球是让平，赢 2 球是让负。",
      iw: iwFlat("1.62 / 6.38 / 4.36", "受让主热", "+1 让胜热是长崎不败。因素反对，改判看客赢。"),
    },
    "054": {
      ftScores: pair("1-0", "2-1"), htScores: pair("0-0", "1-0"),
      ftOu: pair("小2.5", "大2.5"), htOu: pair("小1.5", "小0.5"),
      scriptNote: "北单客倒热，欧赔主约 1.98。拧着信因素跟让胜。",
      iw: iwFlat("2.77 / 5.33 / 2.21", "北单客热 欧赔主热", "北单和欧赔拧着。信因素，不跟北单客。"),
    },
  };

  function inferFt(m) {
    if (global.CC_PRED && CC_PRED.scoresOf) return CC_PRED.scoresOf(m);
    const paper = parseSp(m.sp);
    const line = parseFloat(String(m.handicap || "0").replace("+", "")) || 0;
    const fav = paper ? Math.min(paper.h || 9, paper.d || 9, paper.a || 9) : 9;
    const aim = fav <= 1.25 ? 3.2 : fav <= 1.6 ? 2.7 : Math.abs(line) >= 1 ? 2.6 : 2.3;
    const mag = Math.abs(line) >= 1.25 ? 2 : Math.abs(line) >= 0.75 ? 1 : 1;
    const p = m.pick || "";
    if (/平/.test(p) && !/主|客|让胜|让负/.test(p)) {
      const g = aim >= 2.8 ? 2 : 1;
      return pair(g + "-" + g, (g + 1) + "-" + (g + 1));
    }
    if (/客|让负/.test(p) && !/主|让胜/.test(p)) return pair((aim >= 2.8 ? "1-2" : "0-1"), (mag >= 2 ? "0-2" : "1-2"));
    if (/主|让胜/.test(p) && /客|让负/.test(p)) return pair("2-1", "1-2");
    if (/主|让胜/.test(p) && /平/.test(p)) return pair(aim >= 2.8 ? "2-1" : "1-0", aim >= 2.8 ? "2-2" : "1-1");
    return pair(aim >= 3 ? "3-1" : "2-1", aim >= 3 ? "2-1" : "2-0");
  }

  function sidesFromPick(p) {
    const s = [];
    if (/主|让胜/.test(p || "")) s.push("胜");
    if (/平|让平/.test(p || "")) s.push("平");
    if (/客|让负/.test(p || "")) s.push("负");
    return s.length ? s : ["胜"];
  }

  function hafuFromPick(p) {
    if (/客|让负/.test(p) && /平/.test(p)) return pair("平平", "平负");
    if (/客|让负/.test(p) && !/主|让胜/.test(p)) return pair("负负", "平负");
    if (/主|让胜/.test(p) && /平/.test(p)) return pair("平胜", "平平");
    if (/主|让胜/.test(p) && /客|让负/.test(p)) return pair("胜胜", "负负");
    if (/平/.test(p) && !/主|客|让胜|让负/.test(p)) return pair("平平", "平胜");
    return pair("胜胜", "平胜");
  }

  function ttgFromScores(scores) {
    const tots = [];
    (scores || []).forEach((x) => {
      const p = String(x).split("-");
      const lab = Number(p[0]) + Number(p[1]) + "球";
      if (tots.indexOf(lab) < 0) tots.push(lab);
    });
    while (tots.length < 2) tots.push(tots[0] === "1球" ? "2球" : "1球");
    return tots.slice(0, 2);
  }

  function hhadFromSides(sides) {
    const map = { 胜: "让胜", 平: "让平", 负: "让负" };
    const out = sides.map((s) => map[s]).filter(Boolean);
    if (out.length === 1) out.push("让平");
    return out.slice(0, 2);
  }

  function inferHt(m) {
    const p = m.pick || "";
    if (/客|让负|0/.test(p) && !/主|让胜|3/.test(p)) return pair("0-0", "0-1");
    if (/平|让平|1/.test(p) && !/主|客/.test(p)) return pair("0-0", "1-1");
    return pair("0-0", "1-0");
  }

  function inferOu(m) {
    const p = m.pick || "";
    if (p === "主/客" || p === "让胜/让负") return pair("小2.5", "大2.5");
    if (/让负|客/.test(p) && /让平|平/.test(p)) return pair("小2.5", "大2.5");
    return pair("小2.5", "小3.5");
  }

  function inferAgents(m) {
    const map = {};
    (m.factors || []).forEach((f) => { map[f.name] = f.text; });
    const first = String(m.pick || "主").split("/")[0].replace("让", "");
    const paper = parseSp(m.sp);
    let paperVote = "主";
    if (paper && paper.d != null) {
      const min = Math.min(paper.h, paper.d, paper.a);
      paperVote = min === paper.a ? "客" : min === paper.d ? "平" : "主";
    }
    const seat = (name, key, vote) => ({
      name, vote, text: map[key] || "未知", paper: key === "SP",
    });
    return [
      seat("战意席", "战意", /未知/.test(map["战意"] || "未知") ? "观察" : first),
      seat("优先级席", "赛事优先级", first),
      seat("内容席", "实力", first),
      seat("主客席", "主客", first),
      seat("伤停席", "伤停轮换", /未知/.test(map["伤停轮换"] || "未知") ? "观察" : first),
      seat("发布会席", "发布会", /未知/.test(map["发布会"] || "未知") ? "观察" : first),
      seat("盘口座", "SP", paperVote),
    ];
  }

  function inferMarket(m) {
    const nums = String(m.sp || "").match(/(\d+\.\d+)/g);
    const even = nums && nums.length >= 3 && Math.abs(+nums[0] - +nums[2]) < 0.4;
    if (even) {
      return {
        light: "yellow", drift: "两边差不多", veto: "对开，没一边倒", quake: "暂时没变",
        note: "两边赔率差不多。不要只买一边。",
      };
    }
    if (m.paperOppose) {
      return {
        light: "red", drift: "看起来有热门", veto: "公司打架", quake: "热门方向不可信",
        note: "别碰热门单边。不是让你去博冷。",
      };
    }
    if (m.env === "掺局区") {
      return {
        light: "yellow", drift: m.dual ? "两边差不多" : "略偏主", veto: "日职看不清", quake: "暂时没变",
        note: "日职少买，不进长串。",
      };
    }
    if (m.dual) {
      return {
        light: "yellow", drift: "两边差不多", veto: "没一边倒", quake: "暂时没变",
        note: "买两边，或者路过。",
      };
    }
    return {
      light: "green", drift: /客|让负|0/.test(m.pick || "") ? "偏客" : "偏主",
      veto: "各家差不多", quake: "没乱走",
      note: "可以跟一边。1.3 以下别梭哈。",
    };
  }

  function defaultExtras(m) {
    const live = m.source === "live" || m._mk;
    const scores = live && m.ftScores && m.ftScores.length ? m.ftScores : inferFt(m);
    const had = sidesFromPick(m.pick);
    const hafu = (live && m.hafuPicks && m.hafuPicks.length) ? m.hafuPicks : hafuFromPick(m.pick);
    const ttg = (live && m.ttgPicks && m.ttgPicks.length) ? m.ttgPicks : ttgFromScores(scores);
    const out = {
      hadPicks: had,
      hhadPicks: (live && m.hhadPicks && m.hhadPicks.length) ? m.hhadPicks : hhadFromSides(had),
      ftScores: scores,
      ttgPicks: ttg,
      hafuPicks: hafu,
      htScores: hafu,
      ftOu: ttg,
      htOu: hafu,
      scriptNote: m.scriptNote || "比分跟进球数盘、让球线和欧赔热度，不写死小球。",
      iw: iwFlat(m.sp, "即时盘", "未见有效变盘，不改判。"),
      agents: inferAgents(m),
      market: m.market || inferMarket(m),
    };
    if (live) {
      delete out.iw;
      delete out.agents;
    }
    return out;
  }

  function tally(list) {
    const acc = { 主: 0, 平: 0, 客: 0, 观察: 0 };
    (list || []).forEach((a) => {
      const k = /客/.test(a.vote) ? "客" : /平/.test(a.vote) ? "平" : /主/.test(a.vote) ? "主" : "观察";
      acc[k] += 1;
    });
    return acc;
  }

  const PAST_JC = [
    { code: "001", league: "欧冠", date: "2026-10-20", kickoff: "01:00", home: "费内巴切", away: "斯拉维亚", sp: "1.38 / 4.55 / 5.40", pick: "主", dual: false, safe: false, env: "高可信", paperOppose: true, tag: "复盘挂", result: "平", score: "2-2", summary: "欧冠连不胜写了还是跟了 1.38。", factors: [] },
    { code: "002", league: "欧冠", date: "2026-10-20", kickoff: "01:00", home: "萨巴赫", away: "多特", sp: "9.00 / 5.90 / 1.18", pick: "平/客", dual: true, safe: false, env: "高可信", paperOppose: false, tag: "复盘中", result: "客", score: "1-2", summary: "1.18 带平是纪律。", factors: [] },
    { code: "004", league: "欧冠", date: "2026-10-20", kickoff: "03:00", home: "那不勒斯", away: "博德闪耀", sp: "1.63 / 4.10 / 3.68", pick: "主/平", dual: true, safe: false, env: "高可信", paperOppose: false, tag: "复盘中", result: "主", score: "4-3", summary: "主必须留。平没用上。", factors: [] },
    { code: "005", league: "欧冠", date: "2026-10-20", kickoff: "03:00", home: "罗马", away: "布拉迪斯拉发", sp: "1.20 / 6.20 / 9.50", pick: "主", dual: false, safe: false, env: "高可信", paperOppose: false, tag: "复盘中", result: "主", score: "4-0", summary: "深盘不默认平。", factors: [] },
    { code: "006", league: "欧冠", date: "2026-10-20", kickoff: "03:00", home: "巴黎", away: "巴萨", sp: "2.33 / 4.33 / 2.13", pick: "主/客", dual: true, safe: false, env: "高可信", paperOppose: false, tag: "复盘中", result: "主", score: "4-2", summary: "对开包两边。", factors: [] },
    { code: "007", league: "欧冠", date: "2026-10-20", kickoff: "03:45", home: "利物浦", away: "黄潜", sp: "1.32 / 4.70 / 6.27", pick: "主/平", dual: true, safe: false, env: "高可信", paperOppose: false, tag: "复盘中", result: "主", score: "4-3", summary: "0-2 落后能翻，带平成立。", factors: [] },
    { code: "008", league: "欧冠", date: "2026-10-20", kickoff: "03:45", home: "曼城", away: "AEK", sp: "1.18 / 6.80 / 10.0", pick: "主", dual: false, safe: false, env: "高可信", paperOppose: false, tag: "复盘中", result: "主", score: "5-1", summary: "深盘客队磨不满。", factors: [] },
    { code: "009", league: "欧冠", date: "2026-10-20", kickoff: "03:45", home: "斯图加特", away: "马竞", sp: "3.35 / 3.90 / 1.74", pick: "客", dual: false, safe: false, env: "高可信", paperOppose: true, tag: "复盘挂", result: "平", score: "1-1", summary: "早上平/客，下午让名额挂在自己刀上。", factors: [] },
    { code: "010", league: "欧冠", date: "2026-10-20", kickoff: "03:45", home: "波尔图", away: "PSV", sp: "1.34 / 4.80 / 5.75", pick: "主", dual: false, safe: false, env: "高可信", paperOppose: true, tag: "复盘挂", result: "客", score: "0-1", summary: "1.34 欧冠 0 分热主跟纸面。", factors: [] },
  ];

  function attach() {
    if (!global.CC_DATA._pastMerged) {
      global.CC_DATA.jczq.matches = PAST_JC.concat(global.CC_DATA.jczq.matches);
      global.CC_DATA._pastMerged = true;
    }
    const slateDate = { jczq: "2026-10-21", beidan: "2026-10-21", r14: "2026-10-21", r9: "2026-10-21" };
    ["jczq", "beidan", "r14", "r9"].forEach((key) => {
      if (!global.CC_DATA[key] || !global.CC_DATA[key].matches) return;
      (global.CC_DATA[key].matches || []).forEach((m) => {
        if (key === "r14" && m.source !== "live") m.date = Number(m.code) <= 7 ? "2026-10-20" : "2026-10-22";
        const live = m.source === "live" || m._mk;
        if (!live && !m.result) Object.assign(m, defaultExtras(m));
        delete m.agents;
        delete m.tally;
        delete m.iw;
        if (global.CC_ODDS) global.CC_ODDS.enrichMatch(m, slateDate[key]);
        if (global.CC_ENGINE) m.engine = global.CC_ENGINE.read(m);
        m.id = `${m.date}-${m.code}`;
      });
    });
  }

  global.CC_EXTRAS = { attach, tally };
  if (global.CC_DATA) attach();
})(window);
