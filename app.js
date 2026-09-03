const STORE = "ichigo-techou-v4";
const SCORE_KEYS = ["A1","A2","A3","A4","A5","A6","A7","A8","A9"];
const SCORE_LABELS = {
  A1: "外觀整體",
  A2: "色澤",
  A3: "香氣自然度與強度",
  A4: "草莓本味真實度與層次",
  A5: "甜酸平衡",
  A6: "乳感與草莓融合度",
  A7: "濃稠度",
  A8: "滑順細膩度",
  A9: "餘味"
};

const state = {
  data: null,
  page: "home",
  currentId: null,
  editing: false,
  formMode: "create"
};

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.samples) {
        state.data = parsed;
        return;
      }
    }
  } catch (e) {}
  state.data = structuredClone(window.ICHIGO_DEFAULTS);
}

function save() {
  localStorage.setItem(STORE, JSON.stringify(state.data));
}

function migrateBerryChar() {
  if (!state.data || !state.data.site) return;
  const s = state.data.site;
  if (s.title) s.title = String(s.title).replace(/苺/g, "莓");
  if (s.adminCode) s.adminCode = String(s.adminCode).replace(/苺/g, "莓");
  if (s.tagline) s.tagline = String(s.tagline).replace(/苺/g, "莓");
  if (Array.isArray(s.intro)) {
    s.intro = s.intro.map(line => typeof line === "string" ? line.replace(/苺/g, "莓") : line);
  }
}

function syncAuthUI() {
  const user = window.Cloud && window.Cloud.user;
  if (user) {
    document.body.classList.add("is-officer", "is-editing");
    state.editing = true;
    if ($("#auth-label")) $("#auth-label").textContent = user.email || "已登入";
    if ($("#auth-box")) $("#auth-box").classList.add("hidden");
  } else {
    if ($("#auth-label")) $("#auth-label").textContent = "";
    if ($("#auth-box")) $("#auth-box").classList.remove("hidden");
  }
}

async function bootCloud() {
  loadLocal();
  migrateBerryChar();
  save();
  if (!window.Cloud || !window.SUPABASE_ANON_KEY) {
    syncAuthUI();
    renderAll();
    return;
  }
  try {
    const ok = await window.Cloud.init();
    if (ok) {
      const rows = await window.Cloud.fetchSamples();
      if (rows && rows.length) {
        const map = {};
        (state.data.samples || []).forEach(s => { if (s && s.id) map[s.id] = s; });
        rows.forEach(r => { map[r.id] = Object.assign({}, map[r.id] || {}, r); });
        state.data.samples = Object.keys(map).sort().map(k => map[k]);
      }
    }
  } catch (err) {
    console.warn(err);
  }
  syncAuthUI();
  renderAll();
}

function avg(sample) {
  const vals = SCORE_KEYS.map(k => Number(sample.scores?.[k])).filter(n => !Number.isNaN(n));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a,b)=>a+b,0) / vals.length) * 10) / 10;
}

function colorOf(id) {
  return (state.data.colors || window.ICHIGO_DEFAULTS.colors).find(c => c.id === id);
}

function imgSrc(path) {
  if (!path) return "";
  return String(path).replace(/\\/g, "/");
}

const COUNTRIES = {
  HK: { iso: "hk", name: "香港" },
  JP: { iso: "jp", name: "日本" },
  TW: { iso: "tw", name: "台灣" },
  KR: { iso: "kr", name: "韓國" },
  CN: { iso: "cn", name: "中國大陸" },
  TH: { iso: "th", name: "泰國" },
  SG: { iso: "sg", name: "新加坡" },
  US: { iso: "us", name: "美國" },
  AU: { iso: "au", name: "澳洲" },
  NL: { iso: "nl", name: "荷蘭" },
  NZ: { iso: "nz", name: "紐西蘭" },
  GB: { iso: "gb", name: "英國" },
  FR: { iso: "fr", name: "法國" },
  DE: { iso: "de", name: "德國" },
  MY: { iso: "my", name: "馬來西亞" },
  VN: { iso: "vn", name: "越南" },
  ID: { iso: "id", name: "印尼" },
  PH: { iso: "ph", name: "菲律賓" },
  EU: { iso: "eu", name: "歐洲" },
  OT: { iso: "", name: "其他" }
};

