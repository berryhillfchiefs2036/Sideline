/* Sideline — little league game day tracker
   Source file. After editing, run:  npm run build   (writes app.js)          */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ============================ CONSTANTS ============================ */

const OFFENSE_SLOTS = ["LT", "LG", "C", "RG", "RT", "TE", "WR X", "WR Z", "QB", "RB", "FB"];
const DEFENSE_SLOTS = ["DE L", "DT L", "DT R", "DE R", "LB L", "MLB", "LB R", "CB L", "CB R", "FS", "SS"];
const SPECIAL_TEAMS = {
  kickoff: { label: "Kickoff", slots: ["K", "L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"] },
  kickReturn: { label: "Kick return", slots: ["Front L", "Front M", "Front R", "Wedge L", "Wedge M", "Wedge R", "Mid L", "Mid R", "KR 1", "KR 2", "Safety"] },
  punt: { label: "Punt", slots: ["P", "LS", "PP L", "PP R", "G L", "G R", "T L", "T R", "W L", "W R", "C"] },
  puntReturn: { label: "Punt return", slots: ["Rush L", "Rush M", "Rush R", "Hold L", "Hold R", "Mid L", "Mid M", "Mid R", "Wall", "PR", "Safety"] },
  fieldGoal: { label: "FG / PAT", slots: ["K", "H", "LS", "LT", "LG", "RG", "RT", "TE L", "TE R", "W L", "W R"] },
};
const ST_KEYS = Object.keys(SPECIAL_TEAMS);

const OFF_ACTIONS = [
  { key: "rush", label: "Ran it", hint: "carry" },
  { key: "catch", label: "Caught it", hint: "reception" },
  { key: "pass", label: "Threw it", hint: "completion" },
  { key: "fumble", label: "Fumbled", hint: "lost ball" },
];
const DEF_ACTIONS = [
  { key: "tackle", label: "Tackle", hint: "solo" },
  { key: "assist", label: "Assist", hint: "shared" },
  { key: "sack", label: "Sack", hint: "behind LOS" },
  { key: "int", label: "Interception", hint: "picked" },
  { key: "fumrec", label: "Fumble rec.", hint: "on the ball" },
  { key: "pbu", label: "Pass broken up", hint: "no catch" },
];
const ST_ACTIONS = [
  { key: "kick", label: "Kicked it", hint: "kick / punt" },
  { key: "return", label: "Returned it", hint: "runback" },
  { key: "tackle", label: "Tackle", hint: "coverage" },
  { key: "fumrec", label: "Recovered", hint: "loose ball" },
];
const SCORES = [
  { key: "none", label: "No score", pts: 0 },
  { key: "td", label: "Touchdown", pts: 6 },
  { key: "pat", label: "PAT kick", pts: 1 },
  { key: "two", label: "2-point", pts: 2 },
  { key: "fg", label: "Field goal", pts: 3 },
  { key: "safety", label: "Safety", pts: 2 },
];
const ORD = ["", "1st", "2nd", "3rd", "4th"];
const UNITS = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
  { key: "special", label: "Special" },
];
const VERB = { rush: "ran", catch: "caught", pass: "threw", return: "returned", tackle: "tackle",
  assist: "assist", sack: "sack", int: "interception", fumrec: "recovery", pbu: "pass broken up",
  fumble: "fumble", team: "team play", kick: "kicked" };

const uid = () => Math.random().toString(36).slice(2, 9);
const mkSlots = (labels) => labels.map((l) => ({ id: uid(), label: l, playerId: null, backupId: null }));
const freshLineups = () => ({
  offense: mkSlots(OFFENSE_SLOTS),
  defense: mkSlots(DEFENSE_SLOTS),
  special: ST_KEYS.reduce((a, k) => Object.assign({}, a, { [k]: mkSlots(SPECIAL_TEAMS[k].slots) }), {}),
});
const freshSquad = () => ({ roster: [], lineups: freshLineups(), minPlays: 8, rev: 0 });
const BASE = () => ({ quarter: 1, us: 0, them: 0, down: 1, distance: 10, unit: "offense",
  stKey: "kickoff", swaps: {}, plays: [] });

/* ============================ GAME FOLD ============================ */

function fold(ops) {
  const revoked = new Set();
  ops.forEach((o) => {
    if (o.type === "undo") (o.targets || [o.target]).forEach((t) => revoked.add(t));
  });
  let live = ops.filter((o) => o.type !== "undo" && !revoked.has(o.id));
  const lastReset = live.map((o) => o.type).lastIndexOf("reset");
  if (lastReset >= 0) live = live.slice(lastReset + 1);

  const g = BASE();
  live.forEach((o) => {
    if (o.type === "set") { g[o.field] = o.value; return; }
    if (o.type === "adj") { g[o.team] = Math.max(0, g[o.team] + o.delta); return; }
    if (o.type === "sub") {
      const k = o.unit === "special" ? o.stKey : "u";
      g.swaps[o.unit] = g.swaps[o.unit] || {};
      g.swaps[o.unit][k] = Object.assign({}, g.swaps[o.unit][k] || {}, { [o.slotId]: o.playerId });
      return;
    }
    if (o.type !== "play") return;

    const sc = SCORES.find((x) => x.key === o.score);
    const pts = sc ? sc.pts : 0;
    g.plays.push(Object.assign({}, o, { down: g.down, distance: g.distance, quarter: g.quarter }));
    if (pts > 0) {
      const ours = o.unit !== "defense" || o.score === "td" || o.score === "safety";
      if (ours) g.us += pts; else g.them += pts;
      g.down = 1; g.distance = 10;
    } else if (o.unit === "offense" || o.unit === "defense") {
      const gained = o.unit === "offense" ? o.yards || 0 : -(o.yards || 0);
      const turnover = o.action === "int" || o.action === "fumrec" || o.action === "fumble";
      if (turnover) { g.down = 1; g.distance = 10; g.unit = o.unit === "offense" ? "defense" : "offense"; }
      else if (gained >= g.distance) { g.down = 1; g.distance = 10; }
      else if (g.down >= 4) { g.down = 1; g.distance = 10; g.unit = o.unit === "offense" ? "defense" : "offense"; }
      else { g.down = g.down + 1; g.distance = Math.max(1, g.distance - gained); }
    }
  });
  g.live = live;
  return g;
}

