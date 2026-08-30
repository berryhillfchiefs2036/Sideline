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
  key: "pass",
  label: "Threw it",
  hint: "completion"
}, {
  key: "fumble",
  label: "Fumbled",
  hint: "lost ball"
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
  key: "tackle",
  label: "Tackle",
  hint: "coverage"
}, {
  key: "fumrec",
  label: "Recovered",
  hint: "loose ball"
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
  label: "PAT kick",
  pts: 1
}, {
  key: "two",
  label: "2-point",
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
const ORD = ["", "1st", "2nd", "3rd", "4th"];
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
  return: "returned",
  tackle: "tackle",
  assist: "assist",
  sack: "sack",
  int: "interception",
  fumrec: "recovery",
  pbu: "pass broken up",
  fumble: "fumble",
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
  swaps: {},
  plays: []
});

/* ============================ GAME FOLD ============================ */

function fold(ops) {
  const revoked = new Set();
  ops.forEach(o => {
    if (o.type === "undo") (o.targets || [o.target]).forEach(t => revoked.add(t));
  });
  let live = ops.filter(o => o.type !== "undo" && !revoked.has(o.id));
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
    if (o.type !== "play") return;
    const sc = SCORES.find(x => x.key === o.score);
    const pts = sc ? sc.pts : 0;
    g.plays.push(Object.assign({}, o, {
      down: g.down,
      distance: g.distance,
      quarter: g.quarter
    }));
    if (pts > 0) {
      const ours = o.unit !== "defense" || o.score === "td" || o.score === "safety";
      if (ours) g.us += pts;else g.them += pts;
      g.down = 1;
      g.distance = 10;
    } else if (o.unit === "offense" || o.unit === "defense") {
      const gained = o.unit === "offense" ? o.yards || 0 : -(o.yards || 0);
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
  passY: 0,
  tk: 0,
  ast: 0,
  sack: 0,
  int: 0,
  fr: 0,
  pbu: 0,
  td: 0,
  pts: 0
});
function tally(plays) {
  const m = {};
  const g = id => m[id] = m[id] || blank();
  plays.forEach(p => {
    (p.snaps || []).forEach(id => {
      const s = g(id);
      s.snaps++;
      if (p.unit === "offense") s.off++;else if (p.unit === "defense") s.def++;else s.st++;
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
    if (p.action === "pass") s.passY += y;
    if (p.action === "return") s.rushY += y;
    if (p.action === "tackle") s.tk++;
    if (p.action === "assist") s.ast++;
    if (p.action === "sack") {
      s.sack++;
      s.tk++;
    }
    if (p.action === "int") s.int++;
    if (p.action === "fumrec") s.fr++;
    if (p.action === "pbu") s.pbu++;
    if (p.score === "td") s.td++;
    const sc = SCORES.find(x => x.key === p.score);
    if (sc) s.pts += sc.pts;
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
  const renameGame = useCallback((id, opponent) => {
    mutateGames(prev => prev.map(g => g.id === id ? Object.assign({}, g, {
      opponent
    }) : g));
    const rec = games.find(g => g.id === id);
    if (rec && code && sb) pushGame(Object.assign({}, rec, {
      opponent
    }));
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
    renameGame,
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
  const unitSlots = (game.unit === "special" ? lineups.special[game.stKey] : lineups[game.unit]) || [];
  const sKey = game.unit === "special" ? game.stKey : "u";
  const swaps = (game.swaps[game.unit] || {})[sKey] || {};
  const onField = unitSlots.map(s => Object.assign({}, s, {
    playerId: swaps[s.id] !== undefined ? swaps[s.id] : s.playerId
  }));
  const fieldIds = onField.map(s => s.playerId).filter(Boolean);
  const putIn = (slotId, playerId, group) => addOp({
    type: "sub",
    unit: game.unit,
    stKey: game.stKey,
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
  const logPlay = ({
    playerId,
    action,
    yards,
    score
  }) => {
    addOp({
      type: "play",
      unit: game.unit,
      stKey: game.unit === "special" ? game.stKey : null,
      playerId: playerId || null,
      action: action || null,
      yards: yards || 0,
      score: score && score !== "none" ? score : null,
      snaps: fieldIds
    });
    setSheet(null);
  };
  const archive = opponent => {
    const players = roster.map(p => ({
      id: p.id,
      num: p.num,
      name: p.name,
      s: statOf(p.id)
    })).filter(r => r.s.snaps > 0);
    S.archiveGame({
      id: uid(),
      endedAt: new Date().toISOString(),
      opponent: opponent || "",
      us: game.us,
      them: game.them,
      playsCount: game.plays.length,
      players
    });
  };
  const lastUndoable = game.live.slice().reverse().find(o => ["play", "sub", "adj", "set"].indexOf(o.type) >= 0);
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
    assign
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
    addOp,
    code,
    onArchive: archive
  }), tab === "season" && /*#__PURE__*/React.createElement(SeasonTab, {
    games: S.games,
    squad: squad,
    setSquad: setSquad,
    onRename: S.renameGame,
    onRemove: S.removeGame,
    onImport: S.importGames
  })), sheet && sheet.type === "play" && /*#__PURE__*/React.createElement(PlaySheet, {
    slot: sheet.slot,
    player: byId[sheet.slot.playerId],
    unit: game.unit,
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
  assign
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
  }, "Quarter ", game.quarter, " \xB7 ", game.plays.length, " plays run")), /*#__PURE__*/React.createElement("div", {
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
  }, "+")))), /*#__PURE__*/React.createElement("div", {
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
    length: 40
  }, (_, i) => i + 1).map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, d, " ", d === 1 ? "yard" : "yards", " to go")), game.distance > 40 && /*#__PURE__*/React.createElement("option", {
    value: game.distance
  }, game.distance, " yards to go")), /*#__PURE__*/React.createElement("button", {
    className: "chip",
    onClick: () => set("quarter", game.quarter % 4 + 1)
  }, "Q", game.quarter))), /*#__PURE__*/React.createElement("div", {
    className: "units"
  }, UNITS.map(u => /*#__PURE__*/React.createElement("button", {
    key: u.key,
    className: "unit " + u.key + (game.unit === u.key ? " on" : ""),
    onClick: () => set("unit", u.key)
  }, u.label))), game.unit === "special" && /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, ST_KEYS.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: game.stKey === k ? "on" : "",
    onClick: () => set("stKey", k)
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
    className: "abtn ghost",
    disabled: !canUndo,
    onClick: undo
  }, "Undo")), /*#__PURE__*/React.createElement(PlayLog, {
    game: game,
    byId: byId
  }));
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
  byId
}) {
  const recent = game.plays.slice(-14).reverse();
  if (!recent.length) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Play log"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Latest first")), /*#__PURE__*/React.createElement("div", null, recent.map(p => {
    const pl = byId[p.playerId];
    const sc = SCORES.find(x => x.key === p.score);
    return /*#__PURE__*/React.createElement("div", {
      className: "logline",
      key: p.id
    }, /*#__PURE__*/React.createElement("span", {
      className: "eyebrow"
    }, ORD[p.down], " & ", p.distance), /*#__PURE__*/React.createElement("span", null, pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : /*#__PURE__*/React.createElement("b", null, "Whole unit"), " ", VERB[p.action] || "", " ", ["rush", "catch", "pass", "return"].indexOf(p.action) >= 0 ? p.yards + " yd" : "", sc && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--stop)",
        fontWeight: 700
      }
    }, " \xB7 ", sc.label)), /*#__PURE__*/React.createElement("span", {
      className: "who"
    }, p.byName || ""));
  })));
}

