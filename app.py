from flask import Flask,render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
from dotenv import load_dotenv
from database import init_db, guardar_cliente
import re
from database import obtener_leads # Asegúrate de importar la nueva función

load_dotenv()


app = Flask(__name__)
init_db() # Crea el archivo ducati_leads.db automáticamente al iniciar
CORS(app) # Permite que tu HTML se comunique con Python

# Configura tu API Key de Groq aquí
client = Groq(api_key= os.getenv("GROQ_API_KEY"))

# Diccionario para almacenar el historial de conversaciones
# En un entorno real, usarías una base de datos como Redis o SQLite
chat_histories = {}
user_sessions = {}  # Nueva memoria para guardar datos específicos (nombre, mail, tel)

SYSTEM_PROMPT = {
    "role": "system", 
    "content": (
        "Eres el Asistente Experto de Ducati Colombia. Tu tono es sofisticado, apasionado y muy útil.\n\n"

        "OBJETIVO DE CONVERSIÓN:\n"
        "Cuando un usuario muestre interés alto (pregunte por pruebas de manejo, disponibilidad o detalles técnicos profundos), "
        "debes solicitar sus datos para agendar un Test Ride o enviarle un catálogo personalizado.\n\n"
        
        "REGLA DE CAPTURA DE DATOS:\n"
        "1. Si no conoces su NOMBRE, pregúntalo amablemente.\n"
        "2. Si ya tienes el nombre pero no el CONTACTO, solicita su correo electrónico y un número de teléfono.\n"
        "3. Sé elegante: 'Para coordinar tu experiencia con la Panigale, ¿podrías compartirme tu nombre, correo y un número de contacto?'\n\n"
        
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
    user_id = data.get("user_id", "default_user")
    user_message = data.get("message")

    # Inicializar historial y datos de sesión si es nuevo
    if user_id not in chat_histories:
        chat_histories[user_id] = [SYSTEM_PROMPT]
        user_sessions[user_id] = {"nombre": "Interesado Ducati", "email": None, "telefono": None}

    chat_histories[user_id].append({"role": "user", "content": user_message})

    try:
        # --- EXTRACCIÓN Y ACTUALIZACIÓN DE MEMORIA ---
        
        # 1. Intentar capturar nombre (si no lo tenemos ya)
        if user_sessions[user_id]["nombre"] == "Interesado Ducati":
            nombre_match = re.search(r'(?:llam[oa]|soy|nombre\s+es|hablas\s+con)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)', user_message, re.IGNORECASE)
            if nombre_match:
                user_sessions[user_id]["nombre"] = nombre_match.group(1).capitalize()
            elif len(user_message.split()) == 1 and user_message[0].isupper():
                user_sessions[user_id]["nombre"] = user_message.capitalize()

        # 2. Capturar Email
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', user_message)
        if email_match:
            user_sessions[user_id]["email"] = email_match.group()

        # 3. Capturar Teléfono
        phone_match = re.search(r'\+?\d{7,15}', user_message.replace(" ", ""))
        if phone_match:
            user_sessions[user_id]["telefono"] = phone_match.group()

        # --- GUARDADO EN BASE DE DATOS ---
        # Si tenemos al menos un dato de contacto nuevo, actualizamos la DB
        if email_match or phone_match:
            guardar_cliente(
                user_sessions[user_id]["nombre"],
                user_sessions[user_id]["email"] or "Sin correo",
                user_sessions[user_id]["telefono"] or "Sin teléfono",
                "Lead desde Chat"
            )
            print(f">>> [DB] Actualizado: {user_sessions[user_id]}")

        # Llamada a Groq
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=chat_histories[user_id],
            temperature=0.6
        )
        
        bot_response = completion.choices[0].message.content
        chat_histories[user_id].append({"role": "assistant", "content": bot_response})

        return jsonify({"response": bot_response})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"response": "Error en el sistema."}), 500

@app.route('/admin-ducati')
def admin_panel():
    # Obtenemos los datos de la DB
    leads = obtener_leads()
    return render_template('admin.html', leads=leads)

if __name__ == '__main__':
    app.run(debug=True, port=5000)