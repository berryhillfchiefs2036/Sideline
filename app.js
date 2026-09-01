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
  key: "pickedoff",
  label: "Picked off",
  hint: "interception thrown"
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
}, {
  key: "touchback",
  label: "Touchback",
  hint: "kick, no return"
}, {
  key: "onsidewon",
  label: "Onside — we got it!",
  hint: "recovered"
}, {
  key: "onsidelost",
  label: "Onside — they got it",
  hint: "not recovered"
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
  kick: "kicked",
  pickedoff: "pass picked off",
  touchback: "kickoff — touchback",
  onsidewon: "onside kick — we got it!",
  onsidelost: "onside kick — they got it"
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
  teamName: "",
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
  /* Remembered so the last End game can be undone — reopening that game.
     recId names the archive record that End created, so reopening never has
     to guess which saved game the undo brings back. */
  const lastResetId = lastReset >= 0 ? live[lastReset].id : null;
  const lastResetRecId = lastReset >= 0 ? live[lastReset].recId || null : null;
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
        spot: g.spot,
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
      spot: g.spot,
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
      const turnover = o.action === "int" || o.action === "fumrec" || o.action === "fumble" || o.action === "pickedoff";
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
  g.lastResetId = lastResetId;
  g.lastResetRecId = lastResetRecId;
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
  intT: 0,
  fr: 0,
  pbu: 0,
  blk: 0,
  tb: 0,
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
    /* A caught, incomplete, or picked-off pass also credits the passer (QB
       by default, or whoever the coach picked for a trick play). */
    if (p.passerId && (p.action === "catch" || p.action === "incomplete" || p.action === "pickedoff")) {
      const q = g(p.passerId);
      q.att++;
      if (p.action === "catch") {
        q.cmp++;
        q.passY += p.yards || 0;
      }
      if (p.action === "pickedoff") q.intT++;
    }
    /* A pick logged straight on the QB's own card (no separate passer). */
    if (p.action === "pickedoff" && !p.passerId && p.playerId) {
      const q = g(p.playerId);
      q.att++;
      q.intT++;
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
    if (p.action === "touchback") {
      s.kicks++;
      s.tb++;
    }
    if (p.action === "onsidewon" || p.action === "onsidelost") s.kicks++;
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

/* Team-level situational numbers, all derived from data every play already
   carries (each play stores the down and distance it was snapped at, so
   first downs and 3rd/4th-down conversions cost the coaches zero extra taps). */
function teamTotals(plays) {
  const T = {
    rush: 0,
    pass: 0,
    kr: 0,
    pr: 0,
    allowed: 0,
    fd: 0,
    thirdA: 0,
    thirdC: 0,
    fourthA: 0,
    fourthC: 0,
    takeaways: 0,
    giveaways: 0,
    tb: 0,
    onA: 0,
    onR: 0,
    penN: 0,
    penY: 0
  };
  plays.forEach(p => {
    if (p.type === "pen") {
      if (p.ours) {
        T.penN++;
        T.penY += p.yards || 0;
      }
      /* A defensive penalty that covers the distance moves our chains. */
      if (p.side === "defense" && p.unit !== "defense" && (p.yards || 0) >= (p.distance || 0)) T.fd++;
      return;
    }
    const y = p.yards || 0;
    if (p.unit === "defense" && !(p.them && p.action === "punt")) T.allowed += p.action === "sack" || p.action === "tfl" ? -y : y;
    if (p.unit === "defense" && !p.them && (p.action === "int" || p.action === "fumrec")) T.takeaways++;
    if (p.them) return;
    if (p.unit === "offense") {
      if (p.action === "rush") T.rush += y;
      if (p.action === "catch" || p.action === "pass") T.pass += y;
      if (p.action === "fumble" || p.action === "pickedoff") T.giveaways++;
      const isConv = p.action === "conv" || p.action === "convfail" || p.action === "stopconv" || p.action === "block" || p.score === "pat" || p.score === "two";
      if (!isConv) {
        const moved = y >= (p.distance || 10) || p.score === "td";
        if (moved) T.fd++;
        if (p.down === 3) {
          T.thirdA++;
          if (moved) T.thirdC++;
        }
        if (p.down === 4) {
          T.fourthA++;
          if (moved) T.fourthC++;
        }
      }
    }
    if (p.unit === "special") {
      if (p.action === "return") {
        if (p.stKey === "kickReturn" || p.stKey === "kickoff") T.kr += y;
        if (p.stKey === "puntReturn" || p.stKey === "punt") T.pr += y;
      }
      if (p.action === "touchback") T.tb++;
      if (p.action === "onsidewon") {
        T.onA++;
        T.onR++;
      }
      if (p.action === "onsidelost") T.onA++;
    }
  });
  return T;
}

/* Group the game into offensive possessions. Best-effort from the log: a
   drive opens with our first offensive play and closes on a score, a lost
   ball, a failed 4th down, or when the ball clearly changes hands. */
function computeDrives(plays) {
  const drives = [];
  let cur = null;
  const close = result => {
    if (!cur) return;
    if (result && !cur.result) cur.result = result;
    drives.push(cur);
    cur = null;
  };
  plays.forEach(p => {
    if (p.type === "pen") {
      if (cur) cur.yards += (p.side === "defense" ? 1 : -1) * (p.yards || 0);
      return;
    }
    if (p.them || p.unit === "defense") {
      close("");
      return;
    }
    if (p.unit === "special") {
      if (!cur) return;
      if (p.stKey === "punt") close("Punt");else if (p.stKey === "fieldGoal") close(p.score === "fg" ? "Field goal" : "FG missed");else close("");
      return;
    }
    if (p.unit !== "offense") return;
    /* Post-TD conversion tries sit outside the drive. */
    if (p.action === "conv" || p.action === "convfail" || p.action === "stopconv" || p.action === "block" || p.score === "pat" || p.score === "two") return;
    if (!cur) cur = {
      q: p.quarter,
      plays: 0,
      yards: 0,
      result: ""
    };
    cur.plays++;
    const y = p.yards || 0;
    if (["rush", "catch", "pass", "fumkept"].indexOf(p.action) >= 0) cur.yards += y;
    if (p.score === "td") {
      close("Touchdown");
      return;
    }
    if (p.score === "fg") {
      close("Field goal");
      return;
    }
    if (p.action === "fumble") {
      close("Fumble lost");
      return;
    }
    if (p.action === "pickedoff") {
      close("Picked off");
      return;
    }
    if (p.down >= 4 && y < (p.distance || 10)) {
      close("Turnover on downs");
      return;
    }
  });
  if (cur) {
    cur.result = "On the field";
    drives.push(cur);
  }
  return drives;
}

/* A text box score fit for the team group chat, built from an archived game
   record (or the game on the board shaped like one). */
function boxScoreText(rec) {
  const T = teamTotals(rec.plays || []);
  const names = {};
  (rec.players || []).forEach(r => {
    names[r.id] = "#" + r.num + " " + r.name;
  });
  const who = id => names[id] || "Team";
  const usName = ((rec.team || "") + "").trim() || "Us";
  const oppName = ((rec.opponent || "") + "").trim() || "Them";
  const res = rec.us > rec.them ? "W" : rec.us < rec.them ? "L" : "T";
  const L = [];
  L.push("FINAL" + (rec.scrim ? " (scrimmage)" : "") + ": " + usName + " " + rec.us + " — " + oppName + " " + rec.them + " (" + res + ")");
  if (rec.endedAt) L.push(new Date(rec.endedAt).toLocaleDateString());
  L.push("");
  L.push("Team");
  L.push("Rushing " + T.rush + " · Passing " + T.pass + " · Total " + (T.rush + T.pass) + " · Allowed " + T.allowed);
  L.push("First downs " + T.fd + " · 3rd down " + T.thirdC + "/" + T.thirdA + " · 4th down " + T.fourthC + "/" + T.fourthA);
  const m = T.takeaways - T.giveaways;
  L.push("Turnovers " + (m > 0 ? "+" : "") + m + " (" + T.takeaways + " taken / " + T.giveaways + " lost)");
  if (T.penN) L.push("Penalties " + T.penN + " for " + T.penY + " yds");
  if (T.tb || T.onA) L.push("Kickoffs: " + T.tb + " touchback" + (T.tb === 1 ? "" : "s") + " · onside " + T.onR + "/" + T.onA);
  const scoring = (rec.plays || []).filter(p => p.type !== "pen" && (p.pts > 0 || p.score && p.score !== "none" && p.pts == null));
  if (scoring.length) {
    L.push("");
    L.push("Scoring");
    scoring.forEach(p => {
      const sc = SCORES.find(x => x.key === p.score);
      const pts = p.pts != null ? p.pts : sc ? sc.pts : 0;
      const ours = !p.them && (p.unit !== "defense" || p.score === "td" || p.score === "safety");
      const desc = p.them ? oppName + " " + (sc ? sc.label.toLowerCase() : "score") + (p.yards ? ", " + p.yards + " yd" : "") : who(p.playerId) + (VERB[p.action] ? " " + VERB[p.action] : "") + (p.yards ? " " + p.yards + " yd" : "") + (sc ? " — " + sc.label : "");
      L.push("Q" + p.quarter + "  " + desc + "  (+" + pts + " " + (ours ? usName : oppName) + ")");
    });
  }
  const P = rec.players || [];
  const top = (key, fmt) => {
    const best = P.slice().sort((a, b) => (b.s && b.s[key] || 0) - (a.s && a.s[key] || 0))[0];
    return best && best.s && best.s[key] > 0 ? fmt(best) : null;
  };
  const leaders = [top("rushY", r => "Rushing: " + who(r.id) + " — " + r.s.rush + " for " + r.s.rushY), top("recY", r => "Receiving: " + who(r.id) + " — " + r.s.rec + " for " + r.s.recY), top("passY", r => "Passing: " + who(r.id) + " — " + r.s.cmp + "/" + r.s.att + ", " + r.s.passY + " yds"), top("tk", r => "Tackles: " + who(r.id) + " — " + r.s.tk + (r.s.ast ? " (+" + r.s.ast + " ast)" : ""))].filter(Boolean);
  if (leaders.length) {
    L.push("");
    L.push("Leaders");
    leaders.forEach(x => L.push(x));
  }
  return L.join("\n");
}

/* Hand text to the phone's share sheet, else the clipboard, else a prompt. */
function shareText(text) {
  if (navigator.share) {
    navigator.share({
      text
    }).catch(() => {});
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => window.alert("Box score copied — paste it anywhere:\n\n" + text), () => window.prompt("Copy the box score:", text));
    return;
  }
  window.prompt("Copy the box score:", text);
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
const kCrewWatch = c => `sideline.crew.${c}.watch`;
const CFG = window.SIDELINE_CONFIG || {};
const CREW_ON = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && CFG.supabaseUrl.indexOf("YOUR-") < 0);
const sb = CREW_ON ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
const T_OPS = "sideline_ops";
const T_SQUAD = "sideline_squads";
const T_GAMES = "sideline_games";

/* Crew codes: 6 characters from letters and digits 2-9 (no vowels, no 0/O
   or 1/I look-alikes) — about 590 million combinations, so two teams never
   collide by accident. Codes made before this were 4 characters; joining
   and watching accept both lengths forever. */
const makeCode = () => {
  const A = "BCDFGHJKLMNPQRSTVWXYZ23456789";
  return Array.from({
    length: 6
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

  /* ---- coach account (Supabase Auth) ---- */
  const [user, setUser] = useState(null);
  const [watch, setWatch] = useState(() => saved && saved.code ? LS.get(kCrewWatch(saved.code), null) : null);
  useEffect(() => {
    if (!sb) return undefined;
    sb.auth.getSession().then(({
      data
    }) => setUser(data && data.session ? data.session.user : null)).catch(() => {});
    const res = sb.auth.onAuthStateChange((_ev, session) => setUser(session ? session.user : null));
    return () => {
      try {
        res.data.subscription.unsubscribe();
      } catch (e) {/* noop */}
    };
  }, []);

  /* Returns null on success, "CHECK_EMAIL" when a new account needs its
     confirmation email, or a human-readable error string. */
  const authAction = useCallback(async (mode, email, password) => {
    if (!sb) return "Crew sync isn't set up on this deployment.";
    try {
      const {
        data,
        error
      } = mode === "signup" ? await sb.auth.signUp({
        email,
        password
      }) : await sb.auth.signInWithPassword({
        email,
        password
      });
      if (error) return error.message || "That didn't work — try again.";
      if (mode === "signup" && data && !data.session) return "CHECK_EMAIL";
      return null;
    } catch (e) {
      return "No connection — try again.";
    }
  }, []);
  const signOut = useCallback(() => {
    if (sb) sb.auth.signOut().catch(() => {});
  }, []);

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
     an existing code never does this, so a joiner can't clobber the crew.
     Returns null on success, or a human-readable error string. */
  const joinCrew = useCallback(async (c, name, carrySquad) => {
    const clean = (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (clean.length < 4) return "That code is too short.";
    /* Signed-in coaches register membership (and claim unclaimed codes)
       through sideline_join. If the database hasn't been migrated to the
       accounts schema yet, the function won't exist — join the old way so
       nothing breaks mid-upgrade. */
    let watchCode = clean;
    if (sb) {
      try {
        const s = await sb.auth.getSession();
        if (s && s.data && s.data.session) {
          const r = await sb.rpc("sideline_join", {
            code: clean,
            name: name || null
          });
          if (r.error) {
            const missing = r.error.code === "PGRST202" || /function .*does not exist|schema cache/i.test(r.error.message || "");
            if (!missing) return "Couldn't join: " + (r.error.message || "unknown error");
          } else if (r.data && r.data.watch_code) {
            watchCode = r.data.watch_code;
          }
        }
      } catch (e) {
        return "No connection — check your signal and try again.";
      }
    }
    LS.set(kCrewWatch(clean), watchCode);
    setWatch(watchCode);
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
    return null;
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
    /* Best-effort: drop this coach's membership row too, so the crew's
       coach list stays honest. Local data is untouched either way. */
    if (code && sb) {
      sb.auth.getSession().then(s => {
        if (s && s.data && s.data.session) {
          sb.from("sideline_members").delete().eq("game_code", code).eq("user_id", s.data.session.user.id).then(() => {});
        }
      }).catch(() => {});
    }
    LS.set(K_ME, {
      id: meRef.current.id,
      name: meRef.current.name
    });
    setCode(null);
    setTheirs({});
    setMine(LS.get(K_SOLO_OPS, []));
    setSquadLocal(LS.get(K_SOLO_SQUAD, freshSquad()));
    setGamesLocal(LS.get(K_SOLO_GAMES, []));
  }, [code]);
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
    importGames,
    user,
    watch,
    authAction,
    signOut
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

  /* The team's own name replaces "Us" across the app once it's set (Season
     tab); the other side shows the tracked opponent when there is one. */
  const teamName = ((squad.teamName || "") + "").trim();
  const oppName = (((game.gameInfo || {}).opponent || "") + "").trim();
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
  /* Archives the board and returns the new record's id, so the reset op that
     follows can point straight at it. schedId is the schedule entry the coach
     confirmed on the End sheet — the ONLY thing that ever stamps a schedule
     row final, so a stale tag can never stamp the wrong game invisibly. */
  const archive = (opponent, when, schedId) => {
    /* Player lines come from everyone the plays credit — not the roster — so
       a kid removed from the roster mid-season keeps their archived stats. */
    const players = Object.keys(stats).map(id => {
      const p = byId[id];
      return {
        id,
        num: p ? p.num : "—",
        name: p ? p.name : "Former player",
        s: stats[id]
      };
    }).filter(r => r.s.snaps > 0);
    /* Games logged after the fact get archived under the date they were
       actually played, not the date they were typed in. */
    const endedAt = /^\d{4}-\d{2}-\d{2}$/.test((when || "").trim()) ? new Date(when.trim() + "T12:00:00").toISOString() : new Date().toISOString();
    const recId = uid();
    /* usOrig/themOrig remember the score as folded at archive time, so a
       later manual edit to the record survives a reopen (the difference is
       replayed on top as an adjustment). */
    S.archiveGame({
      id: recId,
      endedAt,
      opponent: opponent || "",
      us: game.us,
      them: game.them,
      usOrig: game.us,
      themOrig: game.them,
      playsCount: game.playCount,
      plays: game.plays,
      players,
      scrim: !!(game.gameInfo || {}).scrim,
      schedId: schedId || null
    });
    if (schedId) setSquad(s => Object.assign({}, s, {
      schedule: (s.schedule || []).map(g => g.id === schedId ? Object.assign({}, g, {
        done: true,
        us: game.us,
        them: game.them
      }) : g)
    }));
    return recId;
  };
  const endGame = () => {
    /* An empty board has nothing to archive — just clear it. Anything with
       plays goes through the End sheet so the opponent and date are staring
       at the coach instead of hiding in a popup that's easy to dismiss. */
    if (game.plays.length === 0) {
      if (window.confirm("Clear this board? Nothing is saved — there are no plays on it.")) {
        addOp({
          type: "reset"
        });
      }
      return;
    }
    setSheet({
      type: "endgame"
    });
  };
  /* Tapping a scheduled game tags the live board with it: plays logged from
     here on archive under that opponent and date. The tag is an op, so it
     syncs to the whole crew and clears with the next board reset. */
  const trackScheduled = g => {
    /* A game already marked final lives on the Season list — re-tracking it
       would start a second copy of it on the live board. */
    if (g.done && !window.confirm("This game is already final (" + (g.us || 0) + "–" + (g.them || 0) + "). Tracking it again starts a brand-new game on the board — to see or fix the finished one, " + "use Stats or Reopen on the Season list. Track it again anyway?")) return;
    const info = game.gameInfo || {};
    /* Never switch which game a full board belongs to — that's how one
       game's plays and score end up stamped on another game. */
    if (game.plays.length > 0 && info.schedId !== g.id) {
      window.alert("The board has " + game.plays.length + " plays" + (info.opponent ? " from vs " + info.opponent : "") + " on it. End that game first — " + "then start " + (g.opponent ? "the " + g.opponent + " game" : "the next one") + " fresh.");
      return;
    }
    addOp({
      type: "set",
      field: "gameInfo",
      value: {
        schedId: g.id,
        opponent: g.opponent,
        date: g.date,
        scrim: !!g.scrim
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

  /* Any saved game can be reopened onto an empty board for full editing.
     The most recently ended one comes back by undoing its End (original ops,
     original authors); older games are rebuilt from the archive's stored
     play-by-play, re-timestamped to now so the replay picks them up. */
  const boardEmpty = game.playCount === 0 && game.plays.length === 0;
  const reopenGame = rec => {
    if (!boardEmpty) {
      window.alert("There's already a game on the board — end it first, then any saved game can be reopened.");
      return;
    }
    if (!window.confirm("Put " + (rec.opponent ? "vs " + rec.opponent : "this game") + " (" + (rec.us || 0) + "–" + (rec.them || 0) + ", " + (rec.playsCount || 0) + " plays) back on the board? " + "Every play comes back, fully editable, and it leaves the Season list until you end the game again.")) return;
    const tagOp = ts => ({
      type: "set",
      field: "gameInfo",
      ts,
      value: {
        opponent: rec.opponent || "",
        date: (rec.endedAt || "").slice(0, 10),
        schedId: rec.schedId || null,
        scrim: !!rec.scrim
      }
    });
    /* Score differences replay as adjustments, never absolute sets — so a
       record edited after archiving keeps its correction, AND a play added
       later still moves the score like it should. */
    const adjOps = (baseUs, baseThem, ts) => {
      const dUs = (rec.us || 0) - baseUs;
      const dThem = (rec.them || 0) - baseThem;
      if (dUs) addOp({
        type: "adj",
        team: "us",
        delta: dUs,
        ts
      });
      if (dThem) addOp({
        type: "adj",
        team: "them",
        delta: dThem,
        ts: ts + 1
      });
    };
    if (game.lastResetId && game.lastResetRecId && rec.id === game.lastResetRecId) {
      /* Undo the End — and revoke anything logged since it (a next-game tag,
         score ticks, subs), so none of it leaks into the restored game. */
      addOp({
        type: "undo",
        targets: [game.lastResetId].concat(game.live.map(o => o.id))
      });
      const after = Date.now() + 5;
      addOp(tagOp(after));
      adjOps(rec.usOrig != null ? rec.usOrig : rec.us || 0, rec.themOrig != null ? rec.themOrig : rec.them || 0, after + 1);
    } else {
      /* Rebuild from the archived snapshot. Quarter fields are kept only
         where the quarter changes (as editable marks) so a later quarter fix
         propagates; stale down/distance/spot annotations recompute fresh. */
      const base = Date.now();
      const list = rec.plays || [];
      let rUs = 0,
        rThem = 0,
        prevQ = null;
      list.forEach((p, i) => {
        const op = Object.assign({}, p);
        delete op.id;
        delete op.by;
        delete op.byName;
        delete op.down;
        delete op.distance;
        delete op.spot;
        if (op.quarter && op.quarter !== prevQ) op.qMark = true;else {
          delete op.quarter;
          delete op.qMark;
        }
        prevQ = p.quarter || prevQ;
        if (p.type !== "pen") {
          const pts = p.pts != null ? p.pts : (SCORES.find(x => x.key === p.score) || {}).pts || 0;
          if (pts > 0) {
            const ours = !p.them && (p.unit !== "defense" || p.score === "td" || p.score === "safety");
            if (ours) rUs += pts;else rThem += pts;
          }
        }
        addOp(Object.assign(op, {
          ts: base + i
        }));
      });
      const after = base + list.length + 500;
      addOp(tagOp(after));
      adjOps(rUs, rThem, after + 1);
    }
    S.removeGame(rec.id);
    setTab("game");
  };

  /* The game on the board, shaped like an archived record so season totals
     and the box score can include it before it's ended. */
  const liveRec = game.playCount > 0 ? {
    id: "live",
    endedAt: new Date().toISOString(),
    scrim: !!(game.gameInfo || {}).scrim,
    players: Object.keys(stats).map(id => {
      const p = byId[id];
      return {
        id,
        num: p ? p.num : "—",
        name: p ? p.name : "Former player",
        s: stats[id]
      };
    }).filter(r => r.s.snaps > 0)
  } : null;
  const lastUndoable = game.live.slice().reverse().find(o => ["play", "pen", "sub", "adj", "set"].indexOf(o.type) >= 0);
  const undo = () => {
    if (!lastUndoable) return;
    const targets = lastUndoable.group ? game.live.filter(o => o.group === lastUndoable.group).map(o => o.id) : [lastUndoable.id];
    addOp({
      type: "undo",
      targets
    });
  };
  const statusText = !code ? "Tap to add coaches" : sync.state === "noconfig" ? "needs setup" : sync.state === "offline" ? S.user ? "saved on this phone, will retry" : "tap to sign in" : sync.state === "connecting" ? "connecting" : `${sync.coaches} ${sync.coaches === 1 ? "coach" : "coaches"} · live`;
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
    placeFirst,
    teamName,
    oppName,
    schedule: squad.schedule || [],
    onTrack: trackScheduled
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
    teamName,
    onEndGame: endGame
  }), tab === "season" && /*#__PURE__*/React.createElement(SeasonTab, {
    games: S.games,
    squad: squad,
    setSquad: setSquad,
    teamName: teamName,
    onEdit: S.editGame,
    onRemove: S.removeGame,
    onImport: S.importGames,
    onTrack: trackScheduled,
    canReopen: boardEmpty,
    onReopen: reopenGame,
    live: liveRec
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
    teamName: teamName,
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
    teamName: teamName,
    onClose: () => setSheet(null),
    onLog: pen => {
      addOp(Object.assign({
        type: "pen",
        unit
      }, pen));
      setSheet(null);
    }
  }), sheet && sheet.type === "endgame" && /*#__PURE__*/React.createElement(EndGameSheet, {
    game: game,
    code: code,
    schedule: squad.schedule || [],
    onClose: () => setSheet(null),
    onEnd: (opp, when, schedId) => {
      /* If another coach already ended it while this sheet sat open,
         archiving again would save a junk empty 0-0 game. */
      if (game.plays.length === 0) {
        window.alert("This game was already ended — probably by another coach. Nothing extra was saved.");
        setSheet(null);
        return;
      }
      const recId = archive(opp, when, schedId);
      addOp({
        type: "reset",
        recId
      });
      setSheet(null);
    }
  }), sheet && sheet.type === "crew" && /*#__PURE__*/React.createElement(CrewSheet, {
    me: S.me,
    code: code,
    sync: sync,
    available: S.crewAvailable,
    onJoin: S.joinCrew,
    user: S.user,
    watch: S.watch,
    onAuth: S.authAction,
    onSignOut: S.signOut,
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
  placeFirst,
  teamName,
  oppName,
  schedule,
  onTrack
}) {
  const set = (field, value) => addOp({
    type: "set",
    field,
    value
  });
  const filled = onField.filter(s => s.playerId).length;
  /* After a game ends the board comes back blank and untagged — hold the
     logging controls until the coaches pick which game this is, so no play
     ever lands in the wrong game. */
  const needsGame = !game.gameInfo && game.playCount === 0 && game.plays.length === 0;
  const upcoming = (schedule || []).filter(g => !g.done).sort((a, b) => a.date + "T" + (a.time || "") < b.date + "T" + (b.time || "") ? -1 : 1);
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
  }, teamName || "Us"), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.us), !needsGame && /*#__PURE__*/React.createElement("div", {
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
  }, oppName || "Them"), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.them), !needsGame && /*#__PURE__*/React.createElement("div", {
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
  }, game.spot != null ? "◉ " + spotLabel(game.spot) : "Ball spot"))), game.gameInfo && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      textAlign: "center",
      marginTop: 8
    }
  }, game.gameInfo.opponent ? /*#__PURE__*/React.createElement(React.Fragment, null, "Tracking vs ", game.gameInfo.opponent, game.gameInfo.date ? " · " + new Date(game.gameInfo.date + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }) : "", game.gameInfo.scrim ? " · scrimmage" : "") : "Tracking an unscheduled game", game.playCount === 0 && game.plays.length === 0 && /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      marginLeft: 8,
      padding: "2px 8px"
    },
    onClick: () => addOp({
      type: "undo",
      targets: game.live.map(o => o.id)
    })
  }, "Pick a different game")), !needsGame && /*#__PURE__*/React.createElement("div", {
    className: "units"
  }, UNITS.map(u => /*#__PURE__*/React.createElement("button", {
    key: u.key,
    className: "unit " + u.key + (unit === u.key ? " on" : ""),
    onClick: () => setUnit(u.key)
  }, u.label))), !needsGame && unit === "special" && /*#__PURE__*/React.createElement("div", {
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
  }, "No players yet. Open ", /*#__PURE__*/React.createElement("b", null, "Roster"), " to add your team, then set starters in ", /*#__PURE__*/React.createElement("b", null, "Lineups"), ".") : needsGame ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("b", null, "Which game is this?"), " The last game is saved on the Season tab. Pick the next one so every play lands in the right game."), upcoming.map((g, i) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: g.id
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
  }, i === 0 ? "Next up · " : "", new Date(g.date + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }), g.scrim ? " · scrimmage" : "")), /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    onClick: () => onTrack(g)
  }, "Start this game"))), upcoming.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "Nothing on the schedule yet \u2014 add the games on the ", /*#__PURE__*/React.createElement("b", null, "Season"), " tab."), /*#__PURE__*/React.createElement("button", {
    className: "abtn ghost",
    style: {
      width: "100%",
      marginTop: 10
    },
    onClick: () => set("gameInfo", {
      adhoc: true
    })
  }, "Track without a scheduled game")) : /*#__PURE__*/React.createElement("div", {
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
  })), !needsGame && /*#__PURE__*/React.createElement("div", {
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
    teamName: teamName,
    oppName: oppName,
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
  teamName,
  oppName,
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
      }, "Flag"), " ", pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : p.ours ? "on " + (teamName || "us") : "on " + (oppName || "them"), " — ", pk ? pk.label : "penalty", ", ", p.yards, " yd"), /*#__PURE__*/React.createElement("span", {
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
    }, ORD[p.down], " & ", p.distance), /*#__PURE__*/React.createElement("span", null, pl ? /*#__PURE__*/React.createElement("b", null, "#", pl.num, " ", pl.name) : /*#__PURE__*/React.createElement("b", null, p.them ? oppName || "Their team" : "Whole unit"), " ", p.them && p.yards ? p.yards + " yd " : "", VERB[p.action] || "", " ", ["rush", "catch", "pass", "return", "kick", "fumkept"].indexOf(p.action) >= 0 ? p.yards + " yd" : "", ["sack", "tfl"].indexOf(p.action) >= 0 && p.yards ? "−" + p.yards + " yd" : "", p.passerId && byId[p.passerId] ? " from #" + byId[p.passerId].num : "", p.assistIds && p.assistIds.length ? " · assist " + p.assistIds.map(id => byId[id] ? "#" + byId[id].num : "").join(", ") : "", sc && /*#__PURE__*/React.createElement("span", {
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
  const isPassPlay = unit === "offense" && (action === "catch" || action === "incomplete" || action === "pickedoff");
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
  teamName,
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
  const isPass = play.unit === "offense" && (action === "catch" || action === "incomplete" || action === "pickedoff");
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
  }, teamName || "Us", " \u2014 no one in particular"), roster.map(p => /*#__PURE__*/React.createElement("option", {
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
  const isPass = unit === "offense" && (action === "catch" || action === "incomplete" || action === "pickedoff");
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

/* Ending a game: opponent and date sit in plain view (prefilled from the
   tracked game) so the archive never saves nameless — no popup chains. */
function EndGameSheet({
  game,
  code,
  schedule,
  onClose,
  onEnd
}) {
  const info = game.gameInfo || {};
  const [opp, setOpp] = useState(info.opponent || "");
  const [when, setWhen] = useState(info.date || new Date().toISOString().slice(0, 10));
  /* Which schedule entry gets stamped final is chosen HERE, in the open —
     defaulting to the tracked game but never stamping anything unseen. */
  const sched = schedule || [];
  const [schedSel, setSchedSel] = useState(info.schedId && sched.some(g => g.id === info.schedId) ? info.schedId : "");
  const pickSched = id => {
    setSchedSel(id);
    const entry = sched.find(g => g.id === id);
    if (entry && !opp.trim()) setOpp(entry.opponent || "");
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
    className: "plate",
    style: {
      minWidth: 62,
      fontSize: 16
    }
  }, game.us, "\u2013", game.them), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, "End this game"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, game.playCount, " plays \xB7 saves to the Season tab")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Cancel")), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginBottom: 12
    }
  }, code ? "Ends it for every coach on the crew. " : "", "The score, play log, and stats archive under this opponent and date, then the board clears for the next game. Roster and lineups stay put, and the saved game can always be reopened from the Season tab."), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Who was it against?"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    "aria-label": "Opponent",
    placeholder: "Opposing team",
    value: opp,
    onChange: e => setOpp(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "What date was it played?"), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "date",
    "aria-label": "Game date",
    value: when,
    onChange: e => setWhen(e.target.value)
  }), sched.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "12px 0 6px"
    }
  }, "Mark a scheduled game final with this score"), /*#__PURE__*/React.createElement("select", {
    className: "inp",
    "aria-label": "Schedule game to mark final",
    value: schedSel,
    onChange: e => pickSched(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "None \u2014 don't touch the schedule"), sched.map(g => /*#__PURE__*/React.createElement("option", {
    key: g.id,
    value: g.id
  }, "vs ", g.opponent, " \u2014 ", g.date, g.done ? " (already final " + g.us + "–" + g.them + ")" : "")))), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    onClick: () => onEnd(opp.trim(), when, schedSel || null)
  }, "End the game \u2014 save it to the Season")));
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
  teamName,
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
  }, teamName || "Us", " \u2014 no one in particular"), roster.map(p => /*#__PURE__*/React.createElement("option", {
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
  user,
  watch,
  onAuth,
  onSignOut,
  onJoin,
  onLeave,
  onRename,
  onClose
}) {
  const [entry, setEntry] = useState("");
  const [name, setName] = useState(me && me.name || "");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = entry.replace(/[^A-Za-z0-9]/g, "").length >= 4;

  /* Crew roster of coaches: everyone can see who's on the crew; the owner
     can remove a coach (they keep their account, lose this team's access).
     Quietly absent on a database that hasn't been migrated to accounts. */
  const [crew, setCrew] = useState(null);
  const [membersList, setMembersList] = useState(null);
  const loadCrew = useCallback(async () => {
    if (!sb || !code || !user) return;
    try {
      const c = await sb.from("sideline_crews").select("owner,watch_code").eq("game_code", code).maybeSingle();
      if (!c.error && c.data) setCrew(c.data);
      const m = await sb.from("sideline_members").select("user_id,coach_name,joined_at").eq("game_code", code);
      if (!m.error && m.data) setMembersList(m.data);
    } catch (e) {/* offline or pre-accounts schema — section stays hidden */}
  }, [code, user]);
  useEffect(() => {
    loadCrew();
  }, [loadCrew]);
  const isOwner = !!(crew && user && crew.owner === user.id);
  const removeCoach = async m => {
    if (!window.confirm("Remove " + (m.coach_name || "this coach") + " from the crew? They keep their " + "account but lose access to this team unless they rejoin with the code.")) return;
    try {
      await sb.from("sideline_members").delete().eq("game_code", code).eq("user_id", m.user_id);
    } catch (e) {/* surface via reload below */}
    loadCrew();
  };
  const doAuth = async mode => {
    setErr("");
    setBusy(true);
    const r = await onAuth(mode, email.trim(), pass);
    setBusy(false);
    if (r === "CHECK_EMAIL") {
      setErr("Account created — check your email for the confirmation link, then sign in here.");
    } else if (r) setErr(r);
  };
  const doJoin = async (codeArg, carry) => {
    setErr("");
    setBusy(true);
    const r = await onJoin(codeArg, name, carry);
    setBusy(false);
    if (r) setErr(r);
  };

  /* One free account per coach — it's what keeps other teams out of your
     games now that every crew's data is locked to its members. */
  const authBox = /*#__PURE__*/React.createElement("div", {
    className: "yardbox",
    style: {
      marginTop: 10,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 6
    }
  }, "Coach account"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--soft)",
      lineHeight: 1.5,
      marginBottom: 8
    }
  }, "Coaching a crew needs a free account, so only your coaches can touch your team's games. One account works for every team you coach."), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    "aria-label": "Email",
    type: "email",
    placeholder: "Email",
    value: email,
    autoComplete: "username",
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    "aria-label": "Password",
    type: "password",
    placeholder: "Password (8+ characters)",
    style: {
      marginTop: 8
    },
    value: pass,
    autoComplete: "current-password",
    onChange: e => setPass(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    style: {
      flex: 1,
      marginTop: 0
    },
    disabled: busy || !email.trim() || !pass,
    onClick: () => doAuth("signin")
  }, "Sign in"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    style: {
      flex: "0 0 auto",
      padding: "10px 14px"
    },
    disabled: busy || !email.trim() || !pass,
    onClick: () => doAuth("signup")
  }, "Create an account")));
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
  }, "Sharing a game across phones needs a database. Add your Supabase URL and anon key to ", /*#__PURE__*/React.createElement("b", null, "config.js"), " in the repo and this turns on. Until then everything works fine on one phone."), err && /*#__PURE__*/React.createElement("div", {
    className: "banner",
    style: {
      marginTop: 0,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", null, err)), code ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
  }, "Send the other coaches this page's link and this code. Everyone who types it in shares one roster, one score, one play log.")), /*#__PURE__*/React.createElement("div", {
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
      const link = window.location.origin + window.location.pathname + "?watch=" + (crew && crew.watch_code || watch || code);
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
  }, "Save")), user && membersList && membersList.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "yardbox",
    style: {
      marginTop: 10,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 4
    }
  }, "Coaches on this crew", isOwner ? " — you're the owner" : ""), membersList.map(m => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: m.user_id,
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("b", null, m.coach_name || "Coach"), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow",
    style: {
      marginLeft: 6
    }
  }, crew && m.user_id === crew.owner ? "owner" : "", user && m.user_id === user.id ? crew && m.user_id === crew.owner ? " · you" : "you" : "")), isOwner && m.user_id !== user.id && /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => removeCoach(m)
  }, "Remove"))), isOwner && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--soft)",
      marginTop: 8,
      lineHeight: 1.4
    }
  }, "Anyone with the crew code can join, so keep it to your staff \u2014 and if someone who shouldn't be here shows up, remove them right here.")), user ? /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      color: "var(--soft)"
    }
  }, "Signed in as ", /*#__PURE__*/React.createElement("b", null, user.email)), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: onSignOut
  }, "Sign out")) : available && authBox, /*#__PURE__*/React.createElement("button", {
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
  }, "Any signed-in coach who types in the crew code joins the crew, so share it only with your staff. Keep rosters to jersey numbers and first names.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Your name (shows on the play log)",
    value: name,
    onChange: e => setName(e.target.value)
  })), available && !user && authBox, available && user && /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      color: "var(--soft)"
    }
  }, "Signed in as ", /*#__PURE__*/React.createElement("b", null, user.email)), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: onSignOut
  }, "Sign out")), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "14px 0 6px"
    }
  }, "Start a crew"), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    style: {
      marginTop: 0
    },
    disabled: !available || !user || busy,
    onClick: () => doJoin(makeCode(), true)
  }, "Create a code"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--soft)",
      marginTop: 6,
      lineHeight: 1.4
    }
  }, user ? "Your roster, lineups, and schedule come with you — the other coaches see them as soon as they join." : "Sign in above first — crews are locked to their coaches' accounts."), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "18px 0 6px"
    }
  }, "Or join one"), /*#__PURE__*/React.createElement("input", {
    className: "inp code-inp",
    placeholder: "CODE",
    maxLength: 6,
    value: entry,
    onChange: e => setEntry(e.target.value.toUpperCase())
  }), /*#__PURE__*/React.createElement("button", {
    className: "confirm alt",
    disabled: !ready || !available || !user || busy,
    onClick: () => doJoin(entry)
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
  }, "Watching needs no account \u2014 just the watch code from a coach. Your solo roster stays on this phone and comes back if you leave the crew.")), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      marginTop: 16,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "./about.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "About"), " · ", /*#__PURE__*/React.createElement("a", {
    href: "./help.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "How-to"), " · ", /*#__PURE__*/React.createElement("a", {
    href: "./terms.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "Terms & Privacy"))));
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
  teamName,
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
  const T = teamTotals(game.plays);
  const drives = computeDrives(game.plays);
  const margin = T.takeaways - T.giveaways;
  const shareBox = () => {
    const info = game.gameInfo || {};
    shareText(boxScoreText({
      opponent: info.opponent || "",
      team: teamName,
      endedAt: new Date().toISOString(),
      us: game.us,
      them: game.them,
      plays: game.plays,
      scrim: !!info.scrim,
      players: roster.map(p => ({
        id: p.id,
        num: p.num,
        name: p.name,
        s: statOf(p.id)
      })).filter(r => r.s.snaps > 0)
    }));
  };
  const exportCsv = () => {
    const head = ["Number", "Name", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds", "Catches", "RecYds", "PassCmp", "PassAtt", "PassYds", "IntThrown", "Kicks", "KickYds", "Touchbacks", "Returns", "RetYds", "FGM", "FGA", "ConvM", "ConvA", "BlkKicks", "Fumbles", "FumLost", "Tackles", "Assists", "TFL", "Sacks", "LossYds", "Int", "FumRec", "PBU", "Penalties", "PenYds", "TD", "Points"];
    const body = rows.slice().sort((a, b) => (parseInt(a.p.num, 10) || 0) - (parseInt(b.p.num, 10) || 0)).map(({
      p,
      s
    }) => [p.num, p.name, s.snaps, s.off, s.def, s.st, s.rush, s.rushY, s.rec, s.recY, s.cmp, s.att, s.passY, s.intT, s.kicks, s.kickY, s.tb, s.ret, s.retY, s.fgm, s.fga, s.convM, s.convA, s.blk, s.fum, s.fumL, s.tk, s.ast, s.tfl, s.sack, s.lossY, s.int, s.fr, s.pbu, s.pen, s.penY, s.td, s.pts]);
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
  }, T.rush)), /*#__PURE__*/React.createElement("div", {
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
  }, T.pass)), /*#__PURE__*/React.createElement("div", {
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
  }, T.rush + T.pass))), /*#__PURE__*/React.createElement("div", {
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
  }, T.kr)), /*#__PURE__*/React.createElement("div", {
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
  }, T.pr)), /*#__PURE__*/React.createElement("div", {
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
  }, T.allowed))), /*#__PURE__*/React.createElement("div", {
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
  }, "1st downs"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, T.fd)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "3rd down"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, T.thirdC, "/", T.thirdA)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Turnovers"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, (margin > 0 ? "+" : "") + margin)))), /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, [["plays", "Play count"], ["off", "Offense"], ["def", "Defense"], ["st", "Special"], ["drv", "Drives"]].map(v => /*#__PURE__*/React.createElement("button", {
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
  }, s.blk))))), view === "drv" && (drives.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "Drives show up once the offense takes the field.") : /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "#"), /*#__PURE__*/React.createElement("th", null, "Qtr"), /*#__PURE__*/React.createElement("th", null, "Plays"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Result"))), /*#__PURE__*/React.createElement("tbody", null, drives.map((d, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, i + 1)), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, "Q", d.q), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, d.plays), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, d.yards), /*#__PURE__*/React.createElement("td", null, d.result || "—")))))), /*#__PURE__*/React.createElement("div", {
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
    onClick: shareBox,
    disabled: game.plays.length === 0
  }, "Share box score"), /*#__PURE__*/React.createElement("button", {
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
  onTrack,
  onTrackDone
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [opp, setOpp] = useState("");
  const [scrim, setScrim] = useState(false);
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
        opponent: opp.trim(),
        scrim
      }])
    }));
    setDate("");
    setTime("");
    setOpp("");
    setScrim(false);
  };
  const remove = id => setSquad(s => Object.assign({}, s, {
    schedule: (s.schedule || []).filter(g => g.id !== id)
  }));
  /* A wrong final stamp (ended under the wrong matchup) can be wiped without
     touching any saved game — the row just goes back to upcoming. */
  const clearFinal = id => setSquad(s => Object.assign({}, s, {
    schedule: (s.schedule || []).map(g => g.id === id ? Object.assign({}, g, {
      done: false,
      us: null,
      them: null
    }) : g)
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
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      flex: "1 1 100%",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 14,
      color: "var(--soft)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "aria-label": "Scrimmage",
    checked: scrim,
    onChange: e => setScrim(e.target.checked)
  }), "Scrimmage \u2014 great for practice reps, stays out of the record and season stats"), /*#__PURE__*/React.createElement("button", {
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
    }, fmtDate(g.date), " \xB7 ", fmtTime(g.time), g.scrim ? " · scrimmage" : "", g.done ? " · final " + g.us + "–" + g.them : past ? " · played" : "")), /*#__PURE__*/React.createElement("button", {
      className: "mini dark",
      onClick: () => g.done && onTrackDone ? onTrackDone(g) : onTrack(g)
    }, "Add stats"), g.done && /*#__PURE__*/React.createElement("button", {
      className: "mini",
      onClick: () => {
        if (window.confirm("Clear the " + g.us + "–" + g.them + " final off this scheduled game? " + "Saved games on the Season list aren't touched — the matchup just goes back to upcoming.")) {
          clearFinal(g.id);
        }
      }
    }, "Clear final"), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      onClick: () => {
        if (window.confirm("Take this game off the schedule?")) remove(g.id);
      }
    }, "Remove"));
  }));
}

