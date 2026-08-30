/* Headless smoke test: boot the real app.js in jsdom, drive the UI, check results. */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://example.test/" });
const w = dom.window;

// minimal localStorage
const store = {};
Object.defineProperty(w, "localStorage", {
  value: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
});
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
w.confirm = () => true;
w.prompt = () => "Eagles";

const load = (f) => w.eval(fs.readFileSync(path.join(root, f), "utf8"));
load("config.js");
load("vendor/react.production.min.js");
load("vendor/react-dom.production.min.js");
load("vendor/supabase.min.js");

let failed = 0;
const ok = (name, cond) => { console.log((cond ? "  ok   " : "  FAIL ") + name); if (!cond) failed++; };

w.eval(fs.readFileSync(path.join(root, "app.js"), "utf8"));

const { document } = w;
const act = (fn) => { w.eval("(" + fn.toString() + ")()"); };
const flush = () => new Promise((r) => setTimeout(r, 30));

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const byText = (sel, txt) => $$(sel).find((e) => e.textContent.trim().toLowerCase().indexOf(txt.toLowerCase()) >= 0);
const click = (el) => { if (!el) throw new Error("element not found"); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
const type = (el, val) => {
  const proto = el.tagName === "TEXTAREA" ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, val);
  el.dispatchEvent(new w.Event("input", { bubbles: true }));
};

