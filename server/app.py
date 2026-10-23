# -*- coding: utf-8 -*-
"""锁号台历史库 API：SQLite 挂载目录，已封存场次锁号字段不可改。"""
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("JCZQ_DB_PATH", str(ROOT / "data" / "jczq.db")))
API_KEY = os.environ.get("JCZQ_API_KEY", "")
PORT = int(os.environ.get("JCZQ_PORT", "8787"))

LOCK_COLS = (
    "pick", "dual", "tag", "env", "paper_oppose", "ttg_picks", "ft_scores",
    "hafu_picks", "had_picks", "hhad_picks", "summary", "factors", "sp",
)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


def now_iso():
    return datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S")


def conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with conn() as db:
        db.executescript((ROOT / "schema.sql").read_text(encoding="utf-8"))
        db.commit()


def row_to_match(r):
    if not r:
        return None
    d = dict(r)
    out = {
        "issueDate": d["issue_date"],
        "slot": d["slot"],
        "code": d.get("code") or "",
        "league": d.get("league") or "",
        "home": d["home"],
        "away": d["away"],
        "date": d.get("match_date") or d["issue_date"],
        "kickoff": d.get("kickoff") or "",
        "sp": d.get("sp") or "",
        "pick": d.get("pick") or "",
        "dual": bool(d.get("dual")),
        "tag": d.get("tag") or "",
        "env": d.get("env") or "",
        "paperOppose": bool(d.get("paper_oppose")),
        "score": d.get("score") or "",
        "result": d.get("result") or "",
        "htScore": d.get("ht_score") or "",
        "summary": d.get("summary") or "",
        "source": "db",
        "sealed": bool(d.get("sealed")),
        "manuscript": True,
        "lock": True,
    }
    for src, key in (
        ("ttg_picks", "ttgPicks"), ("ft_scores", "ftScores"), ("hafu_picks", "hafuPicks"),
        ("had_picks", "hadPicks"), ("hhad_picks", "hhadPicks"), ("factors", "factors"),
    ):
        raw = d.get(src)
        if raw:
            try:
                out[key] = json.loads(raw)
            except json.JSONDecodeError:
                out[key] = raw
    return out


def check_write():
    if not API_KEY:
        return None
    got = request.headers.get("X-JCZQ-Key") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if got != API_KEY:
        return jsonify({"ok": False, "error": "unauthorized"}), 401
    return None


def body_match():
    b = request.get_json(silent=True) or {}
    issue = b.get("issueDate") or b.get("issue_date") or ""
    slot = b.get("slot") or ""
    if not issue or not slot:
        return None, (jsonify({"ok": False, "error": "issueDate and slot required"}), 400)
    if not b.get("result") and not b.get("score"):
        return None, (jsonify({"ok": False, "error": "finished match needs result or score"}), 400)
    return b, None


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "db": str(DB_PATH), "exists": DB_PATH.is_file()})


@app.get("/api/history")
def list_history():
    since = request.args.get("since", "")
    days = int(request.args.get("days", "30") or "30")
    q = "SELECT * FROM jc_match_lock WHERE sealed = 1"
    args = []
    if since:
        q += " AND issue_date >= ?"
        args.append(since)
    q += " ORDER BY issue_date DESC, slot ASC LIMIT ?"
    args.append(max(1, min(days * 20, 500)))
    with conn() as db:
        rows = db.execute(q, args).fetchall()
    return jsonify({"ok": True, "matches": [row_to_match(r) for r in rows]})


@app.get("/api/history/one")
def one_history():
    issue = request.args.get("issueDate", "")
    slot = request.args.get("slot", "")
    if not issue or not slot:
        return jsonify({"ok": False, "error": "issueDate and slot required"}), 400
    with conn() as db:
        r = db.execute(
            "SELECT * FROM jc_match_lock WHERE issue_date = ? AND slot = ?",
            (issue, slot),
        ).fetchone()
    if not r:
        return jsonify({"ok": False, "error": "not found"}), 404
    return jsonify({"ok": True, "match": row_to_match(r)})


@app.post("/api/history/seal")
def seal_one():
    err = check_write()
    if err:
        return err
    b, bad = body_match()
    if bad:
        return bad
    issue = b.get("issueDate") or b.get("issue_date")
    slot = b["slot"]
    ts = now_iso()
    with conn() as db:
        old = db.execute(
            "SELECT * FROM jc_match_lock WHERE issue_date = ? AND slot = ?",
            (issue, slot),
        ).fetchone()
        if old and old["sealed"]:
            return jsonify({"ok": True, "skipped": True, "immutable": True, "match": row_to_match(old)})
        cols = {
            "issue_date": issue,
            "slot": slot,
            "code": b.get("code"),
            "league": b.get("league"),
            "home": b.get("home") or "",
            "away": b.get("away") or "",
            "match_date": b.get("date") or issue,
            "kickoff": b.get("kickoff"),
            "sp": b.get("sp"),
            "pick": b.get("pick"),
            "dual": 1 if b.get("dual") else 0,
            "tag": b.get("tag"),
            "env": b.get("env"),
            "paper_oppose": 1 if b.get("paperOppose") else 0,
            "ttg_picks": json.dumps(b.get("ttgPicks") or [], ensure_ascii=False),
            "ft_scores": json.dumps(b.get("ftScores") or [], ensure_ascii=False),
            "hafu_picks": json.dumps(b.get("hafuPicks") or [], ensure_ascii=False),
            "had_picks": json.dumps(b.get("hadPicks") or [], ensure_ascii=False),
            "hhad_picks": json.dumps(b.get("hhadPicks") or [], ensure_ascii=False),
            "summary": b.get("summary"),
            "factors": json.dumps(b.get("factors") or [], ensure_ascii=False),
            "score": b.get("score"),
            "result": b.get("result"),
            "ht_score": b.get("htScore") or b.get("ht_score"),
            "sealed": 1,
            "sealed_at": old["sealed_at"] if old else ts,
            "updated_at": ts,
        }
        db.execute(
            """INSERT INTO jc_match_lock (
               issue_date, slot, code, league, home, away, match_date, kickoff, sp,
               pick, dual, tag, env, paper_oppose, ttg_picks, ft_scores, hafu_picks,
               had_picks, hhad_picks, summary, factors, score, result, ht_score,
               sealed, sealed_at, updated_at
            ) VALUES (
               :issue_date, :slot, :code, :league, :home, :away, :match_date, :kickoff, :sp,
               :pick, :dual, :tag, :env, :paper_oppose, :ttg_picks, :ft_scores, :hafu_picks,
               :had_picks, :hhad_picks, :summary, :factors, :score, :result, :ht_score,
               :sealed, :sealed_at, :updated_at
            )""",
            cols,
        )
        r = db.execute(
            "SELECT * FROM jc_match_lock WHERE issue_date = ? AND slot = ?",
            (issue, slot),
        ).fetchone()
        db.commit()
    return jsonify({"ok": True, "created": True, "match": row_to_match(r)})


@app.post("/api/history/seal/batch")
def seal_batch():
    err = check_write()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    items = body.get("matches") or []
    out = []
    for b in items:
        with app.test_request_context(json=b, method="POST", headers=dict(request.headers)):
            resp = seal_one()
            if isinstance(resp, tuple):
                out.append({"slot": b.get("slot"), "ok": False, "status": resp[1]})
            else:
                data = resp.get_json()
                out.append({"slot": b.get("slot"), "ok": data.get("ok"), "skipped": data.get("skipped"), "created": data.get("created")})
    return jsonify({"ok": True, "results": out})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=PORT, debug=os.environ.get("JCZQ_DEBUG") == "1")
