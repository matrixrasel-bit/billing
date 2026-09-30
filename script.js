// ===== এখানে বদলাতে পারবেন =====
const CUR = "₩"; // টাকা হলে "৳" লিখুন
const EXP_CATS = ["Health insurance", "Gas bill", "Electricity bill", "Mobile bill", "Online subscription", "Additional / অন্যান্য খরচ"];
const INC_TYPES = ["Part-time (Restaurant)", "Allowance / বাসা থেকে", "Scholarship", "অন্যান্য আয়"];
// ================================
const $ = id => document.getElementById(id);
const DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const WEEKS = ["১ম সপ্তাহ (১–৭)", "২য় সপ্তাহ (৮–১৪)", "৩য় সপ্তাহ (১৫–২১)", "৪র্থ সপ্তাহ (২২–২৮)", "৫ম সপ্তাহ (২৯–৩১)"];
const PT = INC_TYPES[0];

let data = { income: [], expense: [] };
try { const d = JSON.parse(localStorage.getItem("fin_data")); if (d) data = d; } catch (e) {}
const save = () => { try { localStorage.setItem("fin_data", JSON.stringify(data)); } catch (e) {} };

const pad = n => String(n).padStart(2, "0");
const today = () => { const n = new Date(); return n.getFullYear() + "-" + pad(n.getMonth() + 1) + "-" + pad(n.getDate()); };
let ym = today().slice(0, 7);

const money = n => CUR + Math.round(n).toLocaleString("en-US");
const mins = t => { const [h, m] = t.split(":"); return +h * 60 + +m; };
const t12 = t => { const h = +t.split(":")[0]; return (h % 12 || 12) + ":" + t.split(":")[1] + " " + (h >= 12 ? "PM" : "AM"); };
const hours = (s, e) => { let d = mins(e) - mins(s); if (d <= 0) d += 1440; return d / 60; };
const wday = d => new Date(d + "T00:00:00").getDay();
const wk = d => Math.ceil(+d.slice(8) / 7) - 1;
const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const inMonth = a => a.filter(x => x.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date));

function fill(sel, arr) { $(sel).innerHTML = arr.map(x => `<option>${esc(x)}</option>`).join(""); }
fill("iType", INC_TYPES); fill("eCat", EXP_CATS);
$("iDate").value = $("eDate").value = today();

// ---- tabs & month ----
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("on", x === b));
  ["ov", "inc", "exp"].forEach(id => $(id).hidden = id !== b.dataset.t);
});
function shift(d) { let [y, m] = ym.split("-").map(Number); m += d; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } ym = y + "-" + pad(m); render(); }
$("prev").onclick = () => shift(-1); $("next").onclick = () => shift(1);
$("iType").onchange = () => { $("shift").hidden = $("iType").value !== PT; };

// ---- add ----
$("iAdd").onclick = () => {
  const o = { id: uid(), date: $("iDate").value, type: $("iType").value, pay: +$("iPay").value, note: $("iNote").value.trim() };
  if (!o.date || !(o.pay > 0)) return alert("তারিখ আর টাকার পরিমাণ দিন।");
  if (o.type === PT) {
    o.s = $("iS").value; o.e = $("iE").value;
    if (!o.s || !o.e) return alert("কাজের শুরু আর শেষের সময় দিন।");
  }
  data.income.push(o); save(); $("iPay").value = ""; $("iNote").value = ""; ym = o.date.slice(0, 7); render();
};
$("eAdd").onclick = () => {
  const o = { id: uid(), date: $("eDate").value, cat: $("eCat").value, amt: +$("eAmt").value, note: $("eNote").value.trim() };
  if (!o.date || !(o.amt > 0)) return alert("তারিখ আর টাকার পরিমাণ দিন।");
  data.expense.push(o); save(); $("eAmt").value = ""; $("eNote").value = ""; ym = o.date.slice(0, 7); render();
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-del]"); if (!b || !confirm("মুছে ফেলবেন?")) return;
  const k = b.dataset.k; data[k] = data[k].filter(x => x.id !== b.dataset.del); save(); render();
});

