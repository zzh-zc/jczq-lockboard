/**
 * 从 OPEN_JC / PAST_JC 生成 js/history-lock-cache.js（推 GitHub 即全站生效）
 * node scripts/build-history-lock-cache.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extras = fs.readFileSync(path.join(root, "js/extras.js"), "utf8");
const openM = extras.match(/const OPEN_JC = (\[[\s\S]*?\n  \]);/);
const pastM = extras.match(/const PAST_JC = (\[[\s\S]*?\n  \]);/);
if (!openM || !pastM) {
  console.error("OPEN_JC / PAST_JC not found");
  process.exit(1);
}
function stripFactors(s) {
  return s.replace(/factors:\s*eleven\(\{[\s\S]*?\}\),?/g, "factors: [],");
}
// eslint-disable-next-line no-eval
const OPEN_JC = eval(stripFactors(openM[1]));
// eslint-disable-next-line no-eval
const PAST_JC = eval(pastM[1]);

function slim(src) {
  if (!src || !(src.score || src.result)) return null;
  const slot = src.slot || (src.code ? `周二${String(src.code).replace(/\D/g, "").padStart(3, "0")}` : "");
  if (!/周[一二三四五六日]\d{3}/.test(slot)) return null;
  return {
    slot,
    code: src.code,
    league: src.league,
    home: src.home,
    away: src.away,
    date: src.date,
    kickoff: src.kickoff,
    sp: src.sp,
    pick: src.pick,
    dual: !!src.dual,
    tag: src.tag,
    env: src.env,
    paperOppose: !!src.paperOppose,
    ttgPicks: src.ttgPicks || [],
    ftScores: src.ftScores || [],
    hafuPicks: src.hafuPicks || [],
    summary: src.summary || "",
    score: src.score,
    result: src.result,
    htScore: src.htScore,
    sealed: true,
    manuscript: true,
    lock: true,
    source: "archive",
  };
}

const map = new Map();
OPEN_JC.forEach((row) => {
  const s = slim(row);
  if (s) map.set(s.slot, s);
});
PAST_JC.forEach((row) => {
  const s = slim(row);
  if (s) map.set(s.slot, s);
});

const matches = [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.slot).localeCompare(String(b.slot)));
const out = {
  at: new Date().toISOString().slice(0, 16).replace("T", " "),
  note: "已封存锁号，随仓库发布；比完场以本文件为准，页面只读。",
  matches,
};
const body = "window.CC_HISTORY_LOCK_CACHE = " + JSON.stringify(out, null, 0) + ";\n";
const target = path.join(root, "js/history-lock-cache.js");
fs.writeFileSync(target, body, "utf8");
console.log("wrote", target, "n=", matches.length);
