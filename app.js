/* Sideline — little league game day tracker
   Source file. After editing, run:  npm run build   (writes app.js)          */

const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} = React;

/* ============================ CONSTANTS ============================ */

const OFFENSE_SLOTS = ["LT", "LG", "C", "RG", "RT", "TE", "WR X", "WR Z", "QB", "RB", "FB"];
const DEFENSE_SLOTS = ["DE L", "DT L", "DT R", "DE R", "LB L", "MLB", "LB R", "CB L", "CB R", "FS", "SS"];
const SPECIAL_TEAMS = {
  kickoff: {
    label: "Kickoff",
    slots: ["K", "L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"]
  },
  kickReturn: {
    label: "Kick return",
    slots: ["Front L", "Front M", "Front R", "Wedge L", "Wedge M", "Wedge R", "Mid L", "Mid R", "KR 1", "KR 2", "Safety"]
  },
  punt: {
    label: "Punt",
    slots: ["P", "LS", "PP L", "PP R", "G L", "G R", "T L", "T R", "W L", "W R", "C"]
  },
  puntReturn: {
    label: "Punt return",
    slots: ["Rush L", "Rush M", "Rush R", "Hold L", "Hold R", "Mid L", "Mid M", "Mid R", "Wall", "PR", "Safety"]
  },
  fieldGoal: {
    label: "FG / PAT",
    slots: ["K", "H", "LS", "LT", "LG", "RG", "RT", "TE L", "TE R", "W L", "W R"]
  }
};
const ST_KEYS = Object.keys(SPECIAL_TEAMS);
const OFF_ACTIONS = [{
  key: "rush",
  label: "Ran it",
  hint: "carry"
}, {
  key: "catch",
  label: "Caught it",
  hint: "reception"
}, {
  key: "incomplete",
  label: "Incomplete pass",
  hint: "no catch"
}, {
  key: "conv",
  label: "Conversion good",
  hint: "pick the points below"
}, {
  key: "convfail",
  label: "Conversion failed",
  hint: "attempt counts, no points"
}, {
  key: "fumble",
  label: "Fumble, lost it",
  hint: "they got the ball"
}, {
  key: "fumkept",
  label: "Fumble, kept it",
  hint: "we recovered it"
}];
const DEF_ACTIONS = [{
  key: "tackle",
  label: "Tackle",
  hint: "solo"
}, {
  key: "assist",
  label: "Assist",
  hint: "shared"
}, {
  key: "tfl",
  label: "Tackle for loss",
  hint: "behind the line"
}, {
  key: "sack",
  label: "Sack",
  hint: "behind LOS"
}, {
  key: "int",
  label: "Interception",
  hint: "picked"
}, {
  key: "fumrec",
  label: "Fumble rec.",
  hint: "on the ball"
}, {
  key: "pbu",
  label: "Pass broken up",
  hint: "no catch"
}];
const ST_ACTIONS = [{
  key: "kick",
  label: "Kicked it",
  hint: "kick / punt"
}, {
  key: "return",
  label: "Returned it",
  hint: "runback"
}, {
  key: "fga",
  label: "FG attempt",
  hint: "add the score if good"
}, {
  key: "conv",
  label: "Conversion good",
  hint: "pick the points below"
}, {
  key: "convfail",
  label: "Conversion failed",
  hint: "attempt counts, no points"
}, {
  key: "tackle",
  label: "Tackle",
  hint: "coverage"
}, {
  key: "fumrec",
  label: "Recovered",
  hint: "loose ball"
}];
const PENALTIES = [{
  key: "falsestart",
  label: "False start",
  yds: 5
}, {
  key: "offside",
  label: "Offside",
  yds: 5
}, {
  key: "encroachment",
  label: "Encroachment",
  yds: 5
}, {
  key: "delay",
  label: "Delay of game",
  yds: 5
}, {
  key: "illform",
  label: "Illegal formation",
  yds: 5
}, {
  key: "illmotion",
  label: "Illegal motion",
  yds: 5
}, {
  key: "toomany",
  label: "Too many players",
  yds: 5
}, {
  key: "holdoff",
  label: "Holding — offense",
  yds: 10
}, {
  key: "holddef",
  label: "Holding — defense",
  yds: 10
}, {
  key: "blockback",
  label: "Block in the back",
  yds: 10
}, {
  key: "handsface",
  label: "Hands to the face",
  yds: 10
}, {
  key: "tripping",
  label: "Tripping",
  yds: 10
}, {
  key: "grounding",
  label: "Intentional grounding",
  yds: 10
}, {
  key: "facemask",
  label: "Face mask",
  yds: 15
}, {
  key: "opi",
  label: "Pass interference — offense",
  yds: 15
}, {
  key: "dpi",
  label: "Pass interference — defense",
  yds: 15
}, {
  key: "roughpass",
  label: "Roughing the passer",
  yds: 15
}, {
  key: "roughkick",
  label: "Roughing the kicker",
  yds: 15
}, {
  key: "horsecollar",
  label: "Horse collar",
  yds: 15
}, {
  key: "clipping",
  label: "Clipping",
  yds: 15
}, {
  key: "chopblock",
  label: "Chop block",
  yds: 15
}, {
  key: "unsports",
  label: "Unsportsmanlike conduct",
  yds: 15
}, {
  key: "personal",
  label: "Personal foul",
  yds: 15
}, {
  key: "targeting",
  label: "Targeting",
  yds: 15
}, {
  key: "other",
  label: "Other",
  yds: 5
}];
const SCORES = [{
  key: "none",
  label: "No score",
  pts: 0
}, {
  key: "td",
  label: "Touchdown",
  pts: 6
}, {
  key: "pat",
  label: "Conversion kick",
  pts: 1
}, {
  key: "two",
  label: "Conversion run/pass",
  pts: 2
}, {
  key: "fg",
  label: "Field goal",
  pts: 3
}, {
  key: "safety",
  label: "Safety",
  pts: 2
}];
/* Post-TD conversion values flip by level: elementary leagues score the kick
   as 2 and the run/pass conversion as 1; high school is the reverse. Each
   logged play stores its points, so changing the level later never rewrites
   old games. (The SCORES pts above are only the fallback for old plays.) */
const scoresFor = level => SCORES.map(s => s.key === "pat" ? Object.assign({}, s, {
  pts: level === "highschool" ? 1 : 2
}) : s.key === "two" ? Object.assign({}, s, {
  pts: level === "highschool" ? 2 : 1
}) : s);
const ORD = ["", "1st", "2nd", "3rd", "4th"];

/* Optional ball-spot tracking: 0 = our goal line, 50 = midfield, 100 = their
   goal line. null = the crew isn't tracking it and nothing shows. */
const spotLabel = v => v == null ? null : v === 50 ? "the 50" : v < 50 ? "Our " + (v === 0 ? "goal line" : v) : v === 100 ? "Their goal line" : "Their " + (100 - v);
const clampSpot = v => Math.max(0, Math.min(100, v));
const UNITS = [{
  key: "offense",
  label: "Offense"
}, {
  key: "defense",
  label: "Defense"
}, {
  key: "special",
  label: "Special"
}];
const VERB = {
  rush: "ran",
  catch: "caught",
  pass: "threw",
  incomplete: "incomplete pass",
  return: "returned",
  fga: "field goal attempt",
  conv: "conversion try",
  convfail: "conversion try — no good",
  punt: "punt — no return",
  stopconv: "stopped their try",
  block: "blocked the kick",
  tackle: "tackle",
  tfl: "tackle for loss",
  assist: "assist",
  sack: "sack",
  int: "interception",
  fumrec: "recovery",
  pbu: "pass broken up",
  fumble: "fumble, lost",
  fumkept: "fumble, kept it",
  team: "team play",
  kick: "kicked"
};
const uid = () => Math.random().toString(36).slice(2, 9);
const mkSlots = labels => labels.map(l => ({
  id: uid(),
  label: l,
  playerId: null,
  backupId: null
}));
const freshLineups = () => ({
  offense: mkSlots(OFFENSE_SLOTS),
  defense: mkSlots(DEFENSE_SLOTS),
  special: ST_KEYS.reduce((a, k) => Object.assign({}, a, {
    [k]: mkSlots(SPECIAL_TEAMS[k].slots)
  }), {})
});
const freshSquad = () => ({
  roster: [],
  lineups: freshLineups(),
  minPlays: 8,
  schedule: [],
  scoring: "elementary",
  rev: 0
});
const BASE = () => ({
  quarter: 1,
  us: 0,
  them: 0,
  down: 1,
  distance: 10,
  unit: "offense",
  stKey: "kickoff",
  spot: null,
  swaps: {},
  plays: []
});

/* ============================ GAME FOLD ============================ */

function fold(ops) {
  const revoked = new Set();
  const amends = {};
  ops.forEach(o => {
    if (o.type === "undo") (o.targets || [o.target]).forEach(t => revoked.add(t));
    /* Edits to past plays are amend ops: patches applied to the target play
       when the game replays, so every board and stat recomputes. Later
       amends layer over earlier ones in time order. */
    if (o.type === "amend" && o.target) amends[o.target] = Object.assign({}, amends[o.target], o.patch);
  });
  let live = ops.filter(o => o.type !== "undo" && o.type !== "amend" && !revoked.has(o.id)).map(o => amends[o.id] ? Object.assign({}, o, amends[o.id], {
    id: o.id,
    qMark: !!amends[o.id].quarter
  }) : o);
  /* Amends can move a play's timestamp, so order by effective time. */
  live.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
  const lastReset = live.map(o => o.type).lastIndexOf("reset");
  if (lastReset >= 0) live = live.slice(lastReset + 1);
  const g = BASE();
  live.forEach(o => {
    if (o.type === "set") {
      g[o.field] = o.value;
      return;
    }
    if (o.type === "adj") {
      g[o.team] = Math.max(0, g[o.team] + o.delta);
      return;
    }
    if (o.type === "sub") {
      const k = o.unit === "special" ? o.stKey : "u";
      g.swaps[o.unit] = g.swaps[o.unit] || {};
      g.swaps[o.unit][k] = Object.assign({}, g.swaps[o.unit][k] || {}, {
        [o.slotId]: o.playerId
      });
      return;
    }
    /* A play amended with an explicit quarter marks where that quarter
       really started: the clock moves there and every later play restamps. */
    if (o.quarter) g.quarter = o.quarter;
    if (o.type === "pen") {
      /* Flags land in the log with the situation they were thrown at, then
         walk the distance off: against the ball side backs the offense up
         (replay the down); against the defense moves the chains, with an
         automatic first down when the yardage covers the distance. Manual
         down/distance taps still override, as always. */
      g.plays.push(Object.assign({}, o, {
        down: g.down,
        distance: g.distance,
        quarter: g.quarter,
        qMark: !!o.qMark
      }));
      if (g.spot != null) {
        /* Move the mark with the walk-off, relative to which way the drive
           is going (defense unit = the other team is driving at our goal).
           The pen op carries the logging coach's unit; older ops fall back
           to the folded unit. */
        const dir = (o.unit || g.unit) === "defense" ? -1 : 1;
        g.spot = clampSpot(g.spot + (o.side === "offense" ? -(o.yards || 0) : o.yards || 0) * dir);
      }
      if (o.side === "defense") {
        g.distance = g.distance - (o.yards || 0);
        if (g.distance <= 0) {
          g.down = 1;
          g.distance = 10;
        }
      } else {
        g.distance = g.distance + (o.yards || 0);
      }
      return;
    }
    if (o.type !== "play") return;
    const sc = SCORES.find(x => x.key === o.score);
    const pts = o.pts != null ? o.pts : sc ? sc.pts : 0;
    g.plays.push(Object.assign({}, o, {
      down: g.down,
      distance: g.distance,
      quarter: g.quarter,
      qMark: !!o.qMark
    }));
    /* Drive gain from this play: offense logs our gain directly; defense logs
       the OTHER team's gain (sack/TFL yards are entered as yards lost, so
       they count negative); special teams move the ball by the kick/return. */
    const gained = o.unit === "defense" ? o.action === "sack" || o.action === "tfl" ? -(o.yards || 0) : o.yards || 0 : o.yards || 0;
    /* Ball-spot auto-tracking: our gains and kicks move the mark away from
       our goal; the other team's gains (defense unit) move it toward us. */
    if (g.spot != null) g.spot = clampSpot(g.spot + (o.unit === "defense" ? -gained : gained));
    if (o.them && o.action === "punt") {
      /* Their punt with no return: we take over with a fresh set of downs. */
      g.down = 1;
      g.distance = 10;
      g.unit = "offense";
    } else if (pts > 0) {
      /* o.them marks a score BY the other team (from the They-scored sheet);
         otherwise a defensive TD or safety is ours (pick-six and the like). */
      const ours = !o.them && (o.unit !== "defense" || o.score === "td" || o.score === "safety");
      if (ours) g.us += pts;else g.them += pts;
      g.down = 1;
      g.distance = 10;
    } else if ((o.unit === "offense" || o.unit === "defense") && o.action !== "stopconv" && o.action !== "block" && o.action !== "conv" && o.action !== "convfail") {
      /* Conversion tries (ours or theirs, made or failed) sit outside the
         drive — there's no down to advance. */
      const turnover = o.action === "int" || o.action === "fumrec" || o.action === "fumble";
      if (turnover) {
        g.down = 1;
        g.distance = 10;
        g.unit = o.unit === "offense" ? "defense" : "offense";
      } else if (gained >= g.distance) {
        g.down = 1;
        g.distance = 10;
      } else if (g.down >= 4) {
        g.down = 1;
        g.distance = 10;
        g.unit = o.unit === "offense" ? "defense" : "offense";
      } else {
        g.down = g.down + 1;
        g.distance = Math.max(1, g.distance - gained);
      }
    }
  });
  g.live = live;
  g.playCount = g.plays.filter(p => p.type !== "pen").length;
  return g;
}
const blank = () => ({
  snaps: 0,
  off: 0,
  def: 0,
  st: 0,
  rush: 0,
  rushY: 0,
  rec: 0,
  recY: 0,
  cmp: 0,
  att: 0,
  passY: 0,
  kicks: 0,
  kickY: 0,
  ret: 0,
  retY: 0,
  fgm: 0,
  fga: 0,
  convM: 0,
  convA: 0,
  fum: 0,
  fumL: 0,
  tk: 0,
  ast: 0,
  tfl: 0,
  sack: 0,
  lossY: 0,
  int: 0,
  fr: 0,
  pbu: 0,
  blk: 0,
  pen: 0,
  penY: 0,
  td: 0,
  pts: 0
});
function tally(plays) {
  const m = {};
  const g = id => m[id] = m[id] || blank();
  plays.forEach(p => {
    if (p.type === "pen") {
      if (p.playerId) {
        const s = g(p.playerId);
        s.pen++;
        s.penY += p.yards || 0;
      }
      return;
    }
    (p.snaps || []).forEach(id => {
      const s = g(id);
      s.snaps++;
      if (p.unit === "offense") s.off++;else if (p.unit === "defense") s.def++;else s.st++;
    });
    /* A caught or incomplete pass also credits the passer (QB by default,
       or whoever the coach picked for a trick play). */
    if (p.passerId && (p.action === "catch" || p.action === "incomplete")) {
      const q = g(p.passerId);
      q.att++;
      if (p.action === "catch") {
        q.cmp++;
        q.passY += p.yards || 0;
      }
    }
    /* Teammates in on the same tackle get their assists on this play. */
    (p.assistIds || []).forEach(id => {
      g(id).ast++;
    });
    if (!p.playerId) return;
    const s = g(p.playerId),
      y = p.yards || 0;
    if (p.action === "rush") {
      s.rush++;
      s.rushY += y;
    }
    if (p.action === "catch") {
      s.rec++;
      s.recY += y;
    }
    if (p.action === "pass") {
      s.passY += y;
      s.cmp++;
      s.att++;
    }
    if (p.action === "return") {
      s.ret++;
      s.retY += y;
    }
    if (p.action === "kick") {
      s.kicks++;
      s.kickY += y;
    }
    /* Explicit attempt actions cover missed tries; made tries logged as any
       other action still count as attempts via their score below. */
    if (p.action === "fga") s.fga++;
    if (p.action === "conv") s.convA++;
    if (p.action === "convfail") s.convA++;
    if (p.score === "fg") {
      s.fgm++;
      if (p.action !== "fga") s.fga++;
    }
    if (p.score === "pat" || p.score === "two") {
      s.convM++;
      if (p.action !== "conv") s.convA++;
    }
    if (p.action === "fumble") {
      s.fum++;
      s.fumL++;
    }
    if (p.action === "fumkept") s.fum++;
    if (p.action === "tackle") s.tk++;
    if (p.action === "assist") s.ast++;
    if (p.action === "tfl") {
      s.tfl++;
      s.tk++;
      s.lossY += y;
    }
    if (p.action === "sack") {
      s.sack++;
      s.tk++;
      s.lossY += y;
    }
    if (p.action === "int") s.int++;
    if (p.action === "fumrec") s.fr++;
    if (p.action === "pbu") s.pbu++;
    if (p.action === "stopconv") s.tk++;
    if (p.action === "block") s.blk++;
    if (p.score === "td") s.td++;
    const sc = SCORES.find(x => x.key === p.score);
    if (sc || p.pts != null) s.pts += p.pts != null ? p.pts : sc.pts;
  });
  return m;
}

