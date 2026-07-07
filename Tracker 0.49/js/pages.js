/* ---------- STATS ---------- */

let weeklyPeriodMode = 'weekly';
window.setWeeklyPeriod = function(mode) {
  weeklyPeriodMode = mode;
  document.getElementById('weekly-btn').classList.toggle('active', mode === 'weekly');
  document.getElementById('monthly-btn').classList.toggle('active', mode === 'monthly');
  renderWeeklyChart();
};

function renderStatsLangPills() {
  const container = document.getElementById("stats-lang-pills");
  if (!container) return;
  if (statsLangFilter !== "all" && !state.languages.includes(statsLangFilter)) {
    statsLangFilter = "all";
  }
  container.innerHTML = "";
  const allPill = document.createElement("button");
  allPill.className = "lang-pill" + (statsLangFilter === "all" ? " active" : "");
  allPill.textContent = "Todos los idiomas";
  allPill.onclick = () => { statsLangFilter = "all"; renderStats(); };
  container.appendChild(allPill);
  state.languages.forEach(lang => {
    const pill = document.createElement("button");
    pill.className = "lang-pill" + (lang === statsLangFilter ? " active" : "");
    pill.textContent = lang;
    pill.onclick = () => { statsLangFilter = lang; renderStats(); };
    container.appendChild(pill);
  });
}

function renderStats() {
  renderStatsLangPills();
  renderKPIs();
  renderHeatmap();
  renderWeeklyChart();
  renderChartByType();
  renderChartByCat();
  renderChartByActivity();
  renderChartByLang();
  renderStreak();
  renderLangStreaks();
  renderBestDay();
  renderAvgDay();
}

function getAllSeconds() {
  const sessions = state.sessions.filter(s => statsMatchLang(s.lang));
  const yt = state.youtube.filter(v => statsMatchLang(v.lang));
  const shows = state.shows.filter(s => statsMatchLang(s.lang));
  const movies = state.movies.filter(m => statsMatchLang(m.lang));
  return { sessions, yt, shows, movies };
}

function buildDayMap() {
  const dayMap = {};
  const add = (ts, secs) => {
    if (!ts || !secs) return;
    const d = new Date(ts); d.setHours(0,0,0,0);
    const k = d.toDateString();
    dayMap[k] = (dayMap[k]||0) + secs;
  };
  const { sessions, yt, shows, movies } = getAllSeconds();
  sessions.forEach(s => add(s.ts, s.seconds));
  yt.forEach(v => add(v.ts, getYtEffectiveSeconds(v)));
  movies.forEach(m => add(m.ts, getMovieEffectiveSeconds(m)));
  return dayMap;
}

function renderKPIs() {
  const el = document.getElementById("kpi-row");
  if (!el) return;
  const { ytSec, showSec, movieSec, actSec, grand } = getStatsTotalSeconds();
  const dayMap = buildDayMap();
  const vals = Object.values(dayMap).filter(v=>v>0);
  const activeDays = vals.length;
  const avgSec = activeDays ? Math.round(grand / activeDays) : 0;
  const now = new Date();
  const dow = (now.getDay()+6)%7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const weekSec  = Object.entries(dayMap).filter(([k]) => new Date(k).getTime() >= weekStart).reduce((s,[,v])=>s+v,0);
  const monthSec = Object.entries(dayMap).filter(([k]) => new Date(k).getTime() >= monthStart).reduce((s,[,v])=>s+v,0);
  const yearSec  = Object.entries(dayMap).filter(([k]) => new Date(k).getTime() >= yearStart).reduce((s,[,v])=>s+v,0);
  el.innerHTML = `
    <div class="kpi-card accent">
      <div class="kpi-label">Total acumulado</div>
      <div class="kpi-value">${formatHM(grand)}</div>
      <div class="kpi-sub">${activeDays} días con actividad</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Esta semana</div>
      <div class="kpi-value">${formatHM(weekSec)}</div>
      <div class="kpi-sub">${activeDays} días con actividad</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Este mes</div>
      <div class="kpi-value">${formatHM(monthSec)}</div>
      <div class="kpi-sub">${now.toLocaleDateString('es-ES',{month:'long'})}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Este año</div>
      <div class="kpi-value">${formatHM(yearSec)}</div>
      <div class="kpi-sub">${now.getFullYear()}</div>
    </div>`;
}

