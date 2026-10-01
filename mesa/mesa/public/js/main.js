/* Puerta de entrada: quién eres y con qué personaje juegas. */

import { $, el, esc, toast, initials } from "./util.js";
import { store, savedSession, forgetSession, join, lobby, connect, onState } from "./net.js";
import { startI18n, langPicker } from "./i18n.js";

const app = () => document.getElementById("app");

/* El papel puede venir por la dirección (?role=screen). Si viene, manda: cada
   pestaña entra con el suyo y no hereda la sesión de otra. */
const askedRole = () => {
  const r = new URLSearchParams(location.search).get("role");
  return ["dm", "player", "screen"].includes(r) ? r : null;
};

async function boot() {
  const wanted = askedRole();
  const saved = savedSession(wanted);
  if (saved && (!wanted || saved.role === wanted)) {
    store.session = saved;
    const alive = await fetch("/api/ping?token=" + encodeURIComponent(saved.token))
      .then(r => r.ok).catch(() => false);
    if (alive) return start(saved.role);
    forgetSession(saved.role);
  }
  gate(wanted);
}

async function start(role) {
  let mount;
  if (role === "dm") mount = (await import("./dm.js")).mountDM;
  else if (role === "screen") mount = (await import("./screen.js")).mountScreen;
  else mount = (await import("./player.js")).mountPlayer;

  const once = new Promise(resolve => onState(resolve));
  connect();
  await once;                       // no se pinta nada hasta tener el estado
  app().className = "";
  mount(app());
}

async function gate(wanted) {
  const info = await lobby().catch(() => ({ players: [], title: "Mesa", offline: true }));
  let role = wanted || "player";
  let charId = null;

  app().className = "gate";
  app().innerHTML = `
    <div class="panel">
      <h1>Mesa</h1>
      <p class="sub">${esc(info.title || "Partida de D&D")}</p>

      <div class="roles">
        <button data-role="dm" aria-pressed="false"><b>DM</b><small>llevas la partida</small></button>
        <button data-role="player" aria-pressed="true"><b>Jugador</b><small>llevas un personaje</small></button>
        <button data-role="screen" aria-pressed="false"><b>Pantalla</b><small>la tele de la mesa</small></button>
      </div>

      <label class="field"><span>Tu nombre</span>
        <input id="name" maxlength="24" placeholder="Como te llaman en la mesa" autocomplete="nickname"></label>

      <label class="field hidden" id="pinField"><span>Código del DM</span>
        <input id="pin" inputmode="numeric" placeholder="Sale en la ventana del servidor"></label>

      <div id="picker"></div>

      <button class="btn primary" id="go" style="width:100%;margin-top:8px">Entrar a la partida</button>
      <p class="prose" style="font-size:12px;margin-top:14px" id="hint"></p>
      <div class="install hidden" id="install"></div>
      <div class="gate-lang" id="gateLang"></div>
    </div>`;

  $("#gateLang").appendChild(langPicker());
  if (info.offline) toast("No se encuentra el servidor de la partida. ¿Está abierta la ventana de Mesa?", "bad");
  paintInstall();

  const nameInput = $("#name");
  nameInput.value = localStorage.getItem("mesa.name") || "";

  const paint = () => {
    document.querySelectorAll("[data-role]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.role === role)));
    $("#pinField").classList.toggle("hidden", role !== "dm");
    $("#hint").textContent = role === "dm"
      ? "El código aparece en la ventana donde arrancaste Mesa."
      : role === "screen"
        ? "Ponla en la tele o el proyector. Doble clic para pantalla completa."
        : "Elige tu personaje, o entra sin él y créalo desde dentro.";
    $("#picker").innerHTML = role !== "player" ? "" : `
      <p class="prose" style="font-size:12px;margin:0 0 6px">Tu personaje</p>
      <div class="pick-list">
        ${(info.players || []).map(p => `
          <button class="pick ${p.taken ? "taken" : ""}" data-char="${p.id}" aria-pressed="${charId === p.id}">
            <span class="avatar" style="--tone:${esc(p.color)};width:32px;height:32px;font-size:12px">${initials(p.name)}</span>
            <span><b>${esc(p.name)}</b><br><small>${esc([p.className, "nivel " + p.level].filter(Boolean).join(" · "))}${p.taken ? " · ya lo lleva alguien" : ""}</small></span>
          </button>`).join("")}
        <button class="pick" data-char="" aria-pressed="${charId === null}"><span><b>Todavía no tengo</b><br><small>lo creas al entrar</small></span></button>
      </div>`;
  };
  paint();

  app().addEventListener("click", e => {
    const roleBtn = e.target.closest("[data-role]");
    if (roleBtn) { role = roleBtn.dataset.role; paint(); return; }
    const charBtn = e.target.closest("[data-char]");
    if (charBtn) { charId = charBtn.dataset.char || null; paint(); }
  });

  $("#go").addEventListener("click", async () => {
    const name = nameInput.value.trim() || (role === "dm" ? "DM" : role === "screen" ? "Pantalla" : "");
    if (!name) return toast("Escribe tu nombre para entrar", "bad");
    localStorage.setItem("mesa.name", name);
    try {
      const data = await join({ name, role, pin: $("#pin").value.trim(), charId });
      await start(data.role);
    } catch (err) {
      toast(err.message, "bad");
    }
  });

  app().addEventListener("keydown", e => { if (e.key === "Enter") $("#go").click(); });
}

/* ---------- Instalar como aplicación ----------
   Chrome y Edge avisan de que se puede instalar; Safari en iPhone no, así
   que ahí se explica el gesto. Y sin HTTPS (fuera de este ordenador) el
   navegador no deja instalar nada: se dice en vez de enseñar un botón que no
   haría nada. */
let installPrompt = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installPrompt = e;
  paintInstall();
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  paintInstall();
  toast("Mesa ya está instalada", "good");
});

function paintInstall() {
  const box = document.getElementById("install");
  if (!box) return;
  let html = "";
  if (standalone()) html = "";
  else if (installPrompt) html = `<button class="btn" id="installBtn" style="width:100%">Instalar Mesa como aplicación</button>`;
  else if (isIOS() && window.isSecureContext) html = `<p class="prose" style="font-size:12px;margin:0">Para tenerla como aplicación: botón <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.</p>`;
  else if (!window.isSecureContext) html = `<p class="prose" style="font-size:12px;margin:0">Para instalar Mesa como aplicación en este aparato hace falta entrar por HTTPS. Mira «Instalar como aplicación» en el README.</p>`;
  box.innerHTML = html;
  box.classList.toggle("hidden", !html);
  const btn = document.getElementById("installBtn");
  if (btn) btn.addEventListener("click", async () => {
    const ev = installPrompt;
    installPrompt = null;
    if (!ev) return;
    ev.prompt();
    await ev.userChoice.catch(() => null);
    paintInstall();
  });
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

startI18n();
boot();
