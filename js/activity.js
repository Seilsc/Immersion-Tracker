function getTotalSeconds() {
  const actSec = state.sessions.filter(s => !currentLang || s.lang === currentLang).reduce((s,a) => s + a.seconds, 0);
  const ytSec = state.youtube.filter(v => !currentLang || v.lang === currentLang).reduce((s,v) => s + getYtEffectiveSeconds(v), 0);
  const showSec = state.shows.filter(s => !currentLang || s.lang === currentLang).reduce((s, sh) => s + sh.epDuration*60*sh.episodesWatched, 0);
  const movieSec = state.movies.filter(m => !currentLang || m.lang === currentLang).reduce((s,m) => s + getMovieEffectiveSeconds(m), 0);
  return { ytSec, showSec, movieSec, actSec, grand: actSec+ytSec+showSec+movieSec };
}

function getStatsTotalSeconds() {
  const actSec = state.sessions.filter(s => statsMatchLang(s.lang)).reduce((s,a) => s + a.seconds, 0);
  const ytSec = state.youtube.filter(v => statsMatchLang(v.lang)).reduce((s,v) => s + getYtEffectiveSeconds(v), 0);
  const showSec = state.shows.filter(s => statsMatchLang(s.lang)).reduce((s, sh) => s + sh.epDuration*60*sh.episodesWatched, 0);
  const movieSec = state.movies.filter(m => statsMatchLang(m.lang)).reduce((s,m) => s + getMovieEffectiveSeconds(m), 0);
  return { ytSec, showSec, movieSec, actSec, grand: actSec+ytSec+showSec+movieSec };
}

function renderTotals() {
  const { grand } = getTotalSeconds();
  document.getElementById("total-grand").textContent = formatHM(grand);
}

function getTodaySeconds(lang) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = startOfDay + 86400000;
  function inToday(ts) { return ts >= startOfDay && ts < endOfDay; }
  const filter = v => (!lang || v.lang === lang) && inToday(v.ts || 0);
  const actSec = state.sessions.filter(filter).reduce((s,a) => s + a.seconds, 0);
  const ytSec = state.youtube.filter(filter).reduce((s,v) => s + getYtEffectiveSeconds(v), 0);
  const movieSec = state.movies.filter(filter).reduce((s,m) => s + getMovieEffectiveSeconds(m), 0);
  return actSec + ytSec + movieSec;
}

function getGoalMotivation(pct) {
  if (pct === 0) return "¡Empieza la sesión de hoy!";
  if (pct < 0.25) return "¡Buen comienzo!";
  if (pct < 0.5) return "Vas por buen camino.";
  if (pct < 0.75) return "¡Ya más de la mitad!";
  if (pct < 1) return "¡Casi lo tienes!";
  return "🎉 ¡Objetivo alcanzado!";
}