/* Season totals: sum archived per-game stat lines, keyed by player. */
function seasonTotals(games) {
  const m = {};
  const keys = Object.keys(blank());
  games.forEach(g => {
    (g.players || []).forEach(r => {
      if (!r || !r.id) return;
      const t = m[r.id] || (m[r.id] = Object.assign(blank(), {
        id: r.id,
        num: r.num,
        name: r.name,
        gp: 0
      }));
      t.num = r.num;
      t.name = r.name;
      t.gp += 1;
      keys.forEach(k => {
        t[k] += r.s && r.s[k] || 0;
      });
    });
  });
  return Object.keys(m).map(k => m[k]);
}
const download = (name, text, mime) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {
    type: mime
  }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ============================ STORAGE ============================ */

const LS = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {/* quota */}
  }
};
const K_ME = "sideline.me";
const K_SOLO_OPS = "sideline.solo.ops";
const K_SOLO_SQUAD = "sideline.solo.squad";
const K_SOLO_GAMES = "sideline.solo.games";
const kCrewOps = c => `sideline.crew.${c}.ops`;
const kCrewSquad = c => `sideline.crew.${c}.squad`;
const kCrewGames = c => `sideline.crew.${c}.games`;
const CFG = window.SIDELINE_CONFIG || {};
const CREW_ON = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && CFG.supabaseUrl.indexOf("YOUR-") < 0);
const sb = CREW_ON ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
const T_OPS = "sideline_ops";
const T_SQUAD = "sideline_squads";
const T_GAMES = "sideline_games";
const makeCode = () => {
  const A = "BCDFGHJKLMNPQRSTVWXYZ23456789";
  return Array.from({
    length: 4
  }, () => A[Math.floor(Math.random() * A.length)]).join("");
};

/* ============================ SYNC HOOK ============================ */

function useSideline() {
  const saved = LS.get(K_ME, null);
  const [me, setMe] = useState(() => {
    if (saved && saved.id) return {
      id: saved.id,
      name: saved.name || ""
    };
    const fresh = {
      id: uid(),
      name: ""
    };
    LS.set(K_ME, fresh);
    return fresh;
  });
  const [code, setCode] = useState(() => saved && saved.code || null);
  const [squad, setSquadLocal] = useState(() => saved && saved.code ? LS.get(kCrewSquad(saved.code), freshSquad()) : LS.get(K_SOLO_SQUAD, freshSquad()));
  const [mine, setMine] = useState(() => saved && saved.code ? LS.get(kCrewOps(saved.code), []) : LS.get(K_SOLO_OPS, []));
  const [theirs, setTheirs] = useState({});
  const [games, setGamesLocal] = useState(() => saved && saved.code ? LS.get(kCrewGames(saved.code), []) : LS.get(K_SOLO_GAMES, []));
  const [sync, setSync] = useState({
    state: code ? "connecting" : "solo",
    coaches: 1,
    at: null
  });
  const dirty = useRef(false);
  const meRef = useRef(me);
  meRef.current = me;
  const squadRef = useRef(squad);
  squadRef.current = squad;

  /* ---- writers ---- */
  const pushOps = useCallback(async (ops, who) => {
    if (!code) {
      LS.set(K_SOLO_OPS, ops);
      return;
    }
    LS.set(kCrewOps(code), ops);
    if (!sb) return;
    const {
      error
    } = await sb.from(T_OPS).upsert({
      game_code: code,
      coach_id: who.id,
      coach_name: who.name || "Coach",
      ops,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "game_code,coach_id"
    });
    if (error) {
      dirty.current = true;
      setSync(s => Object.assign({}, s, {
        state: "offline"
      }));
    } else {
      dirty.current = false;
      setSync(s => Object.assign({}, s, {
        state: "live",
        at: Date.now()
      }));
    }
  }, [code]);
  const addOp = useCallback(op => {
    setMine(prev => {
      const next = prev.concat([Object.assign({
        id: uid(),
        ts: Date.now(),
        by: meRef.current.id
      }, op)]).slice(-2000);
      pushOps(next, meRef.current);
      return next;
    });
  }, [pushOps]);
  const setSquad = useCallback(updater => {
    setSquadLocal(prev => {
      const base = typeof updater === "function" ? updater(prev) : updater;
      const next = Object.assign({}, base, {
        rev: Date.now()
      });
      if (code) {
        LS.set(kCrewSquad(code), next);
        if (sb) sb.from(T_SQUAD).upsert({
          game_code: code,
          squad: next,
          rev: next.rev
        }, {
          onConflict: "game_code"
        }).then(({
          error
        }) => {
          if (error) setSync(s => Object.assign({}, s, {
            state: "offline"
          }));
        });
      } else LS.set(K_SOLO_SQUAD, next);
      return next;
    });
  }, [code]);

  /* ---- season archive ---- */
  const mutateGames = useCallback(fn => {
    setGamesLocal(prev => {
      const next = fn(prev);
      LS.set(code ? kCrewGames(code) : K_SOLO_GAMES, next);
      return next;
    });
  }, [code]);
  const pushGame = useCallback(async rec => {
    if (!code || !sb) return true;
    const {
      error
    } = await sb.from(T_GAMES).upsert({
      id: rec.id,
      game_code: code,
      game: Object.assign({}, rec, {
        pending: false
      }),
      ended_at: rec.endedAt
    }, {
      onConflict: "id"
    });
    return !error;
  }, [code]);
  const archiveGame = useCallback(rec => {
    mutateGames(prev => prev.concat([Object.assign({}, rec, {
      pending: !!code
    })]));
    if (code && sb) pushGame(rec).then(sent => {
      if (sent) mutateGames(prev => prev.map(g => g.id === rec.id ? Object.assign({}, g, {
        pending: false
      }) : g));
    });
  }, [code, mutateGames, pushGame]);

  /* Patch any fields of an archived game (opponent, endedAt, scores) and
     re-upload it, so past games stay editable forever. */
  const editGame = useCallback((id, patch) => {
    mutateGames(prev => prev.map(g => g.id === id ? Object.assign({}, g, patch) : g));
    const rec = games.find(g => g.id === id);
    if (rec && code && sb) pushGame(Object.assign({}, rec, patch));
  }, [games, code, mutateGames, pushGame]);
  const removeGame = useCallback(id => {
    mutateGames(prev => prev.filter(g => g.id !== id));
    if (code && sb) sb.from(T_GAMES).delete().eq("id", id).eq("game_code", code).then(() => {});
  }, [code, mutateGames]);
  const importGames = useCallback(list => {
    const incoming = (Array.isArray(list) ? list : []).filter(g => g && g.id && g.endedAt && Array.isArray(g.players));
    const have = {};
    games.forEach(g => {
      have[g.id] = true;
    });
    const fresh = incoming.filter(g => !have[g.id]);
    if (fresh.length) {
      mutateGames(prev => {
        const ids = {};
        prev.forEach(g => {
          ids[g.id] = true;
        });
        return prev.concat(fresh.filter(g => !ids[g.id])).sort((a, b) => a.endedAt < b.endedAt ? -1 : a.endedAt > b.endedAt ? 1 : 0);
      });
      if (code && sb) fresh.forEach(g => pushGame(g));
    }
    return fresh.length;
  }, [games, code, mutateGames, pushGame]);

  /* ---- reader ---- */
  const pull = useCallback(async () => {
    if (!code || !sb) return;
    try {
      const rows = await sb.from(T_OPS).select("coach_id,coach_name,ops").eq("game_code", code);
      if (rows.error) throw rows.error;
      const got = {};
      (rows.data || []).forEach(r => {
        if (r.coach_id === meRef.current.id) return;
        got[r.coach_id] = {
          name: r.coach_name,
          ops: r.ops || []
        };
      });
      setTheirs(got);
      setSync({
        state: dirty.current ? "offline" : "live",
        coaches: Object.keys(got).length + 1,
        at: Date.now()
      });
      const sq = await sb.from(T_SQUAD).select("squad,rev").eq("game_code", code).maybeSingle();
      if (!sq.error && sq.data && sq.data.squad) {
        setSquadLocal(prev => {
          if ((sq.data.rev || 0) > (prev.rev || 0)) {
            LS.set(kCrewSquad(code), sq.data.squad);
            return sq.data.squad;
          }
          return prev;
        });
      }
      // Season archive: upload anything still local, then take the shared list.
      const pend = LS.get(kCrewGames(code), []).filter(g => g.pending);
      if (pend.length) await Promise.all(pend.map(g => pushGame(g)));
      const gr = await sb.from(T_GAMES).select("game").eq("game_code", code);
      if (!gr.error && gr.data) {
        const remote = gr.data.map(r => r.game).filter(g => g && g.id).map(g => Object.assign({}, g, {
          pending: false
        }));
        const ids = {};
        remote.forEach(g => {
          ids[g.id] = true;
        });
        const still = LS.get(kCrewGames(code), []).filter(g => g.pending && !ids[g.id]);
        const next = remote.concat(still).sort((a, b) => a.endedAt < b.endedAt ? -1 : a.endedAt > b.endedAt ? 1 : 0);
        LS.set(kCrewGames(code), next);
        setGamesLocal(next);
      }
      if (dirty.current) pushOps(mine, meRef.current);
    } catch (e) {
      setSync(s => Object.assign({}, s, {
        state: "offline"
      }));
    }
  }, [code, mine, pushOps, pushGame]);

  /* ---- realtime + safety poll ---- */
  useEffect(() => {
    if (!code) {
      setSync({
        state: "solo",
        coaches: 1,
        at: null
      });
      return;
    }
    if (!sb) {
      setSync({
        state: "noconfig",
        coaches: 1,
        at: null
      });
      return;
    }
    let alive = true;
    pull();
    const ch = sb.channel("sideline-" + code).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: T_OPS,
      filter: "game_code=eq." + code
    }, () => {
      if (alive) pull();
    }).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: T_SQUAD,
      filter: "game_code=eq." + code
    }, () => {
      if (alive) pull();
    }).subscribe();
    const t = setInterval(() => {
      if (!document.hidden) pull();
    }, 12000);
    const onShow = () => {
      if (!document.hidden) pull();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("online", onShow);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("online", onShow);
      sb.removeChannel(ch);
    };
  }, [code, pull]);

  /* ---- crew membership ---- */
  /* carrySquad: when starting a brand-new crew, bring the current roster,
     lineups, and schedule along instead of starting the crew empty. Joining
     an existing code never does this, so a joiner can't clobber the crew. */
  const joinCrew = useCallback((c, name, carrySquad) => {
    const clean = (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (clean.length < 4) return;
    const next = {
      id: meRef.current.id,
      name: name !== undefined ? name : meRef.current.name
    };
    setMe(next);
    LS.set(K_ME, Object.assign({}, next, {
      code: clean
    }));
    setTheirs({});
    setMine(LS.get(kCrewOps(clean), []));
    const stored = LS.get(kCrewSquad(clean), null);
    const hasPlayers = sq => !!(sq && sq.roster && sq.roster.length);
    if (carrySquad && !hasPlayers(stored) && hasPlayers(squadRef.current)) {
      const carried = Object.assign({}, squadRef.current, {
        rev: Date.now()
      });
      LS.set(kCrewSquad(clean), carried);
      setSquadLocal(carried);
      if (sb) sb.from(T_SQUAD).upsert({
        game_code: clean,
        squad: carried,
        rev: carried.rev
      }, {
        onConflict: "game_code"
      }).then(() => {});
    } else {
      setSquadLocal(stored || freshSquad());
    }
    setGamesLocal(LS.get(kCrewGames(clean), []));
    setSync({
      state: "connecting",
      coaches: 1,
      at: null
    });
    setCode(clean);
  }, []);
  const renameMe = useCallback(name => {
    const next = {
      id: meRef.current.id,
      name
    };
    setMe(next);
    LS.set(K_ME, code ? Object.assign({}, next, {
      code
    }) : next);
    if (code) pushOps(mine, next);
  }, [code, mine, pushOps]);
  const leaveCrew = useCallback(() => {
    LS.set(K_ME, {
      id: meRef.current.id,
      name: meRef.current.name
    });
    setCode(null);
    setTheirs({});
    setMine(LS.get(K_SOLO_OPS, []));
    setSquadLocal(LS.get(K_SOLO_SQUAD, freshSquad()));
    setGamesLocal(LS.get(K_SOLO_GAMES, []));
  }, []);
  const allOps = useMemo(() => {
    const out = mine.map(o => Object.assign({}, o, {
      byName: me.name || "You"
    }));
    Object.keys(theirs).forEach(k => {
      (theirs[k].ops || []).forEach(o => out.push(Object.assign({}, o, {
        byName: theirs[k].name || "Coach"
      })));
    });
    return out.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
  }, [mine, theirs, me]);
  return {
    me,
    code,
    squad,
    setSquad,
    allOps,
    addOp,
    sync,
    joinCrew,
    leaveCrew,
    renameMe,
    crewAvailable: CREW_ON,
    games,
    archiveGame,
    editGame,
    removeGame,
    importGames
  };
}

/* ============================ APP ============================ */