// ---- render ----
function render() {
  $("mlabel").textContent = new Date(ym + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const inc = inMonth(data.income), exp = inMonth(data.expense);
  const tin = inc.reduce((a, x) => a + x.pay, 0), tout = exp.reduce((a, x) => a + x.amt, 0);
  $("sIn").textContent = money(tin); $("sOut").textContent = money(tout);
  $("sBal").textContent = money(tin - tout); $("sBal").className = tin - tout >= 0 ? "pos" : "neg";

  // খরচের খাত
  const by = {}; EXP_CATS.forEach(c => by[c] = 0); exp.forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amt);
  const mx = Math.max(1, ...Object.values(by));
  $("cats").innerHTML = Object.keys(by).map(c => `<div class="bar"><span class="n">${esc(c)}</span><span class="t"><i style="width:${by[c] / mx * 100}%"></i></span><span class="v">${money(by[c])}</span></div>`).join("");

  // Restaurant
  const sh = inc.filter(x => x.type === PT);
  if (!sh.length) $("rest").innerHTML = '<p class="empty">এই মাসে কোনো part-time কাজ যোগ করা হয়নি।</p>';
  else {
    const th = sh.reduce((a, x) => a + hours(x.s, x.e), 0), tp = sh.reduce((a, x) => a + x.pay, 0);
    const grp = (keyFn, names) => {
      const g = {}; sh.forEach(x => { const k = keyFn(x.date); g[k] = g[k] || { n: 0, h: 0, p: 0 }; g[k].n++; g[k].h += hours(x.s, x.e); g[k].p += x.pay; });
      return Object.keys(g).sort((a, b) => a - b).map(k => `<tr><td>${names[k]}</td><td>${g[k].n}</td><td>${+g[k].h.toFixed(1)}</td><td>${money(g[k].p)}</td></tr>`).join("");
    };
    const head = "<tr><th>কখন</th><th>বার</th><th>ঘণ্টা</th><th>পেয়েছেন</th></tr>";
    $("rest").innerHTML = `<div class="cards"><div class="card"><small>মোট shift</small><b>${sh.length}টি</b></div><div class="card"><small>মোট সময়</small><b>${+th.toFixed(1)} ঘণ্টা</b></div><div class="card"><small>মোট পেয়েছেন</small><b class="pos">${money(tp)}</b></div></div>
      <p class="pg" style="color:var(--mute);font-size:13px">ঘণ্টা প্রতি গড়: ${money(tp / th)}</p>
      <table>${head.replace("কখন", "সপ্তাহ")}${grp(wk, WEEKS)}</table>
      <table>${head.replace("কখন", "দিন")}${grp(wday, DAYS)}</table>`;
  }

  // তালিকা
  $("iList").innerHTML = inc.length ? inc.map(x => `<div class="item"><div class="m"><b>${esc(x.type)}</b><small>${x.date} · ${DAYS[wday(x.date)]}${x.s ? " · " + t12(x.s) + "–" + t12(x.e) + " (" + +hours(x.s, x.e).toFixed(1) + " ঘণ্টা)" : ""}${x.note ? " · " + esc(x.note) : ""}</small></div><span class="a pos">+${money(x.pay)}</span><button data-k="income" data-del="${x.id}">×</button></div>`).join("") : '<p class="empty">এই মাসে কোনো আয় নেই।</p>';
  $("eList").innerHTML = exp.length ? exp.map(x => `<div class="item"><div class="m"><b>${esc(x.cat)}</b><small>${x.date} · ${DAYS[wday(x.date)]}${x.note ? " · " + esc(x.note) : ""}</small></div><span class="a neg">−${money(x.amt)}</span><button data-k="expense" data-del="${x.id}">×</button></div>`).join("") : '<p class="empty">এই মাসে কোনো খরচ নেই।</p>';
}

// ---- backup ----
$("exp_json").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  a.download = "hisab-backup.json"; a.click();
};
$("imp_json").onclick = () => $("file").click();
$("file").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (d.income && d.expense) { data = d; save(); render(); alert("Backup ফেরত এসেছে।"); } else alert("ভুল file।"); } catch (er) { alert("ভুল file।"); } };
  r.readAsText(f);
};

$("shift").hidden = false; render();
