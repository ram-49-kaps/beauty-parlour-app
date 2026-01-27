# Chatbot Deployment Guide

## 1. Prerequisites
This application is a Python Flask app using LangChain and Groq. It requires a MySQL database connection.

## 2. Environment Variables
Set the following environment variables in your deployment platform (e.g., Render, Vercel, Heroku):

- `GROQ_API_KEY`: Your Groq API Key.
- `DB_HOST`: Database Host (e.g., TiDB address).
- `DB_USER`: Database Username.
- `DB_PASSWORD`: Database Password.
- `DB_NAME`: Database Name.
- `DB_PORT`: Database Port (default 4000 for TiDB).
- `PORT`: (Optional) Port to run on (automatically set by Render).

## 3. Build Command
```bash
pip install -r requirements.txt
```

## 4. Start Command
```bash
gunicorn app:app
```

## 5. Integration
After deployment, copy the URL of this chatbot (e.g., `https://my-chatbot.onrender.com`) and update the **Node.js Backend** environment variable:

`PYTHON_API_URL=https://my-chatbot.onrender.com`
