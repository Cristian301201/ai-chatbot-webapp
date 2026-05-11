
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const navbarCollapse = document.querySelector('.navbar-collapse');
        if (navbarCollapse.classList.contains('show')) {
            new bootstrap.Collapse(navbarCollapse).hide();
        }
    });
});

// Referencias de elementos
const openChatBtn = document.getElementById('open-chat');
const closeChatBtn = document.getElementById('close-chat');
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');
const chatContent = document.getElementById('chat-content');


// Abrir chat
openChatBtn.addEventListener('click', () => {
    chatWindow.style.display = 'flex';
    openChatBtn.style.display = 'none'; // Opcional: ocultar botón al abrir
});

// Cerrar chat
closeChatBtn.addEventListener('click', () => {
    chatWindow.style.display = 'none';
    openChatBtn.style.display = 'block';
});

// Esto genera un ID nuevo CADA VEZ que se recarga la página (F5)
const sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

async function sendMessage() {
    const text = chatInput.value.trim();
    if (text === "") return;

    // 1. Mostrar mensaje del usuario
    const userDiv = document.createElement('div');
    userDiv.classList.add('chat-message', 'user-message');
    userDiv.textContent = text;
    chatContent.appendChild(userDiv);

    chatInput.value = ""; 
    chatContent.scrollTop = chatContent.scrollHeight;

    // 2. Mostrar indicador de "Escribiendo..." (Loader)
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-loader';
    typingDiv.classList.add('typing-indicator');
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatContent.appendChild(typingDiv);
    chatContent.scrollTop = chatContent.scrollHeight;

    try {
        // 3. Petición REAL al servidor Flask
        const response = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                user_id: sessionId  // Aquí enviamos el ID único de esta carga de página
            })
        });
        
        const data = await response.json();

        // 4. Quitar el loader
        const loader = document.getElementById('typing-loader');
        if (loader) loader.remove();

        // 5. Mostrar la respuesta de la IA (Usando Marked para negritas/listas)
        const botDiv = document.createElement('div');
        botDiv.classList.add('chat-message', 'bot-message');
        botDiv.innerHTML = marked.parse(data.response); // Procesa el Markdown
        chatContent.appendChild(botDiv);
        
        chatContent.scrollTop = chatContent.scrollHeight;

    } catch (error) {
        console.error("Error:", error);
        const loader = document.getElementById('typing-loader');
        if (loader) loader.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('chat-message', 'bot-message');
        errorDiv.textContent = "Error de conexión con el garaje central.";
        chatContent.appendChild(errorDiv);
    }
}

// Eventos de envío
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Abrir chat
openChatBtn.addEventListener('click', () => {
    chatWindow.style.display = 'flex';
    // openChatBtn.style.display = 'none'; // Comenta o borra esta línea si quieres que el botón siga ahí
});


// Función para las sugerencias rápidas
function sendQuickReply(text) {
    // 1. Ponemos el texto en el input
    chatInput.value = text;
    
    // 2. Ejecutamos la función de enviar que ya tenemos
    sendMessage();
    
    // 3. Opcional: Ocultar las sugerencias una vez se usen para limpiar el chat
    const replies = document.getElementById('quick-replies');
    if (replies) {
        replies.style.opacity = '0';
        setTimeout(() => replies.remove(), 300);
    }
}

const chatWindow = document.getElementById('chat-window');
const resizer = document.getElementById('chat-resizer');

resizer.addEventListener('mousedown', initResize, false);

function initResize(e) {
    e.preventDefault(); // Evita seleccionar texto al arrastrar
    window.addEventListener('mousemove', Resize, false);
    window.addEventListener('mouseup', stopResize, false);
}

/* Resizer */
function Resize(e) {
    // Calculamos basándonos en que el chat está anclado a la derecha (right: 25px)
    // El nuevo ancho es la distancia desde el borde derecho de la pantalla hasta el mouse
    const newWidth = window.innerWidth - e.clientX - 25; 
    // La altura es la distancia desde el mouse hasta el borde inferior (menos el margen del botón)
    const newHeight = window.innerHeight - e.clientY - 85;

    // Límites mínimos y máximos para que no desaparezca la ventana
    if (newWidth > 320 && newWidth < window.innerWidth * 0.9) {
        chatWindow.style.width = newWidth + 'px';
    }
    if (newHeight > 400 && newHeight < window.innerHeight * 0.8) {
        chatWindow.style.height = newHeight + 'px';
    }
}

function stopResize(e) {
    window.removeEventListener('mousemove', Resize, false);
    window.removeEventListener('mouseup', stopResize, false);
}