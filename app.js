const STORE = "ichigo-techou-v3";
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

function load() {
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
  const rank = { S: 6, A: 5, B: 4, C: 3, "C-": 2.5, "D+": 2, D: 1 };
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
    ["品牌", s.brand], ["產地", s.origin], ["容量", s.volume],
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
  f.id.value = d.id;
  f.name.value = d.name;
  f.brand.value = d.brand;
  f.origin.value = d.origin;
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
      extra: f.comp_extra.value.trim()
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

function persistForm(e) {
  e.preventDefault();
  const item = readForm();
  if (!item.name) { alert("請至少填產品名稱"); return; }
  const i = state.data.samples.findIndex(s => s.id === item.id);
  if (i >= 0) state.data.samples[i] = item;
  else state.data.samples.push(item);
  save();
  renderAll();
  openDetail(item.id);
}

function deleteCurrent() {
  if (!state.currentId) return;
  if (!confirm("確定從手札刪除 " + state.currentId + "？")) return;
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
  const title = s.title || "苺星密報";
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
  state.data.site.title = ($("#site-title")?.value || "").trim() || "苺星密報";
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
  const expect = (state.data.site && state.data.site.adminCode) || "苺星指揮";
  if (code && code.trim() === expect) {
    setOfficer(true);
    alert("權限已開。這裡改的內容只在你這部裝置。要讓大家看到，請匯出 JSON，把內容更新到 data.js 再上傳。");
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
  load();
  if (isOfficer()) document.body.classList.add("is-officer");
  renderAll();
  document.querySelectorAll(".nav a[data-page]").forEach(a => {
    a.onclick = (e) => { e.preventDefault(); show(a.dataset.page); };
  });
  $("#btn-edit").onclick = toggleEdit;
  $("#btn-new").onclick = () => { state.formMode = "create"; fillForm(null); show("editor"); };
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
});