function Sideline() {
  const S = useSideline();
  const {
    code,
    squad,
    setSquad,
    allOps,
    addOp,
    sync
  } = S;
  const [tab, setTab] = useState("game");
  const [sheet, setSheet] = useState(null);
  const [moving, setMoving] = useState(null);
  /* Which unit/formation THIS phone is looking at is local view state — each
     coach browses freely without moving anyone else's screen. Plays record
     the unit their coach was viewing when logging. */
  const [unit, setUnit] = useState("offense");
  const [stKey, setStKey] = useState("kickoff");
  const [movingPlay, setMovingPlay] = useState(null);
  const game = useMemo(() => fold(allOps), [allOps]);
  const stats = useMemo(() => tally(game.plays), [game.plays]);
  const statOf = id => stats[id] || blank();
  const roster = squad.roster,
    lineups = squad.lineups,
    minPlays = squad.minPlays;
  const byId = useMemo(() => {
    const m = {};
    roster.forEach(p => {
      m[p.id] = p;
    });
    return m;
  }, [roster]);
  const unitSlots = (unit === "special" ? lineups.special[stKey] : lineups[unit]) || [];
  const sKey = unit === "special" ? stKey : "u";
  const swaps = (game.swaps[unit] || {})[sKey] || {};
  const onField = unitSlots.map(s => Object.assign({}, s, {
    playerId: swaps[s.id] !== undefined ? swaps[s.id] : s.playerId
  }));
  const fieldIds = onField.map(s => s.playerId).filter(Boolean);
  const putIn = (slotId, playerId, group) => addOp({
    type: "sub",
    unit,
    stKey,
    slotId,
    playerId,
    group
  });
  const assign = (slot, playerId) => {
    const group = uid();
    if (!playerId) {
      putIn(slot.id, null, group);
      return;
    }
    const elsewhere = onField.find(s => s.playerId === playerId && s.id !== slot.id);
    if (elsewhere) putIn(elsewhere.id, slot.playerId || null, group);
    putIn(slot.id, playerId, group);
  };
  const scores = scoresFor(squad.scoring || "elementary");
  const logPlay = ({
    playerId,
    action,
    yards,
    score,
    passerId,
    scorePts,
    assistIds
  }) => {
    addOp({
      type: "play",
      unit,
      stKey: unit === "special" ? stKey : null,
      playerId: playerId || null,
      action: action || null,
      yards: yards || 0,
      passerId: passerId || null,
      assistIds: assistIds && assistIds.length ? assistIds : null,
      score: score && score !== "none" ? score : null,
      pts: score && score !== "none" ? scorePts || 0 : null,
      snaps: fieldIds
    });
    setSheet(null);
  };
  const archive = (opponent, when) => {
    const players = roster.map(p => ({
      id: p.id,
      num: p.num,
      name: p.name,
      s: statOf(p.id)
    })).filter(r => r.s.snaps > 0);
    /* Games logged after the fact get archived under the date they were
       actually played, not the date they were typed in. */
    const endedAt = /^\d{4}-\d{2}-\d{2}$/.test((when || "").trim()) ? new Date(when.trim() + "T12:00:00").toISOString() : new Date().toISOString();
    S.archiveGame({
      id: uid(),
      endedAt,
      opponent: opponent || "",
      us: game.us,
      them: game.them,
      playsCount: game.playCount,
      plays: game.plays,
      players
    });
    /* If this board was tracking a scheduled game, stamp that schedule entry
       as completed with the final score. */
    const schedId = (game.gameInfo || {}).schedId;
    if (schedId) setSquad(s => Object.assign({}, s, {
      schedule: (s.schedule || []).map(g => g.id === schedId ? Object.assign({}, g, {
        done: true,
        us: game.us,
        them: game.them
      }) : g)
    }));
  };
  const endGame = () => {
    const msg = code ? "End this game for all coaches? It's saved to the Season tab, then the score, play log, and stats clear for the next one. Roster and lineups stay put." : "End this game? It's saved to the Season tab, then the score, play log, and stats clear for the next one. Roster and lineups stay put.";
    if (!window.confirm(msg)) return;
    if (game.plays.length > 0) {
      const info = game.gameInfo || {};
      const opp = window.prompt("Who was this game against? (optional)", info.opponent || "") || "";
      const when = window.prompt("What date was it played? (YYYY-MM-DD)", info.date || new Date().toISOString().slice(0, 10)) || "";
      archive(opp, when);
    }
    addOp({
      type: "reset"
    });
  };
  /* Tapping a scheduled game tags the live board with it: plays logged from
     here on archive under that opponent and date. The tag is an op, so it
     syncs to the whole crew and clears with the next board reset. */
  const trackScheduled = g => {
    const info = game.gameInfo || {};
    if (game.plays.length > 0 && info.schedId !== g.id) {
      if (!window.confirm("The board already has " + game.plays.length + " plays" + (info.opponent ? " (vs " + info.opponent + ")" : "") + ". OK tags them all as the " + (g.opponent || "scheduled") + " game — or Cancel and finish the other game first on the Stats tab.")) return;
    }
    addOp({
      type: "set",
      field: "gameInfo",
      value: {
        schedId: g.id,
        opponent: g.opponent,
        date: g.date
      }
    });
    setTab("game");
  };

  /* Reorder a play: re-timestamp it to sit right after the tapped target. */
  const placeAfter = targetId => {
    if (!movingPlay || movingPlay === targetId) {
      setMovingPlay(null);
      return;
    }
    const seq = game.plays;
    const i = seq.findIndex(p => p.id === targetId);
    if (i < 0) {
      setMovingPlay(null);
      return;
    }
    const cur = seq[i].ts || Date.now();
    const next = i + 1 < seq.length ? seq[i + 1].ts || Date.now() : Date.now();
    addOp({
      type: "amend",
      target: movingPlay,
      patch: {
        ts: next > cur ? (cur + next) / 2 : cur + 0.001
      }
    });
    setMovingPlay(null);
  };
  const placeFirst = () => {
    const first = game.plays[0];
    if (movingPlay && first && first.id !== movingPlay) {
      addOp({
        type: "amend",
        target: movingPlay,
        patch: {
          ts: (first.ts || Date.now()) - 1
        }
      });
    }
    setMovingPlay(null);
  };
  const lastUndoable = game.live.slice().reverse().find(o => ["play", "pen", "sub", "adj", "set"].indexOf(o.type) >= 0);
  const undo = () => {
    if (!lastUndoable) return;
    const targets = lastUndoable.group ? game.live.filter(o => o.group === lastUndoable.group).map(o => o.id) : [lastUndoable.id];
    addOp({
      type: "undo",
      targets
    });
  };
  const statusText = !code ? "Tap to add coaches" : sync.state === "noconfig" ? "needs setup" : sync.state === "offline" ? "saved on this phone, will retry" : sync.state === "connecting" ? "connecting" : `${sync.coaches} ${sync.coaches === 1 ? "coach" : "coaches"} · live`;
  return /*#__PURE__*/React.createElement("div", {
    className: "sl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sl-in"
  }, /*#__PURE__*/React.createElement("button", {
    className: "crew",
    onClick: () => setSheet({
      type: "crew"
    })
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot " + (!code ? "" : sync.state === "live" ? "live" : "err")
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, code ? "Crew " + code : "Just you"), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow",
    style: {
      marginLeft: "auto"
    }
  }, statusText)), tab === "game" && /*#__PURE__*/React.createElement(GameTab, {
    game,
    addOp,
    onField,
    byId,
    statOf,
    minPlays,
    setSheet,
    logPlay,
    undo,
    canUndo: !!lastUndoable,
    roster,
    moving,
    setMoving,
    assign,
    onEndGame: endGame,
    unit,
    stKey,
    setUnit,
    setStKey,
    movingPlay,
    setMovingPlay,
    placeAfter,
    placeFirst
  }), tab === "roster" && /*#__PURE__*/React.createElement(RosterTab, {
    squad: squad,
    setSquad: setSquad,
    statOf: statOf
  }), tab === "lineups" && /*#__PURE__*/React.createElement(LineupsTab, {
    squad: squad,
    setSquad: setSquad
  }), tab === "stats" && /*#__PURE__*/React.createElement(StatsTab, {
    roster,
    statOf,
    minPlays,
    game,
    onEndGame: endGame
  }), tab === "season" && /*#__PURE__*/React.createElement(SeasonTab, {
    games: S.games,
    squad: squad,
    setSquad: setSquad,
    onEdit: S.editGame,
    onRemove: S.removeGame,
    onImport: S.importGames,
    onTrack: trackScheduled
  })), sheet && sheet.type === "play" && /*#__PURE__*/React.createElement(PlaySheet, {
    slot: sheet.slot,
    player: byId[sheet.slot.playerId],
    unit: unit,
    onField: onField,
    byId: byId,
    scores: scores,
    onClose: () => setSheet(null),
    onLog: logPlay
  }), sheet && sheet.type === "sub" && /*#__PURE__*/React.createElement(SubSheet, {
    slot: sheet.slot,
    roster: roster,
    byId: byId,
    onField: onField,
    statOf: statOf,
    minPlays: minPlays,
    onClose: () => setSheet(null),
    onPick: pid => {
      assign(sheet.slot, pid);
      setSheet(null);
    }
  }), sheet && sheet.type === "insertplay" && /*#__PURE__*/React.createElement(InsertPlaySheet, {
    afterPlay: sheet.after,
    roster: roster,
    scores: scores,
    onClose: () => setSheet(null),
    onSave: op => {
      /* Timestamp the missed play between its neighbors so the replay
         slots it into the right point of the game. */
      const seq = game.plays;
      const i = seq.findIndex(p => p.id === sheet.after.id);
      const cur = i >= 0 ? seq[i].ts || Date.now() : Date.now();
      const next = i >= 0 && i + 1 < seq.length ? seq[i + 1].ts || Date.now() : Date.now();
      const ts = next > cur ? (cur + next) / 2 : cur + 0.001;
      addOp(Object.assign({
        type: "play",
        ts
      }, op));
      setSheet(null);
    }
  }), sheet && sheet.type === "editplay" && /*#__PURE__*/React.createElement(EditPlaySheet, {
    play: sheet.play,
    roster: roster,
    scores: scores,
    onClose: () => setSheet(null),
    onSave: patch => {
      addOp({
        type: "amend",
        target: sheet.play.id,
        patch
      });
      setSheet(null);
    }
  }), sheet && sheet.type === "them" && /*#__PURE__*/React.createElement(ThemSheet, {
    scores: scores,
    roster: roster,
    onClose: () => setSheet(null),
    onLog: ({
      score,
      pts,
      yards,
      action,
      playerId,
      ours
    }) => {
      addOp({
        type: "play",
        unit,
        stKey: unit === "special" ? stKey : null,
        playerId: playerId || null,
        action: action || null,
        yards: yards || 0,
        passerId: null,
        them: ours ? null : true,
        score,
        pts,
        snaps: fieldIds
      });
      if (action === "punt") setUnit("offense");
      setSheet(null);
    }
  }), sheet && sheet.type === "quarter" && /*#__PURE__*/React.createElement(QuarterSheet, {
    quarter: game.quarter,
    onClose: () => setSheet(null),
    onAdvance: q => {
      addOp({
        type: "set",
        field: "quarter",
        value: q
      });
      /* Halftime ends the drive: fresh 1st & 10 for the second half. */
      if (q === 3) {
        addOp({
          type: "set",
          field: "down",
          value: 1
        });
        addOp({
          type: "set",
          field: "distance",
          value: 10
        });
      }
      setSheet(null);
    },
    onBack: q => {
      addOp({
        type: "set",
        field: "quarter",
        value: q
      });
      setSheet(null);
    },
    onEndGame: () => {
      setSheet(null);
      endGame();
    }
  }), sheet && sheet.type === "spot" && /*#__PURE__*/React.createElement(SpotSheet, {
    spot: game.spot,
    onClose: () => setSheet(null),
    onSet: v => {
      addOp({
        type: "set",
        field: "spot",
        value: v
      });
      setSheet(null);
    }
  }), sheet && sheet.type === "pen" && /*#__PURE__*/React.createElement(PenaltySheet, {
    roster: roster,
    unit: unit,
    onClose: () => setSheet(null),
    onLog: pen => {
      addOp(Object.assign({
        type: "pen",
        unit
      }, pen));
      setSheet(null);
    }
  }), sheet && sheet.type === "crew" && /*#__PURE__*/React.createElement(CrewSheet, {
    me: S.me,
    code: code,
    sync: sync,
    available: S.crewAvailable,
    onJoin: S.joinCrew,
    onLeave: S.leaveCrew,
    onRename: S.renameMe,
    onClose: () => setSheet(null)
  }), /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, [["game", "Game"], ["roster", "Roster"], ["lineups", "Lineups"], ["stats", "Stats"], ["season", "Season"]].map(t => /*#__PURE__*/React.createElement("button", {
    key: t[0],
    className: tab === t[0] ? "on" : "",
    onClick: () => setTab(t[0])
  }, t[1]))));
}

/* ============================ GAME TAB ============================ */