function renderWeeklyChart() {
  const el = document.getElementById("weekly-chart");
  if (!el) return;
  el.innerHTML = "";
  const dayMap = buildDayMap();
  const now = new Date(); now.setHours(0,0,0,0);
  let periods = [];
  if (weeklyPeriodMode === 'weekly') {
    for (let w = 9; w >= 0; w--) {
      const day = new Date(now);
      const dow = (day.getDay()+6)%7;
      day.setDate(day.getDate() - dow - w*7);
      const start = new Date(day);
      const end = new Date(start); end.setDate(end.getDate()+6);
      let secs = 0;
      for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) {
        secs += dayMap[d.toDateString()] || 0;
      }
      const label = w===0 ? 'Esta' : `S-${w}`;
      periods.push({ label, secs, current: w===0 });
    }
  } else {
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth()-m, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth()+1, 0);
      let secs = 0;
      for (let dd=new Date(d); dd<=monthEnd; dd.setDate(dd.getDate()+1)) {
        secs += dayMap[dd.toDateString()] || 0;
      }
      const label = d.toLocaleDateString('es-ES',{month:'short'});
      periods.push({ label, secs, current: m===0 });
    }
  }
  const max = Math.max(...periods.map(p=>p.secs), 1);
  periods.forEach(p => {
    const pct = p.secs / max;
    el.innerHTML += `
      <div class="weekly-bar-wrap">
        <div class="weekly-bar-val">${p.secs > 0 ? formatHM(p.secs) : ''}</div>
        <div class="weekly-bar-track" style="flex:1;width:100%;display:flex;flex-direction:column;justify-content:flex-end;">
          <div class="weekly-bar-fill${p.current?' current':''}" style="height:${Math.round(pct*100)}%;min-height:${p.secs>0?'3px':'0'};"></div>
        </div>
        <div class="weekly-bar-label" style="${p.current?'color:var(--accent);font-weight:600':''}">${p.label}</div>
      </div>`;
  });
}

function renderChartByType() {
  const el = document.getElementById("chart-by-type");
  el.innerHTML = "";
  const { ytSec, showSec, movieSec, actSec } = getStatsTotalSeconds();
  const entries = [
    ["YouTube", ytSec, "#c0392b"],
    ["Series / animes", showSec, "#2f5d4f"],
    ["Películas", movieSec, "#2d4f8a"],
    ["Actividades", actSec, "var(--green)"],
  ].filter(([,v])=>v>0);
  if (!entries.length) { el.innerHTML = noDataMsg(); return; }
  const max = Math.max(...entries.map(([,v])=>v));
  entries.forEach(([label,secs,color]) => el.innerHTML += barRow(label, secs, max, color));
}

function renderChartByLang() {
  const el = document.getElementById("chart-by-lang");
  el.innerHTML = "";
  const langSecs = {};
  state.languages.filter(l => statsMatchLang(l)).forEach(l => langSecs[l] = 0);
  state.sessions.filter(s => statsMatchLang(s.lang)).forEach(s => { langSecs[s.lang] = (langSecs[s.lang]||0) + s.seconds; });
  state.youtube.filter(v => statsMatchLang(v.lang)).forEach(v => { langSecs[v.lang] = (langSecs[v.lang]||0) + getYtEffectiveSeconds(v); });
  state.shows.filter(s => statsMatchLang(s.lang)).forEach(s => { langSecs[s.lang] = (langSecs[s.lang]||0) + getShowSeconds(s); });
  state.movies.filter(m => statsMatchLang(m.lang)).forEach(m => { langSecs[m.lang] = (langSecs[m.lang]||0) + getMovieEffectiveSeconds(m); });
  const entries = Object.entries(langSecs).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) { el.innerHTML = noDataMsg(); return; }
  const max = entries[0][1];
  entries.forEach(([lang,secs]) => el.innerHTML += barRow(lang, secs, max, 'var(--blue)'));
}

