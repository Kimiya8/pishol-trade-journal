Kimia Mirzaei, [12/6/2025 7:20 PM]
/* app.js — advanced trade journal with Firebase + offline fallback + charts
   - Requires: window.FIREBASE_CONFIG to be set in index.html (see README)
   - Uses Firebase compat libs loaded in index.html
   - Uses Chart.js (loaded in index.html)
*/

const $ = (id) => document.getElementById(id);

// helpers
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString();
}
function csvEscape(s) {
  if (s == null) return "";
  return ("${String(s).replace(/"/g, '""')}");
}

// PnL and R-multiple calc
function calcPnL({ entryPrice, exitPrice, size, direction, fees = 0 }) {
  entryPrice = parseFloat(entryPrice) || 0;
  exitPrice = parseFloat(exitPrice) || 0;
  size = parseFloat(size) || 0;
  fees = parseFloat(fees) || 0;
  const sign = (direction === "Long") ? 1 : -1;
  const pnl = sign * (exitPrice - entryPrice) * size - fees;
  return +pnl.toFixed(2);
}
function calcRMultiple({ entryPrice, stopLoss, exitPrice }) {
  entryPrice = parseFloat(entryPrice) || 0;
  stopLoss = parseFloat(stopLoss) || 0;
  exitPrice = parseFloat(exitPrice) || 0;
  const risk = Math.abs(entryPrice - stopLoss);
  if (!risk || risk === 0) return 0;
  const ret = Math.abs(exitPrice - entryPrice) / risk;
  return +ret.toFixed(2);
}

// Firestore paths: users/{uid}/trades
let db = null;
let auth = null;
let currentUser = null;