function GameTab({
  game,
  addOp,
  onField,
  byId,
  statOf,
  minPlays,
  setSheet,
  logPlay,
  undo,
  canUndo,
  roster,
  moving,
  setMoving,
  assign,
  onEndGame,
  unit,
  stKey,
  setUnit,
  setStKey,
  movingPlay,
  setMovingPlay,
  placeAfter,
  placeFirst
}) {
  const set = (field, value) => addOp({
    type: "set",
    field,
    value
  });
  const filled = onField.filter(s => s.playerId).length;
  const movingSlot = moving ? onField.find(s => s.id === moving) : null;
  const movingPlayer = movingSlot ? byId[movingSlot.playerId] : null;
  const tapCard = s => {
    if (moving) {
      if (s.id === moving) {
        setMoving(null);
        return;
      }
      if (movingSlot) assign(s, movingSlot.playerId);
      setMoving(null);
      return;
    }
    setSheet({
      type: s.playerId ? "play" : "sub",
      slot: s
    });
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "board"
  }, /*#__PURE__*/React.createElement("div", {
    className: "board-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Us"), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.us), /*#__PURE__*/React.createElement("div", {
    className: "score-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tick",
    onClick: () => addOp({
      type: "adj",
      team: "us",
      delta: -1
    })
  }, "\u2212"), /*#__PURE__*/React.createElement("button", {
    className: "tick",
    onClick: () => addOp({
      type: "adj",
      team: "us",
      delta: 1
    })
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    className: "dd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-main"
  }, ORD[game.down], " ", /*#__PURE__*/React.createElement("small", null, "&"), " ", game.distance), /*#__PURE__*/React.createElement("div", {
    className: "dd-sub"
  }, "Quarter ", game.quarter, " \xB7 ", game.playCount, " plays run", game.spot != null ? " · ball on " + spotLabel(game.spot) : "")), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Them"), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.them), /*#__PURE__*/React.createElement("div", {
    className: "score-btns"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tick",
    onClick: () => addOp({
      type: "adj",
      team: "them",
      delta: -1
    })
  }, "\u2212"), /*#__PURE__*/React.createElement("button", {
    className: "tick",
    onClick: () => addOp({
      type: "adj",
      team: "them",
      delta: 1
    })
  }, "+"), /*#__PURE__*/React.createElement("button", {
    className: "tick",
    style: {
      width: 36
    },
    onClick: () => setSheet({
      type: "them"
    })
  }, "TD+")))), /*#__PURE__*/React.createElement("div", {
    className: "board-btm"
  }, [1, 2, 3, 4].map(d => /*#__PURE__*/React.createElement("button", {
    key: d,
    className: "chip" + (game.down === d ? " on" : ""),
    onClick: () => set("down", d)
  }, ORD[d]))), /*#__PURE__*/React.createElement("div", {
    className: "board-btm"
  }, /*#__PURE__*/React.createElement("select", {
    className: "dist-sel",
    "aria-label": "Distance to gain",
    value: game.distance,
    onChange: e => set("distance", parseInt(e.target.value, 10))
  }, Array.from({
    length: 100
  }, (_, i) => i + 1).map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, d, " ", d === 1 ? "yard" : "yards", " to go")), game.distance > 100 && /*#__PURE__*/React.createElement("option", {
    value: game.distance
  }, game.distance, " yards to go")), /*#__PURE__*/React.createElement("button", {
    className: "chip",
    onClick: () => setSheet({
      type: "quarter"
    })
  }, "Q", game.quarter), /*#__PURE__*/React.createElement("button", {
    className: "chip" + (game.spot != null ? " on" : ""),
    onClick: () => setSheet({
      type: "spot"
    })
  }, game.spot != null ? "◉ " + spotLabel(game.spot) : "Ball spot"))), game.gameInfo && game.gameInfo.opponent && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      textAlign: "center",
      marginTop: 8
    }
  }, "Tracking vs ", game.gameInfo.opponent, game.gameInfo.date ? " · " + new Date(game.gameInfo.date + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }) : ""), /*#__PURE__*/React.createElement("div", {
    className: "units"
  }, UNITS.map(u => /*#__PURE__*/React.createElement("button", {
    key: u.key,
    className: "unit " + u.key + (unit === u.key ? " on" : ""),
    onClick: () => setUnit(u.key)
  }, u.label))), unit === "special" && /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, ST_KEYS.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: stKey === k ? "on" : "",
    onClick: () => setStKey(k)
  }, SPECIAL_TEAMS[k].label))), moving && /*#__PURE__*/React.createElement("div", {
    className: "banner"
  }, /*#__PURE__*/React.createElement("b", null, "Moving ", movingPlayer ? "#" + movingPlayer.num + " " + movingPlayer.name : "player", "."), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--soft)"
    }
  }, "Tap any spot to drop them in."), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      marginLeft: "auto"
    },
    onClick: () => setMoving(null)
  }, "Cancel")), roster.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      marginTop: 10
    }
  }, "No players yet. Open ", /*#__PURE__*/React.createElement("b", null, "Roster"), " to add your team, then set starters in ", /*#__PURE__*/React.createElement("b", null, "Lineups"), ".") : /*#__PURE__*/React.createElement("div", {
    className: "grid",
    style: {
      marginTop: 10
    }
  }, onField.map(s => {
    const p = byId[s.playerId];
    const st = p ? statOf(p.id) : null;
    const backup = byId[s.backupId];
    const cls = "pcard" + (p ? "" : " empty") + (moving === s.id ? " moving" : moving ? " target" : "");
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: cls
    }, /*#__PURE__*/React.createElement("div", {
      className: "pc-top",
      role: "button",
      tabIndex: 0,
      onClick: () => tapCard(s),
      onKeyDown: e => {
        if (e.key === "Enter") tapCard(s);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "plate"
    }, p ? p.num : "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pc-slot"
    }, s.label), /*#__PURE__*/React.createElement("div", {
      className: "pc-name"
    }, p ? p.name : moving ? "Drop them here" : "Open spot"))), /*#__PURE__*/React.createElement("div", {
      className: "pc-btm"
    }, /*#__PURE__*/React.createElement(Chain, {
      count: st ? st.snaps : 0,
      min: minPlays
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5
      }
    }, p && /*#__PURE__*/React.createElement("button", {
      className: "sub-btn",
      onClick: () => setMoving(moving === s.id ? null : s.id)
    }, moving === s.id ? "×" : "Move"), /*#__PURE__*/React.createElement("button", {
      className: "sub-btn" + (backup && backup.id !== s.playerId ? " ready" : ""),
      onClick: () => setSheet({
        type: "sub",
        slot: s
      })
    }, backup && backup.id !== s.playerId ? "⇄ " + backup.num : "Sub"))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "actionbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "abtn",
    disabled: filled === 0,
    onClick: () => logPlay({
      playerId: null,
      action: "team",
      yards: 0,
      score: "none"
    })
  }, "Snap, no stat"), /*#__PURE__*/React.createElement("button", {
    className: "abtn",
    onClick: () => setSheet({
      type: "pen"
    })
  }, "Flag"), /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    disabled: !canUndo,
    onClick: undo
  }, "Undo")), /*#__PURE__*/React.createElement(PlayLog, {
    game: game,
    byId: byId,
    addOp: addOp,
    onEdit: p => setSheet({
      type: "editplay",
      play: p
    }),
    onInsert: p => setSheet({
      type: "insertplay",
      after: p
    }),
    movingPlay: movingPlay,
    onMove: p => setMovingPlay(p.id),
    onPlace: p => placeAfter(p.id),
    onPlaceFirst: placeFirst,
    onCancelMove: () => setMovingPlay(null)
  }), game.plays.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "abtn",
    style: {
      width: "100%",
      marginTop: 12
    },
    onClick: onEndGame
  }, "End game \u2014 save it to the Season"));
}
function Chain({
  count,
  min
}) {
  const marks = Math.max(min, 1);
  const short = count < min;
  return /*#__PURE__*/React.createElement("div", {
    className: "chain" + (short ? " short" : ""),
    title: count + " plays"
  }, Array.from({
    length: marks
  }).map((_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i < count ? short ? "o" : "f" : ""
  })), count > marks && /*#__PURE__*/React.createElement("i", {
    className: "f",
    style: {
      width: 9
    }
  }));
}
function PlayLog({
  game,
  byId,
  addOp,
  onEdit,
  onInsert,
  movingPlay,
  onMove,
  onPlace,
  onPlaceFirst,
  onCancelMove
}) {
  const [showAll, setShowAll] = useState(false);
  const all = game.plays.slice().reverse();
  const recent = showAll ? all : all.slice(0, 14);
  if (!all.length) return null;
  const lineProps = p => ({
    className: "logline",
    style: movingPlay === p.id ? {
      background: "#FBF3E3"
    } : null,
    onClick: movingPlay ? e => {
      if (e.target && e.target.closest && e.target.closest(".mini")) return;
      onPlace(p);
    } : undefined
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Play log"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, showAll ? all.length + " this game · latest first" : "Latest first")), movingPlay && /*#__PURE__*/React.createElement("div", {
    className: "banner"
  }, /*#__PURE__*/React.createElement("b", null, "Moving a play."), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--soft)"
    }
  }, "Tap the play it should come right after."), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: onPlaceFirst
  }, "Make it the first play"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      marginLeft: "auto"
    },
    onClick: onCancelMove
  }, "Cancel")), /*#__PURE__*/React.createElement("div", null, recent.map((p, i) => {
    const qBreak = i > 0 && recent[i - 1].quarter !== p.quarter ? /*#__PURE__*/React.createElement("div", {
      className: "eyebrow",
      style: {
        margin: "10px 0 4px"
      }
    }, "Quarter ", p.quarter) : null;
    const pl = byId[p.playerId];
    if (p.type === "pen") {
      const pk = PENALTIES.find(x => x.key === p.kind);
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: p.id
      }, qBreak, /*#__PURE__*/React.createElement("div", lineProps(p), /*#__PURE__*/React.createElement("span", {
        className: "eyebrow"
      }, ORD[p.down], " & ", p.distance), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
        style: {
          color: "var(--stop)"
        }
      }, "Flag"), " ", pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : p.ours ? "on us" : "on them", " — ", pk ? pk.label : "penalty", ", ", p.yards, " yd"), /*#__PURE__*/React.createElement("span", {
        className: "who"
      }, p.byName || ""), /*#__PURE__*/React.createElement("button", {
        className: "mini",
        style: {
          flex: "0 0 auto",
          padding: "2px 8px"
        },
        "aria-label": "Move this play in the sequence",
        onClick: () => onMove(p)
      }, "\u2195"), /*#__PURE__*/React.createElement("button", {
        className: "mini",
        style: {
          flex: "0 0 auto",
          padding: "2px 8px"
        },
        "aria-label": "Add a missed play after this one",
        onClick: () => onInsert(p)
      }, "\uFF0B"), /*#__PURE__*/React.createElement("button", {
        className: "mini",
        style: {
          flex: "0 0 auto",
          padding: "2px 8px"
        },
        "aria-label": "Edit this play",
        onClick: () => onEdit(p)
      }, "\u270E"), /*#__PURE__*/React.createElement("button", {
        className: "mini",
        style: {
          flex: "0 0 auto",
          padding: "2px 8px"
        },
        "aria-label": "Remove this penalty",
        onClick: () => {
          if (window.confirm("Take this penalty out? The down and distance recalculate without it.")) {
            addOp({
              type: "undo",
              targets: [p.id]
            });
          }
        }
      }, "\u2715")));
    }
    const sc = SCORES.find(x => x.key === p.score);
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: p.id
    }, qBreak, /*#__PURE__*/React.createElement("div", lineProps(p), /*#__PURE__*/React.createElement("span", {
      className: "eyebrow"
    }, ORD[p.down], " & ", p.distance), /*#__PURE__*/React.createElement("span", null, pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : /*#__PURE__*/React.createElement("b", null, p.them ? "Their team" : "Whole unit"), " ", p.them && p.yards ? p.yards + " yd " : "", VERB[p.action] || "", " ", ["rush", "catch", "pass", "return", "kick", "fumkept"].indexOf(p.action) >= 0 ? p.yards + " yd" : "", ["sack", "tfl"].indexOf(p.action) >= 0 && p.yards ? "−" + p.yards + " yd" : "", p.passerId && byId[p.passerId] ? " from #" + byId[p.passerId].num : "", p.assistIds && p.assistIds.length ? " · assist " + p.assistIds.map(id => byId[id] ? "#" + byId[id].num : "").join(", ") : "", sc && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--stop)",
        fontWeight: 700
      }
    }, " \xB7 ", sc.label)), /*#__PURE__*/React.createElement("span", {
      className: "who"
    }, p.byName || ""), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      style: {
        flex: "0 0 auto",
        padding: "2px 8px"
      },
      "aria-label": "Move this play in the sequence",
      onClick: () => onMove(p)
    }, "\u2195"), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      style: {
        flex: "0 0 auto",
        padding: "2px 8px"
      },
      "aria-label": "Add a missed play after this one",
      onClick: () => onInsert(p)
    }, "\uFF0B"), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      style: {
        flex: "0 0 auto",
        padding: "2px 8px"
      },
      "aria-label": "Edit this play",
      onClick: () => onEdit(p)
    }, "\u270E"), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      style: {
        flex: "0 0 auto",
        padding: "2px 8px"
      },
      "aria-label": "Remove this play",
      onClick: () => {
        if (window.confirm("Take this play out? The score, down, and stats recalculate without it — you can re-log it right.")) {
          addOp({
            type: "undo",
            targets: [p.id]
          });
        }
      }
    }, "\u2715")));
  })), all.length > 14 && /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      width: "100%",
      padding: 10,
      marginTop: 8
    },
    onClick: () => setShowAll(!showAll)
  }, showAll ? "Show recent plays only" : "Show all " + all.length + " plays"));
}

/* ============================ SHEETS ============================ */

