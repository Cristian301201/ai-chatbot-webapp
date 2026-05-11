# 🤖 AI Chatbot Web App

A full-stack web application featuring an intelligent conversational chatbot 
powered by the LLaMA model through the Groq API.

## 🚀 Features

- Real-time chat interface built with HTML, CSS and JavaScript
- Python/Flask backend handling AI logic and routing
- LLaMA language model integration via Groq API for fast inference
- Chat history persistence across sessions
- Clean and responsive UI

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| AI Model | LLaMA (via Groq API) |
| Persistence | Python (server-side storage) |

## ⚙️ Getting Started

### Prerequisites
- Python 3.x
- A Groq API key — get one free at [groq.com](https://groq.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/Cristian301201/ai-chatbot-webapp.git
cd ai-chatbot-webapp

# Install dependencies
pip install -r requirements.txt

# Add your Groq API key
# Create a .env file and add:
# GROQ_API_KEY=your_api_key_here

# Run the app
python app.py
```

Open your browser at `http://localhost:5000`

## 📁 Project Structure
ai-chatbot-webapp/
├── app.py              # Flask server and API routes
├── static/             # Frontend assets (CSS, JS)
├── templates/          # HTML templates
└── requirements.txt    # Python dependencies

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key |

## 👤 Author

**Cristian Correa**  
[GitHub](https://github.com/Cristian301201)