function nationBadge(sample) {
  const g = countryOf(sample);
  if (!g) return "";
  const flag = g.iso
    ? `<img class="flag" src="https://flagcdn.com/w80/${g.iso}.png" alt="${g.name}" width="22" height="16">`
    : "";
  return `<span class="nation-badge">${flag}<b>${g.name}</b></span>`;
}

function guessCountryCode(sample) {
  const code = (sample.country || sample.composition && sample.composition.country || "").toUpperCase();
  if (COUNTRIES[code]) return code;
  const blob = [sample.origin, sample.brand, sample.name, sample.composition && sample.composition.access].filter(Boolean).join(" ");
  const rules = [
    ["AU", /澳洲|澳大利亞|Australia|Rokeby|Pauls/i],
    ["NL", /荷蘭|荷兰|Dutch Lady|子母/i],
    ["NZ", /紐西蘭|新西兰|New Zealand/i],
    ["JP", /日本|Japan|三佳利|桑格利亞|SANGARIA/i],
    ["KR", /韓國|韩国|Korea|Binggrae|빙그레/i],
    ["TW", /台灣|台湾|Taiwan/i],
    ["HK", /香港|Hong Kong|十字牌|維他/i],
    ["CN", /中國大陸|中国大陆|中國／|Mainland/i],
    ["SG", /新加坡|Singapore/i],
    ["TH", /泰國|泰国|Thailand/i],
    ["US", /美國|美国|USA|United States/i],
    ["GB", /英國|英国|UK|United Kingdom/i],
    ["FR", /法國|法国|France/i],
    ["DE", /德國|德国|Germany/i],
    ["MY", /馬來|马来|Malaysia/i],
    ["VN", /越南|Vietnam/i],
    ["ID", /印尼|Indonesia/i],
    ["PH", /菲律賓|菲律宾|Philippine/i]
  ];
  for (const [c, re] of rules) if (re.test(blob)) return c;
  return "";
}

function countryOf(sample) {
  return COUNTRIES[guessCountryCode(sample)] || null;
}

function specOf(sample) {
  const c = sample.composition || {};
  return {
    pack: sample.spec?.pack || c.pack || "",
    storage: sample.spec?.storage || c.storage || "",
    access: sample.spec?.access || c.access || "",
    value: sample.spec?.value || c.valueNote || ""
  };
}

function alienBlurb(text) {
  if (!text) return "";
  const cut = text.split("潛伏者評語")[1] || text;
  return cut.replace(/^[:：]\s*/, "").slice(0, 72);
}

