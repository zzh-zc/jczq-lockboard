import fs from "fs";
const ex = fs.readFileSync("js/extras.js", "utf8");
const re = /slot: "(周五\d+)"[\s\S]*?ttgPicks: (\[[^\]]+\])[\s\S]*?ftScores: (\[[^\]]+\])/g;
let m;
let bad = 0;
while ((m = re.exec(ex))) {
  const ttg = eval(m[2]).map((x) => +String(x).replace(/\D/g, ""));
  const sc = eval(m[3]);
  const lo = Math.min(...ttg);
  const hi = Math.max(...ttg);
  const tots = sc.map((s) => {
    const h = s.match(/(\d+)-(\d+)/);
    return h ? +h[1] + +h[2] : -1;
  });
  const ok = tots.length >= 2 && tots.some((t) => t === lo) && tots.some((t) => t === hi);
  console.log(m[1], ttg.join("/"), sc.join("/"), ok ? "OK" : "BAD");
  if (!ok) bad += 1;
}
process.exit(bad ? 1 : 0);