function renderGoalBar() {
  const wrap = document.getElementById("goal-bar-wrap");
  if (!wrap) return;
  const goals = state.goals;
  if (goals.type === "global") {
    const goalMin = goals.globalMinutes || 0;
    if (!goalMin) {
      wrap.innerHTML = `<div class="goal-no-goal">Sin objetivo diario. <a id="go-to-goal-config">Configura uno →</a></div>`;
      document.getElementById("go-to-goal-config")?.addEventListener("click", () => { document.querySelector(".nav-tab[data-page='config']").click(); });
      return;
    }
    const doneSec = getTodaySeconds(null);
    const goalSec = goalMin * 60;
    const pct = Math.min(doneSec / goalSec, 1);
    const over = doneSec > goalSec;
    const doneStr = formatHM(doneSec);
    const goalStr = formatHM(goalSec);
    const msg = getGoalMotivation(pct);
    wrap.innerHTML = `<div class="goal-bar-top"><span class="goal-bar-label"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span> Objetivo diario (global)</span><span class="goal-bar-numbers"><span class="done">${doneStr}</span> / ${goalStr}</span></div><div class="goal-bar-track"><div class="goal-bar-fill${over?' over':''}" style="width:${Math.round(pct*100)}%"></div></div><div class="goal-bar-msg${pct>=1?' complete':''}">${msg}</div>`;
  } else {
    const perLang = goals.perLang || {};
    const goalMin = perLang[currentLang] || 0;
    if (!goalMin) {
      wrap.innerHTML = `<div class="goal-no-goal">Sin objetivo para <strong>${currentLang}</strong>. <a id="go-to-goal-config">Configura uno →</a></div>`;
      document.getElementById("go-to-goal-config")?.addEventListener("click", () => { document.querySelector(".nav-tab[data-page='config']").click(); });
      return;
    }
    const doneSec = getTodaySeconds(currentLang);
    const goalSec = goalMin * 60;
    const pct = Math.min(doneSec / goalSec, 1);
    const over = doneSec > goalSec;
    const doneStr = formatHM(doneSec);
    const goalStr = formatHM(goalSec);
    const msg = getGoalMotivation(pct);
    wrap.innerHTML = `<div class="goal-bar-top"><span class="goal-bar-label"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span> Objetivo diario · ${currentLang}</span><span class="goal-bar-numbers"><span class="done">${doneStr}</span> / ${goalStr}</span></div><div class="goal-bar-track"><div class="goal-bar-fill${over?' over':''}" style="width:${Math.round(pct*100)}%"></div></div><div class="goal-bar-msg${pct>=1?' complete':''}">${msg}</div>`;
  }
}

function refreshGoalConfigUI() {
  const goals = state.goals;
  document.getElementById("goal-type-global").classList.toggle("active", goals.type === "global");
  document.getElementById("goal-type-per-lang").classList.toggle("active", goals.type !== "global");
  document.getElementById("goal-global-section").style.display = goals.type === "global" ? "block" : "none";
  document.getElementById("goal-per-lang-section").style.display = goals.type !== "global" ? "block" : "none";
  const gMin = goals.globalMinutes || 0;
  document.getElementById("goal-global-h").value = Math.floor(gMin / 60) || "";
  document.getElementById("goal-global-m").value = gMin % 60 || "";
  refreshPresetHighlight("goal-global-presets", gMin);
  const langSel = document.getElementById("goal-lang-select");
  const prevLang = langSel.value;
  langSel.innerHTML = state.languages.map(l => `<option value="${l}">${l}</option>`).join("");
  if (prevLang && state.languages.includes(prevLang)) langSel.value = prevLang;
  else langSel.value = currentLang;
  refreshPerLangGoalInputs();
  renderPerLangGoalList();
}

function refreshPerLangGoalInputs() {
  const lang = document.getElementById("goal-lang-select").value;
  const min = (state.goals.perLang || {})[lang] || 0;
  document.getElementById("goal-lang-h").value = Math.floor(min / 60) || "";
  document.getElementById("goal-lang-m").value = min % 60 || "";
  refreshPresetHighlight("goal-lang-presets", min);
}

function refreshPresetHighlight(containerId, minutes) {
  document.querySelectorAll(`#${containerId} .goal-preset-btn`).forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.minutes) === minutes);
  });
}

function renderPerLangGoalList() {
  const el = document.getElementById("goal-lang-list");
  if (!el) return;
  const perLang = state.goals.perLang || {};
  const entries = Object.entries(perLang).filter(([,m]) => m > 0);
  if (!entries.length) { el.innerHTML = '<div class="empty-state">Ningún idioma tiene objetivo configurado.</div>'; return; }
  el.innerHTML = entries.map(([lang, min]) => `<div class="entry"><div class="entry-main"><span class="entry-title">${lang}</span></div><div class="entry-right"><span class="entry-duration">${formatHM(min*60)}</span><button class="danger-link" onclick="clearLangGoal('${lang}')">quitar</button></div></div>`).join("");
}

