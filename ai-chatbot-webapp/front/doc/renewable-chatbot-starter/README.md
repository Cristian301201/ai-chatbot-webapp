# Renova - Renewable Energy Chatbot Starter

Proyecto base en **HTML + CSS + JavaScript** (sin dependencias) con una interfaz sencilla y profesional sobre energías renovables.
Incluye un **chatbot** con:

- **Modo Local (interno):** respuestas por reglas / palabras clave (no requiere internet).
- **Modo API (externo):** envía el mensaje a un endpoint configurable en `app.js`.

## Estructura
- `index.html`
- `styles.css`
- `app.js`

## Cómo usar
1. Abre `index.html` en tu navegador.
2. Presiona el botón flotante 💬 (abajo a la derecha).
3. Haz preguntas como:
   - "¿Qué es la energía solar?"
   - "beneficios"
   - "microred"

## Conectar tu API
En `app.js`, cambia:

- `API_CONFIG.endpoint`
- `API_CONFIG.headers` (si necesitas token)
- `API_CONFIG.buildBody(...)` (si tu API espera campos distintos)
- `API_CONFIG.parseResponse(...)` (si tu API retorna un formato diferente)

> Nota: Si tu API está en otro dominio, debe permitir CORS (Access-Control-Allow-Origin).
