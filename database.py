import sqlite3

def init_db():
    conn = sqlite3.connect('ducati_leads.db')
    cursor = conn.cursor()
    # Añadimos las columnas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            email TEXT,
            telefono TEXT,
            interes TEXT,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def guardar_cliente(nombre, email, telefono, interes="Test Ride"):
    try:
        conn = sqlite3.connect('ducati_leads.db')
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO clientes (nombre, email, telefono, interes) VALUES (?, ?, ?, ?)",
            (nombre, email, telefono, interes)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error al guardar en DB: {e}")
        return False
    
def obtener_leads():
    """Obtiene todos los registros de la tabla clientes."""
    conn = sqlite3.connect('ducati_leads.db')
    # Esto permite acceder a las columnas por nombre como un diccionario
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clientes ORDER BY fecha DESC")
    leads = cursor.fetchall()
    conn.close()
    return leads