@echo off
chcp 65001 >nul
title 个人开源项目雷达 (RepoRadar CN)
cd /d "%~dp0"

echo ========================================================
echo        📡 个人开源项目雷达 (RepoRadar CN) 一键启动
echo ========================================================
echo.

echo [1/2] 检查运行环境与数据库...
python -c "from repo_radar.storage.db import init_db; init_db()"
if errorlevel 1 (
    echo [!] 数据库初始化失败，请检查 Python 环境。
    pause
    exit /b 1
)

echo [2/2] 启动 Web 界面服务 (默认端口 8501)...
start "" http://localhost:8501
streamlit run repo_radar/ui/app.py

pause
