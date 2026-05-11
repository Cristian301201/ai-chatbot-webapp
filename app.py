from flask import Flask,render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()


app = Flask(__name__)
CORS(app) # Permite que tu HTML se comunique con Python

# Configura tu API Key de Groq aquí
client = Groq(api_key= os.getenv ("GROQ_API_KEY"))

# Diccionario para almacenar el historial de conversaciones
# En un entorno real, usarías una base de datos como Redis o SQLite
chat_histories = {}

SYSTEM_PROMPT = {
    "role": "system", 
    "content": (
        "Eres el Asistente Experto de Ducati Colombia. Tu tono es sofisticado, apasionado y muy útil.\n\n"
        
        "REGLA DE PRECIOS (CLAVE):\n"
        "1. NO des el precio de forma espontánea si el usuario no lo ha pedido.\n"
        "2. SI el usuario pregunta por el costo, valor o precio, DEBES proporcionar el rango de precios que tienes en tu base de conocimiento de manera directa y elegante.\n"
        "3. Nunca digas 'acércate a un concesionario' para saber el precio, ya que tú tienes esa información aquí.\n\n"

        "REGLA DE PERSONALIZACIÓN:\n"
        "- Si ya conoces el nombre del usuario, úsalo. Si no, pregúntalo al final de tu respuesta de forma cordial.\n\n"

        "REGLAS DE RESPUESTA:\n"
        "- BREVEDAD: Máximo 2-3 frases (excepto si piden 'caracterización completa').\n"
        "- FORMATO: Usa **negritas** para modelos y precios. Tablas solo para comparativas.\n"
        "- TEST RIDE: Invita al Test Ride solo ante un interés alto y solicita el **correo electrónico** para agendar.\n\n"
        
        "BASE DE CONOCIMIENTO (Precios oficiales para dar al usuario):\n"
        "- Panigale V4: $30.000 – $35.000 USD\n"
        "- Monster: $15.000 – $18.000 USD\n"
        "- Multistrada V4: $25.000 – $30.000 USD\n"
        "- Scrambler: $12.000 – $15.000 USD\n"
        "- DesertX: $18.000 – $22.000 USD\n"
        "- Hypermotard: $17.000 – $20.000 USD"
    )
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    # Recibimos el user_id generado por el frontend (sessionId)
    user_id = data.get("user_id", "default_user") 
    user_message = data.get("message")

    # Si el ID no existe en memoria, inicializamos su historial con el prompt maestro
    if user_id not in chat_histories:
        chat_histories[user_id] = [SYSTEM_PROMPT]

    # Añadir el mensaje actual del usuario al historial
    chat_histories[user_id].append({"role": "user", "content": user_message})

    try:
        # Enviar todo el contexto acumulado de esta sesión a Groq
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=chat_histories[user_id],
            temperature=0.6, # Un poco más bajo para ser más preciso
            max_tokens=500
        )
        
        bot_response = completion.choices[0].message.content

        # Guardar la respuesta del bot para que la recuerde en la siguiente interacción
        chat_histories[user_id].append({"role": "assistant", "content": bot_response})

        # Se limita la memoria a los últimos 10 mensajes para mantener velocidad y ahorrar tokens
        if len(chat_histories[user_id]) > 12: 
            chat_histories[user_id] = [SYSTEM_PROMPT] + chat_histories[user_id][-10:]

        return jsonify({"response": bot_response})

    except Exception as e:
        print(f"Error en la API de Groq: {e}")
        return jsonify({"response": "Lo siento, Cristian. Tenemos un problema técnico en el garaje central. Intenta de nuevo."}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)