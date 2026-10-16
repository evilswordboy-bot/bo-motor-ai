@echo off
title BO MOTOR AI Launcher
echo ===================================================
echo Starting BO MOTOR AI Dashboard (Localhost & Online)
echo ===================================================

cd /d "C:\Users\Sakthibalan\.gemini\antigravity\scratch\bo-motor-ai"

start "FastAPI Backend" /min cmd /c "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
start "Streamlit Dashboard" /min cmd /c "python -m streamlit run streamlit_app.py --server.port 8501 --server.headless true"

timeout /t 3 >nul

start "Tunnel 8000" /min cmd /c "cloudflared.exe tunnel --url http://localhost:8000"
start "Tunnel 8501" /min cmd /c "cloudflared.exe tunnel --url http://localhost:8501"

timeout /t 4 >nul

start chrome.exe "http://localhost:8501" "http://localhost:8000"
echo BO MOTOR AI is now running!