function renderChartByCat() {
  const el = document.getElementById("chart-by-cat");
  el.innerHTML = "";
  const catSecs = {};
  const { sessions, yt, shows, movies } = getAllSeconds();
  sessions.forEach(s => { catSecs[s.cat] = (catSecs[s.cat]||0) + s.seconds; });
  yt.forEach(v => { catSecs["YouTube"] = (catSecs["YouTube"]||0) + getYtEffectiveSeconds(v); });
  shows.forEach(s => { catSecs["Series"] = (catSecs["Series"]||0) + getShowSeconds(s); });
  movies.forEach(m => { catSecs["Películas"] = (catSecs["Películas"]||0) + getMovieEffectiveSeconds(m); });
  const colors = { ...ACTIVITY_COLORS, YouTube:"#c0392b", Series:"#2f5d4f", Películas:"#2d4f8a" };
  const entries = Object.entries(catSecs).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if (!entries.length) { el.innerHTML = noDataMsg(); return; }
  const max = entries[0][1];
  entries.forEach(([cat,secs]) => el.innerHTML += barRow(cat, secs, max, colors[cat]||'var(--green)'));
}

function renderChartByActivity() {
  const el = document.getElementById("chart-by-activity");
  el.innerHTML = "";
  const { sessions, yt } = getAllSeconds();
  const actSecs = {};
  sessions.forEach(s => { actSecs[s.activityName] = (actSecs[s.activityName]||0) + s.seconds; });
  yt.forEach(v => { const name = v.activity||"YouTube"; actSecs[name] = (actSecs[name]||0) + getYtEffectiveSeconds(v); });
  const entries = Object.entries(actSecs).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if (!entries.length) { el.innerHTML = noDataMsg(); return; }
  const max = entries[0][1];
  entries.forEach(([name,secs]) => el.innerHTML += barRow(name, secs, max, 'var(--purple)'));
}

function barRow(label, secs, max, color) {
  const pct = (secs/max*100).toFixed(1);
  return `<div class="bar-row">
    <div class="bar-label" title="${label}">${label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="bar-val">${formatHM(secs)}</div>
  </div>`;
}

function noDataMsg() {
  return '<div style="font-size:13px;color:var(--ink-soft);padding:0.5rem 0;">Todavía no hay datos.</div>';
}

const STREAK_MILESTONES = [1, 7, 14, 30, 100, 180];
const STREAK_CELE_KEY = "lang-immersion-last-streak-cele";

function getMilestoneMessage(streak) {
  if (streak === 1) return { emoji: "🌟", title: "¡1 día de racha!", sub: "El primer paso es el más importante." };
  if (streak === 7) return { emoji: "🔥", title: "¡1 semana de racha!", sub: "7 días seguidos. ¡Imparable!" };
  if (streak === 14) return { emoji: "🔥", title: "¡2 semanas de racha!", sub: "14 días consecutivos. ¡Eres una máquina!" };
  if (streak === 30) return { emoji: "🎯", title: "¡1 mes de racha!", sub: "30 días seguidos. ¡Ya es un hábito!" };
  if (streak === 100) return { emoji: "💯", title: "¡100 días de racha!", sub: "100 días consecutivos. ¡Impresionante!" };
  if (streak === 180) return { emoji: "🏆", title: "¡6 meses de racha!", sub: "Medio año sin fallar ni un día." };
  if (streak > 0 && streak % 100 === 0) return { emoji: "👑", title: `¡${streak} días de racha!`, sub: `${streak} días consecutivos. ¡Eres leyenda!` };
  return null;
}