const blank = () => ({ snaps: 0, off: 0, def: 0, st: 0, rush: 0, rushY: 0, rec: 0, recY: 0, passY: 0,
  tk: 0, ast: 0, sack: 0, int: 0, fr: 0, pbu: 0, td: 0, pts: 0 });

function tally(plays) {
  const m = {};
  const g = (id) => (m[id] = m[id] || blank());
  plays.forEach((p) => {
    (p.snaps || []).forEach((id) => {
      const s = g(id); s.snaps++;
      if (p.unit === "offense") s.off++; else if (p.unit === "defense") s.def++; else s.st++;
    });
    if (!p.playerId) return;
    const s = g(p.playerId), y = p.yards || 0;
    if (p.action === "rush") { s.rush++; s.rushY += y; }
    if (p.action === "catch") { s.rec++; s.recY += y; }
    if (p.action === "pass") s.passY += y;
    if (p.action === "return") s.rushY += y;
    if (p.action === "tackle") s.tk++;
    if (p.action === "assist") s.ast++;
    if (p.action === "sack") { s.sack++; s.tk++; }
    if (p.action === "int") s.int++;
    if (p.action === "fumrec") s.fr++;
    if (p.action === "pbu") s.pbu++;
    if (p.score === "td") s.td++;
    const sc = SCORES.find((x) => x.key === p.score);
    if (sc) s.pts += sc.pts;
  });
  return m;
}

/* ============================ STORAGE ============================ */

const LS = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } },
};

const K_ME = "sideline.me";
const K_SOLO_OPS = "sideline.solo.ops";
const K_SOLO_SQUAD = "sideline.solo.squad";
const kCrewOps = (c) => `sideline.crew.${c}.ops`;
const kCrewSquad = (c) => `sideline.crew.${c}.squad`;

const CFG = window.SIDELINE_CONFIG || {};
const CREW_ON = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && CFG.supabaseUrl.indexOf("YOUR-") < 0);
const sb = CREW_ON ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
const T_OPS = "sideline_ops";
const T_SQUAD = "sideline_squads";

const makeCode = () => {
  const A = "BCDFGHJKLMNPQRSTVWXYZ23456789";
  return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join("");
};

/* ============================ SYNC HOOK ============================ */