function PlaySheet({
  slot,
  player,
  unit,
  onField,
  byId,
  scores,
  onClose,
  onLog
}) {
  const actions = unit === "offense" ? OFF_ACTIONS : unit === "defense" ? DEF_ACTIONS : ST_ACTIONS;
  const [action, setAction] = useState(actions[0].key);
  const [yards, setYards] = useState(0);
  const [score, setScore] = useState("none");
  /* Pass plays assume whoever is in the QB spot threw it; the coach can pick
     any other on-field player for a halfback pass or similar. */
  const qbSlot = (onField || []).find(s => s.playerId && s.playerId !== (player && player.id) && (s.label || "").toUpperCase().indexOf("QB") >= 0);
  const [passerId, setPasserId] = useState(qbSlot ? qbSlot.playerId : "");
  const [assistIds, setAssistIds] = useState([]);
  /* Defensive tackles/assists log the OTHER team's gain (or loss, negative)
     so the game tracks yards allowed; sacks and TFLs ask for yards lost. */
  const isDefGain = unit === "defense" && (action === "tackle" || action === "assist");
  const needsYards = ["rush", "catch", "pass", "return", "kick", "sack", "tfl", "fumkept"].indexOf(action) >= 0 || isDefGain;
  const isPassPlay = unit === "offense" && (action === "catch" || action === "incomplete");
  const isLossPlay = action === "sack" || action === "tfl";
  const isTackleLike = ["tackle", "tfl", "sack"].indexOf(action) >= 0;
  if (!player) return null;
  const yardFace = isLossPlay ? yards ? "−" + Math.abs(yards) : "0" : yards > 0 ? "+" + yards : String(yards);
  const yardTone = isLossPlay ? yards ? "loss" : "zero" : isDefGain ? yards > 0 ? "loss" : yards < 0 ? "gain" : "zero" : yards > 0 ? "gain" : yards < 0 ? "loss" : "zero";
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate"
  }, player.num), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, player.name), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, slot.label, " \xB7 ", unit)), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "What happened"), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, actions.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.key,
    className: "opt" + (action === a.key ? " on" : ""),
    onClick: () => setAction(a.key)
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, a.label), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, a.hint)))), needsYards && /*#__PURE__*/React.createElement("div", {
    className: "yardbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      textAlign: "center"
    }
  }, isLossPlay ? "Yards they lost" : isDefGain ? "Their gain (− if they lost yards)" : "Yards"), /*#__PURE__*/React.createElement("div", {
    className: "yardnum " + yardTone
  }, yardFace), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Yards on the play",
    value: yards,
    style: {
      marginTop: 8
    },
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, (isLossPlay ? Array.from({
    length: 31
  }, (_, i) => i) : Array.from({
    length: 201
  }, (_, i) => i - 100)).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, isLossPlay ? y + (y === 1 ? " yard lost" : " yards lost") : (y > 0 ? "+" + y : y) + (Math.abs(y) === 1 ? " yard" : " yards"))))), isPassPlay && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Who threw it"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Who threw it",
    value: passerId,
    onChange: e => setPasserId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "No passer / not sure"), (onField || []).filter(s => s.playerId && s.playerId !== player.id).map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.playerId
  }, "#", byId[s.playerId].num, " ", byId[s.playerId].name, " (", s.label, ")")))), isTackleLike && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Assisted by \u2014 tap everyone in on it"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, (onField || []).filter(s => s.playerId && s.playerId !== player.id).map(s => {
    const on = assistIds.indexOf(s.playerId) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      className: "mini" + (on ? " dark" : ""),
      onClick: () => setAssistIds(on ? assistIds.filter(x => x !== s.playerId) : assistIds.concat([s.playerId]))
    }, "#", byId[s.playerId].num, " ", byId[s.playerId].name);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Points on the play"), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, (scores || SCORES).map(s => /*#__PURE__*/React.createElement("button", {
    key: s.key,
    className: "opt" + (score === s.key ? " on" : ""),
    onClick: () => setScore(s.key)
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, s.pts ? "+" + s.pts : "—")))), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    onClick: () => onLog({
      playerId: player.id,
      action,
      yards: needsYards ? isLossPlay ? Math.abs(yards) : yards : 0,
      score,
      scorePts: ((scores || SCORES).find(x => x.key === score) || {}).pts || 0,
      passerId: isPassPlay ? passerId || null : null,
      assistIds: isTackleLike ? assistIds : null
    })
  }, "Log the play")));
}
function SubSheet({
  slot,
  roster,
  byId,
  onField,
  statOf,
  minPlays,
  onClose,
  onPick
}) {
  const [q, setQ] = useState("");
  const fieldIds = onField.map(s => s.playerId).filter(Boolean);
  const backup = byId[slot.backupId];
  const current = byId[slot.playerId];
  const match = p => !p ? false : !q.trim() || p.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 || String(p.num).indexOf(q) === 0;
  const bench = roster.filter(p => fieldIds.indexOf(p.id) < 0 && match(p)).sort((a, b) => statOf(a.id).snaps - statOf(b.id).snaps);
  const others = onField.filter(s => s.playerId && s.id !== slot.id && match(byId[s.playerId]));
  const Line = ({
    p,
    note
  }) => {
    if (!p) return null;
    const st = statOf(p.id);
    return /*#__PURE__*/React.createElement("button", {
      className: "row",
      style: {
        width: "100%",
        textAlign: "left",
        cursor: "pointer"
      },
      onClick: () => onPick(p.id)
    }, /*#__PURE__*/React.createElement("div", {
      className: "plate"
    }, p.num), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 15
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      className: "eyebrow"
    }, note || p.pos || "any spot")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement(Chain, {
      count: st.snaps,
      min: minPlays
    }), /*#__PURE__*/React.createElement("div", {
      className: "eyebrow",
      style: {
        marginTop: 3
      }
    }, st.snaps, " plays")));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate"
  }, current ? current.num : "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, slot.label), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, current ? current.name + " is in" : "Nobody in this spot")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), backup && backup.id !== slot.playerId && !q && /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    style: {
      marginTop: 0,
      marginBottom: 12
    },
    onClick: () => onPick(backup.id)
  }, "Send in #", backup.num, " ", backup.name), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Find any player by name or number",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "On the bench \xB7 fewest plays first"), bench.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      marginBottom: 10
    }
  }, "Nobody on the bench matches."), bench.map(p => /*#__PURE__*/React.createElement(Line, {
    key: p.id,
    p: p
  })), others.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "14px 0 6px"
    }
  }, "Already on the field \xB7 they trade spots"), others.map(s => /*#__PURE__*/React.createElement(Line, {
    key: s.id,
    p: byId[s.playerId],
    note: "at " + s.label + " now, moves here"
  }))), current && /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    style: {
      width: "100%",
      marginTop: 12
    },
    onClick: () => onPick(null)
  }, "Leave this spot open")));
}
function EditPlaySheet({
  play,
  roster,
  scores,
  onSave,
  onClose
}) {
  const isPen = play.type === "pen";
  const isThem = !!play.them;
  const [playerId, setPlayerId] = useState(play.playerId || "");
  const [action, setAction] = useState(play.action || "team");
  const [yards, setYards] = useState(play.yards || 0);
  const [score, setScore] = useState(play.them && play.action === "punt" ? "punt" : play.score || "none");
  const [passerId, setPasserId] = useState(play.passerId || "");
  const [kind, setKind] = useState(play.kind || "other");
  const [side, setSide] = useState(play.side || "offense");
  const [who, setWho] = useState(isPen ? play.playerId ? play.playerId : play.ours ? "us" : "them" : "them");
  const [qtr, setQtr] = useState(play.qMark ? String(play.quarter) : "auto");
  /* Who was on the field for this play — drives everyone's play counts. */
  const [snapsSel, setSnapsSel] = useState((play.snaps || []).slice());
  const [assistIds, setAssistIds] = useState((play.assistIds || []).slice());
  const toggleSnap = id => setSnapsSel(snapsSel.indexOf(id) >= 0 ? snapsSel.filter(x => x !== id) : snapsSel.concat([id]));
  const withCredit = list => {
    const base = [];
    if (!isThem && playerId) base.push(playerId);
    if (isPass && passerId) base.push(passerId);
    if (isTackleLike) assistIds.forEach(id => {
      if (base.indexOf(id) < 0) base.push(id);
    });
    return base.concat(list.filter(id => base.indexOf(id) < 0));
  };
  const actList = (play.unit === "offense" ? OFF_ACTIONS : play.unit === "defense" ? DEF_ACTIONS : ST_ACTIONS).concat([{
    key: "team",
    label: "Snap, no stat"
  }, {
    key: "stopconv",
    label: "Stopped their try"
  }, {
    key: "block",
    label: "Blocked the kick"
  }, {
    key: "theirpunt",
    label: "Their punt — no return"
  }]);
  const isLoss = action === "sack" || action === "tfl";
  const isPass = play.unit === "offense" && (action === "catch" || action === "incomplete");
  const isTheirPunt = action === "theirpunt";
  const isTackleLike = ["tackle", "tfl", "sack"].indexOf(action) >= 0;
  const save = () => {
    /* "auto" = no mark on this play (clearing one if present); a number
       marks that quarter as starting here. */
    const qPatch = qtr === "auto" ? play.qMark ? {
      quarter: null
    } : {} : {
      quarter: parseInt(qtr, 10)
    };
    if (isPen) {
      onSave(Object.assign({
        playerId: who !== "them" && who !== "us" ? who : null,
        ours: who !== "them",
        kind,
        side,
        yards: parseInt(yards, 10) || 0
      }, qPatch));
    } else if (isThem) {
      if (score === "punt") {
        onSave(Object.assign({
          score: null,
          action: "punt",
          pts: null,
          yards: parseInt(yards, 10) || 0,
          snaps: snapsSel
        }, qPatch));
      } else {
        onSave(Object.assign({
          score,
          action: null,
          pts: (scores.find(x => x.key === score) || {}).pts || 0,
          yards: score === "td" ? parseInt(yards, 10) || 0 : 0,
          snaps: snapsSel
        }, qPatch));
      }
    } else if (isTheirPunt) {
      onSave(Object.assign({
        them: true,
        action: "punt",
        playerId: null,
        passerId: null,
        score: null,
        pts: null,
        yards: Math.abs(parseInt(yards, 10) || 0),
        snaps: snapsSel
      }, qPatch));
    } else {
      onSave(Object.assign({
        playerId: playerId || null,
        action: action || null,
        them: null,
        yards: isLoss ? Math.abs(parseInt(yards, 10) || 0) : parseInt(yards, 10) || 0,
        score: score !== "none" ? score : null,
        pts: score !== "none" ? (scores.find(x => x.key === score) || {}).pts || 0 : null,
        passerId: isPass ? passerId || null : null,
        assistIds: isTackleLike && assistIds.length ? assistIds : null,
        snaps: withCredit(snapsSel)
      }, qPatch));
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, isPen ? "Edit penalty" : isThem ? "Edit their score" : "Edit play"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Everything recomputes when you save")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Quarter \u2014 currently in quarter ", play.quarter), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Quarter",
    value: qtr,
    onChange: e => setQtr(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "auto"
  }, "Same as the play before it", play.qMark ? " (clears the mark here)" : ""), [1, 2, 3, 4].map(q => /*#__PURE__*/React.createElement("option", {
    key: q,
    value: q
  }, "Quarter ", q, " starts at this play", play.qMark && q === play.quarter ? " — marked now" : ""))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12
    }
  }), isPen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Who was flagged"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Who was flagged",
    value: who,
    onChange: e => setWho(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "them"
  }, "The other team"), /*#__PURE__*/React.createElement("option", {
    value: "us"
  }, "Us \u2014 no one in particular"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "The call"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Penalty type",
    value: kind,
    onChange: e => setKind(e.target.value)
  }, PENALTIES.map(x => /*#__PURE__*/React.createElement("option", {
    key: x.key,
    value: x.key
  }, x.label, " (", x.yds, ")"))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Yards walked off"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Penalty yards",
    value: yards,
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, Array.from({
    length: 50
  }, (_, i) => i + 1).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y, " ", y === 1 ? "yard" : "yards"))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Enforced against"), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "opt" + (side === "offense" ? " on" : ""),
    onClick: () => setSide("offense")
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, "The ball side"), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, "backs up \xB7 replay the down")), /*#__PURE__*/React.createElement("button", {
    className: "opt" + (side === "defense" ? " on" : ""),
    onClick: () => setSide("defense")
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, "The defending side"), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, "chains move up")))), isThem && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Their play"), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, scores.filter(s => s.key !== "none").concat([{
    key: "punt",
    label: "Punt — no return",
    pts: 0
  }]).map(s => /*#__PURE__*/React.createElement("button", {
    key: s.key,
    className: "opt" + (score === s.key ? " on" : ""),
    onClick: () => setScore(s.key)
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, s.key === "punt" ? "we take over" : "+" + s.pts + " for them")))), (score === "td" || score === "punt") && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, score === "td" ? "How long was the score?" : "How far did the punt go?"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Their score length",
    value: yards,
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, Array.from({
    length: 101
  }, (_, i) => i).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y, " ", y === 1 ? "yard" : "yards"))))), !isPen && !isThem && /*#__PURE__*/React.createElement(React.Fragment, null, !isTheirPunt && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Player"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Player",
    value: playerId,
    onChange: e => setPlayerId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Whole unit"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name)))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "What happened"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "What happened",
    value: action,
    onChange: e => setAction(e.target.value)
  }, actList.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.key,
    value: a.key
  }, a.label))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, isLoss ? "Yards they lost" : isTheirPunt ? "How far did the punt go?" : "Yards"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Yards",
    value: yards,
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, (isLoss ? Array.from({
    length: 31
  }, (_, i) => i) : Array.from({
    length: 201
  }, (_, i) => i - 100)).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, isLoss ? y + (y === 1 ? " yard lost" : " yards lost") : (y > 0 ? "+" + y : y) + (Math.abs(y) === 1 ? " yard" : " yards")))), isPass && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Who threw it"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Who threw it",
    value: passerId,
    onChange: e => setPasserId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "No passer / not sure"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name)))), !isTheirPunt && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Points on the play"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Points on the play",
    value: score,
    onChange: e => setScore(e.target.value)
  }, scores.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label, s.pts ? " (+" + s.pts + ")" : ""))))), !isPen && !isThem && !isTheirPunt && isTackleLike && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Assisted by \u2014 tap everyone in on it"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, roster.filter(p => p.id !== playerId).map(p => {
    const on = assistIds.indexOf(p.id) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "mini" + (on ? " dark" : ""),
      onClick: () => setAssistIds(on ? assistIds.filter(x => x !== p.id) : assistIds.concat([p.id]))
    }, "#", p.num, " ", p.name);
  }))), !isPen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "On the field for this play \u2014 ", snapsSel.length, " counted"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, roster.map(p => {
    const on = snapsSel.indexOf(p.id) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "mini" + (on ? " dark" : ""),
      onClick: () => toggleSnap(p.id)
    }, "#", p.num, " ", p.name);
  }))), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    onClick: save
  }, "Save the fix")));
}
function InsertPlaySheet({
  afterPlay,
  roster,
  scores,
  onSave,
  onClose
}) {
  const startUnit = afterPlay.unit === "offense" || afterPlay.unit === "defense" || afterPlay.unit === "special" ? afterPlay.unit : "offense";
  const [unit, setUnit] = useState(startUnit);
  const [stKeySel, setStKeySel] = useState(afterPlay.stKey || "kickoff");
  const [playerId, setPlayerId] = useState("");
  const [action, setAction] = useState(startUnit === "defense" ? "tackle" : startUnit === "special" ? "kick" : "rush");
  const [yards, setYards] = useState(0);
  const [score, setScore] = useState("none");
  const [passerId, setPasserId] = useState("");
  const [snapsSel, setSnapsSel] = useState([]);
  const [assistIds, setAssistIds] = useState([]);
  const toggleSnap = id => setSnapsSel(snapsSel.indexOf(id) >= 0 ? snapsSel.filter(x => x !== id) : snapsSel.concat([id]));
  const pickUnit = u => {
    setUnit(u);
    setAction(u === "defense" ? "tackle" : u === "special" ? "kick" : "rush");
  };
  const actList = (unit === "offense" ? OFF_ACTIONS : unit === "defense" ? DEF_ACTIONS : ST_ACTIONS).concat([{
    key: "team",
    label: "Snap, no stat"
  }, {
    key: "stopconv",
    label: "Stopped their try"
  }, {
    key: "block",
    label: "Blocked the kick"
  }, {
    key: "theirpunt",
    label: "Their punt — no return"
  }]);
  const isLoss = action === "sack" || action === "tfl";
  const isPass = unit === "offense" && (action === "catch" || action === "incomplete");
  const isTheirPunt = action === "theirpunt";
  const save = () => {
    const y = isLoss || isTheirPunt ? Math.abs(parseInt(yards, 10) || 0) : parseInt(yards, 10) || 0;
    if (isTheirPunt) {
      onSave({
        unit,
        stKey: unit === "special" ? stKeySel : null,
        them: true,
        action: "punt",
        playerId: null,
        passerId: null,
        score: null,
        pts: null,
        yards: y,
        snaps: snapsSel
      });
    } else {
      const tackleLike = ["tackle", "tfl", "sack"].indexOf(action) >= 0;
      const base = [playerId || null, isPass ? passerId || null : null].filter(Boolean).concat(tackleLike ? assistIds : []);
      onSave({
        unit,
        stKey: unit === "special" ? stKeySel : null,
        them: null,
        playerId: playerId || null,
        action: action || null,
        yards: y,
        score: score !== "none" ? score : null,
        pts: score !== "none" ? (scores.find(x => x.key === score) || {}).pts || 0 : null,
        passerId: isPass ? passerId || null : null,
        assistIds: tackleLike && assistIds.length ? assistIds : null,
        snaps: base.concat(snapsSel.filter(id => base.indexOf(id) < 0))
      });
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, "Add a missed play"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Slides into the game right after the play you tapped")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginBottom: 12
    }
  }, "Downs, score, ball spot, and stats all recompute as if it was logged in the moment. The named player (and passer) get their snap automatically \u2014 tap any teammates below who were also on the field so their play counts stay right."), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Unit"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Unit",
    value: unit,
    onChange: e => pickUnit(e.target.value)
  }, UNITS.map(u => /*#__PURE__*/React.createElement("option", {
    key: u.key,
    value: u.key
  }, u.label))), unit === "special" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Formation"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Formation",
    value: stKeySel,
    onChange: e => setStKeySel(e.target.value)
  }, ST_KEYS.map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, SPECIAL_TEAMS[k].label)))), !isTheirPunt && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Player"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Player",
    value: playerId,
    onChange: e => setPlayerId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Whole unit"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name)))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "What happened"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "What happened",
    value: action,
    onChange: e => setAction(e.target.value)
  }, actList.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.key,
    value: a.key
  }, a.label))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, isLoss ? "Yards they lost" : isTheirPunt ? "How far did the punt go?" : "Yards"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Yards",
    value: yards,
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, (isLoss ? Array.from({
    length: 31
  }, (_, i) => i) : isTheirPunt ? Array.from({
    length: 101
  }, (_, i) => i) : Array.from({
    length: 201
  }, (_, i) => i - 100)).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, isLoss ? y + (y === 1 ? " yard lost" : " yards lost") : isTheirPunt ? y + (y === 1 ? " yard" : " yards") : (y > 0 ? "+" + y : y) + (Math.abs(y) === 1 ? " yard" : " yards")))), isPass && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Who threw it"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Who threw it",
    value: passerId,
    onChange: e => setPasserId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "No passer / not sure"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name)))), !isTheirPunt && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Points on the play"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Points on the play",
    value: score,
    onChange: e => setScore(e.target.value)
  }, scores.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label, s.pts ? " (+" + s.pts + ")" : "")))), !isTheirPunt && ["tackle", "tfl", "sack"].indexOf(action) >= 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Assisted by \u2014 tap everyone in on it"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, roster.filter(p => p.id !== playerId).map(p => {
    const on = assistIds.indexOf(p.id) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "mini" + (on ? " dark" : ""),
      onClick: () => setAssistIds(on ? assistIds.filter(x => x !== p.id) : assistIds.concat([p.id]))
    }, "#", p.num, " ", p.name);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Also on the field \u2014 ", snapsSel.length, " tapped"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, roster.map(p => {
    const on = snapsSel.indexOf(p.id) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "mini" + (on ? " dark" : ""),
      onClick: () => toggleSnap(p.id)
    }, "#", p.num, " ", p.name);
  })), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    onClick: save
  }, "Add the play")));
}
function ThemSheet({
  scores,
  roster,
  onClose,
  onLog
}) {
  const [score, setScore] = useState("td");
  const [yards, setYards] = useState(0);
  const [credit, setCredit] = useState("");
  const list = scores.filter(s => s.key !== "none").concat([{
    key: "punt",
    label: "Punt — no return",
    pts: 0
  }, {
    key: "stopconv",
    label: "Try stopped",
    pts: 0
  }, {
    key: "block",
    label: "Kick blocked",
    pts: 0
  }]);
  const isStop = score === "stopconv" || score === "block";
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, "Their play"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Counts a snap for the kids on the field")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, list.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.key,
    className: "opt" + (score === s.key ? " on" : ""),
    onClick: () => setScore(s.key)
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, s.key === "punt" ? "we take over" : s.key === "stopconv" || s.key === "block" ? "their try failed" : "+" + s.pts + " for them")))), isStop && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, score === "block" ? "Who blocked the kick" : "Who made the tackle"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Who gets the credit",
    value: credit,
    onChange: e => setCredit(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Whole unit"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name)))), (score === "td" || score === "punt") && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, score === "td" ? "How long was the score?" : "How far did the punt go?"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Their score length",
    value: yards,
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, Array.from({
    length: 101
  }, (_, i) => i).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y, " ", y === 1 ? "yard" : "yards")))), /*#__PURE__*/React.createElement("button", {
    className: "confirm alt",
    onClick: () => {
      const sc = list.find(x => x.key === score);
      if (isStop) {
        onLog({
          score: null,
          action: score,
          pts: null,
          yards: 0,
          playerId: credit || null,
          ours: true
        });
      } else {
        onLog({
          score: score === "punt" ? null : score,
          action: score === "punt" ? "punt" : null,
          pts: score === "punt" ? null : sc ? sc.pts : 0,
          yards: score === "td" || score === "punt" ? yards : 0
        });
      }
    }
  }, isStop ? "Log the stop" : score === "punt" ? "Log the punt" : "Put it on their side")));
}
function QuarterSheet({
  quarter,
  onAdvance,
  onBack,
  onEndGame,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, "Quarter ", quarter), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, quarter === 2 ? "Halftime comes next" : quarter === 4 ? "Last quarter" : "Game clock")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Done")), quarter < 4 && /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    style: {
      marginTop: 0
    },
    onClick: () => onAdvance(quarter + 1)
  }, quarter === 2 ? "End the half — start quarter 3" : "End quarter " + quarter + " — start quarter " + (quarter + 1)), quarter === 2 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 10
    }
  }, "Ending the half resets the board to 1st & 10 for the second-half kickoff. Pick who has the ball with the unit buttons, and re-mark the ball spot if you're tracking it."), quarter === 4 && /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    style: {
      marginTop: 0
    },
    onClick: onEndGame
  }, "End the game \u2014 save it to the Season"), quarter > 1 && /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    style: {
      width: "100%",
      marginTop: 10
    },
    onClick: () => onBack(quarter - 1)
  }, "Go back to quarter ", quarter - 1)));
}
function SpotSheet({
  spot,
  onSet,
  onClose
}) {
  const [v, setV] = useState(spot != null ? String(spot) : "35");
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, "Ball spot"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Optional \u2014 set it and plays move it for you")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginBottom: 12
    }
  }, "Mark where the ball sits to start the series. Yards gained and lost, kicks, returns, and penalty walk-offs all move the mark automatically \u2014 come back here whenever the refs re-spot it. Coaches who don't want this just never turn it on."), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Ball spot",
    value: v,
    onChange: e => setV(e.target.value)
  }, Array.from({
    length: 101
  }, (_, i) => i).map(i => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, i === 50 ? "Midfield — the 50" : i < 50 ? "Our " + (i === 0 ? "goal line" : i) : i === 100 ? "Their goal line" : "Their " + (100 - i)))), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    onClick: () => onSet(parseInt(v, 10))
  }, "Set the spot"), spot != null && /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    style: {
      width: "100%",
      marginTop: 10
    },
    onClick: () => onSet(null)
  }, "Stop tracking the spot")));
}
function PenaltySheet({
  roster,
  unit,
  onClose,
  onLog
}) {
  const [who, setWho] = useState("them");
  const [kind, setKind] = useState("falsestart");
  const [yards, setYards] = useState(5);
  const ballSideOurs = unit !== "defense";
  const [side, setSide] = useState(ballSideOurs ? "defense" : "offense");
  const pickWho = v => {
    setWho(v);
    const ours = v !== "them";
    setSide(ours === ballSideOurs ? "offense" : "defense");
  };
  const pickKind = k => {
    setKind(k);
    const pk = PENALTIES.find(x => x.key === k);
    if (pk) setYards(pk.yds);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, "Penalty"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "The flag fixes down & distance for you")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Who was flagged"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Who was flagged",
    value: who,
    onChange: e => pickWho(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "them"
  }, "The other team"), /*#__PURE__*/React.createElement("option", {
    value: "us"
  }, "Us \u2014 no one in particular"), roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "The call"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Penalty type",
    value: kind,
    onChange: e => pickKind(e.target.value)
  }, PENALTIES.map(x => /*#__PURE__*/React.createElement("option", {
    key: x.key,
    value: x.key
  }, x.label, " (", x.yds, ")"))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Yards walked off"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Penalty yards",
    value: yards,
    onChange: e => setYards(parseInt(e.target.value, 10))
  }, Array.from({
    length: 50
  }, (_, i) => i + 1).map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y, " ", y === 1 ? "yard" : "yards"))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Enforced against"), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "opt" + (side === "offense" ? " on" : ""),
    onClick: () => setSide("offense")
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, "The ball side"), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, "backs up \xB7 replay the down")), /*#__PURE__*/React.createElement("button", {
    className: "opt" + (side === "defense" ? " on" : ""),
    onClick: () => setSide("defense")
  }, /*#__PURE__*/React.createElement("div", {
    className: "opt-l"
  }, "The defending side"), /*#__PURE__*/React.createElement("div", {
    className: "opt-h"
  }, "chains move up"))), /*#__PURE__*/React.createElement("button", {
    className: "confirm alt",
    onClick: () => onLog({
      playerId: who !== "them" && who !== "us" ? who : null,
      ours: who !== "them",
      side,
      kind,
      yards
    })
  }, "Log the penalty")));
}
function CrewSheet({
  me,
  code,
  sync,
  available,
  onJoin,
  onLeave,
  onRename,
  onClose
}) {
  const [entry, setEntry] = useState("");
  const [name, setName] = useState(me && me.name || "");
  const ready = entry.replace(/[^A-Za-z0-9]/g, "").length >= 4;
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, code ? "Your coaching crew" : "Coach together"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, code ? sync.coaches + " on this game" : "One game, several phones")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Done")), !available && !code && /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginBottom: 14
    }
  }, "Sharing a game across phones needs a database. Add your Supabase URL and anon key to ", /*#__PURE__*/React.createElement("b", null, "config.js"), " in the repo and this turns on. Until then everything works fine on one phone."), code ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "yardbox",
    style: {
      marginTop: 0,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Crew code"), /*#__PURE__*/React.createElement("div", {
    className: "bigcode"
  }, code), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--soft)",
      lineHeight: 1.5
    }
  }, "Send the other coaches this page's link and these four letters. Everyone who types it in shares one roster, one score, one play log.")), /*#__PURE__*/React.createElement("div", {
    className: "yardbox",
    style: {
      textAlign: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Fans can watch"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--soft)",
      lineHeight: 1.5,
      marginBottom: 8
    }
  }, "Share the watch link for a live, view-only gamecast \u2014 score, down & distance, and the play-by-play as it happens. No editing."), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    style: {
      width: "100%",
      padding: 10
    },
    onClick: () => {
      const link = window.location.origin + window.location.pathname + "?watch=" + code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => window.alert("Watch link copied:\n" + link), () => window.prompt("Copy the watch link:", link));
      } else window.prompt("Copy the watch link:", link);
    }
  }, "Copy the watch link")), sync.state === "offline" && /*#__PURE__*/React.createElement("div", {
    className: "banner",
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("b", null, "No connection."), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--soft)"
    }
  }, "Keep tracking \u2014 everything saves here and uploads when you're back.")), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Your name (shows on the play log)",
    value: name,
    onChange: e => setName(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    onClick: () => onRename(name)
  }, "Save")), /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    style: {
      width: "100%",
      marginTop: 10
    },
    onClick: () => {
      onLeave();
      onClose();
    }
  }, "Coach on my own instead"), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 12
    }
  }, "Anyone with this link and code can read and change the game. Keep it to jersey numbers and first names.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Your name (shows on the play log)",
    value: name,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Start a crew"), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    style: {
      marginTop: 0
    },
    disabled: !available,
    onClick: () => onJoin(makeCode(), name, true)
  }, "Create a code"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--soft)",
      marginTop: 6,
      lineHeight: 1.4
    }
  }, "Your roster, lineups, and schedule come with you \u2014 the other coaches see them as soon as they join."), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "18px 0 6px"
    }
  }, "Or join one"), /*#__PURE__*/React.createElement("input", {
    className: "inp code-inp",
    placeholder: "CODE",
    maxLength: 4,
    value: entry,
    onChange: e => setEntry(e.target.value.toUpperCase())
  }), /*#__PURE__*/React.createElement("button", {
    className: "confirm alt",
    disabled: !ready || !available,
    onClick: () => onJoin(entry, name)
  }, "Join this game"), /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    style: {
      width: "100%",
      marginTop: 10
    },
    disabled: !ready || !available,
    onClick: () => {
      window.location.href = window.location.pathname + "?watch=" + entry.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    }
  }, "Just watch this game (view only)"), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 14
    }
  }, "Your solo roster stays on this phone and comes back if you leave the crew."))));
}