/* Full stats for one archived game — every game keeps its play-by-play and
   per-player lines forever, so this works for the whole season history. */
function GameStatsSheet({
  rec,
  teamName,
  onClose
}) {
  const [view, setView] = useState("plays");
  const plays = rec.plays || [];
  const T = teamTotals(plays);
  const margin = T.takeaways - T.giveaways;
  const drives = computeDrives(plays);
  const rows = (rec.players || []).map(r => ({
    p: r,
    s: Object.assign(blank(), r.s)
  }));
  const res = rec.us > rec.them ? "W" : rec.us < rec.them ? "L" : "T";
  return /*#__PURE__*/React.createElement("div", {
    className: "veil",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-hd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate",
    style: {
      minWidth: 62,
      fontSize: 16
    }
  }, rec.us, "\u2013", rec.them), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sheet-ttl"
  }, res, " ", rec.opponent ? "vs " + rec.opponent : "Game"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, new Date(rec.endedAt).toLocaleDateString(), " \xB7 ", rec.playsCount, " plays", rec.scrim ? " · scrimmage" : "")), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, "Done")), /*#__PURE__*/React.createElement("div", {
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
  }, T.rush)), /*#__PURE__*/React.createElement("div", {
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
  }, T.pass)), /*#__PURE__*/React.createElement("div", {
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
  }, T.rush + T.pass))), /*#__PURE__*/React.createElement("div", {
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
  }, T.kr)), /*#__PURE__*/React.createElement("div", {
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
  }, T.pr)), /*#__PURE__*/React.createElement("div", {
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
  }, T.allowed))), /*#__PURE__*/React.createElement("div", {
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
  }, "1st downs"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, T.fd)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "3rd down"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, T.thirdC, "/", T.thirdA)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Turnovers"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, (margin > 0 ? "+" : "") + margin)))), /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, [["plays", "Play count"], ["off", "Offense"], ["def", "Defense"], ["st", "Special"], ["drv", "Drives"]].map(v => /*#__PURE__*/React.createElement("button", {
    key: v[0],
    className: view === v[0] ? "on" : "",
    onClick: () => setView(v[0])
  }, v[1]))), view !== "drv" && rows.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "No player lines were saved with this game."), view === "plays" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Off"), /*#__PURE__*/React.createElement("th", null, "Def"), /*#__PURE__*/React.createElement("th", null, "Spec"), /*#__PURE__*/React.createElement("th", null, "Total"), /*#__PURE__*/React.createElement("th", null, "Pen"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.snaps - a.s.snaps).map(({
    p,
    s
  }) => /*#__PURE__*/React.createElement("tr", {
    key: p.id
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, "#", p.num), " ", p.name), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.off), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.def), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.st), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.snaps), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, s.pen))))), view === "off" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Car"), /*#__PURE__*/React.createElement("th", null, "Rush"), /*#__PURE__*/React.createElement("th", null, "Rec"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Pass"), /*#__PURE__*/React.createElement("th", null, "PsYd"), /*#__PURE__*/React.createElement("th", null, "Fum"), /*#__PURE__*/React.createElement("th", null, "TD"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.rushY + b.s.recY - (a.s.rushY + a.s.recY)).map(({
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
  }, s.td))))), view === "def" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Tkl"), /*#__PURE__*/React.createElement("th", null, "Ast"), /*#__PURE__*/React.createElement("th", null, "TFL"), /*#__PURE__*/React.createElement("th", null, "Sck"), /*#__PURE__*/React.createElement("th", null, "LsYd"), /*#__PURE__*/React.createElement("th", null, "Int"), /*#__PURE__*/React.createElement("th", null, "FR"), /*#__PURE__*/React.createElement("th", null, "PBU"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.tk - a.s.tk).map(({
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
  }, s.pbu))))), view === "st" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Kicks"), /*#__PURE__*/React.createElement("th", null, "KYds"), /*#__PURE__*/React.createElement("th", null, "Ret"), /*#__PURE__*/React.createElement("th", null, "RYds"), /*#__PURE__*/React.createElement("th", null, "FG"), /*#__PURE__*/React.createElement("th", null, "Conv"), /*#__PURE__*/React.createElement("th", null, "Blk"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.kickY + b.s.retY - (a.s.kickY + a.s.retY)).map(({
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
  }, s.blk))))), view === "drv" && (drives.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "No drives could be read from this game's play log.") : /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "#"), /*#__PURE__*/React.createElement("th", null, "Qtr"), /*#__PURE__*/React.createElement("th", null, "Plays"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Result"))), /*#__PURE__*/React.createElement("tbody", null, drives.map((d, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, i + 1)), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, "Q", d.q), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, d.plays), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, d.yards), /*#__PURE__*/React.createElement("td", null, d.result || "—")))))), /*#__PURE__*/React.createElement("button", {
    className: "confirm",
    onClick: () => shareText(boxScoreText(Object.assign({
      team: teamName
    }, rec)))
  }, "Share the box score")));
}
function SeasonTab({
  games,
  squad,
  setSquad,
  teamName,
  onEdit,
  onRemove,
  onImport,
  onTrack,
  canReopen,
  onReopen,
  live
}) {
  const [year, setYear] = useState("all");
  const [view, setView] = useState("plays");
  const [editingGame, setEditingGame] = useState(null);
  const [statsGame, setStatsGame] = useState(null);
  const fileRef = useRef(null);
  const saveGameEdit = () => {
    if (!editingGame) return;
    const patch = {
      opponent: editingGame.opponent.trim(),
      us: Math.max(0, parseInt(editingGame.us, 10) || 0),
      them: Math.max(0, parseInt(editingGame.them, 10) || 0),
      scrim: !!editingGame.scrim
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
  /* Scrimmages sit in the game list for their play-by-play, but never count
     toward the record or the season stat totals. */
  const counted = shown.filter(g => !g.scrim);
  const liveCounts = !!(live && !live.scrim && (year === "all" || (live.endedAt || "").slice(0, 4) === year));
  const totals = seasonTotals(counted.concat(liveCounts ? [live] : []));
  const wins = counted.filter(g => g.us > g.them).length;
  const losses = counted.filter(g => g.us < g.them).length;
  const ties = counted.length - wins - losses;
  const pf = counted.reduce((a, g) => a + (g.us || 0), 0);
  const pa = counted.reduce((a, g) => a + (g.them || 0), 0);
  const newest = shown.slice().sort((a, b) => a.endedAt < b.endedAt ? 1 : -1);
  const exportCsv = () => {
    const head = ["Number", "Name", "Games", "Plays", "Offense", "Defense", "Special", "Carries", "RushYds", "Catches", "RecYds", "PassCmp", "PassAtt", "PassYds", "IntThrown", "Kicks", "KickYds", "Touchbacks", "Returns", "RetYds", "FGM", "FGA", "ConvM", "ConvA", "BlkKicks", "Fumbles", "FumLost", "Tackles", "Assists", "TFL", "Sacks", "LossYds", "Int", "FumRec", "PBU", "Penalties", "PenYds", "TD", "Points"];
    const body = totals.slice().sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0)).map(t => [t.num, t.name, t.gp, t.snaps, t.off, t.def, t.st, t.rush, t.rushY, t.rec, t.recY, t.cmp, t.att, t.passY, t.intT, t.kicks, t.kickY, t.tb, t.ret, t.retY, t.fgm, t.fga, t.convM, t.convA, t.blk, t.fum, t.fumL, t.tk, t.ast, t.tfl, t.sack, t.lossY, t.int, t.fr, t.pbu, t.pen, t.penY, t.td, t.pts]);
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
  }, (teamName || "Team") + " record — " + (year === "all" ? "all years" : year)), /*#__PURE__*/React.createElement("div", {
    className: "dd-main"
  }, wins, "\u2013", losses, ties ? "–" + ties : ""), /*#__PURE__*/React.createElement("div", {
    className: "dd-sub"
  }, pf, " scored \xB7 ", pa, " allowed")), /*#__PURE__*/React.createElement("div", {
    className: "sechd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h2"
  }, "Team name")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14,
      color: "var(--soft)"
    }
  }, "Replaces \"Us\" across the app and names your side of the fan gamecast field."), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    "aria-label": "Team name",
    style: {
      width: 150
    },
    placeholder: "Chiefs",
    value: squad.teamName || "",
    onChange: e => setSquad(s => Object.assign({}, s, {
      teamName: e.target.value
    }))
  })), /*#__PURE__*/React.createElement(ScheduleSection, {
    squad: squad,
    setSquad: setSquad,
    onTrack: onTrack,
    onTrackDone: g => {
      /* "Add stats" on a finished game means editing THAT game — reopen
         its archive instead of tagging a fresh board with its name. */
      const byNew = games.slice().sort((a, b) => a.endedAt < b.endedAt ? 1 : -1);
      const rec = byNew.find(x => x.schedId === g.id) || byNew.find(x => (x.opponent || "") === g.opponent);
      if (rec) onReopen(rec);else onTrack(g);
    }
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
  }, v[1]))), liveCounts && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "2px 0 8px",
      textAlign: "center"
    }
  }, "Totals include the game on the board"), view === "plays" && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "GP"), /*#__PURE__*/React.createElement("th", null, "Off"), /*#__PURE__*/React.createElement("th", null, "Def"), /*#__PURE__*/React.createElement("th", null, "Spec"), /*#__PURE__*/React.createElement("th", null, "Total"), /*#__PURE__*/React.createElement("th", null, "Pen"))), /*#__PURE__*/React.createElement("tbody", null, totals.slice().sort((a, b) => b.snaps - a.snaps).map(t => /*#__PURE__*/React.createElement("tr", {
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
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      flex: "1 1 100%",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 14,
      color: "var(--soft)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    "aria-label": "Scrimmage game",
    checked: !!editingGame.scrim,
    onChange: e => setEditingGame(Object.assign({}, editingGame, {
      scrim: e.target.checked
    }))
  }), "Scrimmage \u2014 keep it out of the record and season stats"), /*#__PURE__*/React.createElement("button", {
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
  }, new Date(g.endedAt).toLocaleDateString(), " \xB7 ", g.playsCount, " plays", g.scrim ? " · scrimmage" : "", g.pending ? " · waiting to upload" : "")), canReopen && /*#__PURE__*/React.createElement("button", {
    className: "mini dark",
    onClick: () => onReopen(g)
  }, "Reopen"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setStatsGame(g)
  }, "Stats"), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setEditingGame({
      id: g.id,
      opponent: g.opponent || "",
      date: (g.endedAt || "").slice(0, 10),
      us: String(g.us),
      them: String(g.them),
      scrim: !!g.scrim
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
  }, /*#__PURE__*/React.createElement("b", null, "Back up"), " downloads every saved game as one file \u2014 do it now and then, or before switching phones.", /*#__PURE__*/React.createElement("b", null, " Restore"), " merges a backup in without overwriting anything, so it also works for combining years."), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "18px 0 6px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "./about.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "About"), " · ", /*#__PURE__*/React.createElement("a", {
    href: "./help.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "How-to"), " · ", /*#__PURE__*/React.createElement("a", {
    href: "./terms.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "Terms & Privacy")), statsGame && /*#__PURE__*/React.createElement(GameStatsSheet, {
    rec: statsGame,
    teamName: teamName,
    onClose: () => setStatsGame(null)
  }));
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
  const [view, setView] = useState("cast");
  const [sview, setSview] = useState("off");
  useEffect(() => {
    if (!sb) return undefined;
    let alive = true;
    const pull = async () => {
      try {
        const out = [];
        let sqd = null;
        /* Accounts-era path: the read-only watch feed. Falls back to direct
           table reads for a database still on the open (pre-auth) schema. */
        const r = await sb.rpc("sideline_watch", {
          code
        });
        if (!r.error && r.data) {
          (r.data.ops || []).forEach(row => (row.ops || []).forEach(o => out.push(Object.assign({}, o, {
            byName: row.coach_name || "Coach"
          }))));
          sqd = r.data.squad || null;
        } else {
          const rows = await sb.from(T_OPS).select("coach_id,coach_name,ops").eq("game_code", code);
          if (rows.error) throw rows.error;
          (rows.data || []).forEach(row => (row.ops || []).forEach(o => out.push(Object.assign({}, o, {
            byName: row.coach_name || "Coach"
          }))));
          const sq = await sb.from(T_SQUAD).select("squad").eq("game_code", code).maybeSingle();
          if (!sq.error && sq.data) sqd = sq.data.squad || null;
        }
        out.sort((a, b) => a.ts - b.ts || (a.id < b.id ? -1 : 1));
        if (!alive) return;
        setOps(out);
        setStatus("live");
        if (sqd) setSquadState(sqd);
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

  /* The mock field: our team drives left-to-right toward the far end zone.
     The ball marker rides the optional spot tracker; the amber stripe is the
     line to gain, worked out from the down & distance and who has the ball. */
  const ourName = ((squad.teamName || "") + "").trim() || "Us";
  const oppName = ((game.gameInfo && game.gameInfo.opponent || "") + "").trim() || "Them";
  const drives = computeDrives(game.plays);
  const lastDrive = drives.length ? drives[drives.length - 1] : null;
  const curDrive = lastDrive && lastDrive.result === "On the field" ? lastDrive : null;
  /* Game stats tab: the same numbers the coaches see, view-only. */
  const T = teamTotals(game.plays);
  const margin = T.takeaways - T.giveaways;
  const stats = useMemo(() => tally(game.plays), [game.plays]);
  const rows = (squad.roster || []).map(p => ({
    p,
    s: stats[p.id] || blank()
  })).filter(r => r.s.snaps > 0);
  const toGain = game.spot != null ? clampSpot(game.unit === "defense" ? game.spot - game.distance : game.spot + game.distance) : null;
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
  }, (((squad.teamName || "") + "").trim() || "Sideline") + (oppName !== "Them" ? " vs " + oppName : "")), /*#__PURE__*/React.createElement("span", {
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
  }, ourName), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.us)), /*#__PURE__*/React.createElement("div", {
    className: "dd"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-main"
  }, ORD[game.down], " ", /*#__PURE__*/React.createElement("small", null, "&"), " ", game.distance), /*#__PURE__*/React.createElement("div", {
    className: "dd-sub"
  }, "Quarter ", game.quarter, " \xB7 ", game.playCount, " plays run")), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, oppName), /*#__PURE__*/React.createElement("div", {
    className: "score-num"
  }, game.them)))), /*#__PURE__*/React.createElement("div", {
    className: "stbar",
    style: {
      marginTop: 10
    }
  }, [["cast", "Gamecast"], ["stats", "Game stats"]].map(t => /*#__PURE__*/React.createElement("button", {
    key: t[0],
    className: view === t[0] ? "on" : "",
    onClick: () => setView(t[0])
  }, t[1]))), view === "cast" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "gc-meta"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Down"), /*#__PURE__*/React.createElement("b", null, ORD[game.down], " & ", game.distance)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Ball on"), /*#__PURE__*/React.createElement("b", null, game.spot != null ? spotLabel(game.spot) : "—")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Drive"), /*#__PURE__*/React.createElement("b", null, curDrive ? curDrive.plays + (curDrive.plays === 1 ? " play, " : " plays, ") + curDrive.yards + " yds" : "—"))), /*#__PURE__*/React.createElement("div", {
    className: "gc-field"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gc-ez"
  }), /*#__PURE__*/React.createElement("div", {
    className: "gc-turf"
  }, [10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => /*#__PURE__*/React.createElement(React.Fragment, {
    key: v
  }, /*#__PURE__*/React.createElement("i", {
    className: "gc-tick" + (v === 50 ? " mid" : ""),
    style: {
      left: v + "%"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "gc-num",
    style: {
      left: v + "%"
    }
  }, v <= 50 ? v : 100 - v))), game.spot != null && toGain != null && toGain !== game.spot && /*#__PURE__*/React.createElement("span", {
    className: "gc-togo",
    style: {
      left: toGain + "%"
    }
  }), game.spot != null && /*#__PURE__*/React.createElement("span", {
    className: "gc-ball",
    style: {
      left: game.spot + "%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "gc-ez opp"
  })), /*#__PURE__*/React.createElement("div", {
    className: "gc-scale"
  }, /*#__PURE__*/React.createElement("span", null, ourName), /*#__PURE__*/React.createElement("span", null, oppName)), game.spot == null && /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      textAlign: "center",
      marginTop: 6
    }
  }, "The ball appears on the field when the coaches track the spot"), game.gameInfo && game.gameInfo.opponent && /*#__PURE__*/React.createElement("div", {
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
      className: "eyebrow",
      style: {
        flex: "0 0 auto"
      }
    }, ORD[p.down], " & ", p.distance, p.spot != null ? " · " + spotLabel(p.spot) : ""), body));
  })), /*#__PURE__*/React.createElement("div", {
    className: "empty-note",
    style: {
      textAlign: "left",
      marginTop: 14
    }
  }, "View only \u2014 you're following along live. Scores and plays appear here seconds after the coaches log them.")), view === "stats" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "board",
    style: {
      marginTop: 10,
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
  }, T.rush)), /*#__PURE__*/React.createElement("div", {
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
  }, T.pass)), /*#__PURE__*/React.createElement("div", {
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
  }, T.rush + T.pass))), /*#__PURE__*/React.createElement("div", {
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
  }, T.kr)), /*#__PURE__*/React.createElement("div", {
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
  }, T.pr)), /*#__PURE__*/React.createElement("div", {
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
  }, T.allowed))), /*#__PURE__*/React.createElement("div", {
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
  }, "1st downs"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, T.fd)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "3rd down"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, T.thirdC, "/", T.thirdA)), /*#__PURE__*/React.createElement("div", {
    className: "score-blk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: "#8FA394"
    }
  }, "Turnovers"), /*#__PURE__*/React.createElement("div", {
    className: "score-num",
    style: {
      fontSize: 28
    }
  }, (margin > 0 ? "+" : "") + margin)))), /*#__PURE__*/React.createElement("div", {
    className: "stbar"
  }, [["off", "Offense"], ["def", "Defense"], ["st", "Special"], ["drv", "Drives"]].map(v => /*#__PURE__*/React.createElement("button", {
    key: v[0],
    className: sview === v[0] ? "on" : "",
    onClick: () => setSview(v[0])
  }, v[1]))), sview !== "drv" && rows.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "Player stats fill in as the coaches log plays."), sview === "off" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Car"), /*#__PURE__*/React.createElement("th", null, "Rush"), /*#__PURE__*/React.createElement("th", null, "Rec"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Pass"), /*#__PURE__*/React.createElement("th", null, "PsYd"), /*#__PURE__*/React.createElement("th", null, "Fum"), /*#__PURE__*/React.createElement("th", null, "TD"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.rushY + b.s.recY - (a.s.rushY + a.s.recY)).map(({
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
  }, s.td))))), sview === "def" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Tkl"), /*#__PURE__*/React.createElement("th", null, "Ast"), /*#__PURE__*/React.createElement("th", null, "TFL"), /*#__PURE__*/React.createElement("th", null, "Sck"), /*#__PURE__*/React.createElement("th", null, "LsYd"), /*#__PURE__*/React.createElement("th", null, "Int"), /*#__PURE__*/React.createElement("th", null, "FR"), /*#__PURE__*/React.createElement("th", null, "PBU"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.tk - a.s.tk).map(({
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
  }, s.pbu))))), sview === "st" && rows.length > 0 && /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Player"), /*#__PURE__*/React.createElement("th", null, "Kicks"), /*#__PURE__*/React.createElement("th", null, "KYds"), /*#__PURE__*/React.createElement("th", null, "Ret"), /*#__PURE__*/React.createElement("th", null, "RYds"), /*#__PURE__*/React.createElement("th", null, "FG"), /*#__PURE__*/React.createElement("th", null, "Conv"), /*#__PURE__*/React.createElement("th", null, "Blk"))), /*#__PURE__*/React.createElement("tbody", null, rows.slice().sort((a, b) => b.s.kickY + b.s.retY - (a.s.kickY + a.s.retY)).map(({
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
  }, s.blk))))), sview === "drv" && (drives.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-note"
  }, "Drives show up once the offense takes the field.") : /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "#"), /*#__PURE__*/React.createElement("th", null, "Qtr"), /*#__PURE__*/React.createElement("th", null, "Plays"), /*#__PURE__*/React.createElement("th", null, "Yds"), /*#__PURE__*/React.createElement("th", null, "Result"))), /*#__PURE__*/React.createElement("tbody", null, drives.map((d, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", null, i + 1)), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, "Q", d.q), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, d.plays), /*#__PURE__*/React.createElement("td", {
    className: "n"
  }, d.yards), /*#__PURE__*/React.createElement("td", null, d.result || "—"))))))), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      margin: "16px 0 8px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "./about.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "About"), " · ", /*#__PURE__*/React.createElement("a", {
    href: "./help.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "How-to"), " · ", /*#__PURE__*/React.createElement("a", {
    href: "./terms.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: "inherit"
    }
  }, "Terms & Privacy"))));
}

/* ============================ MOUNT ============================ */

const WATCH_CODE = (() => {
  try {
    const m = (window.location.search || "").match(/[?&]watch=([A-Za-z0-9]{4,6})/);
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