function $(sel) { return document.querySelector(sel); }
function show(id) {
  state.page = id;
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("show", p.id === "page-" + id));
  document.querySelectorAll(".nav a[data-page]").forEach(a => a.classList.toggle("active", a.dataset.page === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function siteStats() {
  if (!state.data.site) state.data.site = {};
  if (!state.data.site.stats) {
    state.data.site.stats = { bestMode: "auto", bestValue: "", lastMode: "auto", lastValue: "" };
  }
  return state.data.site.stats;
}

function autoBest() {
  const rank = { S: 6, A: 5, "B+": 4.5, B: 4, "B-": 3.7, "C+": 3.5, C: 3, "C-": 2.5, "D+": 2, D: 1 };
  const grades = state.data.samples.map(s => s.grade).filter(g => rank[g]);
  return grades.sort((a, b) => rank[b] - rank[a])[0] || "—";
}

function autoLast() {
  return state.data.samples[state.data.samples.length - 1]?.id || "—";
}

function renderHome() {
  const samples = state.data.samples;
  const st = siteStats();
  const calcBest = autoBest();
  const calcLast = autoLast();
  const best = st.bestMode === "manual" && st.bestValue ? st.bestValue : calcBest;
  const last = st.lastMode === "manual" && st.lastValue ? st.lastValue : calcLast;
  $("#stat-count").textContent = samples.length;
  $("#stat-best").textContent = best;
  $("#stat-last").textContent = last;
  $("#stat-best-tag").classList.toggle("hidden", st.bestMode !== "manual");
  $("#stat-last-tag").classList.toggle("hidden", st.lastMode !== "manual");
  if ($("#best-mode")) {
    $("#best-mode").value = st.bestMode || "auto";
    $("#best-value").value = st.bestValue || "";
    $("#last-mode").value = st.lastMode || "auto";
    $("#last-value").value = st.lastValue || "";
    $("#best-auto-hint").textContent = "自動結果：" + calcBest;
    $("#last-auto-hint").textContent = "自動結果：" + calcLast;
  }
  const box = $("#card-list");
  box.innerHTML = samples.map(s => {
    const c = colorOf(s.colorId);
    return `<button class="card" data-open="${s.id}">
      ${s.image ? `<img src="${imgSrc(s.image)}" alt="${s.name}">` : `<div style="height:140px;background:${c?.hex || "#f3d0d4"}"></div>`}
      <div class="body">
        <div class="row-between"><span class="id">${s.id}</span><span class="grade ${s.grade}">${s.grade || "—"}</span></div>
        ${nationBadge(s)}
        <h3>${s.name}</h3>
        <div class="meta">${s.brand || ""} · ${s.volume || ""}</div>
        <div style="margin-top:8px" class="chip"><span class="swatch" style="background:${c?.hex || "#eee"}"></span>${s.colorId || "未定色"} · 感官 ${avg(s) ?? "—"}</div>
        ${s.alien ? `<div class="alien-line">${alienBlurb(s.alien)}</div>` : ""}
      </div>
    </button>`;
  }).join("") || `<p class="meta">還沒有樣本。開啟編輯模式後新增第一筆。</p>`;
  box.querySelectorAll("[data-open]").forEach(btn => btn.onclick = () => openDetail(btn.dataset.open));
}

function openDetail(id) {
  const s = state.data.samples.find(x => x.id === id);
  if (!s) return;
  state.currentId = id;
  const c = colorOf(s.colorId);
  const a = avg(s);
  $("#detail-title").textContent = s.name;
  $("#detail-sub").textContent = `${s.id} · ${s.brand || ""} · 征服潛力 ${s.grade || "未評"}`;
  $("#detail-photo").innerHTML = s.image
    ? `<img src="${imgSrc(s.image)}" alt="${s.name}">`
    : `<div style="height:280px;background:${c?.hex || "#f3d0d4"}"></div>`;
  $("#detail-kv").innerHTML = [
    ["品牌", s.brand],
    ["國家／地區", nationBadge(s) || s.origin],
    ["產地說明", s.origin], ["容量", s.volume],
    ["品飲日期", s.tastedOn], ["溫度", s.temp], ["售價", s.price || "未記入"],
    ["色號", `${s.colorId || "—"} ${c ? c.name : ""}`],
    ["感官均分", a ?? "—"], ["回購", s.repurchase || "—"]
  ].map(([k,v]) => `<div><b>${k}</b><span>${v || "—"}</span></div>`).join("");
  $("#detail-color-note").textContent = s.colorNote || "";
  $("#score-table").innerHTML = SCORE_KEYS.map(k => {
    const n = Number(s.scores?.[k]);
    const pct = Number.isNaN(n) ? 0 : n * 10;
    return `<tr><td>${k} ${SCORE_LABELS[k]}</td><td class="score">${Number.isNaN(n) ? "—" : n}
      <div class="bar"><i style="width:${pct}%"></i></div></td>
      <td>${s.notes?.[k] || ""}</td></tr>`;
  }).join("");
  const comp = s.composition || {};
  $("#comp-table").innerHTML = [
    ["奶源", comp.milkType], ["草莓來源", comp.strawberry],
    ["糖／100ml", comp.sugar100], ["蛋白／100ml", comp.protein100],
    ["脂肪／100ml", comp.fat100], ["熱量／100ml", comp.kcal100],
    ["添加物", comp.additives], ["備註", comp.extra]
  ].map(([k,v]) => `<tr><td>${k}</td><td>${v || "—"}</td></tr>`).join("");
  const sp = specOf(s);
  const specEl = $("#spec-table");
  if (specEl) specEl.innerHTML = [
    ["C1 容量與包裝", sp.pack],
    ["C2 保存方式", sp.storage],
    ["C3 取得難度", sp.access],
    ["C4 性價比", sp.value]
  ].map(([k,v]) => `<tr><td>${k}</td><td>${v || "—"}</td></tr>`).join("");
  $("#detail-style").textContent = s.style || "";
  $("#detail-pros").textContent = s.pros || "";
  $("#detail-cons").textContent = s.cons || "";
  $("#detail-verdict").textContent = s.verdict || "";
  $("#detail-memo").textContent = s.memo || "";
  const alienBox = $("#detail-alien");
  if (alienBox) alienBox.textContent = s.alien || "（這筆還沒寫給母星的密報。）";
  show("detail");
}

function fillForm(s) {
  const f = $("#sample-form");
  const empty = {
    id: nextId(), name: "", brand: "", origin: "", volume: "", price: "",
    boughtAt: "", tastedOn: "", temp: "冷藏", blind: false, image: "",
    colorId: "P04", colorNote: "",
    scores: Object.fromEntries(SCORE_KEYS.map(k => [k, ""])),
    notes: Object.fromEntries(SCORE_KEYS.map(k => [k, ""])),
    composition: { milkType:"", strawberry:"", sugar100:"", protein100:"", fat100:"", kcal100:"", additives:"", extra:"" },
    style: "", pros: "", cons: "", grade: "C", repurchase: "", verdict: "", memo: ""
  };
  const d = s ? structuredClone(s) : empty;
  ["spec_pack", "spec_storage", "spec_access", "spec_value"].forEach(n => {
    if (f[n]) f[n].value = "";
  });
  f.id.value = d.id;
  f.name.value = d.name;
  f.brand.value = d.brand;
  f.origin.value = d.origin;
  if (f.country) f.country.value = d.country || d.composition?.country || "HK";
  if (f.spec_pack) f.spec_pack.value = specOf(d).pack;
  if (f.spec_storage) f.spec_storage.value = specOf(d).storage;
  if (f.spec_access) f.spec_access.value = specOf(d).access;
  if (f.spec_value) f.spec_value.value = specOf(d).value;
  f.volume.value = d.volume;
  f.price.value = d.price;
  f.boughtAt.value = d.boughtAt;
  f.tastedOn.value = d.tastedOn;
  f.temp.value = d.temp;
  f.image.value = d.image || "";
  f.colorId.value = d.colorId;
  f.colorNote.value = d.colorNote;
  f.style.value = d.style;
  f.pros.value = d.pros;
  f.cons.value = d.cons;
  f.grade.value = d.grade;
  f.repurchase.value = d.repurchase;
  f.verdict.value = d.verdict;
  if (f.alien) f.alien.value = d.alien || "";
  f.memo.value = d.memo;
  SCORE_KEYS.forEach(k => {
    f["score_"+k].value = d.scores?.[k] ?? "";
    f["note_"+k].value = d.notes?.[k] ?? "";
  });
  Object.keys(d.composition || {}).forEach(k => {
    if (f["comp_"+k]) f["comp_"+k].value = d.composition[k] || "";
  });
}

function nextId() {
  const nums = state.data.samples.map(s => Number((s.id.match(/(\d+)$/) || [])[1])).filter(Boolean);
  const n = (Math.max(0, ...nums) + 1).toString().padStart(3, "0");
  return `SM-2026-${n}`;
}

function readForm() {
  const f = $("#sample-form");
  const scores = {};
  const notes = {};
  SCORE_KEYS.forEach(k => {
    const v = parseFloat(f["score_"+k].value);
    scores[k] = Number.isNaN(v) ? "" : v;
    notes[k] = f["note_"+k].value.trim();
  });
  return {
    id: f.id.value.trim() || nextId(),
    name: f.name.value.trim(),
    brand: f.brand.value.trim(),
    origin: f.origin.value.trim(),
    country: f.country ? f.country.value : "",
    volume: f.volume.value.trim(),
    price: f.price.value.trim(),
    boughtAt: f.boughtAt.value.trim(),
    tastedOn: f.tastedOn.value,
    temp: f.temp.value.trim(),
    image: f.image.value.trim(),
    colorId: f.colorId.value,
    colorNote: f.colorNote.value.trim(),
    scores, notes,
    composition: {
      milkType: f.comp_milkType.value.trim(),
      strawberry: f.comp_strawberry.value.trim(),
      sugar100: f.comp_sugar100.value.trim(),
      protein100: f.comp_protein100.value.trim(),
      fat100: f.comp_fat100.value.trim(),
      kcal100: f.comp_kcal100.value.trim(),
      additives: f.comp_additives.value.trim(),
      extra: f.comp_extra.value.trim(),
      country: f.country ? f.country.value : "",
      pack: f.spec_pack ? f.spec_pack.value.trim() : "",
      storage: f.spec_storage ? f.spec_storage.value.trim() : "",
      access: f.spec_access ? f.spec_access.value.trim() : "",
      valueNote: f.spec_value ? f.spec_value.value.trim() : ""
    },
    style: f.style.value.trim(),
    pros: f.pros.value.trim(),
    cons: f.cons.value.trim(),
    grade: f.grade.value,
    repurchase: f.repurchase.value.trim(),
    verdict: f.verdict.value.trim(),
    alien: f.alien ? f.alien.value.trim() : "",
    memo: f.memo.value.trim()
  };
}

async function persistForm(e) {
  e.preventDefault();
  const item = readForm();
  if (!item.name) { alert("請至少填產品名稱"); return; }
  const file = $("#sample-form").photoFile && $("#sample-form").photoFile.files[0];
  try {
    if (file && window.Cloud && window.Cloud.ready && window.Cloud.user) {
      item.image = await window.Cloud.uploadPhoto(item.id, file);
    }
    if (window.Cloud && window.Cloud.ready && window.Cloud.user) {
      await window.Cloud.upsertSample(item);
    }
  } catch (err) {
    alert("雲端儲存失敗：" + (err.message || err) + "。請確認已登入，且後台表格已建好。");
    return;
  }
  const i = state.data.samples.findIndex(s => s.id === item.id);
  if (i >= 0) state.data.samples[i] = item;
  else state.data.samples.push(item);
  save();
  renderAll();
  openDetail(item.id);
}

async function deleteCurrent() {
  if (!state.currentId) return;
  if (!confirm("確定從手札刪除 " + state.currentId + "？")) return;
  try {
    if (window.Cloud && window.Cloud.ready && window.Cloud.user) {
      await window.Cloud.deleteSample(state.currentId);
    }
  } catch (err) {
    alert("雲端刪除失敗：" + (err.message || err));
    return;
  }
  state.data.samples = state.data.samples.filter(s => s.id !== state.currentId);
  save();
  renderAll();
  show("home");
}

function renderPalette() {
  $("#palette").innerHTML = (state.data.colors || []).map(c =>
    `<div class="pal"><div class="c" style="background:${c.hex}"></div>
     <div class="t"><b>${c.id} ${c.name}</b><br>${c.hex}<br>${c.note}</div></div>`
  ).join("");
  const sel = $("#sample-form").colorId;
  sel.innerHTML = (state.data.colors || []).map(c => `<option value="${c.id}">${c.id} ${c.name}</option>`).join("");
}

function renderCompare() {
  const sel1 = $("#cmp-a"), sel2 = $("#cmp-b");
  const opts = state.data.samples.map(s => `<option value="${s.id}">${s.id} ${s.name}</option>`).join("");
  const keepA = sel1.value, keepB = sel2.value;
  sel1.innerHTML = opts; sel2.innerHTML = opts;
  if (state.data.samples[0]) sel1.value = keepA || state.data.samples[0].id;
  if (state.data.samples[1]) sel2.value = keepB || state.data.samples[1].id;
  paintCompare();
}

function paintCompare() {
  const a = state.data.samples.find(s => s.id === $("#cmp-a").value);
  const b = state.data.samples.find(s => s.id === $("#cmp-b").value);
  if (!a || !b) { $("#compare-out").innerHTML = ""; return; }
  const row = (label, va, vb) => `<tr><td>${label}</td><td>${va ?? "—"}</td><td>${vb ?? "—"}</td></tr>`;
  $("#compare-out").innerHTML = `<table>
    <tr><th></th><th>${a.id}</th><th>${b.id}</th></tr>
    ${row("名稱", a.name, b.name)}
    ${row("評級", a.grade, b.grade)}
    ${row("感官均分", avg(a), avg(b))}
    ${SCORE_KEYS.map(k => row(k + " " + SCORE_LABELS[k], a.scores?.[k], b.scores?.[k])).join("")}
    ${row("一句話", a.verdict, b.verdict)}
  </table>`;
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ichigo-techou-backup.json";
  a.click();
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.samples) throw new Error("格式不正確");
      state.data = parsed;
      save();
      renderAll();
      show("home");
      alert("已匯入手札。");
    } catch (e) { alert("無法讀取這個檔案"); }
  };
  reader.readAsText(file);
}

function resetDefaults() {
  if (!confirm("這會覆蓋你在這個瀏覽器裡改過的內容，確定還原成預設兩筆樣本？")) return;
  state.data = structuredClone(window.ICHIGO_DEFAULTS);
  save();
  renderAll();
  show("home");
}

function applyBranding() {
  const s = state.data.site || {};
  const title = String(s.title || "莓星密報").replace(/苺/g, "莓");
  if (s.title) s.title = title;
  const en = s.enTitle || "BERRY DISPATCH";
  const tag = s.tagline || "";
  document.title = title;
  if ($("#brand-title")) $("#brand-title").textContent = title;
  if ($("#brand-en")) $("#brand-en").textContent = en;
  if ($("#hero-title")) $("#hero-title").textContent = title;
  if ($("#hero-tag")) $("#hero-tag").innerHTML = tag.replace(/\n/g, "<br>");
  if ($("#foot-title")) $("#foot-title").textContent = title;
  if ($("#site-title")) $("#site-title").value = title;
  if ($("#site-en")) $("#site-en").value = en;
  if ($("#site-tag")) $("#site-tag").value = tag;
}

function saveStats() {
  const st = siteStats();
  st.bestMode = $("#best-mode").value;
  st.bestValue = $("#best-value").value;
  st.lastMode = $("#last-mode").value;
  st.lastValue = $("#last-value").value.trim();
  state.data.site.title = ($("#site-title")?.value || "").trim() || "莓星密報";
  state.data.site.enTitle = ($("#site-en")?.value || "").trim();
  state.data.site.tagline = ($("#site-tag")?.value || "").trim();
  save();
  applyBranding();
  renderHome();
}

function isOfficer() {
  return sessionStorage.getItem("ichigo-officer") === "1";
}

function setOfficer(on) {
  if (on) sessionStorage.setItem("ichigo-officer", "1");
  else sessionStorage.removeItem("ichigo-officer");
  document.body.classList.toggle("is-officer", on);
  if (!on) {
    state.editing = false;
    document.body.classList.remove("is-editing");
    if ($("#btn-edit")) {
      $("#btn-edit").textContent = "開啟權限";
      $("#btn-edit").classList.remove("edit-on");
    }
  }
}

function tryUnlock() {
  if (isOfficer()) {
    setOfficer(false);
    alert("已關閉指揮權限。訪客看到的仍是公開閱讀版。");
    return;
  }
  const code = prompt("輸入潛伏者密語");
  const expect = (state.data.site && state.data.site.adminCode) || "莓星指揮";
  if (code && ["莓星指揮", "苺星指揮", expect].includes(code.trim())) {
    setOfficer(true);
    state.editing = true;
    document.body.classList.add("is-editing");
    if ($("#btn-edit")) {
      $("#btn-edit").textContent = "關閉權限";
      $("#btn-edit").classList.add("edit-on");
    }
    alert("權限已開。右上「＋ 登錄標本」可寫新測評。這台瀏覽器看得到；要讓所有人看到，還要把更新後的 data.js 傳到 GitHub。");
  } else if (code !== null) {
    alert("密語不正確。");
  }
}

function toggleEdit() {
  if (!isOfficer()) {
    tryUnlock();
    if (!isOfficer()) return;
  }
  state.editing = !state.editing;
  document.body.classList.toggle("is-editing", state.editing);
  $("#btn-edit").textContent = state.editing ? "關閉權限" : "開啟權限";
  $("#btn-edit").classList.toggle("edit-on", state.editing);
}

function renderAll() {
  applyBranding();
  renderHome();
  renderPalette();
  renderCompare();
}

window.addEventListener("DOMContentLoaded", () => {
  bootCloud();
  if (isOfficer()) document.body.classList.add("is-officer");
  document.querySelectorAll(".nav a[data-page]").forEach(a => {
    a.onclick = (e) => { e.preventDefault(); show(a.dataset.page); };
  });
  $("#btn-edit").onclick = toggleEdit;
  const openNew = () => { state.formMode = "create"; fillForm(null); show("editor"); };
  $("#btn-new").onclick = openNew;
  if ($("#btn-new-nav")) $("#btn-new-nav").onclick = openNew;
  $("#btn-edit-current").onclick = () => {
    const s = state.data.samples.find(x => x.id === state.currentId);
    if (!s) return;
    state.formMode = "edit";
    fillForm(s);
    show("editor");
  };
  $("#btn-delete").onclick = deleteCurrent;
  $("#sample-form").onsubmit = persistForm;
  $("#cmp-a").onchange = paintCompare;
  $("#cmp-b").onchange = paintCompare;
  $("#btn-export").onclick = exportJson;
  $("#btn-reset").onclick = resetDefaults;
  if ($("#btn-save-stats")) $("#btn-save-stats").onclick = saveStats;
  if ($("#btn-gate")) $("#btn-gate").onclick = tryUnlock;
  $("#file-import").onchange = (e) => {
    const f = e.target.files[0];
    if (f) importJson(f);
    e.target.value = "";
  };
  if ($("#btn-login")) $("#btn-login").onclick = async () => {
    const email = $("#auth-email").value.trim();
    const pass = $("#auth-pass").value;
    if (!email || !pass) { alert("請填電郵和密碼"); return; }
    try {
      await window.Cloud.signIn(email, pass);
      syncAuthUI();
      alert("已登入。現在新增的標本會存到共用後台。");
    } catch (err) {
      alert("登入失敗：" + (err.message || err));
    }
  };
  if ($("#btn-signup")) $("#btn-signup").onclick = async () => {
    alert("請讓站長在 Supabase → Authentication → Users 先開好帳號，再用電郵密碼登入。");
  };
  if ($("#btn-logout")) $("#btn-logout").onclick = async () => {
    if (window.Cloud) await window.Cloud.signOut();
    setOfficer(false);
    syncAuthUI();
  };
});