/* ============================ ROSTER ============================ */

function RosterTab({
  squad,
  setSquad,
  statOf
}) {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [pos, setPos] = useState("");
  const [bulk, setBulk] = useState("");
  const [editing, setEditing] = useState(null);

  /* Edits keep the player's id, so career stats stay linked across seasons
     (new jersey number, name fix) — never remove and re-add for that. */
  const saveEdit = () => {
    if (!editing || !editing.name.trim() || !editing.num.trim()) return;
    setSquad(s => Object.assign({}, s, {
      roster: s.roster.map(p => p.id === editing.id ? Object.assign({}, p, {
        num: editing.num.trim(),
        name: editing.name.trim(),
        pos: editing.pos.trim()
      }) : p)
    }));
    setEditing(null);
  };
  const add = () => {
    if (!name.trim() || !num.trim()) return;
    setSquad(s => Object.assign({}, s, {
      roster: s.roster.concat([{
        id: uid(),
        name: name.trim(),
        num: num.trim(),
        pos: pos.trim()
      }])
    }));
    setName("");
    setNum("");
    setPos("");
  };
  const addBulk = () => {
    const lines = bulk.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => {
      const m = l.match(/^(\d+)\s*[,\t ]\s*(.+)$/);
      return m ? {
        id: uid(),
        num: m[1],
        name: m[2].trim(),
        pos: ""
      } : null;
    }).filter(Boolean);
    if (!parsed.length) return;
    setSquad(s => Object.assign({}, s, {
      roster: s.roster.concat(parsed)
    }));
    setBulk("");
  };
  const remove = id => {
    const strip = arr => arr.map(s => Object.assign({}, s, {
      playerId: s.playerId === id ? null : s.playerId,
      backupId: s.backupId === id ? null : s.backupId
    }));
    setSquad(s => Object.assign({}, s, {
      roster: s.roster.filter(p => p.id !== id),
      lineups: {
        offense: strip(s.lineups.offense),
        defense: strip(s.lineups.defense),
        special: ST_KEYS.reduce((a, k) => Object.assign({}, a, {
          [k]: strip(s.lineups.special[k])
        }), {})
      }
    }));
  };
  const sorted = squad.roster.slice().sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Roster"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, squad.roster.length, " players")), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: "0 0 68px"
    },
    placeholder: "#",
    value: num,
    inputMode: "numeric",
    onChange: e => setNum(e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 120
    },
    placeholder: "Player name",
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") add();
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: "1 1 100%"
    },
    placeholder: "Positions they can play (RB, LB\u2026)",
    value: pos,
    onChange: e => setPos(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    style: {
      flex: "1 1 100%",
      padding: 12
    },
    onClick: add
  }, "Add player")), /*#__PURE__*/React.createElement("details", {
    className: "fold"
  }, /*#__PURE__*/React.createElement("summary", null, "Paste a whole roster"), /*#__PURE__*/React.createElement("textarea", {
    className: "inp",
    rows: 5,
    placeholder: "12 Jordan Blair\n7 Sam Ortiz\n44 Eli Ward",
    value: bulk,
    onChange: e => setBulk(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    style: {
      width: "100%",
      padding: 11,
      marginTop: 8
    },
    onClick: addBulk
  }, "Add these players")), sorted.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "Add your first player above. Number and name are all you need."), sorted.map(p => editing && editing.id === p.id ? /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: p.id,
    style: {
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: "0 0 68px"
    },
    placeholder: "#",
    inputMode: "numeric",
    value: editing.num,
    onChange: e => setEditing(Object.assign({}, editing, {
      num: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 120
    },
    placeholder: "Player name",
    value: editing.name,
    onChange: e => setEditing(Object.assign({}, editing, {
      name: e.target.value
    })),
    onKeyDown: e => {
      if (e.key === "Enter") saveEdit();
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: "1 1 100%"
    },
    placeholder: "Positions they can play (RB, LB\u2026)",
    value: editing.pos,
    onChange: e => setEditing(Object.assign({}, editing, {
      pos: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    style: {
      flex: 1,
      padding: 10
    },
    onClick: saveEdit
  }, "Save"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      flex: 1,
      padding: 10
    },
    onClick: () => setEditing(null)
  }, "Cancel")) : /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: p.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate"
  }, p.num), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, p.pos || "no positions listed", " \xB7 ", statOf(p.id).snaps, " plays")), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setEditing({
      id: p.id,
      num: p.num,
      name: p.name,
      pos: p.pos || ""
    })
  }, "Edit"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => {
      if (window.confirm("Remove #" + p.num + " " + p.name + " from the roster? Season stats they already have stay saved, but re-adding them later counts as a new player. To change their number or name, use Edit instead.")) remove(p.id);
    }
  }, "Remove"))), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Play minimum")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14,
      color: "var(--soft)"
    }
  }, "Plays each kid should get. The chain on every card fills toward this number and turns red when they're short."), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      width: 72,
      textAlign: "center",
      fontSize: 20,
      fontWeight: 700
    },
    inputMode: "numeric",
    value: squad.minPlays,
    onChange: e => setSquad(s => Object.assign({}, s, {
      minPlays: Math.max(1, parseInt(e.target.value, 10) || 1)
    }))
  })), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Scoring")), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 100%",
      fontSize: 14,
      color: "var(--soft)"
    }
  }, "After a touchdown: elementary leagues score the kick as 2 and a run or pass conversion as 1 \u2014 high school flips it. Games already logged keep the points they were scored with."), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Scoring level",
    value: squad.scoring || "elementary",
    onChange: e => setSquad(s => Object.assign({}, s, {
      scoring: e.target.value
    }))
  }, /*#__PURE__*/React.createElement("option", {
    value: "elementary"
  }, "Elementary \u2014 kick +2 \xB7 run/pass +1"), /*#__PURE__*/React.createElement("option", {
    value: "highschool"
  }, "High school \u2014 kick +1 \xB7 run/pass +2"))));
}

