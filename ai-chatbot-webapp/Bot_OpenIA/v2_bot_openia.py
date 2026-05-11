import logging
import asyncio
from collections import defaultdict, deque

from openai import AsyncOpenAI
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

# =========================
# 1) CONFIGURACIÓN
# =========================
TELEGRAM_BOT_TOKEN = ""
OPENAI_API_KEY = ""

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("Falta TELEGRAM_BOT_TOKEN en variables de entorno.")
if not OPENAI_API_KEY:
    raise RuntimeError("Falta OPENAI_API_KEY en variables de entorno.")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# =========================
# 2) MEMORIA POR CHAT
# =========================
MEMORY_LIMIT = 10
SYSTEM_PROMPT = (
    "Eres un asistente virtual amigable y servicial. "
    "Responde en texto plano, sin Markdown ni HTML."
)

conversations = defaultdict(
    lambda: deque(
        [{"role": "system", "content": SYSTEM_PROMPT}],
        maxlen=MEMORY_LIMIT * 2 + 1
    )
)

chat_locks = defaultdict(asyncio.Lock)

def split_telegram_message(text: str, limit: int = 4000):
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

async def get_chat_response(chat_id: int, user_input: str) -> str:
    async with chat_locks[chat_id]:
        history = conversations[chat_id]
        history.append({"role": "user", "content": user_input})

        try:
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=list(history),
                temperature=0.7,
                #max_tokens=250,
                max_tokens=1500,
            )
            answer = resp.choices[0].message.content or "No recibí texto de respuesta."
            history.append({"role": "assistant", "content": answer})
            return answer

        except Exception as e:
            logger.error("Error al contactar OpenAI: %s", e, exc_info=True)
            return "😕 Tuve un problema al procesar tu mensaje. Intenta de nuevo."

# =========================
# 3) HANDLERS
# =========================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("¡Hola! 👋 Soy tu asistente IA.\nEnvíame un mensaje y te respondo.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    user_message = update.message.text or ""

    await context.bot.send_chat_action(chat_id=chat_id, action="typing")

    response = await get_chat_response(chat_id, user_message)

    for chunk in split_telegram_message(response):
        await update.message.reply_text(chunk)

# =========================
# 4) MAIN (PARCHE PY 3.14)
# =========================
def ensure_event_loop_for_py314() -> None:
    """
    Python 3.14: no siempre hay un event loop 'actual' por defecto.
    python-telegram-bot usa asyncio.get_event_loop() internamente.
    Creamos y asignamos uno para evitar:
      RuntimeError: There is no current event loop in thread 'MainThread'
    """
    try:
        asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

def main() -> None:
    logger.info("Iniciando bot...")

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("El bot está ahora en línea.")

    # ✅ CLAVE para Python 3.14
    ensure_event_loop_for_py314()

    application.run_polling()

if __name__ == "__main__":
    main()
