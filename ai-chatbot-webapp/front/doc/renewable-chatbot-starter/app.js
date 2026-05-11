/**
 * =========================================================
 * Renova - app.js
 * Chatbot con 2 modos:
 *   1) LOCAL: respuestas internas (reglas simples)
 *   2) API:  conexión externa para hablar con una API (fetch)
 *
 * Está muy comentado para que aprendas y lo puedas modificar.
 * =========================================================
 */

/* =========================
   1) CONFIGURACIÓN DE API
   =========================
   Ajusta estas variables a tu necesidad.
   - Si tu API requiere un API key, puedes enviarlo en headers.
   - Si tu API está en otro dominio, asegúrate de que tenga CORS habilitado.
*/
const API_CONFIG = {
  enabled: true, // solo habilita/inhabilita la opción de modo API
  endpoint: "https://example.com/chat", // <-- Cambia este URL por tu API real
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // "Authorization": "Bearer TU_TOKEN_AQUI", // opcional
  },
  // cómo se envía el prompt (mensaje del usuario)
  buildBody: (userText) => ({
    message: userText,
    // Puedes agregar más campos si tu API lo requiere:
    // model: "gpt-4.1-mini",
    // temperature: 0.7,
  }),
  // cómo se interpreta la respuesta de la API
  parseResponse: (data) => {
    // Intenta ser flexible: si tu API retorna { reply: "..." } úsalo.
    // Si retorna { choices: [{ message: { content: "..."}}]} (estilo LLM), también funciona.
    if (!data) return "No recibí datos del servidor.";
    if (typeof data === "string") return data;
    if (data.reply) return String(data.reply);
    if (data.message) return String(data.message);
    if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
      return String(data.choices[0].message.content);
    }
    // Como última opción, mostramos el JSON:
    return "Respuesta de la API: " + JSON.stringify(data);
  }
};

/* =========================
   2) SELECTORES DEL DOM
   ========================= */
const chatFab = document.getElementById("chatFab");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");
const chatBody = document.getElementById("chatBody");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

const modeToggle = document.getElementById("modeToggle");
const modeLabel = document.getElementById("modeLabel");

/* =========================
   3) ESTADO DEL CHATBOT
   ========================= */
let mode = "local"; // "local" | "api"

/* =========================
   4) UTILIDADES
   ========================= */

/**
 * Normaliza texto: minúsculas + quita tildes
 * Esto ayuda a que el bot reconozca "energía" y "energia" igual.
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Hace scroll al final del chat (para que se vea el último mensaje)
 */
function scrollChatToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}

/**
 * Crea un mensaje en el chat
 * @param {"user"|"bot"} who
 * @param {string} text
 */