/* ============================ LINEUPS ============================ */

function SlotName({
  label,
  onSave
}) {
  const [v, setV] = useState(label);
  useEffect(() => {
    setV(label);
  }, [label]);
  const commit = () => {
    const t = v.trim();
    if (t && t !== label) onSave(t);else setV(label);
  };
  return /*#__PURE__*/React.createElement("input", {
    className: "inp slot-inp",
    value: v,
    "aria-label": "Position name",
    onChange: e => setV(e.target.value),
    onBlur: commit,
    onKeyDown: e => {
      if (e.key === "Enter") e.target.blur();
    }
  });
}
function LineupsTab({
  squad,
  setSquad
}) {
  const [unit, setUnit] = useState("offense");
  const [stKey, setStKey] = useState("kickoff");
  const slots = (unit === "special" ? squad.lineups.special[stKey] : squad.lineups[unit]) || [];
  const defaultNames = unit === "special" ? SPECIAL_TEAMS[stKey].slots : unit === "offense" ? OFFENSE_SLOTS : DEFENSE_SLOTS;
  const resetNames = () => {
    if (!window.confirm("Put this unit's position names back to the defaults?")) return;
    const relabel = arr => arr.map((s, i) => Object.assign({}, s, {
      label: defaultNames[i] || s.label
    }));
    setSquad(s => unit === "special" ? Object.assign({}, s, {
      lineups: Object.assign({}, s.lineups, {
        special: Object.assign({}, s.lineups.special, {
          [stKey]: relabel(s.lineups.special[stKey])
        })
      })
    }) : Object.assign({}, s, {
      lineups: Object.assign({}, s.lineups, {
        [unit]: relabel(s.lineups[unit])
      })
    }));
  };
  const update = (slotId, field, value) => {
    const edit = arr => arr.map(s => s.id === slotId ? Object.assign({}, s, {
      [field]: value || null
    }) : s);
    setSquad(s => unit === "special" ? Object.assign({}, s, {
      lineups: Object.assign({}, s.lineups, {
        special: Object.assign({}, s.lineups.special, {
          [stKey]: edit(s.lineups.special[stKey])
        })
      })
    }) : Object.assign({}, s, {
      lineups: Object.assign({}, s.lineups, {
        [unit]: edit(s.lineups[unit])
      })
    }));
  };
  const used = slots.filter(s => s.playerId).length;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Lineups"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, used, " of 11 set")), /*#__PURE__*/React.createElement("div", {
    className: "units"
  }, UNITS.map(u => /*#__PURE__*/React.createElement("button", {
    key: u.key,
    className: "unit " + u.key + (unit === u.key ? " on" : ""),
    onClick: () => setUnit(u.key)
  }, u.label))), unit === "special" && /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, ST_KEYS.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: stKey === k ? "on" : "",
    onClick: () => setStKey(k)
  }, SPECIAL_TEAMS[k].label))), squad.roster.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "Add players on the ", /*#__PURE__*/React.createElement("b", null, "Roster"), " tab first, then assign them here.") : slots.map(s => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: s.id,
    style: {
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(SlotName, {
    label: s.label,
    onSave: t => update(s.id, "label", t)
  }), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 130
    },
    value: s.playerId || "",
    onChange: e => update(s.id, "playerId", e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Starter\u2026"), squad.roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name))), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    style: {
      flex: 1,
      minWidth: 130
    },
    value: s.backupId || "",
    onChange: e => update(s.id, "backupId", e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Sub\u2026"), squad.roster.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, "#", p.num, " ", p.name))))), squad.roster.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      width: "100%",
      padding: 10,
      marginTop: 2
    },
    onClick: resetNames
  }, "Reset this unit's position names"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left"
    }
  }, "These are starting points, not rules. Tap a position's name to rename it \u2014 call the spots whatever your playbook calls them. During the game ", /*#__PURE__*/React.createElement("b", null, "Sub"), " opens the whole roster for that spot, and", /*#__PURE__*/React.createElement("b", null, " Move"), " picks a player up so you can drop them anywhere on the field."));
}

/* ============================ STATS ============================ */

function StatsTab({
  roster,
  statOf,
  minPlays,
  game,
  onEndGame
}) {
  const [view, setView] = useState("plays");
  const rows = roster.map(p => ({
    p,
    s: statOf(p.id)
  }));
  if (!roster.length) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "empty-note"
    }, "Stats show up here once you have players and plays."));
  }
  const plays = rows.slice().sort((a, b) => a.s.snaps - b.s.snaps);
  const short = plays.filter(r => r.s.snaps < minPlays);
  const teamRush = game.plays.reduce((a, p) => a + (p.unit === "offense" && p.action === "rush" ? p.yards || 0 : 0), 0);
  const teamPass = game.plays.reduce((a, p) => a + (p.unit === "offense" && (p.action === "catch" || p.action === "pass") ? p.yards || 0 : 0), 0);
  /* Yards the other team has gained against our defense (their losses count
     back): tackles/assists log their gain, sacks and TFLs their loss, and
     their scores carry the length of the play. */
  const teamAllowed = game.plays.reduce((a, p) => {
    if (p.type === "pen" || p.unit !== "defense" || p.them && p.action === "punt") return a;
    const y = p.yards || 0;
    return a + (p.action === "sack" || p.action === "tfl" ? -y : y);
  }, 0);
  /* Return yards stay separate from rushing/passing AND from each other,
     split by which return team was on the field. */
  const teamKR = game.plays.reduce((a, p) => a + (!p.them && p.unit === "special" && p.action === "return" && (p.stKey === "kickReturn" || p.stKey === "kickoff") ? p.yards || 0 : 0), 0);
  const teamPR = game.plays.reduce((a, p) => a + (!p.them && p.unit === "special" && p.action === "return" && (p.stKey === "puntReturn" || p.stKey === "punt") ? p.yards || 0 : 0), 0);
  const exportCsv = () => {
    const head = ["Number", "Name", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds", "Catches", "RecYds", "PassCmp", "PassAtt", "PassYds", "Kicks", "KickYds", "Returns", "RetYds", "FGM", "FGA", "ConvM", "ConvA", "BlkKicks", "Fumbles", "FumLost", "Tackles", "Assists", "TFL", "Sacks", "LossYds", "Int", "FumRec", "PBU", "Penalties", "PenYds", "TD", "Points"];
    const body = rows.slice().sort((a, b) => (parseInt(a.p.num, 10) || 0) - (parseInt(b.p.num, 10) || 0)).map(({
      p,
      s
    }) => [p.num, p.name, s.snaps, s.off, s.def, s.st, s.rush, s.rushY, s.rec, s.recY, s.cmp, s.att, s.passY, s.kicks, s.kickY, s.ret, s.retY, s.fgm, s.fga, s.convM, s.convA, s.blk, s.fum, s.fumL, s.tk, s.ast, s.tfl, s.sack, s.lossY, s.int, s.fr, s.pbu, s.pen, s.penY, s.td, s.pts]);
    const csv = [head].concat(body).map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download("sideline-" + new Date().toISOString().slice(0, 10) + ".csv", csv, "text/csv");
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Stats"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, game.playCount, " plays")), /*#__PURE__*/React.createElement("div", {
    className: "board",
    style: {
      marginTop: 0,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "board-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Rush yds"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, teamRush)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Pass yds"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, teamPass)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Total off."), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, teamRush + teamPass))), /*#__PURE__*/React.createElement("div", {
    className: "board-top",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "KO ret yds"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, teamKR)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Punt ret yds"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, teamPR)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Allowed"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, teamAllowed)))), /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, [["plays", "Play count"], ["off", "Offense"], ["def", "Defense"], ["st", "Special"]].map(v => /*#__PURE__*/React.createElement("button", {
    key: v[0],
    className: view === v[0] ? "on" : "",
    onClick: () => setView(v[0])
  }, v[1]))), view === "plays" && /*#__PURE__*/React.createElement(React.Fragment, null, short.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      background: "#F7EAE6",
      borderColor: "#E0C4BC"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("b", null, short.length, " ", short.length === 1 ? "player is" : "players are", " under ", minPlays, " plays."), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--soft)"
    }
  }, "Get them in: ", short.slice(0, 6).map(r => "#" + r.p.num).join(", ")))), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Off"), /*#__PURE__*/React.createElement("th", null, "Def"), /*#__PURE__*/React.createElement("th", null, "Spec"), /*#__PURE__*/React.createElement("th", null, "Total"), /*#__PURE__*/React.createElement("th", null, "Pen"))), /*#__PURE__*/React.createElement("tbody", null, plays.map(({
    p,
    s
  }) => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    className: s.snaps < minPlays ? "short" : ""
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", p.num), " ", p.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.off), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.def), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.st), /*#__PURE__*/React.createElement("td", {
    className: "n",
    style: {
      color: s.snaps < minPlays ? "var(--stop)" : "var(--go)"
    }
  }, s.snaps), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.pen)))))), view === "off" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Car"), /*#__PURE__*/React.createElement("th", null, "Rush"), /*#__PURE__*/React.createElement("th", null, "Rec"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Pass"), /*#__PURE__*/React.createElement("th", null, "PsYd"), /*#__PURE__*/React.createElement("th", null, "Fum"), /*#__PURE__*/React.createElement("th", null, "TD"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.rushY + b.s.recY - (a.s.rushY + a.s.recY)).map(({
    p,
    s
  }) => /*#__PURE__*/React.createElement("tr", {
    key: p.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", p.num), " ", p.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.rush), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.rushY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.rec), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.recY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.att ? s.cmp + "/" + s.att : "—"), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.passY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.fum), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.td))))), view === "def" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Tkl"), /*#__PURE__*/React.createElement("th", null, "Ast"), /*#__PURE__*/React.createElement("th", null, "TFL"), /*#__PURE__*/React.createElement("th", null, "Sck"), /*#__PURE__*/React.createElement("th", null, "LsYd"), /*#__PURE__*/React.createElement("th", null, "Int"), /*#__PURE__*/React.createElement("th", null, "FR"), /*#__PURE__*/React.createElement("th", null, "PBU"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.tk - a.s.tk).map(({
    p,
    s
  }) => /*#__PURE__*/React.createElement("tr", {
    key: p.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", p.num), " ", p.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.tk), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.ast), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.tfl), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.sack), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.lossY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.int), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.fr), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.pbu))))), view === "st" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Kicks"), /*#__PURE__*/React.createElement("th", null, "KYds"), /*#__PURE__*/React.createElement("th", null, "Ret"), /*#__PURE__*/React.createElement("th", null, "RYds"), /*#__PURE__*/React.createElement("th", null, "FG"), /*#__PURE__*/React.createElement("th", null, "Conv"), /*#__PURE__*/React.createElement("th", null, "Blk"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.kickY + b.s.retY - (a.s.kickY + a.s.retY)).map(({
    p,
    s
  }) => /*#__PURE__*/React.createElement("tr", {
    key: p.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", p.num), " ", p.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.kicks), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.kickY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.ret), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.retY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.fga ? s.fgm + "/" + s.fga : "—"), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.convA ? s.convM + "/" + s.convA : "—"), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.blk))))), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "After the game")), /*#__PURE__*/React.createElement("div", {
    className: "actionbar",
    style: {
      marginTop: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "abtn",
    onClick: exportCsv
  }, "Download stats"), /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    onClick: onEndGame
  }, "Start a new game")));
}

/* ============================ SEASON ============================ */

function ScheduleSection({
  squad,
  setSquad,
  onTrack
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [opp, setOpp] = useState("");
  const sched = (squad.schedule || []).slice().sort((a, b) => a.date + "T" + (a.time || "") < b.date + "T" + (b.time || "") ? -1 : 1);
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = sched.filter(g => g.date >= todayKey).length;
  const add = () => {
    if (!date || !opp.trim()) return;
    setSquad(s => Object.assign({}, s, {
      schedule: (s.schedule || []).concat([{
        id: uid(),
        date,
        time,
        opponent: opp.trim()
      }])
    }));
    setDate("");
    setTime("");
    setOpp("");
  };
  const remove = id => setSquad(s => Object.assign({}, s, {
    schedule: (s.schedule || []).filter(g => g.id !== id)
  }));
  const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const fmtTime = t => t ? new Date("2000-01-01T" + t).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }) : "time TBD";
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Schedule"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, upcoming, " upcoming")), /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp sched-date",
    type: "date",
    "aria-label": "Game date",
    value: date,
    style: {
      flex: "1 1 45%",
      minWidth: 130
    },
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp sched-time",
    type: "time",
    "aria-label": "Kickoff time",
    value: time,
    style: {
      flex: "1 1 45%",
      minWidth: 110
    },
    onChange: e => setTime(e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp sched-opp",
    placeholder: "Opposing team",
    value: opp,
    style: {
      flex: "1 1 100%"
    },
    onChange: e => setOpp(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") add();
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    style: {
      flex: "1 1 100%",
      padding: 11
    },
    onClick: add
  }, "Add to schedule")), sched.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "No games on the schedule yet. Add each one above \u2014 date, kickoff time, and who you're playing."), sched.map(g => {
    const past = g.date < todayKey;
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: g.id,
      style: past || g.done ? {
        opacity: 0.55
      } : null
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 15
      }
    }, "vs ", g.opponent), /*#__PURE__*/React.createElement("div", {
      className: "eyebrow"
    }, fmtDate(g.date), " \xB7 ", fmtTime(g.time), g.done ? " · final " + g.us + "–" + g.them : past ? " · played" : "")), /*#__PURE__*/React.createElement("button", {
      className: "mini dark",
      onClick: () => onTrack(g)
    }, "Add stats"), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      onClick: () => {
        if (window.confirm("Take this game off the schedule?")) remove(g.id);
      }
    }, "Remove"));
  }));
}
function SeasonTab({
  games,
  squad,
  setSquad,
  onEdit,
  onRemove,
  onImport,
  onTrack
}) {
  const [year, setYear] = useState("all");
  const [view, setView] = useState("plays");
  const [editingGame, setEditingGame] = useState(null);
  const fileRef = useRef(null);
  const saveGameEdit = () => {
    if (!editingGame) return;
    const patch = {
      opponent: editingGame.opponent.trim(),
      us: Math.max(0, parseInt(editingGame.us, 10) || 0),
      them: Math.max(0, parseInt(editingGame.them, 10) || 0)
    };
    if (/^\d{4}-\d{2}-\d{2}$/.test(editingGame.date)) {
      patch.endedAt = new Date(editingGame.date + "T12:00:00").toISOString();
    }
    onEdit(editingGame.id, patch);
    setEditingGame(null);
  };
  const years = useMemo(() => {
    const ys = {};
    games.forEach(g => {
      ys[(g.endedAt || "").slice(0, 4)] = true;
    });
    return Object.keys(ys).sort().reverse();
  }, [games]);
  const shown = year === "all" ? games : games.filter(g => (g.endedAt || "").slice(0, 4) === year);
  const totals = useMemo(() => seasonTotals(shown), [shown]);
  const wins = shown.filter(g => g.us > g.them).length;
  const losses = shown.filter(g => g.us < g.them).length;
  const ties = shown.length - wins - losses;
  const pf = shown.reduce((a, g) => a + (g.us || 0), 0);
  const pa = shown.reduce((a, g) => a + (g.them || 0), 0);
  const newest = shown.slice().sort((a, b) => a.endedAt < b.endedAt ? 1 : -1);
  const exportCsv = () => {
    const head = ["Number", "Name", "Games", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds", "Catches", "RecYds", "PassCmp", "PassAtt", "PassYds", "Kicks", "KickYds", "Returns", "RetYds", "FGM", "FGA", "ConvM", "ConvA", "BlkKicks", "Fumbles", "FumLost", "Tackles", "Assists", "TFL", "Sacks", "LossYds", "Int", "FumRec", "PBU", "Penalties", "PenYds", "TD", "Points"];
    const body = totals.slice().sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0)).map(t => [t.num, t.name, t.gp, t.snaps, t.off, t.def, t.st, t.rush, t.rushY, t.rec, t.recY, t.cmp, t.att, t.passY, t.kicks, t.kickY, t.ret, t.retY, t.fgm, t.fga, t.convM, t.convA, t.blk, t.fum, t.fumL, t.tk, t.ast, t.tfl, t.sack, t.lossY, t.int, t.fr, t.pbu, t.pen, t.penY, t.td, t.pts]);
    const csv = [head].concat(body).map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download("sideline-season-" + (year === "all" ? "all" : year) + ".csv", csv, "text/csv");
  };
  const backup = () => {
    download("sideline-games-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(games, null, 2), "application/json");
  };
  const restore = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const n = onImport(JSON.parse(rd.result));
        window.alert(n ? "Added " + n + (n === 1 ? " game." : " games.") : "Nothing new in that backup.");
      } catch (err) {
        window.alert("That file doesn't look like a Sideline backup.");
      }
    };
    rd.readAsText(f);
    e.target.value = "";
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Season"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, shown.length, " ", shown.length === 1 ? "game" : "games")), shown.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "board",
    style: {
      textAlign: "center",
      marginTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, year === "all" ? "Team record — all years" : "Team record — " + year), /*#__PURE__*/React.createElement("div", {
    className: "dd-main"
  }, wins, "\u2013", losses, ties ? "–" + ties : ""), /*#__PURE__*/React.createElement("div", {
    className: "dd-sub"
  }, pf, " scored \xB7 ", pa, " allowed")), /*#__PURE__*/React.createElement(ScheduleSection, {
    squad: squad,
    setSquad: setSquad,
    onTrack: onTrack
  }), years.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: year === "all" ? "on" : "",
    onClick: () => setYear("all")
  }, "All years"), years.map(y => /*#__PURE__*/React.createElement("button", {
    key: y,
    className: year === y ? "on" : "",
    onClick: () => setYear(y)
  }, y))), shown.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "No games saved yet. Finish a game and tap ", /*#__PURE__*/React.createElement("b", null, "Start a new game"), " on the Stats tab \u2014 it lands here automatically, and the totals below grow all season.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, [["plays", "Play count"], ["off", "Offense"], ["def", "Defense"], ["st", "Special"]].map(v => /*#__PURE__*/React.createElement("button", {
    key: v[0],
    className: view === v[0] ? "on" : "",
    onClick: () => setView(v[0])
  }, v[1]))), view === "plays" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "GP"), /*#__PURE__*/React.createElement("th", null, "Off"), /*#__PURE__*/React.createElement("th", null, "Def"), /*#__PURE__*/React.createElement("th", null, "Spec"), /*#__PURE__*/React.createElement("th", null, "Total"), /*#__PURE__*/React.createElement("th", null, "Pen"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.snaps - a.snaps).map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", t.num), " ", t.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.gp), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.off), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.def), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.st), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.snaps), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.pen))))), view === "off" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Car"), /*#__PURE__*/React.createElement("th", null, "Rush"), /*#__PURE__*/React.createElement("th", null, "Rec"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Pass"), /*#__PURE__*/React.createElement("th", null, "PsYd"), /*#__PURE__*/React.createElement("th", null, "Fum"), /*#__PURE__*/React.createElement("th", null, "TD"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.rushY + b.recY - (a.rushY + a.recY)).map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", t.num), " ", t.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.rush), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.rushY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.rec), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.recY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.att ? t.cmp + "/" + t.att : "—"), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.passY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.fum), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.td))))), view === "def" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Tkl"), /*#__PURE__*/React.createElement("th", null, "Ast"), /*#__PURE__*/React.createElement("th", null, "TFL"), /*#__PURE__*/React.createElement("th", null, "Sck"), /*#__PURE__*/React.createElement("th", null, "LsYd"), /*#__PURE__*/React.createElement("th", null, "Int"), /*#__PURE__*/React.createElement("th", null, "FR"), /*#__PURE__*/React.createElement("th", null, "PBU"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.tk - a.tk).map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", t.num), " ", t.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.tk), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.ast), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.tfl), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.sack), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.lossY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.int), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.fr), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.pbu))))), view === "st" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Kicks"), /*#__PURE__*/React.createElement("th", null, "KYds"), /*#__PURE__*/React.createElement("th", null, "Ret"), /*#__PURE__*/React.createElement("th", null, "RYds"), /*#__PURE__*/React.createElement("th", null, "FG"), /*#__PURE__*/React.createElement("th", null, "Conv"), /*#__PURE__*/React.createElement("th", null, "Blk"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.kickY + b.retY - (a.kickY + a.retY)).map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", t.num), " ", t.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.kicks), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.kickY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.ret), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.retY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.fga ? t.fgm + "/" + t.fga : "—"), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.convA ? t.convM + "/" + t.convA : "—"), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.blk))))), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Games"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Latest first")), newest.map(g => editingGame && editingGame.id === g.id ? /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: g.id,
    style: {
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    style: {
      flex: "1 1 100%"
    },
    placeholder: "Opponent",
    value: editingGame.opponent,
    onChange: e => setEditingGame(Object.assign({}, editingGame, {
      opponent: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "date",
    "aria-label": "Game date",
    style: {
      flex: "1 1 46%",
      minWidth: 130
    },
    value: editingGame.date,
    onChange: e => setEditingGame(Object.assign({}, editingGame, {
      date: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 46%",
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    inputMode: "numeric",
    "aria-label": "Our score",
    value: editingGame.us,
    onChange: e => setEditingGame(Object.assign({}, editingGame, {
      us: e.target.value
    }))
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    inputMode: "numeric",
    "aria-label": "Their score",
    value: editingGame.them,
    onChange: e => setEditingGame(Object.assign({}, editingGame, {
      them: e.target.value
    }))
  })), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    style: {
      flex: 1,
      padding: 10
    },
    onClick: saveGameEdit
  }, "Save"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      flex: 1,
      padding: 10
    },
    onClick: () => setEditingGame(null)
  }, "Cancel")) : /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: g.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate",
    style: {
      minWidth: 62,
      fontSize: 16
    }
  }, g.us, "\u2013", g.them), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--cond)",
      color: g.us > g.them ? "var(--go)" : g.us < g.them ? "var(--stop)" : "var(--soft)"
    }
  }, g.us > g.them ? "W" : g.us < g.them ? "L" : "T"), " ", g.opponent ? "vs " + g.opponent : "Game"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, new Date(g.endedAt).toLocaleDateString(), " \xB7 ", g.playsCount, " plays", g.pending ? " · waiting to upload" : "")), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setEditingGame({
      id: g.id,
      opponent: g.opponent || "",
      date: (g.endedAt || "").slice(0, 10),
      us: String(g.us),
      them: String(g.them)
    })
  }, "Edit"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => {
      if (window.confirm("Remove this game from the season? Its stats leave the totals.")) onRemove(g.id);
    }
  }, "Remove")))), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Keep it safe")), /*#__PURE__*/React.createElement("div", {
    className: "actionbar",
    style: {
      marginTop: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "abtn",
    onClick: exportCsv,
    disabled: !shown.length
  }, "Season CSV"), /*#__PURE__*/React.createElement("button", {
    className: "abtn",
    onClick: backup,
    disabled: !games.length
  }, "Back up"), /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    onClick: () => fileRef.current && fileRef.current.click()
  }, "Restore")), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "application/json,.json",
    style: {
      display: "none"
    },
    onChange: restore
  }), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("b", null, "Back up"), " downloads every saved game as one file \u2014 do it now and then, or before switching phones.", /*#__PURE__*/React.createElement("b", null, " Restore"), " merges a backup in without overwriting anything, so it also works for combining years."));
}

