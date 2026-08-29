/* Check that two coaches' independent op streams merge into one correct game. */
const fs=require("fs"),path=require("path"),{JSDOM}=require("jsdom");
const root=path.join(__dirname,"..");
const dom=new JSDOM("<div id=root></div>",{runScripts:"outside-only",url:"https://example.test/"});
const w=dom.window;
const store={};
Object.defineProperty(w,"localStorage",{value:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}}});
w.eval(fs.readFileSync(path.join(root,"config.js"),"utf8"));
w.eval(fs.readFileSync(path.join(root,"vendor/react.production.min.js"),"utf8"));
w.eval(fs.readFileSync(path.join(root,"vendor/react-dom.production.min.js"),"utf8"));
w.eval(fs.readFileSync(path.join(root,"vendor/supabase.min.js"),"utf8"));
w.eval(fs.readFileSync(path.join(root,"app.js"),"utf8"));

let failed=0; const ok=(n,c)=>{console.log((c?"  ok   ":"  FAIL ")+n); if(!c)failed++;};
const merge=(...streams)=>[].concat(...streams).sort((a,b)=>a.ts-b.ts||(a.id<b.id?-1:1));

// Head coach logs offense; assistant logs defense. Interleaved timestamps.
const head=[
  {id:"a1",ts:1000,by:"head",type:"play",unit:"offense",playerId:"p1",action:"rush",yards:4,snaps:["p1","p2"]},
  {id:"a3",ts:3000,by:"head",type:"play",unit:"offense",playerId:"p1",action:"rush",yards:8,snaps:["p1","p2"]},
  {id:"a5",ts:5000,by:"head",type:"play",unit:"offense",playerId:"p2",action:"catch",yards:20,score:"td",snaps:["p1","p2"]},
];
const asst=[
  {id:"b2",ts:2000,by:"asst",type:"adj",team:"them",delta:6},
  {id:"b4",ts:4000,by:"asst",type:"sub",unit:"offense",stKey:null,slotId:"s1",playerId:"p3"},
];

const g=w.fold(merge(head,asst));
console.log("\nmerged game");
ok("all 3 offensive plays survived the merge", g.plays.length===3);
ok("plays are in wall-clock order", g.plays.map(p=>p.id).join()==="a1,a3,a5");
ok("our touchdown scored 6", g.us===6);
ok("their score from the assistant applied", g.them===6);
ok("the assistant's sub is in the lineup", g.swaps.offense.u.s1==="p3");
ok("down reset after the touchdown", g.down===1&&g.distance===10);

const t=w.tally(g.plays);
ok("p1 credited 3 snaps", t.p1.snaps===3);
ok("p1 rushing yards add up", t.p1.rushY===12);
ok("p2 credited the touchdown", t.p2.td===1);

// The same events arriving in a different order must produce the same game.
const g2=w.fold(merge(asst,head));
ok("merge is order-independent", JSON.stringify(g2.plays)===JSON.stringify(g.plays)&&g2.us===g.us);

// One coach undoes the other's play.
const withUndo=merge(head,asst,[{id:"b6",ts:6000,by:"asst",type:"undo",targets:["a5"]}]);
const g3=w.fold(withUndo);
ok("either coach can undo any play", g3.plays.length===2&&g3.us===0);

// A late-arriving op from a phone that was offline slots into the right place.
const late=[{id:"a2",ts:1500,by:"head",type:"play",unit:"offense",playerId:"p2",action:"rush",yards:1,snaps:["p2"]}];
const g4=w.fold(merge(head,asst,late));
ok("a late upload lands in time order", g4.plays.map(p=>p.id).join()==="a1,a2,a3,a5");

console.log("\n"+(failed?failed+" FAILURES":"all checks passed"));
process.exit(failed?1:0);
