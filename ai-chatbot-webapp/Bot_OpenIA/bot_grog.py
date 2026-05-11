import logging #Muestra lo que esta pasando en consola
import asyncio #Multitarea, consultas multiples
from collections import defaultdict, deque #Define fila de llegada y salida

from groq import Groq #Conecta con groq
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

# =========================
# 1) CONFIG
# =========================
TELEGRAM_BOT_TOKEN = ""
GROQ_API_KEY = ""

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("Falta TELEGRAM_BOT_TOKEN en variables de entorno.")
if not GROQ_API_KEY:
    raise RuntimeError("Falta GROQ_API_KEY en variables de entorno.")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Cliente Groq (SDK oficial)
groq_client = Groq(api_key=GROQ_API_KEY)

# =========================
# 2) MEMORIA POR CHAT
# =========================
MEMORY_TURNS = 10  # últimos 10 "turnos" (usuario+asistente)
SYSTEM_PROMPT = (
    "Eres un asistente virtual amigable y servicial. "
)

# chat_id -> historial (deque con límite)
conversations = defaultdict(
    lambda: deque([{"role": "system", "content": SYSTEM_PROMPT}], maxlen=MEMORY_TURNS * 2 + 1)
)

# lock por chat_id para no mezclar respuestas si llegan mensajes seguidos
chat_locks = defaultdict(asyncio.Lock)

def split_telegram_message(text: str, limit: int = 4000):
    """Telegram limita el tamaño del mensaje; partimos en trozos seguros."""
    chunks = []
    while len(text) > limit:
        cut = text.rfind("\n", 0, limit)
        if cut == -1:
            cut = limit
        chunks.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        chunks.append(text)
    return chunks

def groq_chat_sync(messages, model: str, temperature: float, max_tokens: int) -> str:
    """
    Llamada síncrona al SDK Groq.
    Groq usa 'chat.completions.create' con 'messages' y 'model'. :contentReference[oaicite:1]{index=1}
    """
    completion = groq_client.chat.completions.create(
        model=model,                 # ej: "llama-3.3-70b-versatile" :contentReference[oaicite:2]{index=2}
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return completion.choices[0].message.content or ""

async def get_chat_response(chat_id: int, user_input: str) -> str:
    async with chat_locks[chat_id]:
        history = conversations[chat_id]
        history.append({"role": "user", "content": user_input})

        # Ejecutar la llamada síncrona en un hilo para no bloquear el bot
        try:
            answer = await asyncio.to_thread(
                groq_chat_sync,
                list(history),
                "llama-3.3-70b-versatile",
                0.7,
                2000,  # sube/baja según qué tan largas quieras las respuestas
            )
            answer = answer.strip() or "No recibí texto de respuesta."

            history.append({"role": "assistant", "content": answer})
            return answer
        except Exception as e:
            logger.error("Error Groq: %s", e, exc_info=True)
            return "😕 Tuve un problema consultando Groq. Intenta de nuevo."

# =========================
# 3) HANDLERS TELEGRAM
# =========================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "¡Hola! 👋 Soy tu bot con Groq.\nEnvíame un mensaje y te respondo."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    user_message = update.message.text or ""

    await context.bot.send_chat_action(chat_id=chat_id, action="typing")

    response = await get_chat_response(chat_id, user_message)

    for chunk in split_telegram_message(response):
        await update.message.reply_text(chunk)

# =========================
# 4) PARCHE PYTHON 3.14 + MAIN
# =========================
def ensure_event_loop_for_py314() -> None:
    """
    En Python 3.14 puede no existir un event loop "actual" por defecto.
    python-telegram-bot usa asyncio.get_event_loop() internamente en run_polling,
    así que creamos y seteamos uno para evitar el RuntimeError.
    """
    try:
        asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

def main() -> None:
    logger.info("Iniciando bot...")

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("El bot está ahora en línea.")

    ensure_event_loop_for_py314()
    app.run_polling()

if __name__ == "__main__":
    main()