/* ============================ GAMECAST (VIEW ONLY) ============================ */

/* Fans follow along at ?watch=CODE — live score, downs, and play-by-play,
   with no controls to change anything. */
function GameCast({
  code
}) {
  const [ops, setOps] = useState([]);
  const [squad, setSquadState] = useState(() => freshSquad());
  const [status, setStatus] = useState(sb ? "connecting" : "noconfig");
  useEffect(() => {
    if (!sb) return undefined;
    let alive = true;
    const pull = async () => {
      try {
        const rows = await sb.from(T_OPS).select("coach_id,coach_name,ops").eq("game_code", code);
        if (rows.error) throw rows.error;
        const out = [];
        (rows.data || []).forEach(r => (r.ops || []).forEach(o => out.push(Object.assign({}, o, {
          byName: r.coach_name || "Coach"
        }))));
        out.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
        if (!alive) return;
        setOps(out);
        setStatus("live");
        const sq = await sb.from(T_SQUAD).select("squad").eq("game_code", code).maybeSingle();
        if (alive && !sq.error && sq.data && sq.data.squad) setSquadState(sq.data.squad);
      } catch (e) {
        if (alive) setStatus("offline");
      }
    };
    pull();
    let ch = null;
    try {
      ch = sb.channel("sideline-watch-" + code).on("postgres_changes", {
        event: "*",
        schema: "public",
        table: T_OPS,
        filter: "game_code=eq." + code
      }, () => {
        if (alive) pull();
      }).subscribe();
    } catch (e) {/* realtime unavailable — the poll below still updates */}
    const t = setInterval(() => {
      if (!document.hidden) pull();
    }, 10000);
    const onShow = () => {
      if (!document.hidden) pull();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      if (ch) try {
        sb.removeChannel(ch);
      } catch (e) {/* noop */}
    };
  }, [code]);
  const game = useMemo(() => fold(ops), [ops]);
  const byId = useMemo(() => {
    const m = {};
    (squad.roster || []).forEach(p => {
      m[p.id] = p;
    });
    return m;
  }, [squad]);
  const statusText = status === "noconfig" ? "needs setup" : status === "offline" ? "reconnecting…" : status === "connecting" ? "connecting…" : "live";
  return /*#__PURE__*/React.createElement("div", {
    className: "sl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sl-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "crew",
    style: {
      cursor: "default"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot " + (status === "live" ? "live" : "err")
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Watching ", code), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow",
    style: {
      marginLeft: "auto"
    }
  }, "Gamecast \xB7 ", statusText)), /*#__PURE__*/React.createElement("div", {
    className: "board"
  }, /*#__PURE__*/React.createElement("div", {
    className: "board-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Us"), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.us)), /*#__PURE__*/React.createElement("div", {
    className: "dd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-main"
  }, ORD[game.down], " ", /*#__PURE__*/React.createElement("small", null, "&"), " ", game.distance), /*#__PURE__*/React.createElement("div", {
    className: "dd-sub"
  }, "Quarter ", game.quarter, " \xB7 ", game.playCount, " plays run", game.spot != null ? " · ball on " + spotLabel(game.spot) : "")), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Them"), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.them)))), game.gameInfo && game.gameInfo.opponent && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      textAlign: "center",
      marginTop: 8
    }
  }, "vs ", game.gameInfo.opponent), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Play-by-play"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Latest first")), game.plays.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "No plays yet \u2014 hang tight, kickoff is coming."), /*#__PURE__*/React.createElement("div", null, game.plays.slice().reverse().map((p, i, arr) => {
    const qBreak = i > 0 && arr[i - 1].quarter !== p.quarter;
    const pl = byId[p.playerId];
    let body;
    if (p.type === "pen") {
      const pk = PENALTIES.find(x => x.key === p.kind);
      body = /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
        style: {
          color: "var(--stop)"
        }
      }, "Flag"), " ", pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : p.ours ? "on us" : "on them", " — ", pk ? pk.label : "penalty", ", ", p.yards, " yd");
    } else {
      const sc = SCORES.find(x => x.key === p.score);
      body = /*#__PURE__*/React.createElement("span", null, pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : /*#__PURE__*/React.createElement("b", null, p.them ? "Their team" : "Whole unit"), " ", p.them && p.yards ? p.yards + " yd " : "", VERB[p.action] || "", " ", ["rush", "catch", "pass", "return", "kick", "fumkept"].indexOf(p.action) >= 0 ? p.yards + " yd" : "", ["sack", "tfl"].indexOf(p.action) >= 0 && p.yards ? "−" + p.yards + " yd" : "", p.passerId && byId[p.passerId] ? " from #" + byId[p.passerId].num : "", p.assistIds && p.assistIds.length ? " · assist " + p.assistIds.map(id => byId[id] ? "#" + byId[id].num : "").join(", ") : "", sc && /*#__PURE__*/React.createElement("span", {
        style: {
          color: "var(--stop)",
          fontWeight: 700
        }
      }, " \xB7 ", sc.label));
    }
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: p.id || i
    }, qBreak && /*#__PURE__*/React.createElement("div", {
      className: "eyebrow",
      style: {
        margin: "10px 0 4px"
      }
    }, "Quarter ", p.quarter), /*#__PURE__*/React.createElement("div", {
      className: "logline"
    }, /*#__PURE__*/React.createElement("span", {
      className: "eyebrow"
    }, ORD[p.down], " & ", p.distance), body));
  })), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 14
    }
  }, "View only \u2014 you're following along live. Scores and plays appear here seconds after the coaches log them.")));
}

/* ============================ MOUNT ============================ */

const WATCH_CODE = (() => {
  try {
    const m = (window.location.search || "").match(/[?&]watch=([A-Za-z0-9]{4})/);
    return m ? m[1].toUpperCase() : null;
  } catch (e) {
    return null;
  }
})();
ReactDOM.createRoot(document.getElementById("root")).render(WATCH_CODE ? /*#__PURE__*/React.createElement(GameCast, {
  code: WATCH_CODE
}) : /*#__PURE__*/React.createElement(Sideline, null));
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