/* ============================ SHEETS ============================ */

function PlaySheet({
  slot,
  player,
  unit,
  onClose,
  onLog
}) {
  const actions = unit === "offense" ? OFF_ACTIONS : unit === "defense" ? DEF_ACTIONS : ST_ACTIONS;
  const [action, setAction] = useState(actions[0].key);
  const [yards, setYards] = useState(0);
  const [score, setScore] = useState("none");
  const needsYards = ["rush", "catch", "pass", "return", "kick"].indexOf(action) >= 0;
  if (!player) return null;
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
  }, "Yards"), /*#__PURE__*/React.createElement("div", {
    className: "yardnum " + (yards > 0 ? "gain" : yards < 0 ? "loss" : "zero")
  }, yards > 0 ? "+" : "", yards), /*#__PURE__*/React.createElement("div", {
    className: "yardrow"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setYards(y => y - 5)
  }, "\u22125"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setYards(y => y - 1)
  }, "\u22121"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setYards(0)
  }, "0"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setYards(y => y + 1)
  }, "+1"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setYards(y => y + 5)
  }, "+5"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setYards(y => y + 10)
  }, "+10"))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Points on the play"), /*#__PURE__*/React.createElement("div", {
    className: "opts"
  }, SCORES.map(s => /*#__PURE__*/React.createElement("button", {
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
      yards: needsYards ? yards : 0,
      score
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
  }, "Send the other coaches this page's link and these four letters. Everyone who types it in shares one roster, one score, one play log.")), sync.state === "offline" && /*#__PURE__*/React.createElement("div", {
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
  }, "Join this game"), /*#__PURE__*/React.createElement("div", {
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
  }, "Add your first player above. Number and name are all you need."), sorted.map(p => /*#__PURE__*/React.createElement("div", {
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
    onClick: () => remove(p.id)
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
  })));
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
  addOp,
  code,
  onArchive
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
  const exportCsv = () => {
    const head = ["Number", "Name", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds", "Catches", "RecYds", "PassYds", "Tackles", "Assists", "Sacks", "Int", "FumRec", "PBU", "TD", "Points"];
    const body = rows.slice().sort((a, b) => (parseInt(a.p.num, 10) || 0) - (parseInt(b.p.num, 10) || 0)).map(({
      p,
      s
    }) => [p.num, p.name, s.snaps, s.off, s.def, s.st, s.rush, s.rushY, s.rec, s.recY, s.passY, s.tk, s.ast, s.sack, s.int, s.fr, s.pbu, s.td, s.pts]);
    const csv = [head].concat(body).map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download("sideline-" + new Date().toISOString().slice(0, 10) + ".csv", csv, "text/csv");
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Stats"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, game.plays.length, " plays")), /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, [["plays", "Play count"], ["off", "Offense"], ["def", "Defense"]].map(v => /*#__PURE__*/React.createElement("button", {
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
  }, "Get them in: ", short.slice(0, 6).map(r => "#" + r.p.num).join(", ")))), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Off"), /*#__PURE__*/React.createElement("th", null, "Def"), /*#__PURE__*/React.createElement("th", null, "Spec"), /*#__PURE__*/React.createElement("th", null, "Total"))), /*#__PURE__*/React.createElement("tbody", null, plays.map(({
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
  }, s.snaps)))))), view === "off" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Car"), /*#__PURE__*/React.createElement("th", null, "Rush"), /*#__PURE__*/React.createElement("th", null, "Rec"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Pass"), /*#__PURE__*/React.createElement("th", null, "TD"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.rushY + b.s.recY - (a.s.rushY + a.s.recY)).map(({
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
  }, s.passY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.td))))), view === "def" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Tkl"), /*#__PURE__*/React.createElement("th", null, "Ast"), /*#__PURE__*/React.createElement("th", null, "Sck"), /*#__PURE__*/React.createElement("th", null, "Int"), /*#__PURE__*/React.createElement("th", null, "FR"), /*#__PURE__*/React.createElement("th", null, "PBU"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.tk - a.s.tk).map(({
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
  }, s.sack), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.int), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.fr), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.pbu))))), /*#__PURE__*/React.createElement("div", {
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
    onClick: () => {
      const msg = code ? "End this game for all coaches? It's saved to the Season tab, then the score, play log, and stats clear for the next one. Roster and lineups stay put." : "End this game? It's saved to the Season tab, then the score, play log, and stats clear for the next one. Roster and lineups stay put.";
      if (!window.confirm(msg)) return;
      if (game.plays.length > 0) onArchive(window.prompt("Who was this game against? (optional)", "") || "");
      addOp({
        type: "reset"
      });
    }
  }, "Start a new game")));
}