function getStreakTier(streak) {
  if (streak >= 1000) return "legendary";
  if (streak >= 100) return "milestone";
  return "basic";
}

function showStreakCelebration(streak, force) {
  const msg = getMilestoneMessage(streak);
  if (!msg) return;
  if (!force) {
    const lastCele = parseInt(localStorage.getItem(STREAK_CELE_KEY) || "0");
    if (lastCele === streak) return;
    localStorage.setItem(STREAK_CELE_KEY, streak);
  }
  document.getElementById("streak-cele-emoji").textContent = msg.emoji;
  document.getElementById("streak-cele-title").textContent = msg.title;
  document.getElementById("streak-cele-sub").textContent = msg.sub;
  const overlay = document.getElementById("streak-celebration");
  overlay.classList.remove("tier-milestone", "tier-legendary");
  const tier = getStreakTier(streak);
  if (tier === "milestone") overlay.classList.add("tier-milestone");
  if (tier === "legendary") overlay.classList.add("tier-legendary");
  overlay.classList.add("visible");
  spawnConfetti(streak);
}

function spawnConfetti(streak) {
  const container = document.getElementById("streak-confetti");
  container.innerHTML = "";
  const tier = getStreakTier(streak);
  const count = tier === "legendary" ? 250 : tier === "milestone" ? 150 : 80;
  const colors = tier === "legendary"
    ? ["#c0963c","#8f6abf","#5b80c8","#d4714e","#4a9078","#e8e2d6","#f5ecd0","#ede0f5"]
    : tier === "milestone"
    ? ["#c0963c","#8a6d2d","#d4a84a","#f5ecd0","#b3502e","#2f5d4f","#2d4f8a","#5c3d8a"]
    : ["#b3502e","#2f5d4f","#2d4f8a","#5c3d8a","#c0963c","#d4714e","#4a9078","#8f6abf"];
  const shapes = ["50%","2px","0"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "streak-confetti-piece" + (tier === "legendary" && Math.random() < 0.2 ? " star" : "");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = tier === "legendary" ? 4 + Math.random() * 10 : tier === "milestone" ? 5 + Math.random() * 8 : 5 + Math.random() * 7;
    const left = Math.random() * 100;
    const delay = Math.random() * (tier === "legendary" ? 3 : 2);
    const dur = tier === "legendary" ? 2 + Math.random() * 3 : tier === "milestone" ? 2 + Math.random() * 2.5 : 2 + Math.random() * 2;
    const borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
    Object.assign(piece.style, {
      left: left + "%", width: size + "px", height: size + "px",
      background: color, borderRadius: borderRadius,
      animationDelay: delay + "s", animationDuration: dur + "s",
    });
    container.appendChild(piece);
  }
}

function renderStreak() {
  const daySet = new Set();
  state.sessions.filter(s => statsMatchLang(s.lang)).forEach(s => daySet.add(new Date(s.ts).toDateString()));
  state.youtube.filter(v => statsMatchLang(v.lang)).forEach(v => { if (v.ts) daySet.add(new Date(v.ts).toDateString()); });
  state.shows.filter(s => statsMatchLang(s.lang)).forEach(s => { if (s.ts) daySet.add(new Date(s.ts).toDateString()); });
  state.movies.filter(m => statsMatchLang(m.lang)).forEach(m => { if (m.ts) daySet.add(new Date(m.ts).toDateString()); });
  const days = [...daySet].map(d => new Date(d)).sort((a,b) => b-a);
  let streak = 0;
  let today = new Date(); today.setHours(0,0,0,0);
  let check = new Date(today);
  if (days.length && days[0].toDateString() !== today.toDateString() && days[0].toDateString() !== new Date(today.getTime()-86400000).toDateString()) {
    streak = 0;
  } else {
    for (const d of days) {
      if (d.toDateString() === check.toDateString()) { streak++; check = new Date(check.getTime()-86400000); }
      else break;
    }
  }
  document.getElementById("streak-days").textContent = streak;
  document.getElementById("streak-label").textContent = streak === 1 ? "día consecutivo" : "días consecutivos";
  document.getElementById("streak-extra").textContent = `${daySet.size} días totales con actividad`;
  showStreakCelebration(streak);
}