function useSideline() {
  const saved = LS.get(K_ME, null);
  const [me, setMe] = useState(() => {
    if (saved && saved.id) return { id: saved.id, name: saved.name || "" };
    const fresh = { id: uid(), name: "" };
    LS.set(K_ME, fresh);
    return fresh;
  });
  const [code, setCode] = useState(() => (saved && saved.code) || null);
  const [squad, setSquadLocal] = useState(() =>
    (saved && saved.code ? LS.get(kCrewSquad(saved.code), freshSquad()) : LS.get(K_SOLO_SQUAD, freshSquad())));
  const [mine, setMine] = useState(() =>
    (saved && saved.code ? LS.get(kCrewOps(saved.code), []) : LS.get(K_SOLO_OPS, [])));
  const [theirs, setTheirs] = useState({});
  const [sync, setSync] = useState({ state: code ? "connecting" : "solo", coaches: 1, at: null });
  const dirty = useRef(false);
  const meRef = useRef(me);
  meRef.current = me;

  /* ---- writers ---- */
  const pushOps = useCallback(async (ops, who) => {
    if (!code) { LS.set(K_SOLO_OPS, ops); return; }
    LS.set(kCrewOps(code), ops);
    if (!sb) return;
    const { error } = await sb.from(T_OPS).upsert({
      game_code: code, coach_id: who.id, coach_name: who.name || "Coach",
      ops, updated_at: new Date().toISOString(),
    }, { onConflict: "game_code,coach_id" });
    if (error) { dirty.current = true; setSync((s) => Object.assign({}, s, { state: "offline" })); }
    else { dirty.current = false; setSync((s) => Object.assign({}, s, { state: "live", at: Date.now() })); }
  }, [code]);

  const addOp = useCallback((op) => {
    setMine((prev) => {
      const next = prev.concat([Object.assign({ id: uid(), ts: Date.now(), by: meRef.current.id }, op)]).slice(-2000);
      pushOps(next, meRef.current);
      return next;
    });
  }, [pushOps]);

  const setSquad = useCallback((updater) => {
    setSquadLocal((prev) => {
      const base = typeof updater === "function" ? updater(prev) : updater;
      const next = Object.assign({}, base, { rev: Date.now() });
      if (code) {
        LS.set(kCrewSquad(code), next);
        if (sb) sb.from(T_SQUAD).upsert({ game_code: code, squad: next, rev: next.rev }, { onConflict: "game_code" })
          .then(({ error }) => { if (error) setSync((s) => Object.assign({}, s, { state: "offline" })); });
      } else LS.set(K_SOLO_SQUAD, next);
      return next;
    });
  }, [code]);

  /* ---- reader ---- */
  const pull = useCallback(async () => {
    if (!code || !sb) return;
    try {
      const rows = await sb.from(T_OPS).select("coach_id,coach_name,ops").eq("game_code", code);
      if (rows.error) throw rows.error;
      const got = {};
      (rows.data || []).forEach((r) => {
        if (r.coach_id === meRef.current.id) return;
        got[r.coach_id] = { name: r.coach_name, ops: r.ops || [] };
      });
      setTheirs(got);
      setSync({ state: dirty.current ? "offline" : "live", coaches: Object.keys(got).length + 1, at: Date.now() });

      const sq = await sb.from(T_SQUAD).select("squad,rev").eq("game_code", code).maybeSingle();
      if (!sq.error && sq.data && sq.data.squad) {
        setSquadLocal((prev) => {
          if ((sq.data.rev || 0) > (prev.rev || 0)) { LS.set(kCrewSquad(code), sq.data.squad); return sq.data.squad; }
          return prev;
        });
      }
      if (dirty.current) pushOps(mine, meRef.current);
    } catch (e) {
      setSync((s) => Object.assign({}, s, { state: "offline" }));
    }
  }, [code, mine, pushOps]);

  /* ---- realtime + safety poll ---- */
  useEffect(() => {
    if (!code) { setSync({ state: "solo", coaches: 1, at: null }); return; }
    if (!sb) { setSync({ state: "noconfig", coaches: 1, at: null }); return; }
    let alive = true;
    pull();
    const ch = sb.channel("sideline-" + code)
      .on("postgres_changes", { event: "*", schema: "public", table: T_OPS, filter: "game_code=eq." + code },
        () => { if (alive) pull(); })
      .on("postgres_changes", { event: "*", schema: "public", table: T_SQUAD, filter: "game_code=eq." + code },
        () => { if (alive) pull(); })
      .subscribe();
    const t = setInterval(() => { if (!document.hidden) pull(); }, 12000);
    const onShow = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("online", onShow);
    return () => {
      alive = false; clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("online", onShow);
      sb.removeChannel(ch);
    };
  }, [code, pull]);

  /* ---- crew membership ---- */
  const joinCrew = useCallback((c, name) => {
    const clean = (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length < 4) return;
    const next = { id: meRef.current.id, name: name !== undefined ? name : meRef.current.name };
    setMe(next);
    LS.set(K_ME, Object.assign({}, next, { code: clean }));
    setTheirs({});
    setMine(LS.get(kCrewOps(clean), []));
    setSquadLocal(LS.get(kCrewSquad(clean), freshSquad()));
    setSync({ state: "connecting", coaches: 1, at: null });
    setCode(clean);
  }, []);

  const renameMe = useCallback((name) => {
    const next = { id: meRef.current.id, name };
    setMe(next);
    LS.set(K_ME, code ? Object.assign({}, next, { code }) : next);
    if (code) pushOps(mine, next);
  }, [code, mine, pushOps]);

  const leaveCrew = useCallback(() => {
    LS.set(K_ME, { id: meRef.current.id, name: meRef.current.name });
    setCode(null); setTheirs({});
    setMine(LS.get(K_SOLO_OPS, []));
    setSquadLocal(LS.get(K_SOLO_SQUAD, freshSquad()));
  }, []);

  const allOps = useMemo(() => {
    const out = mine.map((o) => Object.assign({}, o, { byName: me.name || "You" }));
    Object.keys(theirs).forEach((k) => {
      (theirs[k].ops || []).forEach((o) => out.push(Object.assign({}, o, { byName: theirs[k].name || "Coach" })));
    });
    return out.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
  }, [mine, theirs, me]);

  return { me, code, squad, setSquad, allOps, addOp, sync, joinCrew, leaveCrew, renameMe, crewAvailable: CREW_ON };
}

/* ============================ APP ============================ */

