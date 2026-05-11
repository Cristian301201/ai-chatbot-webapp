/**
 * Renova Lite - Chatbot con 2 modos:
 *  - Local: respuestas internas (sin internet)
 *  - API:   conexión externa (fetch) a un endpoint configurable
 */

/* ========= 1) CONFIG API =========
   Cambia el endpoint por tu API real.
   Nota: si tu API está en otro dominio, necesitas CORS habilitado en el servidor.
*/
const API = {
  endpoint: "https://example.com/chat", // <-- cámbialo
  method: "POST",
  headers: { "Content-Type": "application/json" },
  buildBody: (userText) => ({
    message: userText,
    // Puedes agregar más campos si tu API lo requiere:
    // model: "gpt-4.1-mini",
    // temperature: 0.7,
  }),
  parse: (data) => {
    if (!data) return "No recibí respuesta del servidor.";
    if (typeof data === "string") return data;
    return data.reply || data.message || ("Respuesta: " + JSON.stringify(data));
  }
};

/* ========= 2) DOM ========= */
const chatFab = document.getElementById("chatFab");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");
const chatBody = document.getElementById("chatBody");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMode = document.getElementById("chatMode");

/* ========= 3) Abrir / Cerrar =========
   - Para cerrar: chatWindow.hidden = true
   - Para abrir:  chatWindow.hidden = false
   (CSS tiene .chat[hidden]{display:none!important} para que SÍ funcione)
*/
function openChat() {
  chatWindow.hidden = false;
  chatInput.focus();

  if (!chatBody.dataset.welcome) {
    addMsg("bot", "Hola 👋 Soy EcoBot. Pregunta por solar, eólica, hidro o beneficios. Cambia a modo API si quieres usar tu endpoint.");
    chatBody.dataset.welcome = "1";
  }
}
function closeChat() { chatWindow.hidden = true; }

chatFab.addEventListener("click", () => {
  if (chatWindow.hidden) openChat();
  else closeChat();
});
chatClose.addEventListener("click", closeChat);

/* ========= 4) UI helpers ========= */
function addMsg(who, text) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

/* ========= 5) Respuestas Locales ========= */
function localReply(userText) {
  const t = normalize(userText);

  if (/(hola|buenas|hey)/.test(t)) return "¡Hola! Soy EcoBot de que tipo de energía quieres saber:  ¿Solar, eólica, hidro o beneficios?";
  if (t.includes("beneficio") || t.includes("ventaja"))
    return "Beneficios: menos emisiones, independencia energética y empleos en instalación/mantenimiento.";
  if (t.includes("solar") || t.includes("panel"))
    return "Solar: convierte la luz del sol en electricidad (fotovoltaica) o calor (térmica).";
  if (t.includes("eolica") || t.includes("viento") || t.includes("turbina"))
    return "Eólica: el viento mueve turbinas para generar electricidad limpia.";
  if (t.includes("hidro") || t.includes("presa") || t.includes("rio"))
    return "Hidroeléctrica: usa agua en movimiento (río/presa) para mover turbinas y producir electricidad.";
  if (t.includes("renovable"))
    return "Renovable: fuente que se repone naturalmente (sol, viento, agua, biomasa, geotermia).";

  return "No entendí. Prueba: “solar”, “eólica”, “hidro”, “beneficios” o activa modo API.";
}

/* ========= 6) Respuesta por API ========= */
async function apiReply(userText) {
  try {
    const res = await fetch(API.endpoint, {
      method: API.method,
      headers: API.headers,
      body: JSON.stringify(API.buildBody(userText)),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      return `Error HTTP ${res.status}. ${raw || "Revisa endpoint / CORS / headers."}`;
    }

    const data = await res.json().catch(() => null);
    return API.parse(data);
  } catch (err) {
    return "No pude conectar con la API. Revisa endpoint/internet/CORS. Error: " + String(err);
  }
}

/* ========= 7) Envío ========= */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  addMsg("user", text);
  chatInput.value = "";

  const mode = chatMode.value; // local | api
  const reply = (mode === "api") ? await apiReply(text) : localReply(text);

  addMsg("bot", reply);
});