function calcStreak(dates) {
  const sorted = dates.map(d => new Date(d)).sort((a,b) => b-a);
  const today = new Date(); today.setHours(0,0,0,0);
  let check = new Date(today);
  if (sorted.length && sorted[0].toDateString() !== today.toDateString() && sorted[0].toDateString() !== new Date(today.getTime()-86400000).toDateString()) return 0;
  let streak = 0;
  for (const d of sorted) {
    if (d.toDateString() === check.toDateString()) { streak++; check = new Date(check.getTime()-86400000); }
    else break;
  }
  return streak;
}

function renderLangStreaks() {
  const container = document.getElementById("per-lang-streaks");
  if (!container) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const langs = statsLangFilter !== "all" && state.languages.includes(statsLangFilter)
    ? [statsLangFilter] : state.languages;
  let entries = langs.map(lang => {
    const daySet = new Set();
    state.sessions.filter(s => s.lang === lang).forEach(s => daySet.add(new Date(s.ts).toDateString()));
    state.youtube.filter(v => v.lang === lang).forEach(v => { if (v.ts) daySet.add(new Date(v.ts).toDateString()); });
    state.shows.filter(s => s.lang === lang).forEach(s => { if (s.ts) daySet.add(new Date(s.ts).toDateString()); });
    state.movies.filter(m => m.lang === lang).forEach(m => { if (m.ts) daySet.add(new Date(m.ts).toDateString()); });
    return { lang, streak: calcStreak([...daySet]), total: daySet.size };
  }).filter(e => e.total > 0).sort((a,b) => b.streak - a.streak || b.total - a.total);
  if (!entries.length) { container.innerHTML = ""; return; }
  container.innerHTML = `<div class="stats-grid">${entries.map(e => `
    <div class="stats-card streak-card">
      <div class="stats-card-head"><h3><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> ${e.lang}</h3></div>
      <div class="streak-display">${e.streak}</div>
      <div class="streak-label">${e.streak === 1 ? "día consecutivo" : "días consecutivos"}</div>
      <div class="streak-meta">${e.total} días totales</div>
    </div>`).join("")}</div>`;
}

function renderBestDay() {
  const dayMap = buildDayMap();
  const entries = Object.entries(dayMap).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const bestEl = document.getElementById("best-day-time");
  const dateEl = document.getElementById("best-day-date");
  const extraEl = document.getElementById("best-day-extra");
  if (!entries.length) { bestEl.textContent="—"; dateEl.textContent=""; extraEl.textContent=""; return; }
  const [dayStr, secs] = entries[0];
  bestEl.textContent = formatHM(secs);
  dateEl.textContent = new Date(dayStr).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
  const avg = Object.values(dayMap).reduce((a,b)=>a+b,0)/entries.length;
  extraEl.textContent = `${Math.round(secs/avg)}× la media diaria`;
}

function renderAvgDay() {
  const dayMap = buildDayMap();
  const vals = Object.values(dayMap).filter(v=>v>0);
  const activeDays = vals.length;
  const grand = vals.reduce((a,b)=>a+b,0);
  const avgSec = activeDays ? Math.round(grand / activeDays) : 0;
  document.getElementById("avg-day-time").textContent = activeDays ? formatHM(avgSec) : "—";
  document.getElementById("avg-day-extra").textContent = activeDays ? `${activeDays} días con actividad` : "";
}