(async () => {
  await flush();
  console.log("\nboot");
  ok("app renders", !!$(".sl"));
  ok("scoreboard shows 1st & 10", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 10") >= 0);
  ok("solo mode by default", $(".crew").textContent.indexOf("Just you") >= 0);

  console.log("\nroster");
  click(byText(".nav button", "Roster"));
  await flush();
  const fold = $(".fold");
  fold.open = true;
  const ta = $(".fold textarea");
  type(ta, "12 Jordan Blair\n7 Sam Ortiz\n44 Eli Ward\n33 Ray Kim\n21 Nico Vance");
  await flush();
  click(byText(".fold button", "Add these"));
  await flush();
  ok("bulk add created 5 players", $$(".row .plate").length >= 5);
  ok("roster count shows 5", $(".sechd .eyebrow").textContent.indexOf("5 players") >= 0);

  console.log("\nedit a player");
  const samRosterRow = $$(".row").find((r) => r.textContent.indexOf("Sam") >= 0);
  click(Array.from(samRosterRow.querySelectorAll(".mini")).find((b) => b.textContent === "Edit"));
  await flush();
  const editNum = $$(".row input").find((i) => i.value === "7");
  ok("edit opens with the current number", !!editNum);
  type(editNum, "77");
  click(byText(".mini", "Save"));
  await flush();
  const samRow2 = $$(".row").find((r) => r.textContent.indexOf("Sam") >= 0);
  ok("number change saved on the same player", samRow2 && samRow2.querySelector(".plate").textContent === "77");
  ok("roster still has 5 players", $(".sechd .eyebrow").textContent.indexOf("5 players") >= 0);

  console.log("\nlineups");
  click(byText(".nav button", "Lineups"));
  await flush();
  const selects = $$("select");
  ok("11 offense slots x 2 dropdowns", selects.length === 22);
  // put a player in the QB slot (index 8 -> starter select at 16)
  const qbSelect = selects[16];
  const opt = Array.from(qbSelect.options).find((o) => o.textContent.indexOf("Jordan") >= 0);
  const sSetter = Object.getOwnPropertyDescriptor(w.HTMLSelectElement.prototype, "value").set;
  sSetter.call(qbSelect, opt.value);
  qbSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  // and a backup in the same slot
  const qbBackup = selects[17];
  const opt2 = Array.from(qbBackup.options).find((o) => o.textContent.indexOf("Sam") >= 0);
  sSetter.call(qbBackup, opt2.value);
  qbBackup.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  ok("starter saved", $$("select")[16].value === opt.value);

  console.log("\nrename a position");
  const slotInp = $$(".slot-inp")[0];
  ok("position name is editable", !!slotInp && slotInp.value === "LT");
  type(slotInp, "NOSE");
  slotInp.dispatchEvent(new w.FocusEvent("focusout", { bubbles: true }));
  await flush();
  ok("rename saved in the lineup editor", $$(".slot-inp")[0].value === "NOSE");

  console.log("\ngame — logging a play");
  click(byText(".nav button", "Game"));
  await flush();
  const cards = $$(".pcard");
  ok("11 position cards on the field", cards.length === 11);
  ok("renamed position shows on the field",
    cards.some((c) => c.querySelector(".pc-slot").textContent === "NOSE"));
  const qbCard = cards.find((c) => c.textContent.indexOf("Jordan") >= 0);
  ok("QB card shows the starter", !!qbCard);
  click(qbCard.querySelector(".pc-top"));
  await flush();
  ok("play sheet opened", !!$(".sheet"));
  click(byText(".opt", "Ran it"));
  await flush();
  const yardSel = $(".yardbox select");
  ok("yards dropdown covers -100 through 100", !!yardSel && yardSel.options.length === 201 &&
    yardSel.options[0].value === "-100" && yardSel.options[200].value === "100");
  sSetter.call(yardSel, "10");
  yardSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  ok("yards show +10", $(".yardnum").textContent.trim() === "+10");
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("sheet closed", !$(".sheet"));
  ok("play log has an entry", !!$(".logline"));
  ok("10 yards = new first down", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 10") >= 0);
  ok("play counter incremented", $(".dd-sub").textContent.indexOf("1 plays") >= 0);

  console.log("\nsnap counts");
  click(byText(".nav button", "Stats"));
  await flush();
  const rowFor = (name) => $$("tbody tr").find((r) => r.textContent.indexOf(name) >= 0);
  ok("Jordan credited 1 play", rowFor("Jordan").querySelectorAll("td")[4].textContent === "1");
  ok("benched Sam has 0 plays", rowFor("Sam").querySelectorAll("td")[4].textContent === "0");
  ok("shortage warning appears", $(".row").textContent.indexOf("under 8 plays") >= 0);

  console.log("\nsub: any player into any slot");
  click(byText(".nav button", "Game"));
  await flush();
  const qb2 = $$(".pcard").find((c) => c.textContent.indexOf("Jordan") >= 0);
  click(byText(".sub-btn", "⇄"));
  await flush();
  ok("sub sheet opened with the designated backup", !!byText(".confirm", "Send in"));
  click(byText(".confirm", "Send in"));
  await flush();
  const qb3 = $$(".pcard").find((c) => c.textContent.indexOf("QB") >= 0);
  ok("designated sub is now in at QB", qb3.textContent.indexOf("Sam") >= 0);

  console.log("\nmove: drop a player in a different spot");
  const filled = $$(".pcard").find((c) => c.textContent.indexOf("Sam") >= 0);
  click(byText(".sub-btn", "Move"));
  await flush();
  ok("move banner shown", !!$(".banner"));
  const emptyCard = $$(".pcard.empty")[0];
  const emptyLabel = emptyCard.querySelector(".pc-slot").textContent;
  click(emptyCard.querySelector(".pc-top"));
  await flush();
  const moved = $$(".pcard").find((c) => c.querySelector(".pc-slot").textContent === emptyLabel);
  ok("player landed in the new spot (" + emptyLabel + ")", moved.textContent.indexOf("Sam") >= 0);
  const oldQb = $$(".pcard").find((c) => c.querySelector(".pc-slot").textContent === "QB");
  ok("old spot is now open", oldQb.className.indexOf("empty") >= 0);

  console.log("\nundo");
  click(byText(".abtn", "Undo"));
  await flush();
  const backQb = $$(".pcard").find((c) => c.querySelector(".pc-slot").textContent === "QB");
  ok("undo restored the previous lineup", backQb.textContent.indexOf("Sam") >= 0);

  console.log("\ndown & distance logic");
  const anyCard = $$(".pcard").find((c) => c.querySelector(".plate").textContent !== "—");
  click(anyCard.querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Ran it"));
  const yardSel2 = $(".yardbox select");
  sSetter.call(yardSel2, "1");
  yardSel2.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("1 yard on 1st & 10 becomes 2nd & 9",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("2nd & 9") >= 0);

  console.log("\nremove a logged play");
  click($(".logline [aria-label='Remove this play']"));
  await flush();
  ok("removed play rewinds the down", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 10") >= 0);
  ok("play counter went back down", $(".dd-sub").textContent.indexOf("1 plays") >= 0);
  const cardAgain = $$(".pcard").find((c) => c.querySelector(".plate").textContent !== "—");
  click(cardAgain.querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Ran it"));
  const yardSel3 = $(".yardbox select");
  sSetter.call(yardSel3, "1");
  yardSel3.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("re-logged the play correctly", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("2nd & 9") >= 0);

  console.log("\ntouchdown scoring");
  const c2 = $$(".pcard").find((c) => c.querySelector(".plate").textContent !== "—");
  click(c2.querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Ran it"));
  click(byText(".opt", "Touchdown"));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("touchdown put 6 on the board", $$(".score-num")[0].textContent === "6");

  console.log("\nseason archive");
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".abtn", "Start a new game"));
  await flush();
  click(byText(".nav button", "Game"));
  await flush();
  ok("board reset for the next game", $(".dd-sub").textContent.indexOf("0 plays") >= 0);
  ok("score cleared", $(".score-num").textContent === "0");
  click(byText(".nav button", "Season"));
  await flush();
  const gameRow = byText(".row", "vs Eagles");
  ok("archived game listed with the opponent", !!gameRow);
  ok("game recorded as a win", gameRow && gameRow.textContent.indexOf("W") >= 0);
  ok("record card shows 1-0", !!$(".dd-main") && $(".dd-main").textContent === "1–0");
  ok("record card shows points for and against", $(".dd-sub").textContent.indexOf("6 scored") >= 0 &&
    $(".dd-sub").textContent.indexOf("0 allowed") >= 0);
  const samRow = $$("tbody tr").find((r) => r.textContent.indexOf("Sam") >= 0);
  ok("season totals carry Sam's 2 snaps", samRow && samRow.querySelectorAll("td")[5].textContent === "2");
  const jordanRow = $$("tbody tr").find((r) => r.textContent.indexOf("Jordan") >= 0);
  ok("season totals carry Jordan's snap", jordanRow && jordanRow.querySelectorAll("td")[5].textContent === "1");
  ok("games saved to localStorage", JSON.parse(store["sideline.solo.games"] || "[]").length === 1);

  console.log("\nedit an archived game");
  const archRow = byText(".row", "vs Eagles");
  click(Array.from(archRow.querySelectorAll(".mini")).find((b) => b.textContent === "Edit"));
  await flush();
  const usInp = $$(".row input").find((i) => i.getAttribute("aria-label") === "Our score");
  ok("game edit opens with the score", !!usInp && usInp.value === "6");
  type(usInp, "7");
  click(byText(".mini", "Save"));
  await flush();
  ok("score change saved on the archived game", !!byText(".row", "7–0"));

  console.log("\nschedule");
  type($(".sched-date"), "2026-09-12");
  type($(".sched-time"), "10:30");
  type($(".sched-opp"), "Bears");
  await flush();
  click(byText(".mini", "Add to schedule"));
  await flush();
  const schedRow = byText(".row", "vs Bears");
  ok("scheduled game listed with the opponent", !!schedRow);
  ok("scheduled game shows the date", schedRow && schedRow.textContent.indexOf("Sep") >= 0);
  ok("scheduled game shows the kickoff time", schedRow && schedRow.textContent.indexOf("10:30") >= 0);
  ok("schedule saved to localStorage",
    JSON.parse(store["sideline.solo.squad"]).schedule.length === 1);

  console.log("\ntrack a scheduled game");
  click(byText(".mini", "Add stats"));
  await flush();
  ok("jumped to the game board", !!$(".board"));
  ok("board tagged with the scheduled opponent", $(".sl").textContent.indexOf("Tracking vs Bears") >= 0);

  console.log("\ndistance dropdown");
  click(byText(".nav button", "Game"));
  await flush();
  const distSel = $(".dist-sel");
  ok("distance dropdown lists 1 to 100", !!distSel && distSel.options.length === 100 &&
    distSel.options[0].value === "1" && distSel.options[99].value === "100");
  sSetter.call(distSel, "25");
  distSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  ok("picking 25 updates the scoreboard", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("& 25") >= 0);

  console.log("\nend game button");
  ok("no end-game button on an empty board", !byText(".abtn", "End game"));
  const endCard = $$(".pcard").find((c) => c.querySelector(".plate").textContent !== "—");
  click(endCard.querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Ran it"));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("end-game button appears once plays exist", !!byText(".abtn", "End game"));
  click(byText(".abtn", "End game"));
  await flush();
  ok("board reset after ending the game", $(".dd-sub").textContent.indexOf("0 plays") >= 0);
  click(byText(".nav button", "Season"));
  await flush();
  const bearsRow = byText(".row", "vs Bears");
  ok("scheduled game stamped with the final score", bearsRow && bearsRow.textContent.indexOf("final 0–0") >= 0);
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\npassing stats");
  click($$(".pcard.empty")[0].querySelector(".pc-top"));
  await flush();
  click($$(".sheet .row").find((r) => r.textContent.indexOf("Eli") >= 0));
  await flush();
  const eliCard = $$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0);
  ok("receiver subbed onto the field", !!eliCard);
  click(eliCard.querySelector(".pc-top"));
  await flush();
  ok("Threw it option is gone", !byText(".opt", "Threw it"));
  ok("Incomplete pass is an option", !!byText(".opt", "Incomplete pass"));
  click(byText(".opt", "Caught it"));
  await flush();
  const passerSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Who threw it");
  ok("passer dropdown defaults to the QB",
    !!passerSel && passerSel.options[passerSel.selectedIndex].textContent.indexOf("Jordan") >= 0);
  const ySel = $(".yardbox select");
  sSetter.call(ySel, "15");
  ySel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  click($$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0).querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Incomplete pass"));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".stbar button", "Offense"));
  await flush();
  const jStatRow = $$("tbody tr").find((r) => r.textContent.indexOf("Jordan") >= 0);
  ok("QB auto-credited 1 completion on 2 attempts", jStatRow && jStatRow.querySelectorAll("td")[5].textContent === "1/2");
  ok("QB credited the 15 pass yards", jStatRow && jStatRow.querySelectorAll("td")[6].textContent === "15");
  const eStatRow = $$("tbody tr").find((r) => r.textContent.indexOf("Eli") >= 0);
  ok("receiver credited the catch and yards", eStatRow &&
    eStatRow.querySelectorAll("td")[3].textContent === "1" && eStatRow.querySelectorAll("td")[4].textContent === "15");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nelementary conversions");
  const convCard = $$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0);
  click(convCard.querySelector(".pc-top"));
  await flush();
  const kickOpt = byText(".opt", "Conversion kick");
  const runOpt = byText(".opt", "Conversion run/pass");
  ok("conversion kick is worth 2 at elementary level", !!kickOpt && kickOpt.textContent.indexOf("+2") >= 0);
  ok("conversion run/pass is worth 1 at elementary level", !!runOpt && runOpt.textContent.indexOf("+1") >= 0);
  click(byText(".opt", "Ran it"));
  click(runOpt);
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("run conversion put 1 on the board", $$(".score-num")[0].textContent === "1");

  console.log("\nspecial teams stats");
  click(byText(".unit", "Special"));
  await flush();
  click($$(".pcard.empty")[0].querySelector(".pc-top"));
  await flush();
  click($$(".sheet .row").find((r) => r.textContent.indexOf("Jordan") >= 0));
  await flush();
  const kickCard = $$(".pcard").find((c) => c.textContent.indexOf("Jordan") >= 0);
  ok("kicker subbed onto the kickoff team", !!kickCard);
  click(kickCard.querySelector(".pc-top"));
  await flush();
  ok("FG attempt and conversion options offered", !!byText(".opt", "FG attempt") && !!byText(".opt", "Conversion good"));
  click(byText(".opt", "Kicked it"));
  await flush();
  const kickSel = $(".yardbox select");
  sSetter.call(kickSel, "35");
  kickSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  click($$(".pcard").find((c) => c.textContent.indexOf("Jordan") >= 0).querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "FG attempt"));
  click(byText(".opt", "Field goal"));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".stbar button", "Special"));
  await flush();
  const kickRow = $$("tbody tr").find((r) => r.textContent.indexOf("Jordan") >= 0);
  ok("kick and kick yards credited", kickRow &&
    kickRow.querySelectorAll("td")[1].textContent === "1" && kickRow.querySelectorAll("td")[2].textContent === "35");
  ok("field goal counted made and attempted", kickRow && kickRow.querySelectorAll("td")[5].textContent === "1/1");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\npenalties");
  ok("board shows 5 plays before the flag", $(".dd-sub").textContent.indexOf("5 plays") >= 0);
  click(byText(".abtn", "Flag"));
  await flush();
  const whoSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Who was flagged");
  ok("penalty sheet opened", !!whoSel);
  const jWho = Array.from(whoSel.options).find((o) => o.textContent.indexOf("Jordan") >= 0);
  sSetter.call(whoSel, jWho.value);
  whoSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  const kindSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Penalty type");
  const holdOpt = Array.from(kindSel.options).find((o) => o.textContent.indexOf("Holding — offense") >= 0);
  sSetter.call(kindSel, holdOpt.value);
  kindSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  const penYds = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Penalty yards");
  ok("penalty type preset its yardage", penYds && penYds.value === "10");
  click(byText(".opt", "The ball side"));
  await flush();
  click(byText(".confirm", "Log the penalty"));
  await flush();
  ok("offense penalty backed the distance up", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 20") >= 0);
  ok("penalty is not counted as a play run", $(".dd-sub").textContent.indexOf("5 plays") >= 0);
  ok("penalty shows in the play log", !!byText(".logline", "Holding"));
  click(byText(".nav button", "Stats"));
  await flush();
  const jPenRow = $$("tbody tr").find((r) => r.textContent.indexOf("Jordan") >= 0);
  ok("penalty counted for the player", jPenRow && jPenRow.querySelectorAll("td")[5].textContent === "1");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\ntackle for loss and team totals");
  click(byText(".unit", "Defense"));
  await flush();
  click($$(".pcard.empty")[0].querySelector(".pc-top"));
  await flush();
  click($$(".sheet .row").find((r) => r.textContent.indexOf("Ray") >= 0));
  await flush();
  const rayCard = $$(".pcard").find((c) => c.textContent.indexOf("Ray") >= 0);
  click(rayCard.querySelector(".pc-top"));
  await flush();
  ok("tackle for loss is an option", !!byText(".opt", "Tackle for loss"));
  click(byText(".opt", "Tackle for loss"));
  await flush();
  const tflSel = $(".yardbox select");
  ok("yards-lost picker appears for TFL", !!tflSel && tflSel.options[0].textContent.indexOf("lost") >= 0);
  sSetter.call(tflSel, "4");
  tflSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("TFL backed the opponent up to 2nd & 24",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("2nd & 24") >= 0);
  click(byText(".nav button", "Stats"));
  await flush();
  const totNums = $$(".score-num").map((e) => e.textContent);
  ok("team totals show rushing, passing, and total offense",
    totNums[0] === "0" && totNums[1] === "15" && totNums[2] === "15");
  click(byText(".stbar button", "Defense"));
  await flush();
  const rayRow = $$("tbody tr").find((r) => r.textContent.indexOf("Ray") >= 0);
  ok("TFL and loss yards credited", rayRow &&
    rayRow.querySelectorAll("td")[3].textContent === "1" && rayRow.querySelectorAll("td")[5].textContent === "4");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nfumble kept");
  click(byText(".unit", "Offense"));
  await flush();
  const fumCard = $$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0);
  click(fumCard.querySelector(".pc-top"));
  await flush();
  ok("both fumble options offered", !!byText(".opt", "Fumble, lost it") && !!byText(".opt", "Fumble, kept it"));
  click(byText(".opt", "Fumble, kept it"));
  await flush();
  const fumYds = $(".yardbox select");
  sSetter.call(fumYds, "2");
  fumYds.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("kept fumble is not a turnover — down advances",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("3rd & 22") >= 0);
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".stbar button", "Offense"));
  await flush();
  const eliFumRow = $$("tbody tr").find((r) => r.textContent.indexOf("Eli") >= 0);
  ok("fumble counted without a lost ball", eliFumRow && eliFumRow.querySelectorAll("td")[7].textContent === "1");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nball spot (optional)");
  ok("no spot shown while the feature is off", $(".dd-sub").textContent.indexOf("ball on") < 0);
  click(byText(".chip", "Ball spot"));
  await flush();
  const spotSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Ball spot");
  ok("spot sheet opened", !!spotSel);
  sSetter.call(spotSel, "35");
  spotSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Set the spot"));
  await flush();
  ok("ball marked on our 35", $(".dd-sub").textContent.indexOf("ball on Our 35") >= 0);
  click($$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0).querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Ran it"));
  const spotYds = $(".yardbox select");
  sSetter.call(spotYds, "10");
  spotYds.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("a 10-yard run moved the ball to our 45", $(".dd-sub").textContent.indexOf("ball on Our 45") >= 0);

  console.log("\ntheir scores and yards allowed");
  click(byText(".unit", "Defense"));
  await flush();
  click(byText(".tick", "TD+"));
  await flush();
  ok("they-scored sheet opened", !!byText(".opt", "Touchdown"));
  const lenSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Their score length");
  ok("touchdown length picker offered", !!lenSel);
  sSetter.call(lenSel, "40");
  lenSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Put it on their side"));
  await flush();
  ok("their touchdown put 6 on their side", $$(".score-num")[1].textContent === "6");
  ok("our score unchanged", $$(".score-num")[0].textContent === "4");
  click(byText(".tick", "TD+"));
  await flush();
  click(byText(".opt", "Conversion kick"));
  await flush();
  click(byText(".confirm", "Put it on their side"));
  await flush();
  ok("their conversion kick added 2 at elementary level", $$(".score-num")[1].textContent === "8");
  const defCard = $$(".pcard").find((c) => c.textContent.indexOf("Ray") >= 0);
  click(defCard.querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Tackle"));
  await flush();
  ok("defensive tackle asks for their gain", $(".yardbox").textContent.indexOf("Their gain") >= 0);
  const gainSel = $(".yardbox select");
  sSetter.call(gainSel, "7");
  gainSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("their 7-yard gain moves the sticks to 2nd & 3",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("2nd & 3") >= 0);
  click(byText(".nav button", "Stats"));
  await flush();
  const teamNums = $$(".score-num").map((e) => e.textContent);
  ok("yards allowed totals their gains minus their losses", teamNums[5] === "43");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nedit a past play");
  click($(".logline [aria-label='Edit this play']"));
  await flush();
  const yEdit = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Yards");
  ok("edit sheet opens with the play's current yards", !!yEdit && yEdit.value === "7");
  sSetter.call(yEdit, "2");
  yEdit.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  ok("edited yards recompute down and distance",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("2nd & 8") >= 0);
  click(byText(".nav button", "Stats"));
  await flush();
  ok("yards allowed recomputed after the edit", $$(".score-num")[5].textContent === "38");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\ntheir punt");
  click(byText(".tick", "TD+"));
  await flush();
  ok("punt option offered on their play sheet", !!byText(".opt", "Punt — no return"));
  click(byText(".opt", "Punt — no return"));
  await flush();
  const puntSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Their score length");
  sSetter.call(puntSel, "30");
  puntSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the punt"));
  await flush();
  ok("their punt gives us 1st & 10", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 10") >= 0);
  ok("board flips us to offense", byText(".unit", "Offense").className.indexOf("on") >= 0);
  const puntLine = byText(".logline", "punt");
  ok("punt logged with its distance", !!puntLine && puntLine.textContent.indexOf("30 yd") >= 0);
  click(byText(".nav button", "Stats"));
  await flush();
  ok("punt yards don't count as yards allowed", $$(".score-num")[5].textContent === "38");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\ndefending their try");
  click(byText(".tick", "TD+"));
  await flush();
  ok("failed-try options offered", !!byText(".opt", "Try stopped") && !!byText(".opt", "Kick blocked"));
  click(byText(".opt", "Kick blocked"));
  await flush();
  const credSel = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Who gets the credit");
  ok("credit picker offered", !!credSel);
  const nicoOpt = Array.from(credSel.options).find((o) => o.textContent.indexOf("Nico") >= 0);
  sSetter.call(credSel, nicoOpt.value);
  credSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the stop"));
  await flush();
  ok("their score unchanged after the block", $$(".score-num")[1].textContent === "8");
  ok("block shows in the play log", !!byText(".logline", "blocked the kick"));
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".stbar button", "Special"));
  await flush();
  const nicoRow = $$("tbody tr").find((r) => r.textContent.indexOf("Nico") >= 0);
  ok("blocked kick credited", nicoRow && nicoRow.querySelectorAll("td")[7].textContent === "1");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nreturn yards split by team");
  click(byText(".unit", "Special"));
  await flush();
  click(byText(".stbar button", "Kick return"));
  await flush();
  click($$(".pcard.empty")[0].querySelector(".pc-top"));
  await flush();
  click($$(".sheet .row").find((r) => r.textContent.indexOf("Jordan") >= 0));
  await flush();
  click($$(".pcard").find((c) => c.textContent.indexOf("Jordan") >= 0).querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Returned it"));
  await flush();
  const krSel = $(".yardbox select");
  sSetter.call(krSel, "25");
  krSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  click(byText(".stbar button", "Punt return"));
  await flush();
  click($$(".pcard.empty")[0].querySelector(".pc-top"));
  await flush();
  click($$(".sheet .row").find((r) => r.textContent.indexOf("Eli") >= 0));
  await flush();
  click($$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0).querySelector(".pc-top"));
  await flush();
  click(byText(".opt", "Returned it"));
  await flush();
  const prSel = $(".yardbox select");
  sSetter.call(prSel, "12");
  prSel.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  click(byText(".nav button", "Stats"));
  await flush();
  const splitNums = $$(".score-num").map((e) => e.textContent);
  ok("kick return yards total separately", splitNums[3] === "25");
  ok("punt return yards total separately", splitNums[4] === "12");
  ok("rushing total untouched by returns", splitNums[0] === "10");
  ok("passing total untouched by returns", splitNums[1] === "15");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nfull play history");
  const cappedCount = $$(".logline").length;
  ok("log is capped by default", cappedCount === 14);
  click(byText(".mini", "Show all"));
  await flush();
  const fullCount = $$(".logline").length;
  ok("show-all reveals the whole game", fullCount > cappedCount);
  ok("earliest plays are visible when expanded", !!byText(".logline", "caught"));
  click(byText(".mini", "Show recent"));
  await flush();
  ok("log collapses back to recent plays", $$(".logline").length === 14);

  console.log("\nfailed conversion try");
  const tryCard = $$(".pcard").find((c) => c.textContent.indexOf("Eli") >= 0);
  click(tryCard.querySelector(".pc-top"));
  await flush();
  ok("conversion failed is an option", !!byText(".opt", "Conversion failed"));
  const ddBeforeTry = $(".dd-main").textContent;
  click(byText(".opt", "Conversion failed"));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("failed try leaves down & distance alone", $(".dd-main").textContent === ddBeforeTry);
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".stbar button", "Special"));
  await flush();
  const eliTryRow = $$("tbody tr").find((r) => r.textContent.indexOf("Eli") >= 0);
  ok("failed try charged the attempt", eliTryRow && eliTryRow.querySelectorAll("td")[6].textContent === "1/2");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nend of quarter and half");
  click(byText(".chip", "Q1"));
  await flush();
  ok("quarter sheet opened", !!byText(".confirm", "End quarter 1"));
  click(byText(".confirm", "End quarter 1"));
  await flush();
  ok("quarter advanced to Q2", !!byText(".chip", "Q2"));
  click(byText(".chip", "2nd"));
  await flush();
  click(byText(".chip", "Q2"));
  await flush();
  click(byText(".confirm", "End the half"));
  await flush();
  ok("second half starts in Q3", !!byText(".chip", "Q3"));
  ok("halftime resets the board to 1st & 10",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 10") >= 0);
  click(byText(".chip", "Q3"));
  await flush();
  ok("a mis-tap can go back a quarter", !!byText(".abtn", "Go back to quarter 2"));
  click(byText(".close", "Done"));
  await flush();

  console.log("\nfix a quarter after the fact");
  click($(".logline [aria-label='Edit this play']"));
  await flush();
  const qFix = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Quarter");
  ok("unmarked play inherits its quarter", !!qFix && qFix.value === "auto");
  sSetter.call(qFix, "2");
  qFix.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  ok("quarter boundary appears at the corrected play", !!byText(".logline + .eyebrow, .eyebrow", "Quarter 1") ||
    $$(".eyebrow").some((e) => e.textContent.trim() === "Quarter 1"));

  console.log("\nre-assert and clear a quarter mark");
  click($(".logline [aria-label='Edit this play']"));
  await flush();
  const qSame = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Quarter");
  ok("marked play shows its mark in the picker", !!qSame && qSame.value === "2");
  sSetter.call(qSame, "2");
  qSame.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  ok("re-saving the mark keeps the boundary",
    $$(".eyebrow").some((e) => e.textContent.trim() === "Quarter 1"));
  click($(".logline [aria-label='Edit this play']"));
  await flush();
  const qClr = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Quarter");
  sSetter.call(qClr, "auto");
  qClr.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  ok("clearing the mark removes the boundary",
    !$$(".eyebrow").some((e) => e.textContent.trim() === "Quarter 1"));

  console.log("\nedit a play into their punt");
  click($(".logline [aria-label='Edit this play']"));
  await flush();
  const actEdit = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "What happened");
  const tpOpt = Array.from(actEdit.options).find((o) => o.textContent.indexOf("Their punt") >= 0);
  ok("their-punt option available in the editor", !!tpOpt);
  sSetter.call(actEdit, tpOpt.value);
  actEdit.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  const tpYds = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Yards");
  sSetter.call(tpYds, "20");
  tpYds.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  const convertedLine = byText(".logline", "punt — no return");
  ok("play converted to their 20-yard punt", !!convertedLine && convertedLine.textContent.indexOf("20 yd") >= 0);
  ok("possession flipped to us at 1st & 10", $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("1st & 10") >= 0);

  console.log("\ninsert a missed play");
  click($$(".logline [aria-label='Add a missed play after this one']")[2]);
  await flush();
  const insUnit = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Unit");
  ok("insert sheet opened", !!insUnit);
  sSetter.call(insUnit, "offense");
  insUnit.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  const insPlayer = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Player");
  const nicoIns = Array.from(insPlayer.options).find((o) => o.textContent.indexOf("Nico") >= 0);
  sSetter.call(insPlayer, nicoIns.value);
  insPlayer.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  const insYards = $$(".sheet select").find((s) => s.getAttribute("aria-label") === "Yards");
  sSetter.call(insYards, "8");
  insYards.dispatchEvent(new w.Event("change", { bubbles: true }));
  await flush();
  click(byText(".confirm", "Add the play"));
  await flush();
  const nicoLine = byText(".logline", "Nico");
  ok("missed play slotted into the sequence", !!nicoLine && nicoLine.textContent.indexOf("ran 8 yd") >= 0);
  ok("inserted play is not the latest line", $$(".logline")[0].textContent.indexOf("Nico") < 0);

  console.log("\nfix who was on the field");
  click(byText(".logline", "Nico").querySelector("[aria-label='Edit this play']"));
  await flush();
  const fieldChips = $$(".sheet .mini");
  ok("on-field chips offered in the editor", fieldChips.length >= 5);
  ok("credited player pre-counted",
    fieldChips.some((b) => b.className.indexOf("dark") >= 0 && b.textContent.indexOf("Nico") >= 0));
  click(fieldChips.find((b) => b.textContent.indexOf("Sam") >= 0));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  click(byText(".logline", "Nico").querySelector("[aria-label='Edit this play']"));
  await flush();
  ok("added teammate's snap saved",
    $$(".sheet .mini").some((b) => b.className.indexOf("dark") >= 0 && b.textContent.indexOf("Sam") >= 0));
  click(byText(".close", "Cancel"));
  await flush();

  console.log("\nassists on the same play");
  click(byText(".mini", "Show all"));
  await flush();
  const rayTackleLine = $$(".logline").find((l) =>
    l.textContent.indexOf("Ray") >= 0 && l.textContent.indexOf("tackle") >= 0);
  click(rayTackleLine.querySelector("[aria-label='Edit this play']"));
  await flush();
  ok("assist picker offered on a tackle", !!byText(".eyebrow", "Assisted by"));
  click($$(".sheet .mini").find((b) => b.textContent.indexOf("Eli") >= 0));
  await flush();
  click(byText(".confirm", "Save the fix"));
  await flush();
  ok("assist shows on the play line", !!$$(".logline").find((l) =>
    l.textContent.indexOf("Ray") >= 0 && l.textContent.indexOf("assist #44") >= 0));
  click(byText(".nav button", "Stats"));
  await flush();
  click(byText(".stbar button", "Defense"));
  await flush();
  const eliDefRow = $$("tbody tr").find((r) => r.textContent.indexOf("Eli") >= 0);
  ok("assist credited to the teammate", eliDefRow && eliDefRow.querySelectorAll("td")[2].textContent === "1");
  click(byText(".nav button", "Game"));
  await flush();

  console.log("\nreorder a play");
  ok("moved play starts away from the top", $$(".logline")[0].textContent.indexOf("Nico") < 0);
  click(byText(".logline", "Nico").querySelector("[aria-label='Move this play in the sequence']"));
  await flush();
  ok("move banner shown", !!byText(".banner", "Moving a play"));
  click($$(".logline")[0]);
  await flush();
  ok("play moved to its new spot in the order", $$(".logline")[0].textContent.indexOf("Nico") >= 0);

  console.log("\npersistence");
  ok("ops saved to localStorage", !!store["sideline.solo.ops"] && JSON.parse(store["sideline.solo.ops"]).length > 3);
  ok("roster saved to localStorage", JSON.parse(store["sideline.solo.squad"]).roster.length === 5);

  console.log("\n" + (failed ? failed + " FAILURES" : "all checks passed"));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("\nCRASH:", e && e.stack || e); process.exit(1); });