window.clearLangGoal = function(lang) {
  delete state.goals.perLang[lang];
  saveState();
  refreshGoalConfigUI();
  renderGoalBar();
};

document.getElementById("goal-type-global").addEventListener("click", () => { state.goals.type = "global"; saveState(); refreshGoalConfigUI(); renderGoalBar(); });
document.getElementById("goal-type-per-lang").addEventListener("click", () => { state.goals.type = "per-lang"; saveState(); refreshGoalConfigUI(); renderGoalBar(); });
document.getElementById("goal-global-presets").addEventListener("click", e => {
  const btn = e.target.closest(".goal-preset-btn");
  if (!btn) return;
  const min = parseInt(btn.dataset.minutes);
  document.getElementById("goal-global-h").value = Math.floor(min / 60) || "";
  document.getElementById("goal-global-m").value = min % 60 || "";
  refreshPresetHighlight("goal-global-presets", min);
});
document.getElementById("goal-lang-presets").addEventListener("click", e => {
  const btn = e.target.closest(".goal-preset-btn");
  if (!btn) return;
  const min = parseInt(btn.dataset.minutes);
  document.getElementById("goal-lang-h").value = Math.floor(min / 60) || "";
  document.getElementById("goal-lang-m").value = min % 60 || "";
  refreshPresetHighlight("goal-lang-presets", min);
});
document.getElementById("goal-global-save").addEventListener("click", () => {
  const h = parseInt(document.getElementById("goal-global-h").value) || 0;
  const m = parseInt(document.getElementById("goal-global-m").value) || 0;
  const total = h * 60 + m;
  if (total <= 0) { setStatus(document.getElementById("goal-global-status"), "Introduce al menos 1 minuto.", "err"); return; }
  state.goals.globalMinutes = total;
  saveState();
  refreshPresetHighlight("goal-global-presets", total);
  setStatus(document.getElementById("goal-global-status"), `✓ Objetivo guardado: ${formatHM(total*60)} diarios.`, "ok");
  renderGoalBar();
});
document.getElementById("goal-global-clear").addEventListener("click", () => {
  state.goals.globalMinutes = 0;
  saveState();
  document.getElementById("goal-global-h").value = "";
  document.getElementById("goal-global-m").value = "";
  refreshPresetHighlight("goal-global-presets", 0);
  setStatus(document.getElementById("goal-global-status"), "Objetivo eliminado.", "ok");
  renderGoalBar();
});
document.getElementById("goal-lang-select").addEventListener("change", refreshPerLangGoalInputs);
document.getElementById("goal-lang-save").addEventListener("click", () => {
  const lang = document.getElementById("goal-lang-select").value;
  if (!lang) return;
  const h = parseInt(document.getElementById("goal-lang-h").value) || 0;
  const m = parseInt(document.getElementById("goal-lang-m").value) || 0;
  const total = h * 60 + m;
  if (total <= 0) { setStatus(document.getElementById("goal-lang-status"), "Introduce al menos 1 minuto.", "err"); return; }
  if (!state.goals.perLang) state.goals.perLang = {};
  state.goals.perLang[lang] = total;
  saveState();
  refreshPresetHighlight("goal-lang-presets", total);
  setStatus(document.getElementById("goal-lang-status"), `✓ Objetivo para ${lang}: ${formatHM(total*60)} diarios.`, "ok");
  renderPerLangGoalList();
  renderGoalBar();
});
document.getElementById("goal-lang-clear").addEventListener("click", () => {
  const lang = document.getElementById("goal-lang-select").value;
  if (!lang || !state.goals.perLang) return;
  delete state.goals.perLang[lang];
  saveState();
  document.getElementById("goal-lang-h").value = "";
  document.getElementById("goal-lang-m").value = "";
  refreshPresetHighlight("goal-lang-presets", 0);
  setStatus(document.getElementById("goal-lang-status"), `Objetivo de ${lang} eliminado.`, "ok");
  renderPerLangGoalList();
  renderGoalBar();
});