function renderHeatmap() {
  const container = document.getElementById("heatmap-inner");
  if (!container) return;
  container.innerHTML = "";
  const today = new Date(); today.setHours(0,0,0,0);
  const WEEKS = 53;
  const dow = (today.getDay()+6)%7;
  const startDate = new Date(today); startDate.setDate(startDate.getDate() - dow - (WEEKS-1)*7);
  const dayMap = buildDayMap();
  const vals = Object.values(dayMap).filter(v=>v>0);
  const max = vals.length ? Math.max(...vals) : 1;
  const monthRow = document.createElement("div");
  monthRow.className = "heatmap-month-row";
  const spacer = document.createElement("div");
  spacer.className = "heatmap-month-spacer";
  spacer.style.width = "24px";
  monthRow.appendChild(spacer);
  const labelsContainer = document.createElement("div");
  labelsContainer.style.cssText = "display:flex;flex:1;gap:3px;";
  monthRow.appendChild(labelsContainer);
  container.appendChild(monthRow);
  const body = document.createElement("div");
  body.className = "heatmap-body";
  const dayLabels = document.createElement("div");
  dayLabels.className = "heatmap-day-labels";
  ["", "L", "", "X", "", "V", ""].forEach(d => {
    const s = document.createElement("span"); s.textContent = d;
    dayLabels.appendChild(s);
  });
  body.appendChild(dayLabels);
  const columns = document.createElement("div");
  columns.className = "heatmap-columns";
  body.appendChild(columns);
  container.appendChild(body);
  let lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const weekStart = new Date(startDate); weekStart.setDate(weekStart.getDate() + w*7);
    const m = weekStart.getMonth();
    const labelEl = document.createElement("div");
    labelEl.className = "heatmap-month-label";
    labelEl.style.flex = "1";
    labelEl.textContent = m !== lastMonth
      ? weekStart.toLocaleDateString('es-ES', { month: 'short' })
      : "";
    if (m !== lastMonth) lastMonth = m;
    labelsContainer.appendChild(labelEl);
    const col = document.createElement("div");
    col.className = "heatmap-col";
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate); date.setDate(date.getDate() + w*7 + d);
      const secs = dayMap[date.toDateString()] || 0;
      const isFuture = date > today;
      const level = isFuture ? 0 : secs === 0 ? 0 : secs < max*0.25 ? 1 : secs < max*0.5 ? 2 : secs < max*0.75 ? 3 : 4;
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";
      cell.dataset.level = level;
      if (isFuture) cell.dataset.future = "";
      if (date.toDateString() === today.toDateString()) cell.dataset.today = "";
      cell.dataset.date = date.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
      cell.dataset.time = secs ? formatHM(secs) : "";
      col.appendChild(cell);
    }
    columns.appendChild(col);
  }
  const tip = document.getElementById("hm-tooltip");
  const tipDate = tip.querySelector(".hm-tooltip-date");
  const tipTime = tip.querySelector(".hm-tooltip-time");
  container.querySelectorAll(".heatmap-cell").forEach(cell => {
    cell.addEventListener("mouseenter", e => {
      const d = cell.dataset.date;
      const t = cell.dataset.time;
      tipDate.textContent = d;
      tipTime.textContent = t ? t : "Sin actividad";
      tipTime.style.color = t ? "#fff" : "rgba(255,255,255,0.4)";
      tip.classList.add("visible");
    });
    cell.addEventListener("mousemove", e => {
      tip.style.left = e.clientX + "px";
      tip.style.top = e.clientY + "px";
    });
    cell.addEventListener("mouseleave", () => {
      tip.classList.remove("visible");
    });
  });
}

/* ---------- STREAK CELEBRATION CLOSE ---------- */

document.getElementById("streak-cele-close").addEventListener("click", () => {
  document.getElementById("streak-celebration").classList.remove("visible");
  document.getElementById("streak-confetti").innerHTML = "";
});