function addMessage(who, text) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${who}`;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = who === "user" ? "Tú" : "EcoBot";

  const content = document.createElement("div");
  content.textContent = text;

  bubble.appendChild(meta);
  bubble.appendChild(content);
  chatBody.appendChild(bubble);

  scrollChatToBottom();
}

/**
 * Simula un pequeño “pensando…” en el chat
 * (sirve para que la UI se sienta más natural)
 */
function addTypingIndicator() {
  const bubble = document.createElement("div");
  bubble.className = "msg bot";
  bubble.dataset.typing = "true";

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = "EcoBot";

  const content = document.createElement("div");
  content.textContent = "Escribiendo…";

  bubble.appendChild(meta);
  bubble.appendChild(content);
  chatBody.appendChild(bubble);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const typing = chatBody.querySelector('[data-typing="true"]');
  if (typing) typing.remove();
}

/* =========================
   5) MOTOR DE RESPUESTAS (LOCAL)
   =========================
   Implementación simple (reglas por palabras clave).
   Puedes mejorarlo de muchas formas:
   - Añadir más intents/patrones
   - Usar un JSON de conocimiento
   - Añadir enlaces a fuentes
   - Añadir memoria de conversación
*/
function localResponse(userTextRaw) {
  const userText = normalize(userTextRaw);

  // Ayuda / comandos
  if (userText.includes("ayuda") || userText.includes("comandos")) {
    return [
      "Puedo responder en modo LOCAL o en modo API.",
      "Ejemplos de preguntas:",
      "- ¿Qué es la energía solar?",
      "- Diferencias entre eólica e hidro",
      "- Beneficios de las renovables",
      "- ¿Qué es una microred?",
      "Tip: activa el switch 'API' si quieres enviar tu mensaje a un endpoint externo."
    ].join("\n");
  }

  // Saludos
  if (/(hola|buenas|hey|saludos)/.test(userText)) {
    return "¡Hola! Soy EcoBot. Pregúntame sobre energía solar, eólica, hidro, geotérmica, biomasa o beneficios.";
  }

  // Definición general
  if (userText.includes("que es") && (userText.includes("renovable") || userText.includes("energias renovables"))) {
    return "Las energías renovables provienen de fuentes naturales que se reponen de manera continua (sol, viento, agua, calor interno de la Tierra y biomasa). Su objetivo es producir energía con menor impacto ambiental.";
  }

  // Solar
  if (userText.includes("solar") || userText.includes("panel")) {
    return [
      "☀️ Energía solar:",
      "- Fotovoltaica: paneles convierten luz en electricidad.",
      "- Solar térmica: usa el sol para calentar agua/aire.",
      "Consejo práctico: es ideal para techos y lugares con buena radiación solar."
    ].join("\n");
  }

  // Eólica
  if (userText.includes("eolica") || userText.includes("viento") || userText.includes("aerogener")) {
    return [
      "🌬️ Energía eólica:",
      "- Convierte el movimiento del viento en electricidad mediante turbinas.",
      "- Funciona mejor en zonas con vientos constantes.",
      "Dato clave: puede complementarse con otras fuentes para mayor estabilidad."
    ].join("\n");
  }

  // Hidro
  if (userText.includes("hidro") || userText.includes("hidraul") || userText.includes("presa") || userText.includes("rio")) {
    return [
      "💧 Energía hidroeléctrica:",
      "- Aprovecha el agua en movimiento para mover turbinas.",
      "- Puede ser grande (presas) o pequeña (microhidro).",
      "Idea: microhidro puede ser útil en comunidades cercanas a ríos con caudal estable."
    ].join("\n");
  }

  // Geotérmica
  if (userText.includes("geoterm")) {
    return [
      "🌋 Energía geotérmica:",
      "- Usa el calor del interior de la Tierra.",
      "- Puede generar electricidad o servir para calefacción/climatización.",
      "Ventaja: suele ser constante (no depende del clima diario)."
    ].join("\n");
  }

  // Biomasa
  if (userText.includes("biomasa") || userText.includes("biogas") || userText.includes("residuo")) {
    return [
      "🌾 Biomasa:",
      "- Transforma materia orgánica (residuos agrícolas, orgánicos) en energía.",
      "- Puede producir biogás, calor o biocombustibles.",
      "Clave: si se gestiona bien, apoya la economía circular."
    ].join("\n");
  }

  // Beneficios
  if (userText.includes("beneficio") || userText.includes("ventaja")) {
    return [
      "✅ Beneficios de las renovables:",
      "1) Menos emisiones y mejor calidad del aire.",
      "2) Diversificación energética (menos dependencia).",
      "3) Empleos verdes (instalación y mantenimiento).",
      "4) Soluciones para zonas rurales (microredes + almacenamiento)."
    ].join("\n");
  }

  // Microred
  if (userText.includes("microred") || userText.includes("microgrid")) {
    return "Una microred (microgrid) es un sistema local que genera y distribuye energía (por ejemplo, solar + baterías) y puede operar conectado a la red principal o de forma aislada.";
  }

  // Comparaciones
  if (userText.includes("diferencia") || userText.includes("compar")) {
    return "Si me dices entre cuáles fuentes quieres comparar (por ejemplo: solar vs eólica), te doy una comparación rápida por costos, disponibilidad y continuidad.";
  }

  // Fallback (si no entiende)
  return "No estoy seguro de eso aún. Prueba preguntando por: solar, eólica, hidro, geotérmica, biomasa, microred o beneficios. (También puedes activar el modo API).";
}

/* =========================
   6) CONEXIÓN EXTERNA (API)
   ========================= */
async function apiResponse(userTextRaw) {
  if (!API_CONFIG.enabled) {
    return "El modo API está deshabilitado en la configuración.";
  }

  try {
    const res = await fetch(API_CONFIG.endpoint, {
      method: API_CONFIG.method,
      headers: API_CONFIG.headers,
      body: JSON.stringify(API_CONFIG.buildBody(userTextRaw)),
    });

    // Si la API responde con error HTTP (400/401/500, etc.)
    if (!res.ok) {
      const fallbackText = await res.text().catch(() => "");
      return `La API respondió con error (${res.status}). ${fallbackText || "Revisa endpoint/headers/CORS."}`;
    }

    // Intenta parsear JSON
    const data = await res.json().catch(() => null);
    return API_CONFIG.parseResponse(data);

  } catch (err) {
    // Errores típicos: CORS, DNS, endpoint caído, etc.
    return "No pude conectar con la API. Verifica el endpoint, internet y CORS. Error: " + String(err);
  }
}

/* =========================
   7) UI: ABRIR/CERRAR CHAT
   ========================= */
function openChat() {
  chatWindow.hidden = false;
  chatInput.focus();

  // Mensaje de bienvenida (solo si el chat está vacío)
  if (!chatBody.dataset.welcomed) {
    addMessage("bot", "¡Hola! Soy EcoBot 🤖. Pregúntame sobre energías renovables. Si quieres usar una API externa, activa el switch 'API'.");
    chatBody.dataset.welcomed = "true";
  }
}

function closeChat() {
  chatWindow.hidden = true;
}

/* =========================
   8) EVENTOS
   ========================= */
chatFab.addEventListener("click", () => {
  const isHidden = chatWindow.hidden;
  if (isHidden) openChat();
  else closeChat();
});

chatClose.addEventListener("click", closeChat);

// Cambiar modo local/API
modeToggle.addEventListener("change", () => {
  mode = modeToggle.checked ? "api" : "local";
  modeLabel.textContent = mode === "api" ? "API" : "Local";

  addMessage("bot", mode === "api"
    ? "Modo API activado. Ahora enviaré tu mensaje a tu endpoint configurado en app.js."
    : "Modo Local activado. Responderé con conocimiento interno (sin internet)."
  );
});

// Enviar mensaje
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  chatInput.value = "";

  addTypingIndicator();

  // Pequeña pausa para que se vea el indicador
  await new Promise(r => setTimeout(r, 250));

  let reply = "";
  if (mode === "api") {
    reply = await apiResponse(text);
  } else {
    reply = localResponse(text);
  }

  removeTypingIndicator();
  addMessage("bot", reply);
});

/* =========================
   9) MEJORAS OPCIONALES (IDEAS)
   =========================
   - Guardar historial en localStorage
   - Añadir botones rápidos (chips) con preguntas frecuentes
   - Añadir timestamps y avatars
   - Añadir markdown/render de links
   - Conectar a una API real (tu backend) y/o a un modelo LLM
*/
