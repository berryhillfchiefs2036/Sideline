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

  console.log("\ngame — logging a play");
  click(byText(".nav button", "Game"));
  await flush();
  const cards = $$(".pcard");
  ok("11 position cards on the field", cards.length === 11);
  const qbCard = cards.find((c) => c.textContent.indexOf("Jordan") >= 0);
  ok("QB card shows the starter", !!qbCard);
  click(qbCard.querySelector(".pc-top"));
  await flush();
  ok("play sheet opened", !!$(".sheet"));
  click(byText(".opt", "Ran it"));
  await flush();
  for (let i = 0; i < 2; i++) click(byText(".yardrow button", "+5"));
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
  click(byText(".yardrow button", "+1"));
  await flush();
  click(byText(".confirm", "Log the play"));
  await flush();
  ok("1 yard on 1st & 10 becomes 2nd & 9",
    $(".dd-main").textContent.replace(/\s+/g, " ").indexOf("2nd & 9") >= 0);

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

  console.log("\npersistence");
  ok("ops saved to localStorage", !!store["sideline.solo.ops"] && JSON.parse(store["sideline.solo.ops"]).length > 3);
  ok("roster saved to localStorage", JSON.parse(store["sideline.solo.squad"]).roster.length === 5);

  console.log("\n" + (failed ? failed + " FAILURES" : "all checks passed"));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("\nCRASH:", e && e.stack || e); process.exit(1); });