/* ---------- STREAK TEST MODE ---------- */

document.getElementById("streak-test-menu").addEventListener("click", e => {
  const btn = e.target.closest("[data-streak]");
  if (!btn) return;
  const val = parseInt(btn.dataset.streak);
  if (val) showStreakCelebration(val, true);
});

/* ---------- HISTORY ---------- */

function renderHistory() {
  const list = document.getElementById("history-list");
  const filterLang = document.getElementById("filter-lang").value;
  const filterCat = document.getElementById("filter-cat").value;
  let allEntries = [];
  state.sessions.forEach((s, i) => allEntries.push({
    title: s.activityName, sub: s.note || "", url: s.url || "",
    cat: s.cat, lang: s.lang, seconds: s.seconds, ts: s.ts,
    type: "session", idx: i
  }));
  state.youtube.forEach((v, i) => allEntries.push({
    title: v.activity || "YouTube", url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
    sub: v.title + " · ⏳ Sin guardar", cat: "YouTube",
    lang: v.lang || "", seconds: getYtEffectiveSeconds(v), ts: v.ts || 0,
    type: "youtube", idx: i
  }));
  state.shows.forEach((s, i) => {
    const secs = getShowSeconds(s);
    allEntries.push({
      title: s.activity || "Series", url: s.url || (s.tmdbId ? `https://www.themoviedb.org/tv/${s.tmdbId}` : ""),
      sub: `${s.name} · ${s.episodesWatched} ep · ⏳ Sin guardar`, cat: "Series",
      lang: s.lang || "", seconds: secs, ts: s.ts || 0,
      type: "show", idx: i
    });
  });
  state.movies.forEach((m, i) => allEntries.push({
    title: m.activity || "Película", url: m.url || (m.tmdbId ? `https://www.themoviedb.org/movie/${m.tmdbId}` : ""),
    sub: m.title + (m.year ? ` · ${m.year}` : "") + " · ⏳ Sin guardar", cat: "Películas",
    lang: m.lang || "", seconds: getMovieEffectiveSeconds(m), ts: m.ts || 0,
    type: "movie", idx: i
  }));
  if (filterLang) allEntries = allEntries.filter(e => e.lang === filterLang);
  if (filterCat) allEntries = allEntries.filter(e => e.cat === filterCat);
  allEntries.sort((a,b) => b.ts - a.ts);
  if (!allEntries.length) { list.innerHTML = '<div class="empty-state">No hay entradas que mostrar.</div>'; return; }
  list.innerHTML = allEntries.map(e => `
    <div class="history-entry">
      <div class="history-entry-main">
        <div class="history-entry-title">${e.url ? `<a href="${e.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${e.title}</a>` : e.title}</div>
        ${e.sub ? `<div class="history-entry-sub">${e.sub}</div>` : ""}
        <div style="margin-top:0.25rem;display:flex;gap:0.4rem;flex-wrap:wrap;">
          <span class="history-entry-activity">${e.cat}</span>
          ${e.lang ? `<span class="history-entry-activity" style="background:var(--blue-soft);color:var(--blue)">${e.lang}</span>` : ""}
        </div>
      </div>
      <div class="history-entry-right">
        <span class="entry-duration">${formatHMS(e.seconds)}</span>
        ${e.ts ? `<span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft)">${formatDate(e.ts)}</span>` : ""}
        <button class="delete-entry-btn" onclick="deleteHistoryEntry('${e.type}', ${e.idx}, this)" title="Eliminar entrada">✕</button>
      </div>
    </div>`).join("");
}

let deleteTrash = [];
let deleteUndoTimer = null;

function deleteHistoryEntry(type, idx, btn) {
  if (!btn.dataset.confirming) {
    btn.dataset.confirming = "1";
    btn.textContent = "¿Eliminar?";
    btn.classList.add("confirming");
    setTimeout(() => {
      if (btn.dataset.confirming) {
        btn.dataset.confirming = "";
        btn.textContent = "✕";
        btn.classList.remove("confirming");
      }
    }, 3000);
    return;
  }
  btn.dataset.confirming = "";

  const entry = { type, idx };
  if (type === "session") entry.data = state.sessions.splice(idx, 1)[0];
  else if (type === "youtube") entry.data = state.youtube.splice(idx, 1)[0];
  else if (type === "show") entry.data = state.shows.splice(idx, 1)[0];
  else if (type === "movie") entry.data = state.movies.splice(idx, 1)[0];

  deleteTrash.push(entry);
  saveState();
  renderTotals();
  renderGoalBar();
  renderHistory();

  showUndoToast(`"${entry.data?.activityName || entry.data?.title || entry.data?.name || "Elemento"}" eliminado`);
}

function showUndoToast(msg) {
  const toast = document.getElementById("undo-toast");
  const msgEl = document.getElementById("undo-toast-msg");
  const btn = document.getElementById("undo-toast-btn");
  if (!toast) return;
  msgEl.textContent = msg;
  toast.style.display = "flex";
  btn.onclick = () => {
    const entry = deleteTrash.pop();
    if (!entry) return;
    if (entry.type === "session") state.sessions.splice(entry.idx, 0, entry.data);
    else if (entry.type === "youtube") state.youtube.splice(entry.idx, 0, entry.data);
    else if (entry.type === "show") state.shows.splice(entry.idx, 0, entry.data);
    else if (entry.type === "movie") state.movies.splice(entry.idx, 0, entry.data);
    saveState();
    renderTotals();
    renderGoalBar();
    renderHistory();
    toast.style.display = "none";
    clearTimeout(deleteUndoTimer);
  };
  clearTimeout(deleteUndoTimer);
  deleteUndoTimer = setTimeout(() => {
    deleteTrash = [];
    toast.style.display = "none";
  }, 10000);
}

function populateHistoryFilters() {
  const catEl = document.getElementById("filter-cat");
  const cats = new Set(["YouTube","Series","Películas", ...ACTIVITIES.map(a=>a.cat)]);
  catEl.innerHTML = `<option value="">Todas las categorías</option>` +
    [...cats].map(c => `<option value="${c}">${c}</option>`).join("");
}

document.getElementById("filter-lang").addEventListener("change", renderHistory);
document.getElementById("filter-cat").addEventListener("change", renderHistory);

document.getElementById("export-csv").addEventListener("click", () => {
  const rows = [["Tipo","Título","Categoría","Actividad","Idioma","Duración (seg)","Duración (legible)","URL","Nota","Fecha"]];
  state.sessions.forEach(s => rows.push([
    "Actividad", s.activityName, s.cat, s.activityId||"", s.lang, s.seconds, formatHMS(s.seconds), "", s.note||"",
    s.ts ? new Date(s.ts).toISOString() : ""
  ]));
  state.youtube.forEach(v => rows.push([
    "YouTube", v.title, "YouTube", v.activity||"", v.lang||"", v.seconds, formatHMS(v.seconds), v.url||`https://www.youtube.com/watch?v=${v.id}`, "",
    v.ts ? new Date(v.ts).toISOString() : ""
  ]));
  state.shows.forEach(s => {
    const sec = getShowSeconds(s);
    if (sec) rows.push(["Serie", s.name, "Series", s.activity||"", s.lang||"", sec, formatHMS(sec), s.url||"", `${s.episodesWatched} ep`, ""]);
  });
  state.movies.forEach(m => rows.push([
    "Película", m.title, "Películas", "", m.lang||"", m.seconds, formatHMS(m.seconds), m.url||"", "",
    m.ts ? new Date(m.ts).toISOString() : ""
  ]));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
  a.download = `inmersion_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

const origRenderStats = renderStats;
renderStats = function() {
  origRenderStats();
  applyDisplayPrefs();
};