function Sideline() {
  const S = useSideline();
  const { code, squad, setSquad, allOps, addOp, sync } = S;
  const [tab, setTab] = useState("game");
  const [sheet, setSheet] = useState(null);
  const [moving, setMoving] = useState(null);

  const game = useMemo(() => fold(allOps), [allOps]);
  const stats = useMemo(() => tally(game.plays), [game.plays]);
  const statOf = (id) => stats[id] || blank();
  const roster = squad.roster, lineups = squad.lineups, minPlays = squad.minPlays;
  const byId = useMemo(() => {
    const m = {}; roster.forEach((p) => { m[p.id] = p; }); return m;
  }, [roster]);

  const unitSlots = (game.unit === "special" ? lineups.special[game.stKey] : lineups[game.unit]) || [];
  const sKey = game.unit === "special" ? game.stKey : "u";
  const swaps = (game.swaps[game.unit] || {})[sKey] || {};
  const onField = unitSlots.map((s) => Object.assign({}, s, {
    playerId: swaps[s.id] !== undefined ? swaps[s.id] : s.playerId }));
  const fieldIds = onField.map((s) => s.playerId).filter(Boolean);

  const putIn = (slotId, playerId, group) =>
    addOp({ type: "sub", unit: game.unit, stKey: game.stKey, slotId, playerId, group });
  const assign = (slot, playerId) => {
    const group = uid();
    if (!playerId) { putIn(slot.id, null, group); return; }
    const elsewhere = onField.find((s) => s.playerId === playerId && s.id !== slot.id);
    if (elsewhere) putIn(elsewhere.id, slot.playerId || null, group);
    putIn(slot.id, playerId, group);
  };
  const logPlay = ({ playerId, action, yards, score }) => {
    addOp({ type: "play", unit: game.unit, stKey: game.unit === "special" ? game.stKey : null,
      playerId: playerId || null, action: action || null, yards: yards || 0,
      score: score && score !== "none" ? score : null, snaps: fieldIds });
    setSheet(null);
  };
  const lastUndoable = game.live.slice().reverse().find((o) => ["play", "sub", "adj", "set"].indexOf(o.type) >= 0);
  const undo = () => {
    if (!lastUndoable) return;
    const targets = lastUndoable.group
      ? game.live.filter((o) => o.group === lastUndoable.group).map((o) => o.id)
      : [lastUndoable.id];
    addOp({ type: "undo", targets });
  };

  const statusText = !code ? "Tap to add coaches"
    : sync.state === "noconfig" ? "needs setup"
    : sync.state === "offline" ? "saved on this phone, will retry"
    : sync.state === "connecting" ? "connecting"
    : `${sync.coaches} ${sync.coaches === 1 ? "coach" : "coaches"} · live`;

  return (
    <div className="sl">
      <div className="sl-in">
        <button className="crew" onClick={() => setSheet({ type: "crew" })}>
          <span className={"dot " + (!code ? "" : sync.state === "live" ? "live" : "err")} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{code ? "Crew " + code : "Just you"}</span>
          <span className="eyebrow" style={{ marginLeft: "auto" }}>{statusText}</span>
        </button>

        {tab === "game" && <GameTab {...{ game, addOp, onField, byId, statOf, minPlays, setSheet, logPlay,
          undo, canUndo: !!lastUndoable, roster, moving, setMoving, assign }} />}
        {tab === "roster" && <RosterTab squad={squad} setSquad={setSquad} statOf={statOf} />}
        {tab === "lineups" && <LineupsTab squad={squad} setSquad={setSquad} />}
        {tab === "stats" && <StatsTab {...{ roster, statOf, minPlays, game, addOp, code }} />}
      </div>

      {sheet && sheet.type === "play" && (
        <PlaySheet slot={sheet.slot} player={byId[sheet.slot.playerId]} unit={game.unit}
          onClose={() => setSheet(null)} onLog={logPlay} />)}
      {sheet && sheet.type === "sub" && (
        <SubSheet slot={sheet.slot} roster={roster} byId={byId} onField={onField} statOf={statOf}
          minPlays={minPlays} onClose={() => setSheet(null)}
          onPick={(pid) => { assign(sheet.slot, pid); setSheet(null); }} />)}
      {sheet && sheet.type === "crew" && (
        <CrewSheet me={S.me} code={code} sync={sync} available={S.crewAvailable} onJoin={S.joinCrew}
          onLeave={S.leaveCrew} onRename={S.renameMe} onClose={() => setSheet(null)} />)}

      <nav className="nav">
        {[["game", "Game"], ["roster", "Roster"], ["lineups", "Lineups"], ["stats", "Stats"]].map((t) => (
          <button key={t[0]} className={tab === t[0] ? "on" : ""} onClick={() => setTab(t[0])}>{t[1]}</button>
        ))}
      </nav>
    </div>
  );
}

/* ============================ GAME TAB ============================ */