/* ============================ SEASON ============================ */

function ScheduleSection({
  squad,
  setSquad
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
      style: past ? {
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
    }, fmtDate(g.date), " \xB7 ", fmtTime(g.time), past ? " · played" : "")), /*#__PURE__*/React.createElement("button", {
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
  onRename,
  onRemove,
  onImport
}) {
  const [year, setYear] = useState("all");
  const [view, setView] = useState("plays");
  const fileRef = useRef(null);
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
  const newest = shown.slice().sort((a, b) => a.endedAt < b.endedAt ? 1 : -1);
  const exportCsv = () => {
    const head = ["Number", "Name", "Games", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds", "Catches", "RecYds", "PassYds", "Tackles", "Assists", "Sacks", "Int", "FumRec", "PBU", "TD", "Points"];
    const body = totals.slice().sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0)).map(t => [t.num, t.name, t.gp, t.snaps, t.off, t.def, t.st, t.rush, t.rushY, t.rec, t.recY, t.passY, t.tk, t.ast, t.sack, t.int, t.fr, t.pbu, t.td, t.pts]);
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
  }, shown.length, " ", shown.length === 1 ? "game" : "games", " \xB7 ", wins, "-", losses, ties ? "-" + ties : "")), /*#__PURE__*/React.createElement(ScheduleSection, {
    squad: squad,
    setSquad: setSquad
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
  }, [["plays", "Play count"], ["off", "Offense"], ["def", "Defense"]].map(v => /*#__PURE__*/React.createElement("button", {
    key: v[0],
    className: view === v[0] ? "on" : "",
    onClick: () => setView(v[0])
  }, v[1]))), view === "plays" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "GP"), /*#__PURE__*/React.createElement("th", null, "Off"), /*#__PURE__*/React.createElement("th", null, "Def"), /*#__PURE__*/React.createElement("th", null, "Spec"), /*#__PURE__*/React.createElement("th", null, "Total"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.snaps - a.snaps).map(t => /*#__PURE__*/React.createElement("tr", {
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
  }, t.snaps))))), view === "off" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Car"), /*#__PURE__*/React.createElement("th", null, "Rush"), /*#__PURE__*/React.createElement("th", null, "Rec"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Pass"), /*#__PURE__*/React.createElement("th", null, "TD"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.rushY + b.recY - (a.rushY + a.recY)).map(t => /*#__PURE__*/React.createElement("tr", {
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
  }, t.passY), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.td))))), view === "def" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Tkl"), /*#__PURE__*/React.createElement("th", null, "Ast"), /*#__PURE__*/React.createElement("th", null, "Sck"), /*#__PURE__*/React.createElement("th", null, "Int"), /*#__PURE__*/React.createElement("th", null, "FR"), /*#__PURE__*/React.createElement("th", null, "PBU"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.tk - a.tk).map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", t.num), " ", t.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.tk), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.ast), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.sack), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.int), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.fr), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, t.pbu))))), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Games"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Latest first")), newest.map(g => /*#__PURE__*/React.createElement("div", {
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
    onClick: () => {
      const v = window.prompt("Opponent name", g.opponent || "");
      if (v !== null) onRename(g.id, v);
    }
  }, "Name"), /*#__PURE__*/React.createElement("button", {
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

/* ============================ MOUNT ============================ */

ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(Sideline, null));
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