function initFirebase() {
  if (!window.FIREBASE_CONFIG) {
    console.warn("FIREBASE_CONFIG not provided — app will work offline (localStorage).");
    return;
  }
  firebase.initializeApp(window.FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  auth.onAuthStateChanged((u) => {
    currentUser = u;
    updateAuthUI();
    if (u) loadTradesFromServer();
    else loadTradesFromLocal();
  });
}

// LocalStorage helpers
function saveLocalTrade(trade) {
  const arr = JSON.parse(localStorage.getItem("trades") || "[]");
  arr.push(trade);
  localStorage.setItem("trades", JSON.stringify(arr));
}
function getLocalTrades() {
  return JSON.parse(localStorage.getItem("trades") || "[]");
}
function clearLocalTrades() {
  localStorage.removeItem("trades");
}

// Firestore helpers
async function saveRemoteTrade(uid, trade) {
  const col = db.collection("users").doc(uid).collection("trades");
  const res = await col.add(trade);
  return res.id;
}
async function getRemoteTrades(uid) {
  const col = db.collection("users").doc(uid).collection("trades");
  const snap = await col.orderBy("createdAt", "asc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// UI functions
function updateAuthUI() {
  if (currentUser) {
    $("btn-logout").style.display = "inline-block";
    $("btn-login").style.display = "none";
    $("btn-signup").style.display = "none";
    $("user-info").style.display = "inline-block";
    $("user-info").textContent = شما وارد شده‌اید: ${currentUser.email};
  } else {
    $("btn-logout").style.display = "none";
    $("btn-login").style.display = "inline-block";
    $("btn-signup").style.display = "inline-block";
    $("user-info").style.display = "none";
    $("user-info").textContent = "";
  }
}

// Render trades
let tradesCache = []; // array of trade objects (decrypted/unwrapped)

function renderTrades(filter = {}) {
  const out = $("trades");
  out.innerHTML = "";
  const marketFilter = filter.market || "All";
  const q = (filter.q || "").trim().toLowerCase();

  const filtered = tradesCache.filter(t => {
    if (marketFilter !== "All" && t.market !== marketFilter) return false;
    if (q) {
      const hay = ${t.asset || ""} ${t.notes || ""} ${t.strategy || ""}.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).slice().reverse();

  filtered.forEach(t => {
    const el = document.createElement("div");
    el.className = "trade-item";

Kimia Mirzaei, [12/6/2025 7:20 PM]
const left = document.createElement("div");
    left.innerHTML = <strong>${t.asset || ""}</strong> — ${t.market} — ${t.direction} — Entry:${t.entryPrice} Exit:${t.exitPrice} PnL:${t.pnl};
    const right = document.createElement("div");
    right.className = "trade-actions";
    const date = document.createElement("div");
    date.className = "muted";
    date.textContent = formatDate(t.date || t.createdAt);
    right.appendChild(date);

    // delete (local-only or remote)
    const del = document.createElement("button");
    del.textContent = "حذف";
    del.onclick = async () => {
      if (!confirm("می‌خواهی این ترید حذف شود؟")) return;
      if (currentUser && t.id && db) {
        await db.collection("users").doc(currentUser.uid).collection("trades").doc(t.id).delete();
        await loadTradesFromServer();
      } else {
        // local
        const arr = getLocalTrades().filter(x => x.createdAt !== t.createdAt);
        localStorage.setItem("trades", JSON.stringify(arr));
        loadTradesFromLocal();
      }
    };
    right.appendChild(del);

    el.appendChild(left);
    el.appendChild(right);
    out.appendChild(el);
  });

  renderStats(filtered);
  renderCharts(filtered);
}

function renderStats(arr) {
  const s = { total: arr.length, wins: 0, losses: 0, totalPnl: 0 };
  arr.forEach(t => {
    const p = parseFloat(t.pnl) || 0;
    s.totalPnl += p;
    if (p > 0) s.wins++;
    else if (p < 0) s.losses++;
  });
  const winRate = s.total ? Math.round((s.wins / s.total) * 100) : 0;
  $("stats").innerHTML = <div class="stats-row">
    <div>Total: ${s.total}</div>
    <div>Win rate: ${winRate}%</div>
    <div>Total P/L: ${s.totalPnl.toFixed(2)}</div>
  </div>;
}

let equityChart = null;
let winrateChart = null;

function renderCharts(arr) {
  // equity over time
  const series = [];
  let cum = 0;
  arr.slice().sort((a,b)=> (a.createdAt0) - (b.createdAt0)).forEach(t => {
    cum += parseFloat(t.pnl) || 0;
    series.push({ date: (t.date||t.createdAt).toString().split('T')[0], equity: +cum.toFixed(2) });
  });
  const labels = series.map(s => s.date || "");
  const data = series.map(s => s.equity || 0);

  const ctx = $("equityChart").getContext("2d");
  if (equityChart) equityChart.destroy();
  equityChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Equity", data, fill: false, borderColor: "#4caf50" }]},
    options: { responsive: true, maintainAspectRatio: false }
  });

  // winrate (rolling)
  const winLabels = [];
  const winData = [];
  let wins=0;
  arr.slice().sort((a,b)=> (a.createdAt0) - (b.createdAt0)).forEach((t,i) => {
    if ((parseFloat(t.pnl)||0) > 0) wins++;
    winLabels.push(t.date||t.createdAt);
    winData.push(Math.round((wins/(i+1))*100));
  });
  const ctx2 = $("winrateChart").getContext("2d");
  if (winrateChart) winrateChart.destroy();
  winrateChart = new Chart(ctx2, {
    type: "line",
    data: { labels: winLabels, datasets: [{ label: "Win rate %", data: winData, fill:false, borderColor: "#2196f3" }]},
    options: { responsive: true, maintainAspectRatio: false, scales:{ y:{ beginAtZero:true, max:100 }} }
  });
}

// load local trades
function loadTradesFromLocal() {
  tradesCache = getLocalTrades().map(t => {
    // ensure fields
    return { ...t };
  });
  renderTrades({ market: $("filter-market").value, q: $("search").value });
}

// load remote trades (for logged-in user)
async function loadTradesFromServer() {
  if (!currentUser || !db) { loadTradesFromLocal(); return; }
  const remote = await getRemoteTrades(currentUser.uid);
  // remote items may have encrypted or not; we assume plain objects
  tradesCache = remote.map(r => ({ ...r }));
  renderTrades({ market: $("filter-market").value, q: $("search").value });
}

// export CSV
function exportCSV(items = tradesCache) {

Kimia Mirzaei, [12/6/2025 7:20 PM]
const rows = items.map(t => [
    t.date||"",
    t.asset||"",
    t.market||"",
    t.direction||"",
    t.entryPrice||"",
    t.stopLoss||"",
    t.exitPrice||"",
    t.size||"",
    t.fees||"",
    t.pnl||"",
    t.rMultiple||"",
    t.strategy||"",
    t.tags||"",
    t.notes||""
  ]);
  const headers = ["date","asset","market","direction","entry","stopLoss","exit","size","fees","pnl","rMulti","strategy","tags","notes"];
  const csv = [headers.join(",")].concat(rows.map(r=> r.map(v => "${String(v).replace(/"/g,'""')}").join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pishol_trades.csv"; a.click();
  URL.revokeObjectURL(url);
}

// handle upload image -> base64
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// DOM wiring
function wireEvents() {
  $("btn-signup").onclick = async () => {
    const email = $("email").value.trim();
    const pass = $("password").value;
    if (!email || !pass) return alert("ایمیل و رمز را وارد کن");
    try {
      await auth.createUserWithEmailAndPassword(email, pass);
      alert("ثبت‌نام انجام شد، هم‌اکنون وارد می‌شوید.");
    } catch (e) { alert("Signup error: " + e.message); }
  };
  $("btn-login").onclick = async () => {
    const email = $("email").value.trim();
    const pass = $("password").value;
    if (!email || !pass) return alert("ایمیل و رمز را وارد کن");
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      alert("ورود موفق");
    } catch (e) { alert("Login error: " + e.message); }
  };
  $("btn-logout").onclick = async () => {
    if (!auth) return;
    await auth.signOut();
    alert("خروج انجام شد");
  };

  $("save-trade").onclick = async () => {
    // collect
    const data = {
      asset: $("asset").value.trim(),
      market: $("market").value,
      direction: $("direction").value,
      entryPrice: $("entryPrice").value,
      stopLoss: $("stopLoss").value,
      exitPrice: $("exitPrice").value,
      size: $("size").value,
      fees: $("fees").value,
      date: $("date").value || new Date().toISOString(),
      tags: $("tags").value,
      strategy: $("strategy").value,
      notes: $("notes").value,
      createdAt: Date.now()
    };
    data.pnl = calcPnL(data);
    data.rMultiple = calcRMultiple(data);

    const file = $("screenshot").files[0];
    if (file) {
      $("save-msg").textContent = "در حال آپلود اسکرین‌شات...";
      try {
        data.screenshot = await fileToBase64(file); // small images only
      } catch (e) {
        console.error(e);
      }
    }

    // save remote if logged in
    if (currentUser && db) {
      try {
        $("save-msg").textContent = "در حال ذخیره در سرور...";
        await saveRemoteTrade(currentUser.uid, data);
        $("save-msg").textContent = "ذخیره شد (سرور).";
        // reload
        await loadTradesFromServer();
      } catch (e) {
        console.error(e);
        $("save-msg").textContent = "خطا در ذخیره سرور — ذخیره محلی انجام شد.";
        saveLocalTrade(data);
        loadTradesFromLocal();
      }
    } else {
      saveLocalTrade(data);
      $("save-msg").textContent = "ذخیره محلی انجام شد.";
      loadTradesFromLocal();
    }

    // clear form
    ["asset","entryPrice","exitPrice","size","fees","tags","strategy","notes"].forEach(id => $(id).value = "");
    $("screenshot").value = "";
    setTimeout(()=> $("save-msg").textContent = "", 2500);
  };

  $("search").oninput = () => renderTrades({ market: $("filter-market").value, q: $("search").value });
  $("filter-market").onchange = () => renderTrades({ market: $("filter-market").value, q: $("search").value });

  $("export-csv").onclick = () => exportCSV(tradesCache);

Kimia Mirzaei, [12/6/2025 7:20 PM]
$("sync-now").onclick = async () => {
    if (!currentUser || !db) return alert("ابتدا وارد شوید تا سینک انجام شود.");
    // push local items to server then reload
    const local = getLocalTrades();
    if (local.length) {
      const proceed = confirm("تریدهای محلی وجود دارد — می‌خوای آن‌ها را به حساب آنلاین منتقل کنیم؟");
      if (proceed) {
        for (const t of local) {
          await saveRemoteTrade(currentUser.uid, t);
        }
        clearLocalTrades();
      }
    }
    await loadTradesFromServer();
    alert("سینک کامل شد.");
  };
}

// initialize app
(function initApp(){
  try { initFirebase(); } catch(e) { console.error("Firebase init error", e); }
  wireEvents();

  // if not logged in, show local trades
  if (!window.FIREBASE_CONFIG) {
    // still show local
    loadTradesFromLocal();
  }
})();