function GameTab({ game, addOp, onField, byId, statOf, minPlays, setSheet, logPlay, undo, canUndo, roster, moving, setMoving, assign }) {
  const set = (field, value) => addOp({ type: "set", field, value });
  const filled = onField.filter((s) => s.playerId).length;
  const movingSlot = moving ? onField.find((s) => s.id === moving) : null;
  const movingPlayer = movingSlot ? byId[movingSlot.playerId] : null;

  const tapCard = (s) => {
    if (moving) {
      if (s.id === moving) { setMoving(null); return; }
      if (movingSlot) assign(s, movingSlot.playerId);
      setMoving(null);
      return;
    }
    setSheet({ type: s.playerId ? "play" : "sub", slot: s });
  };

  return (
    <React.Fragment>
      <div className="board">
        <div className="board-top">
          <div className="score-blk">
            <div className="eyebrow">Us</div>
            <div className="score-num">{game.us}</div>
            <div className="score-btns">
              <button className="tick" onClick={() => addOp({ type: "adj", team: "us", delta: -1 })}>−</button>
              <button className="tick" onClick={() => addOp({ type: "adj", team: "us", delta: 1 })}>+</button>
            </div>
          </div>
          <div className="dd">
            <div className="dd-main">{ORD[game.down]} <small>&amp;</small> {game.distance}</div>
            <div className="dd-sub">Quarter {game.quarter} · {game.plays.length} plays run</div>
          </div>
          <div className="score-blk">
            <div className="eyebrow">Them</div>
            <div className="score-num">{game.them}</div>
            <div className="score-btns">
              <button className="tick" onClick={() => addOp({ type: "adj", team: "them", delta: -1 })}>−</button>
              <button className="tick" onClick={() => addOp({ type: "adj", team: "them", delta: 1 })}>+</button>
            </div>
          </div>
        </div>
        <div className="board-btm">
          {[1, 2, 3, 4].map((d) => (
            <button key={d} className={"chip" + (game.down === d ? " on" : "")} onClick={() => set("down", d)}>{ORD[d]}</button>
          ))}
        </div>
        <div className="board-btm">
          {[1, 2, 3, 5, 10, 15].map((d) => (
            <button key={d} className={"chip" + (game.distance === d ? " on" : "")} onClick={() => set("distance", d)}>{d}</button>
          ))}
          <button className="chip" onClick={() => set("quarter", (game.quarter % 4) + 1)}>Q{game.quarter}</button>
        </div>
      </div>

      <div className="units">
        {UNITS.map((u) => (
          <button key={u.key} className={"unit " + u.key + (game.unit === u.key ? " on" : "")}
            onClick={() => set("unit", u.key)}>{u.label}</button>
        ))}
      </div>

      {game.unit === "special" && (
        <div className="stbar">
          {ST_KEYS.map((k) => (
            <button key={k} className={game.stKey === k ? "on" : ""} onClick={() => set("stKey", k)}>
              {SPECIAL_TEAMS[k].label}</button>
          ))}
        </div>
      )}

      {moving && (
        <div className="banner">
          <b>Moving {movingPlayer ? "#" + movingPlayer.num + " " + movingPlayer.name : "player"}.</b>
          <span style={{ color: "var(--soft)" }}>Tap any spot to drop them in.</span>
          <button className="mini" style={{ marginLeft: "auto" }} onClick={() => setMoving(null)}>Cancel</button>
        </div>
      )}

      {roster.length === 0 ? (
        <div className="empty-note" style={{ marginTop: 10 }}>
          No players yet. Open <b>Roster</b> to add your team, then set starters in <b>Lineups</b>.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 10 }}>
          {onField.map((s) => {
            const p = byId[s.playerId];
            const st = p ? statOf(p.id) : null;
            const backup = byId[s.backupId];
            const cls = "pcard" + (p ? "" : " empty") + (moving === s.id ? " moving" : moving ? " target" : "");
            return (
              <div key={s.id} className={cls}>
                <div className="pc-top" role="button" tabIndex={0} onClick={() => tapCard(s)}
                  onKeyDown={(e) => { if (e.key === "Enter") tapCard(s); }}>
                  <div className="plate">{p ? p.num : "—"}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pc-slot">{s.label}</div>
                    <div className="pc-name">{p ? p.name : moving ? "Drop them here" : "Open spot"}</div>
                  </div>
                </div>
                <div className="pc-btm">
                  <Chain count={st ? st.snaps : 0} min={minPlays} />
                  <div style={{ display: "flex", gap: 5 }}>
                    {p && <button className="sub-btn" onClick={() => setMoving(moving === s.id ? null : s.id)}>
                      {moving === s.id ? "×" : "Move"}</button>}
                    <button className={"sub-btn" + (backup && backup.id !== s.playerId ? " ready" : "")}
                      onClick={() => setSheet({ type: "sub", slot: s })}>
                      {backup && backup.id !== s.playerId ? "⇄ " + backup.num : "Sub"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="actionbar">
        <button className="abtn" disabled={filled === 0}
          onClick={() => logPlay({ playerId: null, action: "team", yards: 0, score: "none" })}>Snap, no stat</button>
        <button className="abtn ghost" disabled={!canUndo} onClick={undo}>Undo</button>
      </div>

      <PlayLog game={game} byId={byId} />
    </React.Fragment>
  );
}

function Chain({ count, min }) {
  const marks = Math.max(min, 1);
  const short = count < min;
  return (
    <div className={"chain" + (short ? " short" : "")} title={count + " plays"}>
      {Array.from({ length: marks }).map((_, i) => (
        <i key={i} className={i < count ? (short ? "o" : "f") : ""} />
      ))}
      {count > marks && <i className="f" style={{ width: 9 }} />}
    </div>
  );
}

function PlayLog({ game, byId }) {
  const recent = game.plays.slice(-14).reverse();
  if (!recent.length) return null;
  return (
    <React.Fragment>
      <div className="sechd"><div className="h2">Play log</div><div className="eyebrow">Latest first</div></div>
      <div>
        {recent.map((p) => {
          const pl = byId[p.playerId];
          const sc = SCORES.find((x) => x.key === p.score);
          return (
            <div className="logline" key={p.id}>
              <span className="eyebrow">{ORD[p.down]} &amp; {p.distance}</span>
              <span>
                {pl ? <b>#{pl.num} {pl.name}</b> : <b>Whole unit</b>}{" "}
                {VERB[p.action] || ""}{" "}
                {["rush", "catch", "pass", "return"].indexOf(p.action) >= 0 ? p.yards + " yd" : ""}
                {sc && <span style={{ color: "var(--stop)", fontWeight: 700 }}> · {sc.label}</span>}
              </span>
              <span className="who">{p.byName || ""}</span>
            </div>
          );
        })}
      </div>
    </React.Fragment>
  );
}

/* ============================ SHEETS ============================ */

function PlaySheet({ slot, player, unit, onClose, onLog }) {
  const actions = unit === "offense" ? OFF_ACTIONS : unit === "defense" ? DEF_ACTIONS : ST_ACTIONS;
  const [action, setAction] = useState(actions[0].key);
  const [yards, setYards] = useState(0);
  const [score, setScore] = useState("none");
  const needsYards = ["rush", "catch", "pass", "return", "kick"].indexOf(action) >= 0;
  if (!player) return null;
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-hd">
          <div className="plate">{player.num}</div>
          <div>
            <div className="sheet-ttl">{player.name}</div>
            <div className="eyebrow">{slot.label} · {unit}</div>
          </div>
          <button className="close" onClick={onClose}>Cancel</button>
        </div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>What happened</div>
        <div className="opts">
          {actions.map((a) => (
            <button key={a.key} className={"opt" + (action === a.key ? " on" : "")} onClick={() => setAction(a.key)}>
              <div className="opt-l">{a.label}</div><div className="opt-h">{a.hint}</div>
            </button>
          ))}
        </div>
        {needsYards && (
          <div className="yardbox">
            <div className="eyebrow" style={{ textAlign: "center" }}>Yards</div>
            <div className={"yardnum " + (yards > 0 ? "gain" : yards < 0 ? "loss" : "zero")}>
              {yards > 0 ? "+" : ""}{yards}</div>
            <div className="yardrow">
              <button onClick={() => setYards((y) => y - 5)}>−5</button>
              <button onClick={() => setYards((y) => y - 1)}>−1</button>
              <button onClick={() => setYards(0)}>0</button>
              <button onClick={() => setYards((y) => y + 1)}>+1</button>
              <button onClick={() => setYards((y) => y + 5)}>+5</button>
              <button onClick={() => setYards((y) => y + 10)}>+10</button>
            </div>
          </div>
        )}
        <div className="eyebrow" style={{ margin: "12px 0 6px" }}>Points on the play</div>
        <div className="opts">
          {SCORES.map((s) => (
            <button key={s.key} className={"opt" + (score === s.key ? " on" : "")} onClick={() => setScore(s.key)}>
              <div className="opt-l">{s.label}</div><div className="opt-h">{s.pts ? "+" + s.pts : "—"}</div>
            </button>
          ))}
        </div>
        <button className="confirm"
          onClick={() => onLog({ playerId: player.id, action, yards: needsYards ? yards : 0, score })}>
          Log the play</button>
      </div>
    </div>
  );
}

function SubSheet({ slot, roster, byId, onField, statOf, minPlays, onClose, onPick }) {
  const [q, setQ] = useState("");
  const fieldIds = onField.map((s) => s.playerId).filter(Boolean);
  const backup = byId[slot.backupId];
  const current = byId[slot.playerId];
  const match = (p) => !p ? false : (!q.trim()
    || p.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 || String(p.num).indexOf(q) === 0);
  const bench = roster.filter((p) => fieldIds.indexOf(p.id) < 0 && match(p))
    .sort((a, b) => statOf(a.id).snaps - statOf(b.id).snaps);
  const others = onField.filter((s) => s.playerId && s.id !== slot.id && match(byId[s.playerId]));

  const Line = ({ p, note }) => {
    if (!p) return null;
    const st = statOf(p.id);
    return (
      <button className="row" style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => onPick(p.id)}>
        <div className="plate">{p.num}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
          <div className="eyebrow">{note || p.pos || "any spot"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Chain count={st.snaps} min={minPlays} />
          <div className="eyebrow" style={{ marginTop: 3 }}>{st.snaps} plays</div>
        </div>
      </button>
    );
  };

  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-hd">
          <div className="plate">{current ? current.num : "—"}</div>
          <div>
            <div className="sheet-ttl">{slot.label}</div>
            <div className="eyebrow">{current ? current.name + " is in" : "Nobody in this spot"}</div>
          </div>
          <button className="close" onClick={onClose}>Cancel</button>
        </div>
        {backup && backup.id !== slot.playerId && !q && (
          <button className="confirm" style={{ marginTop: 0, marginBottom: 12 }} onClick={() => onPick(backup.id)}>
            Send in #{backup.num} {backup.name}</button>
        )}
        <input className="inp" placeholder="Find any player by name or number" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
        <div className="eyebrow" style={{ marginBottom: 6 }}>On the bench · fewest plays first</div>
        {bench.length === 0 && <div className="empty-note" style={{ marginBottom: 10 }}>Nobody on the bench matches.</div>}
        {bench.map((p) => <Line key={p.id} p={p} />)}
        {others.length > 0 && (
          <React.Fragment>
            <div className="eyebrow" style={{ margin: "14px 0 6px" }}>Already on the field · they trade spots</div>
            {others.map((s) => <Line key={s.id} p={byId[s.playerId]} note={"at " + s.label + " now, moves here"} />)}
          </React.Fragment>
        )}
        {current && (
          <button className="abtn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => onPick(null)}>
            Leave this spot open</button>
        )}
      </div>
    </div>
  );
}

function CrewSheet({ me, code, sync, available, onJoin, onLeave, onRename, onClose }) {
  const [entry, setEntry] = useState("");
  const [name, setName] = useState((me && me.name) || "");
  const ready = entry.replace(/[^A-Za-z0-9]/g, "").length >= 4;
  return (
    <div className="veil" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-hd">
          <div>
            <div className="sheet-ttl">{code ? "Your coaching crew" : "Coach together"}</div>
            <div className="eyebrow">{code ? sync.coaches + " on this game" : "One game, several phones"}</div>
          </div>
          <button className="close" onClick={onClose}>Done</button>
        </div>

        {!available && !code && (
          <div className="empty-note" style={{ textAlign: "left", marginBottom: 14 }}>
            Sharing a game across phones needs a database. Add your Supabase URL and anon key to <b>config.js</b> in the
            repo and this turns on. Until then everything works fine on one phone.
          </div>
        )}

        {code ? (
          <React.Fragment>
            <div className="yardbox" style={{ marginTop: 0, textAlign: "center" }}>
              <div className="eyebrow">Crew code</div>
              <div className="bigcode">{code}</div>
              <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.5 }}>
                Send the other coaches this page's link and these four letters. Everyone who types it in shares one roster,
                one score, one play log.
              </div>
            </div>
            {sync.state === "offline" && (
              <div className="banner" style={{ marginTop: 10 }}>
                <b>No connection.</b>
                <span style={{ color: "var(--soft)" }}>Keep tracking — everything saves here and uploads when you're back.</span>
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <input className="inp" placeholder="Your name (shows on the play log)" value={name}
                onChange={(e) => setName(e.target.value)} />
              <button className="mini dark" onClick={() => onRename(name)}>Save</button>
            </div>
            <button className="abtn ghost" style={{ width: "100%", marginTop: 10 }}
              onClick={() => { onLeave(); onClose(); }}>Coach on my own instead</button>
            <div className="empty-note" style={{ textAlign: "left", marginTop: 12 }}>
              Anyone with this link and code can read and change the game. Keep it to jersey numbers and first names.
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="row" style={{ marginBottom: 14 }}>
              <input className="inp" placeholder="Your name (shows on the play log)" value={name}
                onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Start a crew</div>
            <button className="confirm" style={{ marginTop: 0 }} disabled={!available}
              onClick={() => onJoin(makeCode(), name)}>Create a code</button>
            <div className="eyebrow" style={{ margin: "18px 0 6px" }}>Or join one</div>
            <input className="inp code-inp" placeholder="CODE" maxLength={4} value={entry}
              onChange={(e) => setEntry(e.target.value.toUpperCase())} />
            <button className="confirm alt" disabled={!ready || !available} onClick={() => onJoin(entry, name)}>
              Join this game</button>
            <div className="empty-note" style={{ textAlign: "left", marginTop: 14 }}>
              Your solo roster stays on this phone and comes back if you leave the crew.
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

/* ============================ ROSTER ============================ */

function RosterTab({ squad, setSquad, statOf }) {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [pos, setPos] = useState("");
  const [bulk, setBulk] = useState("");

  const add = () => {
    if (!name.trim() || !num.trim()) return;
    setSquad((s) => Object.assign({}, s, {
      roster: s.roster.concat([{ id: uid(), name: name.trim(), num: num.trim(), pos: pos.trim() }]) }));
    setName(""); setNum(""); setPos("");
  };
  const addBulk = () => {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((l) => {
      const m = l.match(/^(\d+)\s*[,\t ]\s*(.+)$/);
      return m ? { id: uid(), num: m[1], name: m[2].trim(), pos: "" } : null;
    }).filter(Boolean);
    if (!parsed.length) return;
    setSquad((s) => Object.assign({}, s, { roster: s.roster.concat(parsed) }));
    setBulk("");
  };
  const remove = (id) => {
    const strip = (arr) => arr.map((s) => Object.assign({}, s, {
      playerId: s.playerId === id ? null : s.playerId,
      backupId: s.backupId === id ? null : s.backupId }));
    setSquad((s) => Object.assign({}, s, {
      roster: s.roster.filter((p) => p.id !== id),
      lineups: {
        offense: strip(s.lineups.offense),
        defense: strip(s.lineups.defense),
        special: ST_KEYS.reduce((a, k) => Object.assign({}, a, { [k]: strip(s.lineups.special[k]) }), {}),
      },
    }));
  };
  const sorted = squad.roster.slice().sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0));

  return (
    <React.Fragment>
      <div className="sechd"><div className="h2">Roster</div><div className="eyebrow">{squad.roster.length} players</div></div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <input className="inp" style={{ flex: "0 0 68px" }} placeholder="#" value={num} inputMode="numeric"
          onChange={(e) => setNum(e.target.value)} />
        <input className="inp" style={{ flex: 1, minWidth: 120 }} placeholder="Player name" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <input className="inp" style={{ flex: "1 1 100%" }} placeholder="Positions they can play (RB, LB…)" value={pos}
          onChange={(e) => setPos(e.target.value)} />
        <button className="mini dark" style={{ flex: "1 1 100%", padding: 12 }} onClick={add}>Add player</button>
      </div>

      <details className="fold">
        <summary>Paste a whole roster</summary>
        <textarea className="inp" rows={5} placeholder={"12 Jordan Blair\n7 Sam Ortiz\n44 Eli Ward"} value={bulk}
          onChange={(e) => setBulk(e.target.value)} />
        <button className="mini dark" style={{ width: "100%", padding: 11, marginTop: 8 }} onClick={addBulk}>
          Add these players</button>
      </details>

      {sorted.length === 0 && <div className="empty-note">Add your first player above. Number and name are all you need.</div>}
      {sorted.map((p) => (
        <div className="row" key={p.id}>
          <div className="plate">{p.num}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
            <div className="eyebrow">{p.pos || "no positions listed"} · {statOf(p.id).snaps} plays</div>
          </div>
          <button className="mini" onClick={() => remove(p.id)}>Remove</button>
        </div>
      ))}

      <div className="sechd"><div className="h2">Play minimum</div></div>
      <div className="row">
        <div style={{ flex: 1, fontSize: 14, color: "var(--soft)" }}>
          Plays each kid should get. The chain on every card fills toward this number and turns red when they're short.
        </div>
        <input className="inp" style={{ width: 72, textAlign: "center", fontSize: 20, fontWeight: 700 }} inputMode="numeric"
          value={squad.minPlays}
          onChange={(e) => setSquad((s) => Object.assign({}, s, { minPlays: Math.max(1, parseInt(e.target.value, 10) || 1) }))} />
      </div>
    </React.Fragment>
  );
}

/* ============================ LINEUPS ============================ */

function LineupsTab({ squad, setSquad }) {
  const [unit, setUnit] = useState("offense");
  const [stKey, setStKey] = useState("kickoff");
  const slots = (unit === "special" ? squad.lineups.special[stKey] : squad.lineups[unit]) || [];

  const update = (slotId, field, value) => {
    const edit = (arr) => arr.map((s) => (s.id === slotId ? Object.assign({}, s, { [field]: value || null }) : s));
    setSquad((s) => (unit === "special"
      ? Object.assign({}, s, { lineups: Object.assign({}, s.lineups, {
          special: Object.assign({}, s.lineups.special, { [stKey]: edit(s.lineups.special[stKey]) }) }) })
      : Object.assign({}, s, { lineups: Object.assign({}, s.lineups, { [unit]: edit(s.lineups[unit]) }) })));
  };
  const used = slots.filter((s) => s.playerId).length;

  return (
    <React.Fragment>
      <div className="sechd"><div className="h2">Lineups</div><div className="eyebrow">{used} of 11 set</div></div>
      <div className="units">
        {UNITS.map((u) => (
          <button key={u.key} className={"unit " + u.key + (unit === u.key ? " on" : "")}
            onClick={() => setUnit(u.key)}>{u.label}</button>
        ))}
      </div>
      {unit === "special" && (
        <div className="stbar">
          {ST_KEYS.map((k) => (
            <button key={k} className={stKey === k ? "on" : ""} onClick={() => setStKey(k)}>{SPECIAL_TEAMS[k].label}</button>
          ))}
        </div>
      )}
      {squad.roster.length === 0 ? (
        <div className="empty-note">Add players on the <b>Roster</b> tab first, then assign them here.</div>
      ) : slots.map((s) => (
        <div className="row" key={s.id} style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="plate" style={{ minWidth: 58, fontSize: 14, letterSpacing: ".08em" }}>{s.label}</div>
          <select className="inp" style={{ flex: 1, minWidth: 130 }} value={s.playerId || ""}
            onChange={(e) => update(s.id, "playerId", e.target.value)}>
            <option value="">Starter…</option>
            {squad.roster.map((p) => <option key={p.id} value={p.id}>#{p.num} {p.name}</option>)}
          </select>
          <select className="inp" style={{ flex: 1, minWidth: 130 }} value={s.backupId || ""}
            onChange={(e) => update(s.id, "backupId", e.target.value)}>
            <option value="">Sub…</option>
            {squad.roster.map((p) => <option key={p.id} value={p.id}>#{p.num} {p.name}</option>)}
          </select>
        </div>
      ))}
      <div style={{ height: 8 }} />
      <div className="empty-note" style={{ textAlign: "left" }}>
        These are starting points, not rules. During the game <b>Sub</b> opens the whole roster for that spot, and
        <b> Move</b> picks a player up so you can drop them anywhere on the field.
      </div>
    </React.Fragment>
  );
}

/* ============================ STATS ============================ */

function StatsTab({ roster, statOf, minPlays, game, addOp, code }) {
  const [view, setView] = useState("plays");
  const rows = roster.map((p) => ({ p, s: statOf(p.id) }));

  if (!roster.length) {
    return <div style={{ marginTop: 20 }}><div className="empty-note">Stats show up here once you have players and plays.</div></div>;
  }
  const plays = rows.slice().sort((a, b) => a.s.snaps - b.s.snaps);
  const short = plays.filter((r) => r.s.snaps < minPlays);

  const exportCsv = () => {
    const head = ["Number", "Name", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds",
      "Catches", "RecYds", "PassYds", "Tackles", "Assists", "Sacks", "Int", "FumRec", "PBU", "TD", "Points"];
    const body = rows.slice().sort((a, b) => (parseInt(a.p.num, 10) || 0) - (parseInt(b.p.num, 10) || 0))
      .map(({ p, s }) => [p.num, p.name, s.snaps, s.off, s.def, s.st, s.rush, s.rushY, s.rec, s.recY,
        s.passY, s.tk, s.ast, s.sack, s.int, s.fr, s.pbu, s.td, s.pts]);
    const csv = [head].concat(body).map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sideline-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <React.Fragment>
      <div className="sechd"><div className="h2">Stats</div><div className="eyebrow">{game.plays.length} plays</div></div>
      <div className="stbar">
        {[["plays", "Play count"], ["off", "Offense"], ["def", "Defense"]].map((v) => (
          <button key={v[0]} className={view === v[0] ? "on" : ""} onClick={() => setView(v[0])}>{v[1]}</button>
        ))}
      </div>

      {view === "plays" && (
        <React.Fragment>
          {short.length > 0 && (
            <div className="row" style={{ background: "#F7EAE6", borderColor: "#E0C4BC" }}>
              <div style={{ fontSize: 14 }}>
                <b>{short.length} {short.length === 1 ? "player is" : "players are"} under {minPlays} plays.</b>{" "}
                <span style={{ color: "var(--soft)" }}>
                  Get them in: {short.slice(0, 6).map((r) => "#" + r.p.num).join(", ")}</span>
              </div>
            </div>
          )}
          <table>
            <thead><tr><th>Player</th><th>Off</th><th>Def</th><th>Spec</th><th>Total</th></tr></thead>
            <tbody>
              {plays.map(({ p, s }) => (
                <tr key={p.id} className={s.snaps < minPlays ? "short" : ""}>
                  <td><b>#{p.num}</b> {p.name}</td>
                  <td className="n">{s.off}</td><td className="n">{s.def}</td><td className="n">{s.st}</td>
                  <td className="n" style={{ color: s.snaps < minPlays ? "var(--stop)" : "var(--go)" }}>{s.snaps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}

      {view === "off" && (
        <table>
          <thead><tr><th>Player</th><th>Car</th><th>Rush</th><th>Rec</th><th>Yds</th><th>Pass</th><th>TD</th></tr></thead>
          <tbody>
            {rows.slice().sort((a, b) => (b.s.rushY + b.s.recY) - (a.s.rushY + a.s.recY)).map(({ p, s }) => (
              <tr key={p.id}>
                <td><b>#{p.num}</b> {p.name}</td>
                <td className="n">{s.rush}</td><td className="n">{s.rushY}</td>
                <td className="n">{s.rec}</td><td className="n">{s.recY}</td>
                <td className="n">{s.passY}</td><td className="n">{s.td}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === "def" && (
        <table>
          <thead><tr><th>Player</th><th>Tkl</th><th>Ast</th><th>Sck</th><th>Int</th><th>FR</th><th>PBU</th></tr></thead>
          <tbody>
            {rows.slice().sort((a, b) => b.s.tk - a.s.tk).map(({ p, s }) => (
              <tr key={p.id}>
                <td><b>#{p.num}</b> {p.name}</td>
                <td className="n">{s.tk}</td><td className="n">{s.ast}</td><td className="n">{s.sack}</td>
                <td className="n">{s.int}</td><td className="n">{s.fr}</td><td className="n">{s.pbu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="sechd"><div className="h2">After the game</div></div>
      <div className="actionbar" style={{ marginTop: 0 }}>
        <button className="abtn" onClick={exportCsv}>Download stats</button>
        <button className="abtn ghost" onClick={() => {
          const msg = code
            ? "Clear the score, play log, and every stat for all coaches? Roster and lineups stay put."
            : "Clear the score, play log, and every stat? Roster and lineups stay put.";
          if (window.confirm(msg)) addOp({ type: "reset" });
        }}>Start a new game</button>
      </div>
    </React.Fragment>
  );
}

/* ============================ MOUNT ============================ */

ReactDOM.createRoot(document.getElementById("root")).render(<Sideline />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}
